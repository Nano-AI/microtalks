# ASR candidates: local benchmark

Tested September 22, 2026 on the Apple M4 / 24 GB machine, using the external ExFAT SSD at `/Volumes/Extreme SSD/Microtalks`. Background desktop/server load was uncontrolled.

## Recommendation

Try `base.en` with the transcript-style prompt below as an optional latency experiment. Its warm CLI medians on the three short clips were 0.521–0.586 seconds, versus 1.011–1.128 seconds for the existing unprompted `small.en`. The smaller model needs microphone testing before adoption: unprompted `base.en` omitted substantial text on the artificial long fixture. Prompting corrected that fixture in all three repetitions.

This experiment does not resolve the user's missing human `um`/`ah` complaint. Both models already retained the short synthetic clip's `um` and `uh`. There were no positive `ah` or `erm` samples. Prompting `small.en` offered no measured word-retention benefit here; carry-initial-prompt added no accuracy benefit over a plain prompt for either model.

The disfluency-trained JacobLinCool model remains an untested candidate requiring separate conversion work. Approval for a conversion environment and its dependencies is the next step if that model is pursued.

## Artifact check

HF API queries inspected the target's complete file listing and searched `whisper-large-v3-turbo-verbatim`, `verbatim-1`, and `verbatim` filtered by `ggml` / `gguf`:

