"""Small, local coaching reference index; no model or network dependencies."""

import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import threading
import unicodedata
from urllib.parse import urlsplit


SOURCE_PATH = Path(__file__).resolve().parent.parent / 'knowledge' / 'guides.json'
DEFAULT_ROOT = Path('/Volumes/Extreme SSD/Microtalks')
_APPLICATION_ID = 0x4D54434B
_LOCK = threading.RLock()
_active_root = None
_STOPWORDS = frozenset('''a an and are as at be been being but by can could did do
does doing for from had has have he her hers him his how i if in into is it its
me my of on or our ours she should so than that the their them then there these
they this those to too us was we were what when where which who why will with
would you your yours not no don doesn didn isn aren wasn weren won wouldn
shouldn couldn haven hasn hadn t s re ve ll d m about also just really very
please help want need someone person conversation talk say said'''.split())


def _checked_root(root):
    root = Path(root).expanduser().resolve()
    # Never create a missing mount point on the internal disk.
    if root.parts[:2] == ('/', 'Volumes'):
        if len(root.parts) < 3 or not os.path.ismount(Path(*root.parts[:3])):
            raise FileNotFoundError(f'AI volume is not mounted: {root}')
    if not root.is_dir() or not (root / 'models').is_dir():
        raise FileNotFoundError(f'Existing AI root with models directory required: {root}')
    return root


def _load_source():
    raw = SOURCE_PATH.read_bytes()
    docs = json.loads(raw)
    if not isinstance(docs, list) or not docs:
        raise ValueError('Guides must be a nonempty list')
    seen = set()
    for doc in docs:
        if not isinstance(doc, dict):
            raise ValueError('Each guide must be an object')
        for field in ('id', 'title', 'url', 'text'):
            if not isinstance(doc.get(field), str) or not doc[field].strip():
                raise ValueError(f'Guide requires nonempty string {field}')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', doc['id']):
            raise ValueError('Guide id must be a lowercase slug')
        if doc['id'] in seen:
            raise ValueError(f'Duplicate guide id: {doc["id"]}')
        seen.add(doc['id'])
        url = urlsplit(doc['url'])
        if (url.scheme not in ('https', 'http') or not url.hostname
                or url.username is not None or url.password is not None
                or any(char.isspace() for char in doc['url'])):
            raise ValueError('Guide URL must be an absolute HTTP(S) URL')
        tags = doc.get('tags')
        if (not isinstance(tags, list) or not tags
                or any(not isinstance(tag, str) or not tag.strip() for tag in tags)):
            raise ValueError('Guide tags must be a nonempty list of nonempty strings')
    return docs, hashlib.sha256(raw).hexdigest()


def _connect(path):
    connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_knowledge(root: Path | None = None) -> dict:
    """Validate and index guides, returning ready/count/path/digest/updated metadata.

    ``root`` is the AI root (containing ``models``), not the knowledge folder.
    Explicit calls select the root used by subsequent searches. Invalid source
    data or unavailable storage raises an exception without replacing the index.
    """
    global _active_root
    with _LOCK:
        selected = _checked_root(root if root is not None else
                                 os.environ.get('MICROTALKS_AI_DIR', DEFAULT_ROOT))
        docs, digest = _load_source()
        folder = selected / 'knowledge'
        path = folder / 'coach.sqlite3'
        if folder.is_symlink() or path.is_symlink():
            raise ValueError('Knowledge storage must not be a symlink')
        folder.mkdir(exist_ok=True)
        existed = path.exists()
        connection = _connect(path)
        try:
            application_id = connection.execute('PRAGMA application_id').fetchone()[0]
            if existed and application_id != _APPLICATION_ID:
                raise ValueError(f'Refusing to modify an unrelated database: {path}')
            connection.execute('PRAGMA journal_mode=DELETE')
            # Serialize rebuilds across processes as well as Python threads.
            connection.execute('BEGIN IMMEDIATE')
            connection.execute(f'PRAGMA application_id={_APPLICATION_ID}')
            connection.execute('CREATE TABLE IF NOT EXISTS metadata (digest TEXT NOT NULL)')
            connection.execute('''CREATE VIRTUAL TABLE IF NOT EXISTS guides USING fts5(
                id UNINDEXED, title, url UNINDEXED, text, tags,
                tokenize='porter unicode61 remove_diacritics 2')''')
            previous = connection.execute('SELECT digest FROM metadata').fetchone()
            updated = previous is None or previous['digest'] != digest
            if updated:
                connection.execute('DELETE FROM guides')
                connection.executemany(
                    'INSERT INTO guides (id, title, url, text, tags) VALUES (?, ?, ?, ?, ?)',
                    [(d['id'], d['title'], d['url'], d['text'], ' '.join(d['tags']))
                     for d in docs])
                connection.execute('DELETE FROM metadata')
                connection.execute('INSERT INTO metadata (digest) VALUES (?)', (digest,))
            count = connection.execute('SELECT count(*) FROM guides').fetchone()[0]
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()
        _active_root = selected
        return dict(ready=True, count=count, path=str(path), digest=digest, updated=updated)


def knowledge_status() -> dict:
    """Check/refresh the selected index; report storage/source errors as not ready."""
    with _LOCK:
        try:
            return initialize_knowledge(_active_root)
        except (OSError, ValueError, sqlite3.Error) as error:
            return dict(ready=False, count=0, error=str(error))


def _tokens(query):
    query = unicodedata.normalize('NFKC', query[:8000]).casefold()
    # Quoted alphanumeric tokens cannot execute FTS operators or SQL. Splitting
    # both straight and curly apostrophes also handles possessives/contractions.
    words = re.findall(r'[^\W_]+', query, flags=re.UNICODE)
    return list(dict.fromkeys(word for word in words
                             if word not in _STOPWORDS and len(word) > 1))[:48]


def _excerpt(text):
    if len(text) <= 900:
        return text
    # Preserve source limitations at the start instead of emitting a contextless
    # match snippet. Full authored summaries remain in the database.
    prefix = text[:899]
    boundary = prefix.rfind(' ')
    return prefix[:boundary].rstrip() + '…'


def search_guides(query: str, limit: int = 2) -> list[dict]:
    """Return matching {id,title,url,text} references; never invent fallback hits.

    Limits are clamped to 0..8. Storage/schema errors propagate so the caller can
    distinguish unavailable retrieval from a legitimate empty result.
    """
    if not isinstance(query, str):
        raise TypeError('query must be a string')
    if isinstance(limit, bool) or not isinstance(limit, int):
        raise TypeError('limit must be an integer')
    limit = max(0, min(limit, 8))
    tokens = _tokens(query)
    if not tokens or not limit:
        return []
    # AND semantics require every meaningful term; no broad OR fallback that
    # would attach citations based on a single incidental word in a long query.
    match = ' AND '.join('"' + token + '"' for token in tokens)
    with _LOCK:
        metadata = initialize_knowledge(_active_root)
        path = metadata['path']
    # Read-only connections cannot accidentally recreate a DB after unplugging.
    connection = sqlite3.connect(Path(path).as_uri() + '?mode=ro', uri=True, timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        rows = connection.execute('''SELECT id, title, url, text FROM guides
            WHERE guides MATCH ?
            ORDER BY bm25(guides, 0, 6, 0, 1, 8), id LIMIT ?''', (match, limit)).fetchall()
        return [dict(id=row['id'], title=row['title'], url=row['url'],
                     text=_excerpt(row['text'])) for row in rows]
    finally:
        connection.close()
