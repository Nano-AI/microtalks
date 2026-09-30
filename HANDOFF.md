# Microtalks — project handoff

**Start here.** This document records the latest product requirements and actual implementation state at handoff. It supersedes older README instructions wherever those still describe separate guided/text/local-AI modes.

Project: `/Users/grootbeat/Documents/microtalks`  
Hardware: **MacBook Air, Apple M4, 10-core CPU, 24 GB unified memory**  
Model/runtime storage: `/Volumes/Extreme SSD/Microtalks`  
Related assessment: **[`LAYA_EVALUATION.md`](LAYA_EVALUATION.md)**

## 1. Critical current status

**The SSD was safely ejected at the user's request.** The Microtalks Python server on port 8765 and dedicated Ollama server on port 11435 were stopped before ejection. No model installation, download, or inference was performed for this handoff. Do not create directories under `/Volumes/Extreme SSD` while the physical drive is absent.

**The source is midway through a refactor and is not ready to build.** The last built `dist/` represents the older, working-but-rejected split experience. A previously passing test suite does not establish that the current source works.

Concrete break, verified from the internal project files:

- `src/LocalConversation.tsx` was moved to **`src/Conversation.tsx`**.
- New exports: **`LessonSetup`**, **`Conversation`**, **`PracticeRun`**.
- `LessonSetup` now accepts the selected `lesson`, starts with `lesson.partner`, shows the correct target, and labels its CTA **Start lesson**.
- **`src/App.tsx` still imports `LocalConversation` / `LocalSetup` from the removed path.** It also still defines the old guided `Briefing` and `Conversation` functions.
- Both `App.tsx` and the renamed component still contain text/manual practice branches. The latest user instruction is to remove those.
- Tests and docs still contain old entry-point names and assumptions. Update them as part of the refactor; do not restore rejected features just to satisfy obsolete tests.

There were no requested commits or PRs. Files are saved locally. See `PAUSED.md` for the shorter pause snapshot.

## 2. What the product is supposed to be

A playful, Duolingo-like website for practising small talk and micro social skills, initially in university situations. Each lesson gives a specific target, introduces a fictional animal partner, and lets the learner practise a believable conversation. Chess-inspired feedback identifies good connections, missed cues, mistakes, and recoveries.

The product should reward responsive conversation rather than clever scripts, universal positivity, appeasement, or one extroverted personality style.

### Latest user requirements — authoritative

1. **Every lesson uses AI.** The map, biome cards, practice library, progress page, and review actions must all launch the same live AI lesson. Preserve the lesson the user clicked. Remove **Try local AI** as a separate destination and remove the authored fallback experience.
2. **Every lesson is live voice only.** Remove text entry, text mode, editable voice drafts, and the manual record → inspect → send workflow. No per-turn edit/revert/replay. Pause/resume, microphone retry, ending a session, read-only review, and starting a new attempt are appropriate controls.
3. **Words appear as the partner says them.** Do not show the full upcoming reply in the bubble, an expandable transcript, accessibility labels, or a hidden selectable text layer before it is spoken. A paused audio player must pause the reveal.
4. **Automatic turn handoff.** Listen when appropriate, show read-only recognition, detect the end of a spoken turn, submit automatically, and speak the next reply. The user wants flow, not repeated button presses.
5. **Barge-in / cutting someone off.** Detect learner speech while the partner is talking, stop or pause the partner's audio, and represent the interruption in the conversation. A supportive “mm-hm” is not automatically rude. Future model context must distinguish what the learner actually heard from the unheard remainder of the generated reply.
6. **Better filler handling.** The user reports that Whisper omits ums and ahs. Do not interpret an empty filler count as proof of fluent audio. They want filler feedback/penalties, but the detector must be evaluated for missed and invented events.
7. **Lower latency.** The user finds responses too slow. Measure ASR, actor generation, TTS, grading contention, and first audible response separately. Installing a faster classifier or ASR does not by itself fix the whole pipeline.
8. **Realistic personalities and consequences.** Partners remember the current scene, have consistent facts and styles, respond to disrespect, and can leave early. Swearing about a frustrating situation is different from insulting the partner.
9. **Emotional practice.** Include de-escalation and supporting sadness. A good reply need not instantly make an upset character happy. Maintain boundaries rather than reward accepting abuse.
10. **Animal/forest identity.** Dog, fox, and owl cast; British fox voice with understated storybook wit; corrected owl beak; habitat progression rather than a food-chain social hierarchy.
11. **Grounded coaching.** A local reference library should support analysis and expose sources. The user requested delegation of this work; that research and SQLite implementation are already completed.