- [Target metadata, including file hashes](https://huggingface.co/api/models/JacobLinCool/whisper-large-v3-turbo-verbatim-1?blobs=true): revision `c7430ca44055c70c9a13d6bcfcdf62baa3cb2902`; `model.safetensors` is 1,617,825,448 bytes. Published SHA256: `ad88d481ecb23aefe3adaeb491fdc2bea7852f80c673e5f69c18d9ab3ce62a01`. Transformers full weights are present. No Whisper.cpp weights are listed.
- [Name search](https://huggingface.co/api/models?search=whisper-large-v3-turbo-verbatim&limit=100) found the target and its LoRA adapter, plus unrelated Welsh/Estonian models. The Estonian GGML result is not a conversion of this English fine-tune. [GGML filter](https://huggingface.co/api/models?search=verbatim&filter=ggml&limit=100) and [GGUF filter](https://huggingface.co/api/models?search=verbatim&filter=gguf&limit=100) returned empty lists. These bounded searches did not establish an available compatible conversion; differently named or untagged repositories could be missed.
- The target's published WER is 7.7269 on `ami-disfluent`. Its card names `verbatim-3-lora` internally despite the repository name. Neither WER nor that name establishes filler-event reliability. See `FILLER_RESEARCH.md` for the training/evaluation caveats.
- [Whisper.cpp artifacts](https://huggingface.co/api/models/ggerganov/whisper.cpp?blobs=true) provide a compatible `ggml-base.en.bin`. Only this single new weight file was downloaded. It is ordinary English Whisper, without disfluency-specific fine-tuning.

The target safetensors file was not downloaded. No PyTorch, Transformers, HF client, or other dependency was installed. Published target hash above is metadata only; the two GGML hashes below were verified locally against HF metadata.

| Model | Exact SSD path | Bytes | SHA256 |
|---|---|---:|---|
| Existing small.en | `/Volumes/Extreme SSD/Microtalks/models/whisper/ggml-small.en.bin` | 487,614,201 | `c6138d6d58ecc8322097e0f987c32f1be8bb0a18532a3f88f734d1bbf9c41e5d` |
| New base.en | `/Volumes/Extreme SSD/Microtalks/models/whisper/ggml-base.en.bin` | 147,964,211 | `a03779c86df3323075f5e796cb2ce5029f00ec8869eee3fdfb897afe36c6d002` |

New download: 147.964 MB / 141.110 MiB. Source revision for both matching GGML artifacts: `ggerganov/whisper.cpp@5359861c739e955e79d9a303bcbc70fb988958b1`. [Pinned base.en download](https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-base.en.bin).

## Method

`scripts/benchmark_stt_candidates.py` runs each model/configuration sequentially: one first-observed call on the filler clip, then three repetitions of all four fixtures. Total: 78 successful CLI invocations. It records exact commands, transcripts, SHA256s, exit codes, Metal-backend evidence, per-run Whisper timings, and wall-clock durations in `results/stt-candidates.json` on the SSD. Individual logs/transcripts and generated 16 kHz fixtures are under `results/stt-candidates/`.

Whisper.cpp source checkout: `927cfce34f31707e17f2bff35c349632fb9e2c3a`. Executable: `runtime/whisper.cpp/build/bin/whisper-cli` under the SSD root; its binary SHA256 is in the JSON. Four threads, English, beam size one, best-of one, temperature zero, temperature increment 0.2, default fallback enabled, GPU/flash attention defaults enabled. VAD and suppression options were not enabled. Each call starts a new process and reloads the model.

The first-observed column is a cold-start proxy only. Model hash verification reads the weights before inference, and previous OS/Metal caches were not flushed. Later configurations reuse those caches. Warm means repeated fresh CLI processes, not a resident-model service. Wall time includes startup, loading, transcription, output, and process exit; audio preparation and hashing are excluded. Per-stage `load`, `encode`, `decode`, `prompt`, and other CLI timings remain in the JSON. Timing variability and sequential model order prevent a precise causal speedup estimate. Three repetitions do not establish p95 latency.

Fixtures:

| Fixture | Seconds | Reference provenance |
|---|---:|---|
| `voice-fillers.wav` | 3.975 | Existing Kokoro `af_heart`; intended text: “Um, I, uh, got lost. Like, I walked into the wrong lecture.” |
| `voice-maya.wav` | 4.315 | Existing Kokoro `af_heart`; intended text: “Hey, is this the psychology lecture? I got lost finding the building.” |
| `asr-jfk-16k.wav` | 11.000 | Existing recorded JFK sample; reference from the earlier benchmark |
| Concatenated fixture | 41.158 | `(fillers + 1s silence + maya + 1s silence) × 4`; exercises multiple decode windows |

The original WAVs were read and hashed. Synthetic originals were linearly resampled from 24 kHz to 16 kHz, matching the earlier smoke benchmark's method. No new voice synthesis was needed. The repeated long fixture is an artificial stress case; it cannot estimate natural long-speech accuracy. TTS input text provides intended references rather than listening-verified acoustic labels. None of these recordings is a new human microphone evaluation.

## Results

Seconds below are CLI startup + transcription + exit. Warm columns are medians of three runs per fixture.

| Candidate | First observed, filler | Warm filler | Warm Maya | Warm JFK | Warm 41s fixture |
|---|---:|---:|---:|---:|---:|
| small.en default | 0.910 | 1.100 | 1.011 | 1.128 | 2.344 |
| small.en prompt | 1.383 | 1.241 | 0.990 | 1.289 | 2.098 |
| small.en prompt + carry | 1.475 | 1.398 | 1.120 | 1.031 | 3.057 |
| base.en default | 1.372 | 0.521 | 0.497 | 0.589 | 0.695* |
| base.en prompt | 0.809 | 0.586 | 0.521 | 0.581 | 1.213 |
| base.en prompt + carry | 0.564 | 0.403 | 0.459 | 0.572 | 1.483 |

\* Unprompted base.en's long-fixture output was incomplete, so its low duration is not a successful transcription speed result.

All six configurations had 0% normalized WER on the three short fixtures in every repetition. Each retained the filler clip's one `um` and one `uh`, with no `ah` or `erm` insertion. Maya and JFK produced no counted fillers.

| Long fixture | `um` retained | `uh` retained | Full WER | Regular-word WER |
|---|---:|---:|---:|---:|
| small.en, all configurations | 4/4 | 4/4 | 0% | 0% |
| base.en default | 2/4 | 0/4 | 58.33% | 56.82% |
| base.en prompt or prompt + carry | 4/4 | 4/4 | 0% | 0% |

These results were identical across repetitions after normalization. WER uses lowercase word tokens with punctuation ignored and apostrophes removed. Regular-word WER removes only `um`, `uh`, `erm`, and `ah` from both reference and hypothesis before alignment; lexical `like` remains a regular word. Filler retention uses exact token counts capped at the reference count. The JSON separately records excess counts. This measures count agreement; event precision/recall and timing require human-labelled audio. `ah`/`erm` retention is explicitly null because there are no positive references.

## Reproduce

Run the complete benchmark from the project directory using the existing environment:

```bash
"/Volumes/Extreme SSD/Microtalks/runtime/voice-env/bin/python" \
  scripts/benchmark_stt_candidates.py --repeats 3
```

It makes no downloads and verifies the expected model hashes before running. Use `--models small.en` for only the installed baseline. Reruns overwrite this benchmark's own JSON, fixture, transcript, and log files. It does not import application modules.

Exact optional base.en prompt experiment on the generated filler fixture:

```bash
"/Volumes/Extreme SSD/Microtalks/runtime/whisper.cpp/build/bin/whisper-cli" \
  -m "/Volumes/Extreme SSD/Microtalks/models/whisper/ggml-base.en.bin" \
  -f "/Volumes/Extreme SSD/Microtalks/results/stt-candidates/fillers-16k.wav" \
  -l en -t 4 -bs 1 -bo 1 -tp 0 -tpi 0.2 -nt \
  --prompt "Um, I was, uh, thinking about it. Ah, let me start again. I, I think we could go tomorrow, um, if that works for you."
```

Add `--carry-initial-prompt` to reproduce the carry variant. Remove `--prompt` and its text for the default variant. Substitute `ggml-small.en.bin` for the small-model comparison. The JSON contains the full measured commands including `-otxt -of` output paths.

Verification included actual execution of all six configurations, SHA256 checks for both models, and separate metric assertions covering filler deletion, insertion, absent-reference null handling, punctuation normalization, and regular-word substitution. Application UI/backend integration and conversation-model inference were outside this benchmark.
