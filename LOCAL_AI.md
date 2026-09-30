# Local AI installation and measured tests

Installed and tested **September 22, 2026** on this machine. These are real local measurements, not model-card throughput estimates.

## Current experience: animal cast, live voice, memory, and local references

The current website adds:

- Maya the dog, Leo the fox, and Sam the owl, with consistent fictional biographies and speaking styles. The fox defaults to British `bm_fable` at 0.96 speed; `bm_daniel` and `bm_george` are available as previews. Maya uses `bf_emma` with `bf_isabella` as an alternative; Sam uses `bm_george` with `bm_daniel` as an alternative. All use the British phonemizer. The owl has corrected two-part beak articulation.
- Eight lessons in four illustrated biomes, including de-escalation and supporting sadness.
- Up to six local learner turns. Direct personal hostility or a clear goodbye ends the conversation immediately; the model can also choose a natural earlier exit. Situation-directed swearing is not automatically treated as an insult.
- Structured character state: mood, ending status/reason, and retained verbatim quotes with verified speaker provenance. Each request still includes the full current-session transcript. New sessions start fresh.
- **Live practice:** whole-reply voice playback, automatic microphone handoff, periodic read-only Whisper partial transcripts, pause-based submission, and no replay/edit of submitted Live attempts. Pause thresholds: 1.2, 1.6, or 2.4 seconds. Twenty seconds with no detected speech pauses the session; 45 seconds caps one recording.
- Per-response ratings and separate approximate pace, pitch-range, and filler observations. New local turns earn 15 participation XP; repeated detected fillers in Live practice can deduct at most three. Pitch range never creates an emotion or personality diagnosis and does not deduct points.
- An eight-guide SQLite FTS5 coaching library, implemented by a separate subagent. Original summaries and links are in `knowledge/guides.json`; the database is on the SSD at `knowledge/coach.sqlite3`. Relevant notes are included in the grading prompt, and retrieved references appear in the UI.

### Verified voice and behavior checks

All three fox voice options generated finite, unclipped 24 kHz audio. Whisper transcribed the same test sentence without normalized word errors for all three; peaks were 0.386, 0.512, and 0.349. This checks intelligibility and waveform integrity, **not subjective voice attractiveness or television-quality performance**. Audition them with **Hear Leo** before starting.

A real-model conversation recalled “Alex” and “law” after intervening conversation. In separate real calls, the frustrated character stayed annoyed and the sad character stayed sad after a supportive first response. Insults and farewells returned an ended state immediately. See SSD `results/live-feature-check.json` and `fox-bm_*.wav`.

Both real-service browser checks passed: the manual local voice flow, and hands-free capture → pause endpoint → Whisper → Qwen → Kokoro → immutable review. Tests use prerecorded/synthesized microphone input, not the user's physical microphone. A deterministic browser check also verifies that early endings stop the microphone loop and that a single-turn Live session survives reload.

Endpoint detection currently uses a conservative sustained-energy/pause detector. Background speech or loud continuous noise can confuse it. Partial transcription is chunked local recognition (about every few seconds), not token-by-token streaming. Local model inference still creates response delays. The app listens on the learner's turn rather than providing full-duplex barge-in. Physical-room and subjective listening tests remain important.

## Current website update: 9B and live move ratings

The website now defaults to **`qwen3.5:9b`**, installed on the same SSD. The original 4B weights are retained for comparison but are no longer the website default. Ollama reported about **5.5 GB** of GPU-backed allocation for 9B at 4K context. System swap was approximately **8.8 GB** during the updated tests with other desktop applications running; this is not an isolated model-memory measurement. The installer still limits the server to one resident language model.

The original quality tests exposed weak writing, and the first local integration also lacked per-response ratings. Both were addressed:

- Shorter, more literal character instructions and the larger model; seven generated replies across introductions, a stressed classmate, and a reserved photography conversation were inspected. They were coherent, but this is not independent human validation and occasional generic or awkward phrasing remains possible.
- The grader is now an external reviewer receiving explicitly labelled `PARTNER_CUE` and `LEARNER_REPLY`, instead of inheriting the actor's chat roles. This corrected the observed error where a respectful topic change was called a boundary violation.
- Evidence matching tolerates typographic quote/apostrophe differences only, then returns the original verbatim transcript substring. Changed words or invented evidence remain rejected.
- Nine development grading examples produced grounded quotes after these changes. Ratings distinguished appropriate responses from boundary pressure and dismissal; severity labels still varied, so this is not a validated accuracy score.
- Each reply is graded automatically after the actor responds. The UI shows pending, completed, and unavailable states without disabling the next reply. Final review reuses those results rather than rerunning them.