## 3. What was working before the unfinished refactor

| Area | Implemented state | Important limit |
|---|---|---|
| UI | Responsive React/Vite app, light/dark themes, animal graphics, four biomes, eight lessons | The built UI still has the rejected guided/local split |
| Dialogue | Qwen3.5 9B through a dedicated Ollama server | Can still produce awkward, generic, or inconsistent replies |
| Persona/state | Fixed biographies and scene facts, full session transcript, current mood, verified memory quotes | No cross-session personal memory; extra generated state adds latency |
| Endings | Explicit personal insults and clear goodbyes use deterministic early exits; model can end naturally | Intent rules are conservative heuristics, not complete language understanding |
| Voice | Local Whisper small.en + Kokoro ONNX, British voice options, voice previews | Physical microphone quality and subjective voice appeal are not established by synthetic tests |
| Hands-free | Opt-in live loop, pause-based auto-submit, read-only partial transcripts, immutable Live attempts | Still an option beside manual/text modes; listens on learner turns, not during partner speech |
| Feedback | Per-response coaching, pending states, evidence checks, out-of-order result handling | Qwen grading shares inference capacity with the actor and remains unreliable on some judgments |
| Delivery | Transcript fillers, approximate pace/pitch range, small capped repeated-filler deduction | ASR can omit fillers; acoustic measurements do not establish emotion |
| RAG | Eight original sourced summaries, SQLite FTS5, references displayed with feedback | Small keyword-retrieval library, not a full book corpus or validated grading system |
| Persistence | Browser localStorage, six-turn local maximum, early-ending session support | Existing saved attempts include historical guided/text data; preserve them as read-only history |

### Cast

- **Maya — dog:** warm, curious, enthusiastic, with boundaries. Default voice `bf_emma`; alternative `bf_isabella`.
- **Leo — fox:** cautious at first, becomes playful around shared interests. Default `bm_fable` at 0.96 speed; alternatives `bm_daniel`, `bm_george`.
- **Sam — owl:** observant, reserved, direct. Default `bm_george`; alternative `bm_daniel`.

These are fictional character choices, not claims that all members of an animal species behave this way. Do not clone a TV actor's identity; the user requested an evocative British style.

### Lessons and biomes

| Biome | Lesson IDs | Focus |
|---|---|---|
| Meadow | `opening`, `follow` | Open a conversation; follow a specific detail |
| Woodland | `room`, `share` | Read tone; contribute without only asking questions |
| Riverside | `join`, `exit` | Join an exchange; end comfortably |
| Highlands | `deescalate`, `support` | Respond to frustration; offer support without forced positivity |

## 4. Project map

| File | Purpose / next action |
|---|---|
| `src/App.tsx` | Navigation, map/library/progress launch paths, modal setup, review/history. **First refactor target.** Remove duplicate conversation implementation and stale imports. |
| `src/Conversation.tsx` | Real-model setup, dialogue/voice loop, recording, grading, memory display. Finish conversion to one live-only experience. |
| `src/localApi.ts` | Local HTTP requests, cancellation, AudioWorklet capture, WAV encoding, periodic ASR previews. |
| `public/pcm-recorder.js` | Microphone worklet, chunk delivery, capture limit, endpoint events. |
| `public/audio-endpoint.js` | Sustained-energy/pause detector. Not neural VAD or speaker identification. |
| `src/engine.ts` | Lesson definitions, cast, biomes, progress types, legacy heuristic evaluator. Do not let the old evaluator become a runtime fallback. |
| `src/Character.tsx` | Original dog/fox/owl SVGs, expressions, corrected beak, biome scenes. |
| `src/styles.css`, `src/conversation.css`, `src/forest.css` | Existing visual system. Preserve interaction accessibility and responsive layouts. |
| `scripts/local_server.py` | Local web/API server, actor, coach, speech, transcription, health. Current `/speech` discards timing metadata. |
| `scripts/conversation_state.py` | Character canon, voice choices, scene facts, intent/ending rules, state schema. |
| `scripts/delivery_metrics.py` | Approximate acoustic and transcript-derived observations. |
| `scripts/coaching_knowledge.py` | Validated SQLite FTS5 retrieval on the SSD. |
| `knowledge/guides.json` | Eight original reference summaries with citations/tags. |
| `scripts/start-local-ai.sh` | Dedicated Ollama server, SSD model path, port 11435. |
| `scripts/start-local-web.sh` | Checks/starts Ollama, **builds frontend**, then serves app/API on port 8765. Will fail until the source import/refactor is repaired. |
| `tests/` | Browser coverage, including opt-in real-model tests. Old launch labels/modes must be replaced. |
| `scripts/test_local_server.py`, `scripts/test_coaching_knowledge.py`, `scripts/test_delivery_metrics.py` | Backend/state/RAG/delivery checks. |

