import unittest
from unittest.mock import Mock

from verification.infra.launch_controller import start


class LaunchControllerTests(unittest.TestCase):
    def setUp(self):
        self.ddb, self.ec2 = Mock(), Mock()
        self.ref, self.release = 'a' * 32, 'b' * 64
        self.ddb.get_item.return_value = {'Item': {'state': {'S': 'approved'},
            'artifactDigest': {'S': 'c' * 64},
            'releaseDigest': {'S': self.release}, 'expiresAt': {'N': '150'}}}
        self.ec2.run_instances.return_value = {'Instances': [{'InstanceId': 'i-synthetic'}]}
        self.args = dict(ddb=self.ddb, ec2=self.ec2, table='synthetic',
            template='lt-synthetic', version='3', release=self.release, enabled=True, now=100)

    def test_only_immutable_deployment_inputs_reach_ec2(self):
        result = start({'approvalId': self.ref}, **self.args)
        self.ec2.run_instances.assert_called_once_with(MinCount=1, MaxCount=1,
            ClientToken=self.ref, LaunchTemplate={'LaunchTemplateId': 'lt-synthetic', 'Version': '3'})
        self.assertFalse(result['bankSessionAccepted'])
        self.assertEqual(result['expiresAt'], 6700)
        transaction = self.ddb.transact_write_items.call_args.kwargs['TransactItems']
        self.assertEqual(len(transaction), 3)
        self.assertEqual(transaction[0]['Update']['ExpressionAttributeValues'][':remaining'],
                         {'N': '48000000'})
        self.assertEqual(transaction[1]['Put']['ConditionExpression'], 'attribute_not_exists(id)')

    def test_disabled_expired_or_wrong_release_never_spends_or_starts(self):
        for change in ({'enabled': False}, {'now': 150}, {'release': 'c' * 64}, {'version': '$Latest'}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                start({'approvalId': self.ref}, **{**self.args, **change})
        self.ddb.transact_write_items.assert_not_called()
        self.ec2.run_instances.assert_not_called()

    def test_untrusted_deployment_or_session_fields_are_rejected(self):
        for extra in ('userData', 'repo', 'session', 'module', 'instanceCount', 'roleArn'):
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                start({'approvalId': self.ref, extra: 'attacker'}, **self.args)
        self.ec2.run_instances.assert_not_called()

    def test_budget_lease_or_approval_transaction_conflict_never_launches(self):
        self.ddb.transact_write_items.side_effect = RuntimeError('TransactionCanceledException')
        with self.assertRaises(RuntimeError):
            start({'approvalId': self.ref}, **self.args)
        self.ec2.run_instances.assert_not_called()

    def test_uncertain_launch_does_not_refund_or_release_a_lease(self):
        self.ec2.run_instances.side_effect = TimeoutError()
        with self.assertRaises(TimeoutError):
            start({'approvalId': self.ref}, **self.args)
        self.ddb.delete_item.assert_not_called()
        self.ddb.update_item.assert_not_called()
        self.assertEqual(self.ddb.transact_write_items.call_count, 1)