New development records: SSD `results/dialogue-quality-9b.json`, `dialogue-quality-9b-grading-v2.json`, and `dialogue-quality-9b-grading-v3.json`. The live browser test passed with 9B, real Whisper/Kokoro execution, and a visible first-turn rating before the next reply. Typical grading calls in this small development run took **6–8 seconds**.

Set `MICROTALKS_MODEL` before starting the web server to select another already-installed model deliberately. The UI reads the active model from health/turn responses.

**The installation table and original benchmark numbers below describe the earlier 4B baseline**, retained as a historical comparison.

## Installation

**SSD root:** `/Volumes/Extreme SSD/Microtalks`

Host: MacBook Air, Apple M4, 10-core CPU, **24 GB unified memory**. External drive: 2 TB USB SSD, ExFAT, approximately 1.37 TB available before setup. Its allocation unit is 1 MiB, which makes directories containing many small files occupy more physical space than their logical byte size.

| Component | Installed artifact | Location relative to SSD root |
| --- | --- | --- |
| Conversation / experimental rubric grading | Ollama `qwen3.5:4b`, Q4_K_M, downloaded package about 3.4 GB | `models/ollama/` |
| Transcription | Whisper `small.en`, approximately 466 MiB | `models/whisper/ggml-small.en.bin` |
| ASR runtime | whisper.cpp, tag `v1.9.4`, commit `927cfce34f31707e17f2bff35c349632fb9e2c3a`; static build with Metal and Accelerate | `runtime/whisper.cpp/build/bin/whisper-cli` |
| Voice synthesis | Kokoro v1.0 ONNX and v1.0 voice pack from the `model-files-v1.1` distribution | `models/voice/` |
| Voice runtime | Python 3.12.13 environment; `kokoro-onnx==0.6.1`, `onnxruntime==1.30.0`, `soundfile==0.14.0`, `numpy==2.5.3` | `runtime/voice-env/` |
| Download cache / temporary data | uv cache, reserved HF cache, temporary directory | `cache/`, `tmp/` |
| Benchmark artifacts | Timings, generated WAV files, transcripts and logs | `results/` |

The existing Ollama **0.34.0** application and existing Python 3.12 base installation are reused. Model weights, the voice environment's installed packages, source/build files, and download caches are on the SSD. `venv --copies` and uv copy mode avoid ExFAT symlink/hardlink issues. No drive formatting was needed.

Dedicated local Ollama endpoint: **`http://127.0.0.1:11435`**. The pre-existing Ollama server on port 11434 and other model directories are separate.

Model digest:

```text
2a654d98e6fba55d452b7043684e9b57a947e393bbffa62485a7aac05ee4eefd
```

Test configuration: non-thinking mode, 4,096-token context, one loaded model, one request at a time. Actor temperature 0.7, judge temperature 0. Kokoro used CPUExecutionProvider with four inference threads. Whisper used Metal and four CPU threads, beam/best-of set to one.

## Disk and memory observations

`du -sh` reported approximately **12 GiB allocated** for the complete SSD directory, including roughly 4.0 GiB models, 6.0 GiB runtime/source/build/environment, and 2.4 GiB cache. Values are independently rounded. ExFAT's 1 MiB clusters inflate small-file footprints. These are allocated-size measurements, not download sizes.

The drive still had about **1.2 TiB free** after setup. Internal free space was about **21 GiB**, compared with roughly 24 GiB at setup time. Model files were written to the SSD, but macOS swap still uses the internal disk.

Ollama reported **3,144,910,109 bytes (~2.93 GiB)** of model allocation, entirely GPU-backed, at 4K context. This is Ollama's reported allocation, not a full measurement of all system memory. The voice benchmark Python process peak RSS was **0.58 GiB**; it excludes Ollama and Whisper child-process memory.

