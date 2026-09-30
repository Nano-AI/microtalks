# Filler detection for Microtalks

Research date: September 22, 2026. Primary model cards, repository metadata/configuration, vendor documentation, and the installed Whisper.cpp source were inspected. No models were installed, downloaded, or run. Deployment judgments below are estimates, not M4 benchmarks.

## Decision

There is a real, downloadable acoustic filled-pause detector: `classla/wav2vecbert2-filledPause`. It produces timed events directly from audio, so Whisper omissions do not hide those events. Its published validation covers Slovenian and four other Slavic languages; **English reliability remains unestablished**.

For English local ASR, `JacobLinCool/whisper-large-v3-turbo-verbatim-1` is a concrete experimental candidate. It has full weights and disfluent-speech training, but no published filler-specific precision/recall. Neither candidate currently justifies reliable automatic penalties in Microtalks without an English microphone evaluation. This search did not establish a well-supported, ready-to-use English acoustic filler detector with both downloadable weights and convincing filler-event validation.

First test the existing `small.en` with a transcript-style initial prompt. Treat that as an inexpensive experiment. If reliability matters more than local-only operation, Deepgram and AssemblyAI explicitly document filler-preserving transcription options, both requiring hosted API access.

## Five concrete models/resources

### 1. CLASSLA: acoustic filled-pause detection — best direct detector candidate

