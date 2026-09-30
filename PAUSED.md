# Paused at user request

For the complete current handoff, read **`HANDOFF.md`** first. The Laya assessment is in **`LAYA_EVALUATION.md`**. This file remains the original pause snapshot.

The user asked to eject Extreme SSD and continue later. On September 22, 2026, the Microtalks Python server (port 8765) and dedicated Ollama server (port 11435) were stopped. `diskutil eject /dev/disk10` returned **Disk /dev/disk10 ejected**. Do not access or recreate `/Volumes/Extreme SSD/...` until the physical drive is reconnected and verified.

## Important: the latest source changes are incomplete

The last working built website in `dist/` still has the guided/local split. The user explicitly rejected that split and subsequently requested **all lessons be live voice only**, with no text practice, manual submit flow, or separate “Try local AI” entry.

The unification was started but is **not finished or verified**:

- `src/LocalConversation.tsx` was renamed to **`src/Conversation.tsx`**.
- Its exports are now `LessonSetup`, `Conversation`, and `PracticeRun`.
- `LessonSetup` takes the clicked `lesson` prop, defaults to that lesson's partner, displays its target, and says “Start lesson.”
- **`src/App.tsx` has not been updated to the new import/export names** and still contains the legacy guided `Briefing`/`Conversation`, the separate AI banner, and text-related settings. The source build will need this resolved before running the normal build/start script.
- The renamed component still contains text/manual modes. Remove them under the user's latest instruction; every lesson should enter live microphone/TTS practice.
- Tests and docs still target old launch labels and paths. Update them with the implementation.

## Latest user requirements

1. All map, library, biome, progress, and review launch paths must start the same AI-powered lesson selected by the user. No separate AI sandbox, no silent authored fallback.
2. All lessons live voice only. Remove text entry, editable transcripts, manual record-review-send, and replay/revert. Pause/resume, finish, microphone retry, and read-only review remain useful.
3. Reveal each partner word **as audio plays**, without showing future dialogue in bubbles or the active transcript. Pause must freeze reveals. Keep the learner's recognized speech read-only.
4. Detect barge-in: learner speech during character playback should interrupt audio, with realistic character reactions and contextual coaching. A short “mm-hm” is not automatically rude. Future prompts must not assume the learner heard the rest of a cut-off reply.
5. Whisper is omitting fillers and the total response delay is too long. Measure components and avoid treating missing fillers as reliable zero counts.

## Useful timing discovery

The installed Kokoro ONNX model **does expose phoneme durations**:

- Outputs: `waveform` and `duration`.
- `kokoro_onnx.Kokoro.create_timed(...)` returns `(audio, sample_rate, list[Timing])`.
- Each `Timing` has `phoneme`, `start`, and `end` in seconds, already adjusted for trimming and pauses.
- Existing `speak()` in `scripts/local_server.py` still calls `VOICE.create`, discarding those timings.

Use native phoneme timing to map visible word onsets, rather than guessing fixed milliseconds per word. Most normal English words map to whitespace-separated phoneme groups; contractions/numbers/compound words need alignment handling. A timed-speech JSON endpoint could return WAV/base64 plus word timing records while retaining the existing WAV endpoint for voice previews.

## Latency work not yet implemented

Current Qwen3.5 9B actor generates reply plus verbose JSON state/memory quotes before audio starts. Coach requests use the same model lock and can delay an actor request. Consider compact actor output (`reply`, `ended`, `mood`), evidence-checked memory quotes extracted from the actual transcript, actor-priority scheduling, and warming on lesson launch. Do not claim these improvements are already done.

## Delegated ASR benchmark completed

Read **`ASR_RESEARCH.md`** and **`FILLER_RESEARCH.md`**.

- New SSD artifact: `models/whisper/ggml-base.en.bin`, ~141 MiB; hash/source pinned in ASR_RESEARCH.md.
- `scripts/benchmark_stt_candidates.py` and SSD `results/stt-candidates.json` record 78 sequential tests.
- Prompted `base.en` was about 0.52–0.59 s on short samples, versus small.en around 1.0–1.1 s in that run. Unprompted base.en badly omitted content on a 41-second repeated synthetic fixture; prompting restored it in those tests.
- Both models already retained `um`/`uh` on the clean short synthetic fixture. No real-user filler reliability claim is justified; `ah`/`erm` were not tested.
- `JacobLinCool/whisper-large-v3-turbo-verbatim-1` is a real candidate with Transformers weights, but no ready compatible GGML conversion was found. A follow-up conversion-agent call was **aborted before execution** when the user requested ejection. No conversion should be assumed installed.
- Production still uses **small.en**, not base.en.

## Previously working features to preserve

Animal cast (Maya dog, Leo fox, Sam owl), four biomes/eight lessons, British voice auditions, fixed owl beak, full-session history plus verified memory quotes, hostile/farewell early endings, six-turn maximum, live move ratings, separate delivery observations, and eight sourced coaching guides in SQLite FTS5 on the SSD.

Those earlier features passed the documented engine/backend/RAG and browser checks, including actual SSD voice sessions. This verification does **not** cover the current incomplete unification.

Reconnect and verify the volume before continuing. Existing startup scripts and model paths are in `LOCAL_AI.md`; build the corrected source before relaunching `scripts/start-local-web.sh`.