System swap usage rose from approximately **2.9 GB to 6.4 GB** over the install/testing session with the user's other applications running. This was not an isolated workload, so the change cannot be attributed exclusively to the models. It is nevertheless a reason to keep one LLM resident and avoid assuming the larger 9B stack would be equally responsive under the same workload.

The model was explicitly unloaded after testing; the dedicated server remains available but holds no model weights in memory. The Python benchmark processes have exited.

## Measured performance

| Measurement | Result | What it includes |
| --- | --- | --- |
| Cold actor request, revised prompt | **7.45 s** total, **6.22 s** to first content | Model load, prompt processing, full reply; reported load alone 5.21 s |
| Warm actor reply median, revised prompt | **1.56 s** | Five warm requests, short replies |
| Warm time to first actor content | **0.63 s median** | Same five warm requests |
| Warm actor generation | **25.5 tokens/s median** | Ollama's generation count/duration |
| Rubric grading median | **4.08 s** | Twelve short structured JSON responses |
| Kokoro initialization | **0.96 s** | ONNX model and voice pack loading |
| Warm Kokoro whole-utterance synthesis | **1.08 s median** | Three warm outputs, around 4–6 s audio |
| Warm Kokoro real-time factor | **0.24 median** | Generation time / generated audio duration; lower is faster |
| First Whisper call | **16.13 s** | Fresh process/model and first Metal initialization; not representative of subsequent calls |
| Subsequent Whisper calls | **0.51–0.56 s** | Three synthetic clips and an 11 s recorded JFK clip; each call launches/reloads the CLI, with warm OS/Metal caches |
| Serial audio → text → actor → complete audio | **5.81 s** | A separate combined test: ASR 1.20 s, actor 1.96 s, TTS 2.64 s plus small overhead |

The combined test warms the LLM and TTS before measuring. It uses a synthetic recorded input, excludes recording duration and playback, and waits for the entire actor response and entire audio file. It is **not** a streaming first-audio latency measurement. Device temperature and the concurrent desktop workload were not controlled. No p95 or multi-user capacity claim is supported by this small sample.

## Quality results: useful for conversation, not ready for authoritative grading

### Conversation

Six actor requests per pass exercised three personalities and polite exits. Responses stayed short and generation ran successfully, but inspection found continuity and naturalness problems:

- Initial prompts sometimes produced comments about a lecture that had not started, or changed the character's first week into their second.
- Explicit scene facts improved those errors in the development rerun.
- The revised actor still repeated a question the user had already answered, produced a confusing roommate sentence, and invented an odd plan to stand outside when class started.

The 4B model is suitable for the next conversation experiment, but needs better examples/state handling and comparison with a stronger model before claiming realistic personas.

### Rubric grading

Six hand-authored smoke cases were repeated twice: a warmly phrased boundary violation, a respected boundary, negative-worded empathy, upbeat dismissal of distress, a short appropriate goodbye, and a specific follow-up. Expected labels were written by the implementation author; these are **not independently double-labelled or held-out data**.

| Check | Baseline | Clarified-rubric development rerun |
| --- | --- | --- |
| Parseable expected JSON fields/enums | 12/12 | 12/12 |
| Both rating and boundary match hand-authored expectation | 4/12 | **8/12** |
| Exact contiguous evidence quote | 0/12 | **8/12** |
| Same rating/boundary across repeats | 6/6 cases | 6/6 cases |

The baseline labelled every boundary `respected`, including an explicit violation, even when its own explanation described the violation. Explicit definitions fixed the boundary field in all six development cases. However, the revised grader under-rated a respectful topic change and a good specific follow-up. It also changed curly apostrophes in some evidence quotes. Repeatability is not correctness.

**Recommendation:** use this as an actor baseline and experimental coach only. Require evidence validation and an uncertainty path. Do not replace the app's authored ratings with this judge yet. No sentiment classifier or dedicated reward model has been installed. A classifier/reward-model comparison remains future work; positive sentiment alone would not solve the observed semantic failures.

### Voice

Four clean Kokoro-generated utterances and whisper.cpp's recorded JFK sample produced **zero normalized word errors on these five samples**. Normalization ignores case/punctuation. This tiny, mostly synthetic test does not establish accuracy for live microphones, accents, noise, or spontaneous speech.

The synthetic filler clip preserved `Um`, `uh`, and `Like`, but punctuation changed. That is particularly relevant to the POC's punctuation-based filler-`like` heuristic: it would miss some spoken fillers. Reliable delivery grading still needs actual disfluent recordings and context-sensitive detection.