- Artifact: [`classla/wav2vecbert2-filledPause`](https://huggingface.co/classla/wav2vecbert2-filledPause). [Repository metadata](https://huggingface.co/api/models/classla/wav2vecbert2-filledPause?blobs=true) confirms `model.safetensors`, `config.json`, and `preprocessor_config.json`; revision `de8def4ea3c32254a78a6bfdcb34a81ae13e5663`. Weights: 2,322,082,904 bytes, approximately 2.32 GB; 580.5 million FP32 parameters. Optimizer files are training artifacts and unnecessary for inference.
- License: Apache-2.0, declared by the model card.
- Input/output: mono 16 kHz audio; `Wav2Vec2BertForAudioFrameClassification` emits binary filled-pause labels at 20 ms intervals. Consecutive positive frames become start/end events. It does not identify separate spellings such as `um` versus `uh`, nor does it classify lexical fillers such as `like`.
- Evidence: [card and inference example](https://huggingface.co/classla/wav2vecbert2-filledPause/blob/main/README.md), [authors' paper](https://aclanthology.org/2025.bsnlp-1.1/). Slovenian event precision 0.914, recall 0.973, F1 0.943. Cross-language postprocessed F1: Czech 0.874, Croatian 0.913, Polish 0.924, Serbian 0.940. The evaluation counts partial overlap with a reference event as a hit; these scores do not establish precise boundaries or English performance.
- Local viability: Transformers/PyTorch, separate from Whisper.cpp. Weight size makes a batch-size-one experiment plausible within 24 GB, with activation/runtime memory in addition. The published example uses CUDA; CPU execution is the portable starting point. Apple MPS compatibility, speed, and memory have not been verified here. No ready-made GGML/Core ML/ONNX deployment was established in the inspected repository.
- Important integration detail: training chunks were at most 30 seconds. The card's postprocessing drops short events and events at chunk boundaries. Blindly doing that in Microtalks would lose genuine opening `um`s. Evaluate contextual overlap windows and event deduplication; test boundary events separately.

Verdict: strongest research-supported acoustic option found; an English transfer experiment, not a validated English penalty engine.

### 2. JacobLinCool: English disfluent Whisper fine-tune — local ASR experiment

- Artifact: [`JacobLinCool/whisper-large-v3-turbo-verbatim-1`](https://huggingface.co/JacobLinCool/whisper-large-v3-turbo-verbatim-1). [Metadata](https://huggingface.co/api/models/JacobLinCool/whisper-large-v3-turbo-verbatim-1?blobs=true) confirms full `model.safetensors` plus processor/tokenizer/configuration files; revision `c7430ca44055c70c9a13d6bcfcdf62baa3cb2902`. Weights: 1,617,825,448 bytes, approximately 1.62 GB; 808.9 million BF16 parameters. This repository contains full model weights, rather than only a LoRA adapter.
- License: MIT declared on the model. The linked [`ami-disfluent` dataset](https://huggingface.co/datasets/JacobLinCool/ami-disfluent) declares CC-BY-4.0.
- Input/output: 16 kHz audio through a Whisper processor, with 30-second feature windows; English text output. Filler counts would depend on retained transcript tokens. Timestamps require an appropriate inference configuration and validation.
- Evidence: the [model card](https://huggingface.co/JacobLinCool/whisper-large-v3-turbo-verbatim-1/blob/main/README.md) reports fine-tuning on English `ami-disfluent` and evaluation WER 7.7269, versus 32.7209 at training step zero. It provides no filler recall, insertion rate, or live-microphone evaluation. WER cannot substitute for these measurements; normalization choices can hide filler errors. The autogenerated card also names `verbatim-3-lora` internally despite the repository's `verbatim-1` name, a documentation inconsistency worth resolving before adoption.
- Local viability: standard Transformers `WhisperForConditionalGeneration`. A local experiment is plausible on the M4, but compute/runtime memory exceeds the weight-file size. Start with a supported dtype/device combination; BF16 file storage does not prove MPS compatibility. The inspected repository contains no ready-to-load Whisper.cpp model. Conversion and output-parity checks would be separate work, not a drop-in swap of the current GGML file.

Verdict: a specific English disfluency-trained candidate worth benchmarking. True filler retention on the user's speech is unproven by the card.

### 3. Gargan07: real weights, insufficient evidence — reject for scoring

- Artifact: [`Gargan07/wav2vec2-disfluency-model`](https://huggingface.co/Gargan07/wav2vec2-disfluency-model). [Metadata](https://huggingface.co/api/models/Gargan07/wav2vec2-disfluency-model?blobs=true) confirms 1,261,938,680-byte `model.safetensors` plus processor/tokenizer files; revision `9aba7130b9fa7660aba0863bcffaf8b6e5f82243`.
- License: Apache-2.0 declared; the README contains essentially only this declaration.
- Input/output: the [config](https://huggingface.co/Gargan07/wav2vec2-disfluency-model/blob/main/config.json) identifies `Wav2Vec2ForCTC`, with vocabulary size 32; the [processor](https://huggingface.co/Gargan07/wav2vec2-disfluency-model/blob/main/preprocessor_config.json) expects 16 kHz audio. This is an audio-to-token CTC architecture, with no documented timed filler-class output.
- Local viability: approximately 315.5 million FP32 parameters, technically plausible for local Transformers inference. The card supplies no training provenance, language validation, label semantics, inference recipe, or performance results.

Verdict: the weights exist, but the word `disfluency` in the repository name is insufficient evidence. Do not recommend it as a working filler detector.

### 4. Deepgram Nova-3 + `filler_words=true` — explicit retention, hosted API

[Primary documentation](https://developers.deepgram.com/docs/filler-words) specifies `POST /v1/listen?model=nova-3&filler_words=true`, with an API key and uploaded audio. It documents English support and lists Nova/Nova-2/Nova-3 general models. Use the explicitly documented Nova configuration; the page's Flux badge does not resolve its more restrictive model-support prose.

Input is audio, output is transcription JSON. Supported retained spellings are `uh`, `um`, `mhmm`, `mm-mm`, `uh-uh`, `uh-huh`, and `nuh-uh`. Without the flag, `uh` and `um` are stripped for readability. `ah` is absent from this documented list, so evaluate it explicitly rather than promising coverage.

This is a proprietary hosted service under provider terms, requiring credentials, network access, and service billing. No local weights are supplied by this resource. The docs cover prerecorded and Nova streaming use. It offers documented filler retention, not a published guarantee of accurate penalty counts.

### 5. AssemblyAI + `disfluencies: true` — explicit retention, hosted API

[Primary documentation](https://www.assemblyai.com/docs/pre-recorded-audio/filler-words) explicitly says filler words such as `uh` and `um` are removed by default and preserved when `disfluencies` is true. The inspected page lists `universal-3-5-pro` and `universal-2` support.

The documented workflow uploads audio to `/v2/upload`, submits its URL and `disfluencies: true` to `/v2/transcript`, then polls for transcript JSON. It requires an API key. This resource documents prerecorded transcription; do not assume the same parameter works in a separate streaming product.

Proprietary hosted service under provider terms, with network/API costs and no downloadable local weights established here. Suitable as a post-turn evaluation comparator. Neither complete `ah` coverage nor filler-event error rates are demonstrated by this page.

## Whisper initial prompting: what is verified

OpenAI's [Whisper prompting guide](https://cookbook.openai.com/examples/whisper_prompting_guide) says prompts establish transcript style, do not behave like GPT instructions, and are “not especially reliable.” The [speech-to-text documentation](https://platform.openai.com/docs/guides/speech-to-text) includes filler preservation among prompting uses. These are API documents; they establish a technique, not measured effectiveness for local `small.en`.

The installed `examples/cli/cli.cpp` confirms `--prompt` and `--carry-initial-prompt`, with a maximum initial prompt of `n_text_ctx/2` tokens. Standard Whisper's text context is 448 tokens, yielding 224; tokenization differs between English-only and multilingual models. The CLI also exposes `--suppress-nst` and `--suppress-regex`. Neither is a verbatim switch.

`scripts/local_server.py:282–283` currently invokes English `small.en`, four threads, beam size one and best-of one, with no initial prompt and no explicit suppression flags. A useful first test is a short example transcript containing hesitation and repair:

```text
Um, I was, uh, thinking about it. Ah, let me start again. I, I think we could go tomorrow, um, if that works for you.
```

That is a proposed style example, not a known optimal prompt. An instruction such as “Transcribe verbatim and include every filler” is a weaker fit for Whisper's prompting mechanism.

### Controlled tests using the already-installed model

Run these later on identical, human-labelled recordings, without changing app behavior during evaluation:

1. Current settings, no prompt.
2. Same settings with the example supplied through `--prompt`.
3. Prompt plus `--carry-initial-prompt` for clips crossing the model's 30-second window; compare opening versus later fillers. Independent CLI calls need their own prompt.
4. Separately compare beam size one versus five. Larger search is an experiment, not evidence of better filler retention. Keep temperature/fallback settings identical and record them.
5. Compare complete utterances with the app's partial/chunked audio. Check quiet fillers near recording start/end and pause endpoints. ASR cannot recover audio discarded before transcription.

Whisper can still omit fillers, change repairs, or insert prompted words. More `um` tokens alone do not prove improvement. Neither word timestamps nor forced alignment recovers a filler that was omitted from the text. Replacing `small.en` with a larger ordinary Whisper model also supplies no filler-retention guarantee.

## Evaluation and penalty recommendation

Use actual microphone recordings, including spontaneous speech. The synthetic filler success recorded in `LOCAL_AI.md:134` does not establish live accuracy.

Create an English evaluation set with manually timed `um`, `uh`, and `ah`; include repeated fillers, quiet examples, accents, room noise, and events at chunk boundaries. Add negative cases: silence, breaths, laughter, elongated lexical vowels, acknowledgement `mm-hmm`, and meaningful `ah` as in “Ah, I understand.” Split tuning and held-out evaluation by speaker where possible.

Measure event precision/recall with one-to-one matching and a declared boundary tolerance, false positives per speech minute, and per-turn count error. Report each filler separately. Also measure p50/p95 post-turn latency, peak memory, and performance with Qwen/Kokoro active. Published weight sizes are not full-stack memory estimates; local notes already report substantial system swap under desktop load.

For a future local implementation, retain the conversational Whisper transcript and evaluate a parallel acoustic event path. Preserve event time, confidence/score, detector version, and category. Reconcile overlapping windows and repeated partials so one sound creates one event. Do not add acoustic counts and transcript counts without matching them first.

Recommendation: use uncertain detections as reviewable coaching observations. Base penalties only on a held-out, precision-first threshold and contextually appropriate events. Natural hesitation itself is not evidence of a failed conversational move. A zero transcript count should mean “none detected,” not “no fillers spoken.” Text-only BERT/RoBERTa disfluency classifiers and sentiment classifiers cannot reconstruct omitted audio. The inspected `hafidikhsan/whisper-base-en-disfluency` [card](https://huggingface.co/hafidikhsan/whisper-base-en-disfluency/blob/main/README.md) is also an incomplete template with no stated license or evaluation, so its name is not grounds for a recommendation.

## Interruption scoring

Acoustic overlap means two speech streams are active at once. Communicative interruption requires evidence that the learner takes or contests the floor. A brief `mm-hmm`, agreement, supportive laughter, or cooperative sentence completion may overlap without disrupting the other speaker. A floor takeover can also begin during a short pause, so overlap is neither necessary nor sufficient.

Microtalks' current local notes describe turn-gated recording, not full-duplex capture. The existing recordings therefore cannot establish how often the learner speaks during partner playback. Future measurement would require a synchronized playback reference and microphone capture during playback, with echo control so the character's audio is not mistaken for learner speech.

Keep overlap duration/onset as acoustic observations. Assess interruption separately using conversational context, whether the partner had finished, the learner's utterance and persistence, and whether the partner yields or is cut off. Backchannels deserve their own category; Deepgram even includes several acknowledgement spellings in its “filler” list. Do not map every provider-labelled filler or every overlap event directly to an XP deduction.
