"""Operator/owner composition with synthetic bank data and a stubbed NSM trust check."""
import hashlib
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from cryptography.hazmat.primitives import serialization

from verification.common import Rejected, b64, canonical, digest
from verification.control import Ledger
from verification.manual import operator_key, prepare, record
from verification.mercury_oracle import CAPABILITY
from verification.owner_client import complete
from verification.tests import test_execution
from verification.tests.test_sandbox import emit_module


class ManualTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.fixture = test_execution.ExecutionTests()
        self.fixture.setUp()
        self.runtime = self.fixture.runtime
        self.key = self.fixture.operator
        self.ledger = Ledger(Path(self.directory.name)/'ledger.sqlite')
        self.module = bytes(emit_module(canonical(self.fixture.fixture.output)))
        self.release = {'status':'approved', 'liveVerification':True,
                        'expiresAt':int(time.time())+300, 'policyDigest':self.runtime.policy_digest}
        self.binding = {'revision':hashlib.sha256(self.module).hexdigest(),
                        'release':digest(self.release), 'policy':self.runtime.policy_digest,
                        'prompt':'c'*64}
        self.ticket = self.ledger.create_ticket(award='synthetic', contributor='synthetic',
            revision=self.binding['revision'], capability=CAPABILITY, expires=int(time.time())+600)
        self.ledger.judge(self.ticket['id'], actor='operator', version=0, decision='admit',
                          evidence_digest='d'*64)
        self.attempt = self.ledger.reserve(self.ticket['id'], 'synthetic', self.binding, 50000)['id']
        self.args = dict(attempt=self.attempt, module=self.module, binding=self.binding,
                         release=self.release, private_key=self.key, call=self.runtime.handle)
        self.quote = {'attestation':b64(b'synthetic-quote'),
                      'publicKey':b64(self.runtime.channel.public_key_der),
                      'policyDigest':self.runtime.policy_digest}

    def test_prepare_owner_execution_and_authenticated_recording(self):
        with patch('verification.control.verify_document'), \
                patch('verification.owner_client.verify_document', return_value={'policyDigest':self.binding['policy']}), \
                patch('verification.client.verify_document', return_value={'policyDigest':self.binding['policy']}), \
                patch('verification.receipts.verify_document'), \
                patch.object(self.runtime, 'quote', return_value=self.quote), \
                patch('verification.pipeline.fetch_source_isolated', return_value=self.fixture.fixture.document):
            bundle = prepare(self.ledger, **self.args)
            self.assertNotIn('credentials', bundle)
            report = complete(bundle, release=self.release, expected_adapter=self.binding['revision'],
                call=self.runtime.handle, collect_session=lambda: {
                    'credentials':{'cookie':'SYNTHETIC-PRIVATE'}, 'sourceContext':None,
                    'transactionId':self.fixture.fixture.selected})
            record(self.ledger, report=report, binding=self.binding, release=self.release)
            snapshot = self.ledger.inspect_ticket(self.ticket['id'])
            self.assertEqual(snapshot['ticket']['state'], 'verified')
            self.assertFalse(snapshot['payoutEnabled'])
            self.assertNotIn('SYNTHETIC-PRIVATE', str(snapshot))
            report['receipt']['claims']['result'] = 'contradicted'
            with self.assertRaisesRegex(Rejected, 'invalid_receipt_signature'):
                record(self.ledger, report=report, binding=self.binding, release=self.release)

    def test_wrong_artifact_or_unapproved_release_never_contacts_worker(self):
        call = Mock()
        for change in ({'module':b'wrong'}, {'release':{**self.release, 'status':'unreleased'}}):
            with self.subTest(change=change), self.assertRaises(Rejected):
                prepare(self.ledger, **{**self.args, 'call':call, **change})
        call.assert_not_called()

    def test_paused_operator_cannot_issue_a_challenge(self):
        self.ledger.pause()
        call = Mock(return_value=self.quote)
        with patch('verification.control.verify_document'), self.assertRaisesRegex(Rejected, 'service_paused'):
            prepare(self.ledger, **{**self.args, 'call':call})
        self.assertEqual([x.args[0]['operation'] for x in call.call_args_list], ['attest'])
        self.assertEqual(self.ledger.db.execute('SELECT count(*) FROM challenge_grants').fetchone()[0], 0)

    def test_operator_key_requires_private_permissions_and_approved_identity(self):
        path = Path(self.directory.name)/'operator.pem'
        path.write_bytes(self.key.private_bytes(serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
        expected = self.runtime.operator['permitPublicKey']
        path.chmod(0o600)
        self.assertIsNotNone(operator_key(path, expected))
        with self.assertRaisesRegex(Rejected, 'operator_key_mismatch'):
            operator_key(path, b64(b'x'*32))
        path.chmod(0o644)
        with self.assertRaisesRegex(Rejected, 'operator_key_permissions'):
            operator_key(path, expected)
        link = path.with_suffix('.link')
        link.symlink_to(path)
        with self.assertRaises(OSError):
            operator_key(link, expected)
