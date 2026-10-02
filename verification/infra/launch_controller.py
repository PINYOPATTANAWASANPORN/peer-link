"""Trusted Lambda entrypoint. No repository checkout, bank session or guest code.

Deploy only behind an invoke-only IAM role and protected manual workflow. The
operator writes reviewed approvals; workflow callers can only name an existing
approval. A failed/uncertain launch burns its reservation and cannot auto-retry.
"""
import os
import re
import time

RESERVATION = 2_000_000
TASK_CAP = 50_000_000
MAX_AGE = 6600


def start(event, *, ddb, ec2, table, template, version, release, enabled, now=None):
    now = int(time.time()) if now is None else now
    if not enabled:
        raise ValueError('dispatch_disabled')
    if (not isinstance(event, dict) or set(event) != {'approvalId'} or
            not isinstance(event['approvalId'], str) or
            not re.fullmatch(r'[a-f0-9]{32}', event['approvalId'])):
        raise ValueError('invalid_request')
    if not re.fullmatch(r'[a-f0-9]{64}', release) or not re.fullmatch(r'[1-9][0-9]*', version):
        raise ValueError('invalid_deployment')
    ref = event['approvalId']
    record = ddb.get_item(TableName=table, Key={'id': {'S': 'approval/' + ref}},
                          ConsistentRead=True).get('Item', {})
    if (record.get('state') != {'S': 'approved'} or
            record.get('releaseDigest') != {'S': release} or
            not re.fullmatch(r'[a-f0-9]{64}', record.get('artifactDigest', {}).get('S', '')) or
            int(record.get('expiresAt', {}).get('N', '0')) <= now):
        raise ValueError('approval_unavailable')
    # This transaction is the authority boundary for global concurrency and cost.
    # There is no TTL on the budget or lease. Only the external reconciler can
    # release a lease after it verifies the old worker has terminated.
    ddb.transact_write_items(TransactItems=[
        {'Update': {'TableName': table, 'Key': {'id': {'S': 'budget'}},
            'UpdateExpression': 'ADD committedMicroUsd :cost',
            'ConditionExpression': 'paused = :no AND committedMicroUsd <= :remaining',
            'ExpressionAttributeValues': {':cost': {'N': str(RESERVATION)},
                ':remaining': {'N': str(TASK_CAP - RESERVATION)}, ':no': {'BOOL': False}}}},
        {'Put': {'TableName': table, 'Item': {'id': {'S': 'active'},
            'approvalId': {'S': ref}, 'expiresAt': {'N': str(now + MAX_AGE)}},
            'ConditionExpression': 'attribute_not_exists(id)'}},
        {'Update': {'TableName': table, 'Key': {'id': {'S': 'approval/' + ref}},
            'UpdateExpression': 'SET #state = :used',
            'ConditionExpression': '#state = :approved AND releaseDigest = :release AND artifactDigest = :artifact AND expiresAt > :now',
            'ExpressionAttributeNames': {'#state': 'state'},
            'ExpressionAttributeValues': {':used': {'S': 'consumed'},
                ':approved': {'S': 'approved'}, ':release': {'S': release},
                ':artifact': record['artifactDigest'],
                ':now': {'N': str(now)}}}},
    ])
    # Every execution setting comes from the immutable reviewed template version.
    # No user-data, AMI, role, subnet, command, repo or instance count in event.
    response = ec2.run_instances(MinCount=1, MaxCount=1, ClientToken=ref,
        LaunchTemplate={'LaunchTemplateId': template, 'Version': version})
    instances = response.get('Instances', [])
    if len(instances) != 1:
        raise ValueError('unexpected_launch_result')
    ddb.update_item(TableName=table, Key={'id': {'S': 'active'}},
        UpdateExpression='SET instanceId = :instance',
        ConditionExpression='approvalId = :approval',
        ExpressionAttributeValues={':instance': {'S': instances[0]['InstanceId']},
                                   ':approval': {'S': ref}})
    return {'approvalId': ref, 'instanceId': instances[0]['InstanceId'],
            'artifactDigest': record['artifactDigest']['S'],
            'releaseDigest': release, 'reservedMicroUsd': RESERVATION,
            'expiresAt': now + MAX_AGE, 'bankSessionAccepted': False}


def handler(event, context):
    import boto3
    try:
        return start(event, ddb=boto3.client('dynamodb'), ec2=boto3.client('ec2'),
            table=os.environ['TABLE'], template=os.environ['LAUNCH_TEMPLATE'],
            version=os.environ['TEMPLATE_VERSION'], release=os.environ['RELEASE_DIGEST'],
            enabled=os.environ.get('DISPATCH_ENABLED') == 'true')
    except Exception:
        # No input/event, AWS payload, credential, URL or stack trace in logs.
        return {'error': 'launch_refused_or_uncertain', 'bankSessionAccepted': False}
