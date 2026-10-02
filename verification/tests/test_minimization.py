import copy
import json
import unittest
from pathlib import Path

from verification.common import Rejected
from verification.mercury_oracle import reference_facts, scoped_evidence


class MinimizationTests(unittest.TestCase):
    def setUp(self):
        fixture = json.loads((Path(__file__).resolve().parents[2] /
            'banks/us/mercury/fixtures/sent.synthetic.json').read_text())
        self.document, self.selected = fixture['input'], fixture['transactionId']

    def test_guest_gets_only_the_selected_required_fields(self):
        doc = copy.deepcopy(self.document)
        doc['balance'] = 'PRIVATE-BALANCE'
        doc['data']['transactions'][0]['memo'] = 'PRIVATE-MEMO'
        doc['data']['parties'][0]['name'] = 'PRIVATE-NAME'
        doc['data']['transactions'].append({'id': 'UNRELATED-TRANSACTION', 'amount': 999})
        scoped = scoped_evidence(doc, self.selected)
        self.assertEqual(reference_facts(scoped, self.selected), reference_facts(doc, self.selected))
        for private in ('PRIVATE-BALANCE', 'PRIVATE-MEMO', 'PRIVATE-NAME', 'UNRELATED-TRANSACTION'):
            self.assertNotIn(private, json.dumps(scoped))
        self.assertEqual(len(scoped['data']['transactions']), 1)
        self.assertEqual(len(scoped['data']['parties']), 1)

    def test_minimization_cannot_hide_duplicate_selection(self):
        self.document['data']['transactions'].append(self.document['data']['transactions'][0])
        with self.assertRaisesRegex(Rejected, 'oracle_ambiguous_transaction'):
            scoped_evidence(self.document, self.selected)