## 5. Hardware, SSD, and installed models

**Do not touch the ejected drive during documentation-only work.** After reconnecting, verify its real mount path and disk identity. The old device identifier `/dev/disk10` must not be assumed valid on reconnection.

SSD: SanDisk Extreme volume named **Extreme SSD**, 2 TB, **ExFAT with 1 MiB allocation units**. Last observed free space at ejection was approximately **1.31 TB**. Small-file Python/source trees have inflated allocated disk usage on this filesystem.

### Previously verified paths under `/Volumes/Extreme SSD/Microtalks`

| Artifact | Path |
|---|---|
| Ollama model store | `models/ollama/` |
| Qwen3.5 9B | Ollama tag `qwen3.5:9b`, current default |
| Qwen3.5 4B | Ollama tag `qwen3.5:4b`, retained baseline, rejected as default for weak dialogue |
| Whisper small.en | `models/whisper/ggml-small.en.bin` — production recognizer |
| Whisper base.en | `models/whisper/ggml-base.en.bin` — installed comparison only |
| Kokoro | `models/voice/kokoro-v1.0.onnx`, `models/voice/voices-v1.0.bin` |
| Python voice runtime | `runtime/voice-env/bin/python`, Python 3.12.13 |
| Whisper CLI | `runtime/whisper.cpp/build/bin/whisper-cli`, Metal-enabled |
| RAG DB | `knowledge/coach.sqlite3` |
| Caches / scratch / evidence | `cache/`, `tmp/`, `results/` |

Ollama 0.34.0 and the base Python installation already exist on the internal disk. The dedicated server uses **11435**, separate from the user's ordinary Ollama server on **11434**. Do not rewrite global Ollama settings or touch unrelated SSD model collections.

9B's reported GPU-backed allocation was about **5.5 GB** at 4K context. Swap reached approximately **9.5 GB** with the desktop workload running; this was not isolated model-memory measurement. Avoid loading many candidate models simultaneously. The SSD adds storage, not RAM.

### Ports

- `8765`: built website + Python API, canonical local URL.
- `11435`: dedicated SSD-backed Ollama.
- `5173`: Vite development server; proxies `/api/local` to 8765.
- `4173`: old Vite preview port, not a model service.

At pause, 8765 and 11435 were stopped. Do not assume any dev/preview process remains alive.

## 6. Timing and recognition discoveries to use

### Kokoro already supplies useful timing data

The installed ONNX model exposes **`waveform` and `duration`** outputs. Installed `kokoro-onnx` 0.6.1 provides:

```python
audio, sample_rate, phoneme_timings = voice.create_timed(...)
# Timing objects: phoneme, start, end (seconds)
```

These timings incorporate trimming and inserted pauses. This was inspected directly; no new model is required to begin word-aligned reveals.

Implementation direction:

1. Add a timed-speech response carrying audio plus word onset/end records. Keep the existing WAV endpoint for generic voice auditions if useful.
2. Map phoneme spans to source words; handle punctuation, contractions, numbers, hyphenated words, and silence. Test mismatch cases instead of assuming whitespace counts always agree.
3. Drive visible words from the audio player's **actual playback clock**. Only update React state when the visible word index changes.
4. Freeze the reveal on pause, resume from the correct time, cancel on interruption, and never reveal the whole response merely because generation finished.
5. Gate active transcript/history and remembered quotes so they do not expose unheard partner content. Full read-only review after the attempt is fine.

### Whisper alternatives: measured facts

Read `ASR_RESEARCH.md` and `FILLER_RESEARCH.md` before choosing a replacement.

