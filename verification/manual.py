"""Trusted operator handshake and receipt recording; never handles bank input.

Run only on the operator's machine. Neither this module nor its signing key belongs
in a GitHub workflow, contributor process or Nitro parent. Release and binding files
must come from the operator's independent review, never an untrusted worker.
"""
import argparse
import hashlib
import json
import os
import resource
import stat
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from .attestation import policy_digest
from .common import b64, canonical, digest, fields, hex_digest, require, strict_json, unb64
from .control import Ledger
from .owner_client import transport
from .sandbox import MAX_MODULE


def prepare(ledger, *, attempt, module, binding, release, private_key, call):
    fields(binding, ('revision', 'release', 'policy', 'prompt'))
    for value in binding.values():
        hex_digest(value)
    require(0 < len(module) <= MAX_MODULE and
            hashlib.sha256(module).hexdigest() == binding['revision'], 'adapter_mismatch')
    require(release.get('status') == 'approved' and release.get('liveVerification') is True and
            binding['release'] == digest(release) and
            binding['policy'] == release.get('policyDigest'), 'release_binding')
    nonce = os.urandom(32)
    quote = call({'operation': 'attest', 'nonce': b64(nonce)})
    fields(quote, ('attestation', 'publicKey', 'policyDigest'))
    require(quote['policyDigest'] == binding['policy'], 'policy_mismatch')
    grant = ledger.authorize_challenge(attempt, attestation=unb64(quote['attestation']),
        nonce=nonce, public_key_der=unb64(quote['publicKey']), release=release,
        binding=binding, private_key=private_key)
    challenge = call({'operation': 'challenge', 'grant': grant})
    fields(challenge, ('context', 'quote'))
    fresh = challenge['quote']
    fields(fresh, ('attestation', 'publicKey', 'policyDigest'))
    require(fresh['policyDigest'] == binding['policy'], 'policy_mismatch')
    permit = ledger.authorize_execution(attempt, context=challenge['context'],
        attestation=unb64(fresh['attestation']), public_key_der=unb64(fresh['publicKey']),
        release=release, binding=binding, private_key=private_key)
    return {'module': b64(module), 'binding': binding,
            'context': challenge['context'], 'permit': permit}


def record(ledger, *, report, binding, release):
    fields(report, ('receipt', 'quote'))
    quote = report['quote']
    fields(quote, ('attestation', 'publicKey', 'policyDigest'))
    require(quote['policyDigest'] == release.get('policyDigest'), 'policy_mismatch')
    ledger.finish_receipt(report['receipt'], attestation=unb64(quote['attestation']),
        nonce=bytes.fromhex(digest(report['receipt'])), public_key_der=unb64(quote['publicKey']),
        release=release, binding=binding)


def operator_key(path, expected):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, 'rb') as stream:
        metadata = os.fstat(stream.fileno())
        require(stat.S_ISREG(metadata.st_mode) and metadata.st_uid == os.getuid() and
                metadata.st_mode & 0o077 == 0 and metadata.st_size <= 16384,
                'operator_key_permissions')
        key = serialization.load_pem_private_key(stream.read(16385), password=None)
    require(isinstance(key, Ed25519PrivateKey), 'operator_key_type')
    public = key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    require(public == unb64(expected, 32), 'operator_key_mismatch')
    return key


def main():
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', required=True, help='Existing reviewed operator ledger')
    parser.add_argument('--release', required=True)
    parser.add_argument('--binding', required=True)
    commands = parser.add_subparsers(dest='command', required=True)
    request = commands.add_parser('prepare-request')
    for name in ('attempt', 'module', 'key-file', 'output', 'verifier-directory'):
        request.add_argument('--'+name, required=True)
    request.add_argument('--port', required=True, type=int)
    received = commands.add_parser('record-receipt')
    received.add_argument('--report', required=True)
    args = parser.parse_args()
    require(Path(args.db).is_file(), 'operator_ledger_required')
    release = strict_json(Path(args.release).read_bytes())
    binding = strict_json(Path(args.binding).read_bytes())
    ledger = Ledger(args.db)
    if args.command == 'record-receipt':
        report = strict_json(Path(args.report).read_bytes(), 65536)
        record(ledger, report=report, binding=binding, release=release)
        print(json.dumps({'recorded': True, 'payoutApproved': False}))
        return
    directory = Path(args.verifier_directory)
    policies = [strict_json((directory/'policies'/name).read_bytes()) for name in
                ('service.json', 'mercury.json', 'model-trust.json', 'operator-trust.json')]
    prompt = (directory/'prompts/payment-review-v1.txt').read_text()
    require(policy_digest(policies[0], prompt, *policies[1:]) == release.get('policyDigest') and
            hashlib.sha256(prompt.encode()).hexdigest() == binding.get('prompt') and
            policies[3].get('enabled') is True, 'policy_mismatch')
    key = operator_key(args.key_file, policies[3]['permitPublicKey'])
    with Path(args.module).open('rb') as stream:
        module = stream.read(MAX_MODULE + 1)
    # Exclusive creation prevents accidentally replacing an outstanding request.
    # A failed handshake leaves an empty file and consumes no new owner consent.
    with Path(args.output).open('xb') as output:
        bundle = prepare(ledger, attempt=args.attempt, module=module, binding=binding,
            release=release, private_key=key, call=lambda value: transport(args.port, value))
        output.write(canonical(bundle))
    print(json.dumps({'prepared': True, 'attempt': args.attempt,
                      'expiresAt': bundle['context']['expiresAt'], 'bankInputCollected': False}))


if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt):
        print('{"error":"manual_operation_failed_or_expired"}')
        raise SystemExit(1)
