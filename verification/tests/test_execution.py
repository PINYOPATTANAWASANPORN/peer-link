"""Synthetic composition evidence; the bank transport and Nitro device are mocked.

Real RSA encryption, signed permits, Wasm execution, oracle comparison and receipt
signatures execute here. This test is not evidence of hardware/live-bank validation.
"""
import hashlib
import time
import unittest
from unittest.mock import patch

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from verification.admission import issue as admit
from verification.channel import encrypt_session
from verification.common import Rejected, b64, canonical, digest, unb64
from verification.mercury_oracle import CAPABILITY
from verification.permits import issue
from verification.receipts import DOMAIN
from verification.runtime import Runtime
from verification.owner_client import complete
from verification.tests import test_adapter_check as fixtures
from verification.tests.test_sandbox import emit_module


class ExecutionTests(unittest.TestCase):
    def setUp(self):
        fixture = fixtures.AdapterCheckTests()
        fixture.setUp()
        self.fixture = fixture
        self.runtime = Runtime()
        self.operator = Ed25519PrivateKey.generate()
        self.runtime.operator = {'enabled': True, 'permitPublicKey': b64(
            self.operator.public_key().public_bytes(serialization.Encoding.Raw,
                                                    serialization.PublicFormat.Raw))}
        self.runtime.service = {'mode': 'manual', 'manualVerification': True}
        self.runtime.source = {'enabled': True, 'status': 'approved', 'capability': CAPABILITY}

    def request(self, output=None):
        module = bytes(emit_module(canonical(self.fixture.output if output is None else output)))
        binding = {'revision': hashlib.sha256(module).hexdigest(), 'release': 'b'*64,
                   'policy': self.runtime.policy_digest, 'prompt': 'c'*64}
        key_digest = hashlib.sha256(self.runtime.channel.public_key_der).hexdigest()
        expires = int(time.time()) + 90
        grant = admit({'audience':'peer-link-challenge-v1','attempt':'attempt',
            'bindingDigest':digest(binding),'policyDigest':binding['policy'],
            'enclaveKeyDigest':key_digest,'expiresAt':expires}, self.operator)
        context = self.runtime.channel.challenge_authorized(grant,
            operator_public_key=unb64(self.runtime.operator['permitPublicKey']),
            policy_digest=binding['policy'])
        permit = issue({'audience':'peer-link-verification-v1','attempt':'attempt','ticket':'ticket',
            'artifactDigest':binding['revision'],'policyDigest':binding['policy'],
            'enclaveKeyDigest':key_digest,'challenge':context['nonce'],
            'expiresAt':expires,'maximumMicroUsd':50000}, self.operator)
        envelope = encrypt_session(self.runtime.channel.public_key_der,context,
            {'credentials':{'cookie':'SYNTHETIC-SECRET-NEVER-REPORT'},
             'sourceContext':{'organizationId':'00000000-0000-0000-0000-000000000000'},
             'transactionId':self.fixture.selected},consent=True)
        return {'operation':'execute','module':b64(module),'binding':binding,
                'envelope':envelope,'permit':permit}

    def test_real_encryption_wasm_oracle_and_signed_minimal_report(self):
        request = self.request()
        with patch('verification.pipeline.fetch_source_isolated', return_value=self.fixture.document), \
                patch.object(self.runtime,'quote',return_value={'synthetic':True}) as quote:
            report = self.runtime.handle(request)
            self.assertEqual(set(report), {'receipt','quote'})
            receipt = report['receipt']
            self.assertEqual(receipt['claims']['result'],'verified')
            self.assertEqual(receipt['claims']['bindingDigest'],digest(request['binding']))
            self.runtime.channel.key.public_key().verify(unb64(receipt['signature']),
                DOMAIN+canonical(receipt['claims']),padding.PSS(mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=32),hashes.SHA256())
            quote.assert_called_once_with(bytes.fromhex(digest(receipt)))
            for private in ('SYNTHETIC-SECRET','12345',self.fixture.selected,'facts','candidates'):
                self.assertNotIn(private,str(report))
            with self.assertRaisesRegex(Rejected,'expired_or_replayed_challenge'):
                self.runtime.handle(request)

    def test_guest_abstention_strings_never_escape(self):
        request = self.request({'outcome':'insufficient_evidence','reason':'LEAK-ME'})
        with patch('verification.pipeline.fetch_source_isolated', return_value=self.fixture.document), \
                patch.object(self.runtime,'quote',return_value={}):
            report=self.runtime.handle(request)
        self.assertEqual(report['receipt']['claims']['result'],'needs_review')
        self.assertNotIn('LEAK-ME',str(report))

    def test_wrong_binding_and_unapproved_runtime_reject_before_bank_read(self):
        request=self.request()
        request['binding']['revision']='a'*64
        with patch('verification.pipeline.fetch_source_isolated') as fetch:
            with self.assertRaisesRegex(Rejected,'execution_binding'):
                self.runtime.handle(request)
            self.runtime.service['manualVerification']=False
            with self.assertRaisesRegex(Rejected,'live_verification_unavailable'):
                self.runtime.handle(request)
            fetch.assert_not_called()

    def test_model_enablement_cannot_disclose_bank_records(self):
        request=self.request()
        self.runtime.model={'enabled':True}
        with patch('verification.pipeline.fetch_source_isolated') as fetch:
            with self.assertRaisesRegex(Rejected,'external_model_forbidden'):
                self.runtime.handle(request)
            fetch.assert_not_called()

    def test_owner_client_checks_release_and_receipt_with_real_crypto(self):
        # Hardware attestation is the only trust check stubbed here; a separate
        # disposable Nitro run must supply real documents before release.
        self.release = {'status':'approved','liveVerification':True,
                        'expiresAt':int(time.time())+300,'policyDigest':self.runtime.policy_digest}
        request=self.request()
        # request() intentionally uses a fixed release hash for other tests.
        # Re-create it with the pinned synthetic release to test the full client.
        module=unb64(request['module'])
        binding={**request['binding'],'release':digest(self.release)}
        expires=int(time.time())+90
        key_digest=hashlib.sha256(self.runtime.channel.public_key_der).hexdigest()
        grant=admit({'audience':'peer-link-challenge-v1','attempt':'client-attempt',
            'bindingDigest':digest(binding),'policyDigest':binding['policy'],
            'enclaveKeyDigest':key_digest,'expiresAt':expires},self.operator)
        context=self.runtime.channel.challenge_authorized(grant,
            operator_public_key=unb64(self.runtime.operator['permitPublicKey']),policy_digest=binding['policy'])
        permit=issue({'audience':'peer-link-verification-v1','attempt':'client-attempt','ticket':'ticket',
            'artifactDigest':binding['revision'],'policyDigest':binding['policy'],
            'enclaveKeyDigest':key_digest,'challenge':context['nonce'],
            'expiresAt':expires,'maximumMicroUsd':50000},self.operator)
        bundle={'module':b64(module),'binding':binding,'context':context,'permit':permit}
        quote={'attestation':b64(b'synthetic-quote'),'publicKey':b64(self.runtime.channel.public_key_der),
               'policyDigest':self.runtime.policy_digest}
        def session():
            return {'credentials':{'cookie':'SYNTHETIC-SECRET'},'sourceContext':None,
                    'transactionId':self.fixture.selected}
        with patch('verification.owner_client.verify_document', return_value={'policyDigest':binding['policy']}), \
                patch('verification.client.verify_document', return_value={'policyDigest':binding['policy']}), \
                patch('verification.receipts.verify_document'), \
                patch.object(self.runtime,'quote',return_value=quote), \
                patch('verification.pipeline.fetch_source_isolated',return_value=self.fixture.document):
            report=complete(bundle,release=self.release,expected_adapter=binding['revision'],
                            call=self.runtime.handle,collect_session=session)
        self.assertEqual(report['receipt']['claims']['result'],'verified')
        self.assertNotIn('SYNTHETIC-SECRET',str(report))
