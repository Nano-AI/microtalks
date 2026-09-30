"""Run with: python3 -m unittest discover -s scripts -p test_coaching_knowledge.py"""

from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

import coaching_knowledge as knowledge


TEMP_ROOT = '/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/opencode'


class KnowledgeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=TEMP_ROOT)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        (self.root / 'models').mkdir()
        self.docs = json.loads(knowledge.SOURCE_PATH.read_text())
        self.source = self.root / 'guides.json'
        self.write_docs(self.docs)
        self.source_patch = patch.object(knowledge, 'SOURCE_PATH', self.source)
        self.source_patch.start()
        self.addCleanup(self.source_patch.stop)
        self.active_patch = patch.object(knowledge, '_active_root', None)
        self.active_patch.start()
        self.addCleanup(self.active_patch.stop)
        self.env_patch = patch.dict('os.environ', {'MICROTALKS_AI_DIR': str(self.root)})
        self.env_patch.start()
        self.addCleanup(self.env_patch.stop)

    def write_docs(self, docs):
        self.source.write_text(json.dumps(docs), encoding='utf-8')

    def test_initialize_storage_and_full_summary(self):
        info = knowledge.initialize_knowledge()
        self.assertTrue(info['ready'])
        self.assertTrue(info['updated'])
        self.assertEqual(info['count'], 8)
        self.assertEqual(Path(info['path']), self.root / 'knowledge' / 'coach.sqlite3')
        self.assertFalse(knowledge.initialize_knowledge(self.root)['updated'])
        with sqlite3.connect(info['path']) as db:
            self.assertEqual(db.execute('PRAGMA journal_mode').fetchone()[0], 'delete')
            stored = db.execute('SELECT text FROM guides WHERE id = ?',
                                (self.docs[0]['id'],)).fetchone()[0]
        self.assertEqual(stored, self.docs[0]['text'])
        self.assertGreater(len(stored), 900)
        hits = knowledge.search_guides('active listening')
        self.assertEqual(hits[0]['id'], 'listening-relevant-follow-up')
        self.assertEqual(set(hits[0]), {'id', 'title', 'url', 'text'})
        self.assertLessEqual(len(hits[0]['text']), 900)
        self.assertTrue(hits[0]['text'].startswith('Evidence:'))

    def test_relevant_retrieval(self):
        for query, expected in (
            ('deescalation', 'de-escalation-mutual-safety'),
            ('de-escalation anger', 'de-escalation-mutual-safety'),
            ('privacy refusal', 'refusals-exits-autonomy'),
            ('active listening follow up', 'listening-relevant-follow-up'),
            ('How can I paraphrase?', 'listening-relevant-follow-up'),
        ):
            with self.subTest(query=query):
                hits = knowledge.search_guides(query)
                self.assertTrue(hits)
                self.assertEqual(hits[0]['id'], expected)
        privacy = knowledge.search_guides('privacy')
        self.assertEqual({hit['id'] for hit in privacy}, {
            'refusals-exits-autonomy', 'reciprocity-voluntary-self-disclosure'})

    def test_empty_no_hits_and_no_broad_fallback(self):
        for query in ('', '  ', 'the and can I please', '?!* : () "',
                      'quantumchromodynamics', 'privacy quantumchromodynamics'):
            with self.subTest(query=query):
                self.assertEqual(knowledge.search_guides(query), [])

    def test_operators_punctuation_apostrophes_and_unicode(self):
        plain = knowledge.search_guides('anger')
        self.assertEqual(knowledge.search_guides('"anger" OR NOT * () :'), plain)
        self.assertEqual(knowledge.search_guides('anger’s'), plain)
        self.assertEqual(knowledge.search_guides("anger's"), plain)
        for query in ('title:anger', 'NEAR(anger, 1)', "'; DROP TABLE guides; --"):
            self.assertEqual(knowledge.search_guides(query), [])
        self.docs[0]['tags'].append('café 聆听')
        self.write_docs(self.docs)
        self.assertEqual(knowledge.search_guides('café 聆听')[0]['id'], self.docs[0]['id'])
        self.assertEqual(knowledge.knowledge_status()['count'], 8)

    def test_limits_and_types(self):
        self.assertEqual(knowledge.search_guides('privacy', 0), [])
        self.assertEqual(knowledge.search_guides('privacy', -10), [])
        self.assertEqual(len(knowledge.search_guides('privacy', 1)), 1)
        self.assertLessEqual(len(knowledge.search_guides('privacy', 100000)), 8)
        for limit in (True, '2', 1.5, None):
            with self.assertRaises(TypeError):
                knowledge.search_guides('privacy', limit)
        with self.assertRaises(TypeError):
            knowledge.search_guides(None)

    def test_digest_refresh_replaces_removed_documents(self):
        original = knowledge.initialize_knowledge()
        changed = self.docs[0].copy()
        changed['text'] += ' Uniquequokka.'
        self.write_docs([changed])
        hits = knowledge.search_guides('uniquequokka')
        self.assertEqual(hits[0]['id'], changed['id'])
        info = knowledge.knowledge_status()
        self.assertEqual(info['count'], 1)
        self.assertNotEqual(info['digest'], original['digest'])
        self.assertEqual(knowledge.search_guides('deescalation'), [])

    def test_invalid_metadata_rejected_without_changing_index(self):
        original = knowledge.initialize_knowledge()
        invalid = [None, {}, [], [None], self.docs + [self.docs[0]]]
        for field, value in (('id', 'bad id'), ('title', ''), ('url', 'javascript:bad'),
                             ('url', 'https://'), ('text', 42), ('tags', 'anger'),
                             ('tags', ['']), ('tags', [42])):
            doc = self.docs[0].copy()
            doc[field] = value
            invalid.append([doc])
        for docs in invalid:
            with self.subTest(docs=docs):
                self.write_docs(docs)
                with self.assertRaises(ValueError):
                    knowledge.initialize_knowledge()
                self.assertFalse(knowledge.knowledge_status()['ready'])
        with sqlite3.connect(original['path']) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM guides').fetchone()[0], 8)
            self.assertEqual(db.execute('SELECT digest FROM metadata').fetchone()[0],
                             original['digest'])

    def test_missing_storage_does_not_create_directories(self):
        missing = self.root / 'missing'
        with self.assertRaises(FileNotFoundError):
            knowledge.initialize_knowledge(missing)
        self.assertFalse(missing.exists())
        (self.root / 'models').rmdir()
        with self.assertRaises(FileNotFoundError):
            knowledge.initialize_knowledge(self.root)
        self.assertFalse((self.root / 'knowledge').exists())
        with patch.object(knowledge.os.path, 'ismount', return_value=False):
            with self.assertRaises(FileNotFoundError):
                knowledge.initialize_knowledge(knowledge.DEFAULT_ROOT)

    def test_unrelated_data_untouched(self):
        folder = self.root / 'knowledge'
        folder.mkdir()
        path = folder / 'coach.sqlite3'
        with sqlite3.connect(path) as db:
            db.execute('CREATE TABLE unrelated (value TEXT)')
            db.execute("INSERT INTO unrelated VALUES ('keep')")
        before = path.read_bytes()
        with self.assertRaises(ValueError):
            knowledge.initialize_knowledge()
        self.assertEqual(path.read_bytes(), before)

    def test_parallel_initialization_and_search(self):
        def request(index):
            if index % 2:
                return knowledge.initialize_knowledge(self.root)['count']
            return knowledge.search_guides('deescalation')[0]['id']
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(request, range(32)))
        self.assertEqual(results.count(8), 16)
        self.assertEqual(results.count('de-escalation-mutual-safety'), 16)
        self.assertEqual(knowledge.knowledge_status()['count'], 8)


if __name__ == '__main__':
    unittest.main()