- Delegated benchmark ran **78 sequential CLI calls** across small.en/base.en and prompt variants.
- Short-clip warm medians in that run: small.en about **1.0–1.1 s**, prompted base.en about **0.52–0.59 s**. These include fresh CLI startup/load/decode and uncontrolled desktop load; they are not resident-service p95 values.
- Unprompted base.en failed badly on the artificial 41-second repeated fixture (**58.33% WER**, omitted much of it). A transcript-style prompt fixed that fixture in the tested repetitions.
- Both models already retained `um`/`uh` on the clean synthetic short fixture. That does **not** resolve the user's real microphone complaint. `ah` and `erm` had no positive test samples.
- **`JacobLinCool/whisper-large-v3-turbo-verbatim-1` is not installed.** Its Transformers weights were verified as a candidate, but no ready compatible GGML conversion was found. The follow-up conversion-agent call was aborted before execution when the user requested ejection.
- No conversion environment, PyTorch/Transformers installation, or converted verbatim checkpoint should be assumed to exist.

Production is still **small.en**. Do not switch to base.en solely because a short synthetic sample ran faster. Test actual spoken hesitations, clean speech with no fillers, false insertions, accents, noise, and longer turns.

## 7. Laya: promising classification experiment, not an installed replacement

The user is considering [convaiinnovations/laya](https://huggingface.co/convaiinnovations/laya). See **`LAYA_EVALUATION.md`** for source-verified details, sample questions, and an evaluation protocol.

**Recommended role:** a compact, separately resident decision model for conversation events and narrow coaching dimensions. It could remove some per-response Qwen grading work from the actor's critical path.

**It does not generate dialogue, speech, transcripts, explanations, or missing fillers.** It cannot hear emotional delivery. It does not replace Qwen, Whisper, Kokoro, or the need to measure acoustic overlap.

Important findings:

- English root: **421M parameters**, 512-token configured context; approximately 192 tokens nominally allocated to question/options, leaving roughly 320 for state depending on the rendered question.
- Author speed figures are from a **Tesla T4**, not this M4. Root single-question latency is reported as 39.5 ms; the commonly advertised 32.8 ms belongs to the multilingual checkpoint in that table.
- The author's report admits weak base zero-shot typed decisions and **held-out toxicity accuracy around 0.53 / macro-F1 0.40**. Do not replace working explicit ending rules with it on the basis of the marketing summary.
- The model card explicitly warns about overconfidence and the need for domain temperature fitting. “Proper scoring rule” training is not a guarantee of calibration on our conversations.
- Inspected SDK supports an MPS path but uses float32 on CPU/MPS; actual M4 compatibility, throughput, memory, and contention are untested.
- `choice`/`score` **`confidence` is normalized entropy**, not the probability that the selected answer is correct.
- Start with one English checkpoint and a few contextual questions. Do not preload the whole router family into this already busy laptop.

**No Laya weights or dependencies were installed for this handoff.** Research was online-only, with the SSD left ejected.

## 8. Proposed implementation order

### P0 — Restore a coherent live-only application

- [ ] Repair the renamed module import and remove the legacy guided component definitions.
- [ ] One selected lesson → one setup → one AI voice conversation. Remove the separate AI banner/state and scenario reset to lesson one.
- [ ] Remove text/manual/replay UI from new practice. Preserve historical records as read-only review; new attempts should be fresh live sessions.
- [ ] Keep the selected lesson's context, target, default animal, voice selection, mood, and sources through every launch path.
- [ ] Surface unavailable microphone/models with retry/start instructions; never silently fall back to scripted responses.
- [ ] Rewrite obsolete browser tests to assert the new product, including all eight lesson IDs and every entry path.

### P1 — Spoken-word reveal and a dependable voice state machine

- [ ] Consume native Kokoro timing data and reveal only spoken words.
- [ ] Use explicit preparing / partner-speaking / learner-speaking / transcribing / thinking / paused / ended states.
- [ ] Make pause/resume and cancellation reliable. Avoid replaying audio when an unrelated grade result updates state.
- [ ] Stop capture, timers, and queued playback when the scene ends or the user leaves.
- [ ] Preserve read-only learner recognition and handle ASR corrections without enabling user edits.

### P2 — Barge-in and faster response delivery

- [ ] Capture enough audio during partner speech to detect actual overlap; use echo cancellation and test with speakers/headphones.
- [ ] Pause/stop at a known playback timestamp and retain the actually heard partner prefix.
- [ ] Distinguish backchannel acknowledgment, clarification, enthusiasm, and hostile floor-taking. Do not subtract points solely for overlap.
- [ ] Do not place unheard facts from a cut-off reply into subsequent prompts or evidence.
- [ ] Shorten actor output/state generation and give actor work priority over nonessential coaching. Current extra JSON/memory output and shared LLM lock are real latency targets.
- [ ] Measure first audible response, warm/cold timings, and p95 under the combined workload. Publish observations rather than a “real-time” claim based only on tokens/sec.

### P3 — Evaluate better ASR and Laya independently

- [ ] Use human-labelled recordings to choose ASR/filler handling; keep the speech recognizer and conversation judge evaluations separate.
- [ ] Benchmark one Laya checkpoint on CPU, then MPS if supported, in an isolated SSD environment.
- [ ] Evaluate narrow contextual labels against human judgments and compare with the current rules/Qwen coach.
- [ ] Fit calibration/abstention on a separate validation split. Test option-order robustness and truncation.
- [ ] Integrate only demonstrated useful decisions. Use templates or deferred RAG-backed explanation for rationale; keep dialogue on the actor model.

## 9. Golden acceptance scenarios

These are observable user outcomes, not claims that they already pass in the unfinished refactor.

| Scenario | Required outcome |
|---|---|
| Click **Be there for someone** anywhere | Correct support target, animal setup, and live AI scene; no unrelated opening lesson |
| Normal lesson start | Character speaks; words appear with audio; microphone opens automatically; no text-mode switch or Send button |
| Pause mid-sentence | Audio and word reveal stop together; no hidden rest of the line appears |
| Learner introduces Alex from Bristol, studying law | Later response uses those facts correctly and does not swap them with character biography |
| “This course is fucking hard” | No automatic personal-insult exit |
| “You’re fucking stupid” | Firm character response and an actual ended state; no endless invitation to continue |
| “I need to go; see you later” | Warm immediate closure, no new question |
| Brief “mm-hm” over a partner line | Treated as possible acknowledgment, not an automatic blunder |
| Learner talks over a longer partner turn | Audio stops appropriately; interruption timing and heard prefix are preserved for contextual feedback |
| Fillers in a human recording | Count missed and invented fillers against audio labels; no claim that transcript zero equals audio zero |
| Flat pitch | A descriptive optional observation, not a diagnosis or automatic lack-of-empathy penalty |
| Coach offline or uncertain | Conversation/attempt remains usable; explicit unrated state rather than invented confident feedback |
| SSD removed / service unavailable | Honest retry/error state, no unannounced scripted/text fallback |

## 10. Resume and verification

Pure code/documentation work can continue without the SSD. For inference, reconnect it first and inspect the real mount:

```sh
ls "/Volumes"
diskutil info "/Volumes/Extreme SSD"
```

From the project directory, **after repairing the source and updating the tests**:

```sh
npm run build
npm test
PYTHONDONTWRITEBYTECODE=1 python3 scripts/test_local_server.py
PYTHONDONTWRITEBYTECODE=1 python3 scripts/test_coaching_knowledge.py
npm run test:e2e
```

The delivery test needs the SSD Python environment with NumPy:

```sh
PYTHONDONTWRITEBYTECODE=1 "/Volumes/Extreme SSD/Microtalks/runtime/voice-env/bin/python" \
  scripts/test_delivery_metrics.py
```

Start the actual services only with the mounted drive:

```sh
bash scripts/start-local-web.sh
# Website: http://127.0.0.1:8765
```

The existing opt-in live test command is a starting point; adapt it to live-only launches and word timing:

```sh
MICROTALKS_LIVE=1 npm run test:e2e -- --grep "live SSD models" --workers=1
```

Before declaring completion, run the lesson as a person would, inspect desktop/mobile screenshots, and listen to speech. A successful HTTP response, a valid WAV, or ASR reconstructing a synthetic sample does not establish pleasant prosody, realistic dialogue, or accurate social grading.

## 11. Supporting documents and evidence

- `PAUSED.md`: immediate pause state and the aborted ASR conversion request.
- `LOCAL_AI.md`: installed runtime paths, previous measurements, and historical changes.
- `MODEL_RESEARCH.md`: broader conversation/grading-model research and SSD setup.
- `ASR_RESEARCH.md`: exact ASR artifacts, hashes, commands, and measured trade-offs.
- `FILLER_RESEARCH.md`: acoustic detector/verbatim ASR research and limitations.
- `ANIMAL_DESIGN.md`: animal-behavior sources and fictional design choices.
- `knowledge/README.md`: authored summaries and SQLite retrieval contract.
- `LAYA_EVALUATION.md`: current Laya assessment and evaluation proposal.
- SSD `results/`: prior benchmark JSON, logs, voice auditions, and live fixtures. These were not reread from the ejected drive for this handoff.

**Next agent's first action:** read this document, inspect `App.tsx` and `Conversation.tsx`, and finish the live-only unification before installing another model or restarting the old split experience.
