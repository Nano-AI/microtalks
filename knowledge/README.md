# Microtalks reference notes

`guides.json` contains eight original, authored summaries for retrieval during ordinary peer-conversation coaching. It contains no full copied books or articles and no quoted source passages. The Carnegie entry is an original adaptation linked to an authorized publisher description; the full book was not used as a retrieved source.

Each record has `id`, `title`, `url`, `text`, and `tags`. All eight cited URLs were fetched successfully and their relevant content reviewed on September 22, 2026. The ASHA link redirects to its public education resource at the Communication Health Support Association; the Penguin link redirects to the current edition page. Accessibility can change.

## Source and evidence context

- Listening: UC Berkeley Greater Good Science Center's *Active Listening* guide, including its account of Weger et al. (2014). This is a university synthesis, not a direct review of the study's full text.
- Reciprocity: Berkeley's *36 Questions for Increasing Closeness*, summarizing Aron et al. (1997) and Sprecher et al. (2013). This is also a university synthesis; its complete question sets are not reproduced here.
- Sadness: NHS Every Mind Matters public guidance on supporting others.
- De-escalation: Richmond et al. (2012), Project BETA professional consensus, full article accessed through PubMed Central. Peer-conversation recommendations are explicitly adapted from its clinical setting; clinical interventions are outside these notes.
- Refusals: Love is respect / National Domestic Violence Hotline boundary guidance.
- Fillers and pauses: ASHA / Communication Health Support Association public speech guidance.
- Flat pitch: NIMH's *Autism Spectrum Disorder* information, revised 2025; used to contextualize variation, never to diagnose a speaker.
- Genuine interest: Penguin / Vermilion's publisher page for Dale Carnegie, ISBN 9780091906818. This supplies bibliographic context and broad themes, not efficacy evidence.

## Retrieval and use

The `text` field separates evidence or source guidance from **Microtalks recommendation** so that each retrieved record retains its limitations. Keep the source URL with any displayed citation. Citations and human context matter: research-derived relationship patterns are not universal social rules, and professional guidance is not an experimental result.

Titles, prose, and tags include plain-language search terms and variants for SQLite FTS5, such as follow up/followup, de escalation/deescalation, sadness/upset, and flat pitch/monotone. `scripts/coaching_knowledge.py` indexes these fields while retaining each ID, URL, and full summary. It uses only Python's standard library and SQLite FTS5.

### Local retrieval API

- `initialize_knowledge(root: pathlib.Path | None = None)` validates the source and returns `ready`, `count`, `path`, `digest`, and `updated`. The AI root defaults to `MICROTALKS_AI_DIR`, or `/Volumes/Extreme SSD/Microtalks`. The database is `<root>/knowledge/coach.sqlite3`. An existing `models` directory is required; roots under `/Volumes` must be on a mounted volume. An explicit root selects the storage used by subsequent searches.
- `search_guides(query: str, limit: int = 2)` returns dictionaries containing `id`, `title`, `url`, and `text`. Text is a leading excerpt of at most 900 characters, preserving the source context; the full summary remains in SQLite. Limits are clamped to 0–8. Empty or unmatched queries return `[]`; storage or validation errors raise exceptions.
- `knowledge_status()` checks/refreshes the selected index and returns initialization metadata, or `ready=False`, `count=0`, and an `error` message.

Use focused topic queries such as `active listening`, `privacy refusal`, or `deescalation`. Queries are normalized into quoted Unicode tokens, with common stopwords removed. All remaining terms must match: there is no broad fallback for unrelated queries. Title and tag matches receive higher BM25 weights than prose. This is lexical topic retrieval, not semantic retrieval of entire transcripts.

Source changes trigger a SHA-256-based transactional rebuild. Initialization is thread-safe and each request uses its own SQLite connection. The database uses DELETE journaling for removable storage. No models are loaded or changed.

Run the isolated tests from the project root:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p test_coaching_knowledge.py -v
```

Use the notes to suggest context-sensitive options. They do not validate an automated scoring system or provide therapy. Respect refusals and voluntary sharing; allow a conversation to end. Supporting sadness need not produce a positive mood. Someone receiving anger has no obligation to tolerate abuse. Fillers, pauses, and vocal pitch alone cannot establish competence, intent, emotion, or diagnosis.