Generated audio passed finite/non-silent/sample-duration checks. No subjective listening evaluation was performed by the agent; listen to the examples yourself before choosing voices. The British voice `bm_george` was tested using the same `en-us` phonemizer setting as the other voices; language/accent configuration deserves a separate listening check.

## Use it

**The website is now connected.** Run `bash scripts/start-local-web.sh` from the project and open **http://127.0.0.1:8765**. Choose **Try local AI** to use generated Qwen replies, local Whisper transcription, Kokoro playback, and optional experimental grading. The original guided lessons remain available separately.

The local web launcher checks/starts the dedicated Ollama endpoint, builds the frontend, and runs the Python web/API server on port 8765. If it reports that port 8765 is already in use, the website service may already be running. Use the existing URL rather than starting another copy.

Local AI uses an authored opening followed by generated replies, with up to six learner turns or an earlier ending. Grade requests run after **each learner response**, evaluating only the context through that response, independently of the actor's subsequent reply. Feedback must include grounded evidence or the move remains unrated. XP is participation-based (15 per new reply), with the separate capped repeated-filler rule for Live voice. No sentiment classifier has been added.

Audio recording uses browser AudioWorklet and native resampling to mono 16-bit 16 kHz WAV. Whisper's temporary audio/transcripts are written under the SSD's `tmp/` and removed after transcription. Kokoro WAV responses are generated in memory. UI requests use bounded input sizes and loopback-only endpoints. Completed conversation history remains in browser localStorage.

The live browser integration test passed with a simulated microphone backed by the installed voice test clip. It exercised microphone capture, PCM encoding, Whisper, generated Qwen turns, actual browser Kokoro playback, and all three coaching requests. Physical microphone and subjective audio quality still need the user's manual check.

From the project directory, start the dedicated server if it is not already running:

```sh
bash scripts/start-local-ai.sh
```

The script validates that the model directory exists on the mounted SSD, sets the model location, uses port 11435, limits concurrency, and disables Ollama cloud access. It runs in the foreground; Ctrl+C stops that server. An “address already in use” error usually means the dedicated server is already running. Do not launch another copy.

Check the installed/loaded models:

```sh
OLLAMA_HOST=127.0.0.1:11435 ollama list
OLLAMA_HOST=127.0.0.1:11435 ollama ps
```

Run the current benchmark scripts:

```sh
bash scripts/benchmark-local-ai.sh text
bash scripts/benchmark-local-ai.sh voice
bash scripts/benchmark-local-ai.sh roundtrip
```

Run them sequentially to avoid distorting timing. The `roundtrip` mode expects the sample created by `voice`. Re-running replaces the corresponding result files; the original baseline `text-benchmark.json` is retained, while current text tests write `text-benchmark-v2.json`.

Listen to the generated reply:

```sh
afplay "/Volumes/Extreme SSD/Microtalks/results/roundtrip-reply.wav"
```

Other voice samples: `voice-maya.wav`, `voice-leo.wav`, `voice-sam.wav`, `voice-fillers.wav` in the same results folder.

Unload the model without deleting it:

```sh
curl http://127.0.0.1:11435/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen3.5:9b","keep_alive":0}'
```

Keep the SSD mounted while running inference. If its volume name changes, set `MICROTALKS_AI_DIR` to the new root before using the scripts; the Python environment may need recreation if embedded interpreter paths change. This installation reuses the host's existing Python base and Ollama executable, so it is not a fully portable environment for other computers.

## Sources and artifacts

- [Qwen3.5 Ollama distribution](https://ollama.com/library/qwen3.5)
- [Whisper model distribution](https://huggingface.co/ggerganov/whisper.cpp)
- [Whisper.cpp v1.9.4](https://github.com/ggml-org/whisper.cpp/releases/tag/v1.9.4)
- [Kokoro ONNX runtime and model links](https://github.com/thewh1teagle/kokoro-onnx)
- Full local records: SSD `results/text-benchmark.json`, `text-benchmark-v2.json`, `voice-benchmark.json`, `roundtrip-benchmark.json`, WAV files, and Whisper/Ollama logs.
- Broader model/classifier research and SSD cache notes: `MODEL_RESEARCH.md`.
