# Microtalks: local model research

Research date: **2026-09-22**. Primary model cards, configurations and maintainer documentation were checked on this date. Links below identify the evidence; mutable `main` configurations and Ollama tags may change. No model inference or hardware benchmarks were performed.

Project baseline supplied by the user: Microtalks currently uses authored dialogue branches and keyword heuristics. It has no installed LLM or sentiment classifier. This document proposes future work; it does not describe implemented capabilities.

**Subsequent installation:** Qwen3.5 4B, Whisper small.en, and Kokoro were installed and benchmarked on the external SSD later on this date. See `LOCAL_AI.md` for measured results and commands. The website still uses its authored engine; no sentiment classifier is installed.

## 1. Recommended starting point

Start with **one local instruction model serving two separate roles**: a short-response character actor and a rubric-based grader with its own prompt and conversation context. Compare `qwen3.5:4b` with `qwen3.5:9b` if memory allows. Add **Hermes 3 Llama 3.1 8B** as an acting comparison; test **Gemma 4 12B** as another generalist when the machine has enough headroom. None is established here as a reliable small-talk judge.

For voice, start with **Silero VAD → Whisper.cpp → actor → Kokoro**. Run grading after the actor has produced its short reply, or during audio playback if resource contention is acceptable. Keep the existing authored scenarios as a baseline and fallback.

Sentiment alone cannot grade appropriateness. A useful score needs the preceding conversation, the learner's objective and any expressed boundaries. Prefer a small, human-validated rubric over an apparently precise 0–100 score.

Before choosing weights: **What Mac model/chip and how much RAM or unified memory do you have?** Hardware was not inspected. The external SSD solves storage capacity; it does not add runtime memory.

## 2. Audit of the supplied roleplay table

Configuration values establish what a checkpoint declares. They do not prove useful recall at that length, fine-tuning coverage, or the context configured by a local runner. RoPE overrides and third-party quantizations need their own evidence. No supplied RP star rating has a documented evaluation behind it.

| Supplied entry / claim | Primary-source check | Finding for Microtalks |
|---|---|---|
| MythoMax L2 13B / ~32K | [Gryphe/MythoMax-L2-13b config](https://huggingface.co/Gryphe/MythoMax-L2-13b/blob/main/config.json): `max_position_embeddings=4096`, `rope_scaling=null`. | **4,096 declared**, not native 32K. An older Llama 2 actor candidate, with no evidence here for grading reliability. |
| Kimi K2 0905 / ~256K | [Moonshot card](https://huggingface.co/moonshotai/Kimi-K2-Instruct-0905): 1T total parameters, 32B activated, 256K context. | Context claim supported. **Not an ordinary laptop model.** Active parameters describe per-token computation, not all weights needed for deployment. At an idealized four bits per parameter, weights alone would be about 500GB before overhead. |
| Psyfighter 13B / ~4K | Exact version unspecified. Identifiable [KoboldAI/LLaMA2-13B-Psyfighter2 config](https://huggingface.co/KoboldAI/LLaMA2-13B-Psyfighter2/blob/main/config.json) declares 4,096 and no RoPE scaling. | 4K supported for **Psyfighter2 only**. Do not silently identify the table's unversioned name as this checkpoint. Its embedded author notes prioritize fiction and warn that facts may be made up. |
| Chronos Hermes 13B / ~16K | Version unspecified. [Austism/chronos-hermes-13b-v2 config](https://huggingface.co/Austism/chronos-hermes-13b-v2/blob/main/config.json) declares 4,096 and no RoPE scaling. | 16K unsupported for the checked **v2**. Exact table identity remains uncertain. |
| OpenHermes2.5 Mistral7B / ~8K | [teknium config](https://huggingface.co/teknium/OpenHermes-2.5-Mistral-7B/blob/main/config.json): 32,768 positions, `sliding_window=4096`. | 8K is not its configured maximum. Distinguish maximum positions from sliding-window attention and empirically useful context. |
| Nous Hermes2 Yi34B / ~4K | [NousResearch config](https://huggingface.co/NousResearch/Nous-Hermes-2-Yi-34B/blob/main/config.json): 4,096, no RoPE scaling. | 4K supported. A 34B model has a much larger memory cost than the shortlist, without demonstrated benefit for this task. |
| Undi95 DPO Mistral7B / ~32K | No unique repository or revision supplied. | **Unverified identity and context.** “DPO” describes a training method; it does not identify one model or make it a reward model. |
| Platypus2 13B / ~8K | [garage-bAInd config](https://huggingface.co/garage-bAInd/Platypus2-13B/blob/main/config.json): 4,096, no RoPE scaling. | **4K declared**, not 8K. No basis for the RP stars or a grading recommendation. |
| MN Violet Lotus12B / ~131K | [FallenMerick config](https://huggingface.co/FallenMerick/MN-Violet-Lotus-12B/blob/main/config.json): 131,072 positions. [Card](https://huggingface.co/FallenMerick/MN-Violet-Lotus-12B) identifies a Mistral-Nemo-based RP merge. | Context declaration supported: 131,072 tokens = 128Ki tokens. Author-reported local EQ score is not independent validation of dialogue grading or long-context reliability. Optional actor comparison. |
| Deepseek Coder6.7B LoRA / ~8K | Adapter identity absent. The named base-family example [deepseek-coder-6.7b-instruct config](https://huggingface.co/deepseek-ai/deepseek-coder-6.7b-instruct/blob/main/config.json) has 16,384 positions and linear RoPE scaling. | **LoRA entry unverified**; base config cannot verify an unnamed adapter. A coding specialization gives no reason to prefer it for small talk. |
| Synthia13B / ~4K | Version unspecified. [migtissera/Synthia-13B-v1.2 config](https://huggingface.co/migtissera/Synthia-13B-v1.2/blob/main/config.json): 4,096, no RoPE scaling. | 4K supported for **v1.2**, not every possible Synthia release. |
| Llama3 8B Uncensored / ~32K | Many unrelated checkpoints use this description; no author/version supplied. | **Unverified identity and context.** “Uncensored” is not a measure of personality fidelity, social judgment or useful feedback. |

“Local” should mean that a specific artifact has a supported runtime and fits the target machine at acceptable latency. Downloadable weights alone do not establish this. Hugging Face is a repository ecosystem; Ollama runs supported model architectures/formats. A classifier or speech model on HF is not automatically an Ollama chat model.

## 3. Practical conversation shortlist

These are candidates to evaluate, not benchmark winners. Package sizes are the Ollama listing's download sizes as checked, **not RAM requirements**. Use exact tags and record digests rather than relying on `latest`.

| Candidate | Checked facts | Suggested experiment |
|---|---|---|
| **Qwen3.5 4B** | [Ollama](https://ollama.com/library/qwen3.5): `qwen3.5:4b`, 3.4GB package; listed 256K context. | First latency-oriented actor and rubric-grader baseline. Use short replies and disable thinking through the supported runner controls. |
| **Qwen3.5 9B** | Same listing: `qwen3.5:9b`, 6.6GB; 256K advertised. | Compare handling of indirect cues and consistent grading against 4B. A larger size does not itself establish better small-talk judgment. |
| **Gemma 4 12B** | [Ollama](https://ollama.com/library/gemma4): `gemma4:12b`, 7.6GB; 256K listed; system-role and configurable thinking support described. | Generalist alternative when memory permits. Pin `12b`: `latest` currently points to E4B, a different model/package. |
| **Hermes 3 Llama 3.1 8B** | [Nous card](https://huggingface.co/NousResearch/Hermes-3-Llama-3.1-8B) describes roleplay, multi-turn conversation and structured outputs; links official GGUFs. Uses **ChatML**, not the base Llama prompt format. | Acting comparator for differentiated personalities. Its roleplay advantages are author claims until tested in Microtalks. Evaluate grading separately. |
| **MN Violet Lotus 12B** | Card/config above verify an RP-focused merge and long declared context. | Optional specialist if generalists keep sounding like assistants. Lower priority than the first four; narrative verbosity may hurt short spoken exchanges. |

Why start with current small generalists: maintained local distributions and instruction/structured-output support make controlled experiments easier. Older RP merges may still produce enjoyable characters. There is no task-specific evidence here that newer generalists universally outperform them at acting.

Tentative sizing guidance for Apple Silicon, pending actual chip/RAM: on 8GB start with a 2B–4B-class quantization and one LLM at a time; 16GB makes 4B the safer voice-pipeline baseline and 8B–9B worth measuring; 24–32GB gives more room to compare 9B/12B plus speech. These are planning estimates, not fit or speed guarantees. Leave space for macOS, browser, ASR/TTS, runtime buffers and context state. Intel Macs need a separate speed assessment.

Use roughly 4K–8K context initially. A handful of recent turns, scenario facts and a compact session summary should suffice. A 128K/256K setting is unnecessary for these lessons and can increase memory and prompt-processing cost.

## 4. What can actually help grade dialogue?

### Sentiment and emotion: auxiliary signals only

[SamLowe/roberta-base-go_emotions](https://huggingface.co/SamLowe/roberta-base-go_emotions) is a real multi-label emotion classifier trained on Reddit-derived GoEmotions: **28 labels, including neutral**. Its card reports F1 of 0.450 at a uniform 0.5 threshold, with much stronger gratitude detection than caring or nervousness; some rare labels have zero F1 at that threshold. Those are author-reported dataset results, not Microtalks results. An ONNX/INT8 variant exists for lighter inference.

It estimates emotional language. It cannot determine whether cheerfulness is tactless after bad news, whether a question repeats an already answered question, or whether a polite request ignores “I'd rather not discuss that.” “That sounds awful” can be a good empathetic reply despite negative sentiment. Do not turn positivity or detected “caring” directly into points.

### More relevant specialist models and research

| Resource | What is actually available | Useful role and limits |
|---|---|---|
| [Skywork-Reward-V2-Qwen3-1.7B](https://huggingface.co/Skywork/Skywork-Reward-V2-Qwen3-1.7B), plus 0.6B variant linked in its card | Sequence-classification reward models, scalar output; family trained on 26M preference pairs. Card recommends ≤16,384 tokens and **no system prompt** in its chat template. | Practical experimental ranker for alternative replies in the **same context**, especially replay. General assistant-preference training differs from peer small talk. Raw rewards are neither probabilities nor comparable 0–100 social scores. May prefer elaborate helpful answers over realistic brief ones. No feedback rationale is generated by the scalar head. |
| [IBM Granite Guardian 3.0 2B](https://huggingface.co/ibm-granite/granite-guardian-3.0-2b) | Specialized yes/no scoring with prescribed templates; includes answer relevance, context relevance and groundedness. Custom risk definitions require testing. | More directly relevant to “does this answer respond?” and topic-grounding checks. This is an established baseline, not a claim that 3.0 is the latest. RAG relevance is different from conversational appropriateness. A custom boundary-violation definition would be experimental. |
| [BAAI/bge-reranker-v2-m3](https://huggingface.co/BAAI/bge-reranker-v2-m3) | Multilingual query/passage cross-encoder relevance scorer. | Useful for retrieving topic cards; possible off-topic feature after validation. High relevance can still mean intrusive persistence. Applying sigmoid to a score does not calibrate a probability of social success. |
| [Empathy in Text-based Mental Health Support](https://github.com/behavioral-data/Empathy-Mental-Health) | Authors provide a RoBERTa-based bi-encoder method, training/testing code and Reddit annotations. About 10K post/response pairs in the study; dimensions are emotional reactions, interpretations and explorations, with evidence spans. | A strong starting taxonomy for context-sensitive empathy. The checked README is a research/training resource, not proof of a maintained plug-and-play pretrained service. Mental-health support language can be too therapeutic for everyday campus exchanges. TalkLife access has separate non-commercial restrictions. |
| [Switchboard question-detection checkpoint](https://huggingface.co/ddemszky/supervised_finetuning_hist0_is_question_switchboard_question_detection.json_bs32_lr0.000063/blob/main/config.json) | Public BERT-based configuration declares custom `MultiHeadModel`, 512 positions and an uninformative label mapping. No README was available in this check. | A real question-detection research artifact, but insufficient documentation for a deployment recommendation. Recover original loader/labels and evaluate first. Question detection alone cannot establish relevance, openness or respectfulness. |
| [kapilchauhan/fintuned-bert-disfluency](https://huggingface.co/kapilchauhan/fintuned-bert-disfluency) | Text classifier; metadata names Disfl-QA and reports 0.9795 validation accuracy. Generated card also says “unknown dataset” and leaves limitations blank. | Weakly documented exploratory baseline only. Its accuracy is not evidence for natural spoken disfluency scoring. Text lacks pause/prosody information, and ASR may remove repetitions and fillers. |

These resources do **not** establish an off-the-shelf classifier for “respect of a previously expressed personal boundary.” That needs explicit conversation state and domain labels. Likewise, a dialogue act such as “question” should be a descriptive feature: sometimes the best move is to acknowledge, share something brief, change topic or end the conversation.

Most specialist classification heads need their own Transformers/ONNX-compatible inference path. Verify Mac backend support for the exact artifact; CUDA examples and GGUF conversions do not automatically preserve a reward/classification head.

### Recommended hybrid rubric

Give the grader the scenario, the conversation **through the learner's current turn**, and observable boundary cues. Do not let the actor's subsequently generated reaction determine the learner's grade; otherwise an arbitrarily friendly actor can make a poor move look successful.

Score each applicable dimension as 0 = missed/problematic, 1 = adequate, 2 = strong; allow **not applicable** and **uncertain**:

- Relevance: responds to what was actually said, including indirect answers.
- Acknowledgment/empathy: recognizes the cue when one exists; casual chat does not always require an empathy statement.
- Reciprocity: contributes appropriately without monopolizing; avoids an interview-like succession of questions.
- Question quality: relevant and proportionate when a question is useful. No automatic reward for question marks.
- Boundary respect: accepts stated discomfort, refusals and time constraints, and handles appropriate exits.

Use deterministic checks for measurable facts such as duration and repeated exact text. Use a contextual LLM judge for semantic judgments, constrained to a [JSON schema](https://docs.ollama.com/capabilities/structured-outputs) with dimension scores, applicability, evidence quotes, a short explanation and one alternative reply. Validate evidence spans against the transcript. Schema compliance guarantees shape, not correctness. Low-temperature decoding improves repeatability but does not calibrate self-reported confidence.

Map the validated rubric to a few chess-like labels such as “strong move,” “reasonable move” and “missed cue.” Boundary violations should have an explicit rule rather than being averaged away by warm tone. Explain the exact cue and show another viable response. Dialogue has several good continuations; avoid presenting a “best move” or centipawn-like loss as objective truth.

One model can serve actor and grader in separate requests to keep one set of weights resident. Separate prompts reduce role leakage but do not create independent model judgments. A dedicated grader model is justified if it improves agreement with humans enough to pay for extra memory/loading time. Test Skywork as a replay ranker before considering it a primary score source; do not deploy every classifier in the table.

### Path to a purpose-trained classifier

1. Define labels on **context + learner response**, including the scenario objective and observable boundary state. Label cue applicability and evidence as well as quality.
2. Begin with 200–500 double-labelled examples to debug the taxonomy. Then expand to roughly 1K–3K varied examples if learning curves support training; these are planning budgets, not guaranteed sample sufficiency.
3. Include contrast pairs: same words with different preceding cues; polite boundary violations; short but good acknowledgments; sarcasm; topic changes; question overload; appropriate departures; ASR-corrupted text. Do not reward conformity to one accent or an extroverted style.
4. Fine-tune a compact encoder with per-dimension classification/ordinal heads. Keep all turns, paraphrases and replay variants from one conversation in the same split. Hold out scenario families and speakers where possible.
5. Compare with rules and the prompted grader. Calibrate thresholds on validation data, use abstention for uncertain inputs, and reserve untouched human labels for the final test. Human-review any synthetic training labels; LLM agreement is not ground truth.

Examples of the intended labels:

| Previous cue | Learner reply | Expected annotation |
|---|---|---|
| “I'd rather not talk about my grades.” | “Of course. Have you tried the new café?” | Boundary respected; appropriate topic change. |
| Same cue | “I totally understand! But what mark did you get?” | Boundary violated despite positive wording. |
| “I failed the exam and I'm pretty upset.” | “That sounds rough. Want to talk about it?” | Relevant acknowledgment and an optional invitation. |
| “I need to get to class.” | “Nice meeting you. See you around.” | Strong boundary/time-cue response; question quality not applicable. |

## 5. Local speech and low-latency execution

| Component | Checked capability | Recommendation |
|---|---|---|
| [Whisper.cpp](https://github.com/ggml-org/whisper.cpp) | Maintainer documents macOS Intel/Arm, Metal, Core ML, quantization and microphone streaming examples. | First Mac ASR baseline. Compare `base.en` and `small.en` for English, multilingual equivalents if needed. Streaming example uses repeated audio windows; it is not proof of native low-latency turn understanding. |
| Silero VAD | Whisper.cpp documents integrated Silero VAD and adjustable silence/padding settings. | Detect speech regions/endpoints. Begin with push-to-talk as an option and a forgiving silence threshold; a learner's thinking pause need not end the turn. |
| [Qwen3-ASR 0.6B / 1.7B](https://huggingface.co/Qwen/Qwen3-ASR-0.6B) | Card reports 30 languages plus 22 Chinese dialects, offline and streaming inference. The documented streaming path currently requires vLLM and does not return timestamps; timestamps use a separate 0.6B forced aligner. | Later accuracy comparison. Official CUDA/vLLM examples and high-concurrency throughput claims do not establish Mac latency. Verify a Mac-compatible backend before committing. |
| [Kokoro 82M](https://huggingface.co/hexgrad/Kokoro-82M) | Small TTS model, Apache-2.0 weights, selectable voices; v1.0 card lists eight languages and 54 voices. | First TTS baseline. Assign stable voices to personalities and synthesize short sentence chunks. Listen for pronunciation and continuity between chunks. |
| [Chatterbox Turbo / Nano](https://github.com/resemble-ai/chatterbox) | Turbo 350M and Nano 110M; English, paralinguistic tags and reference-clip conditioning. Nano targets CPU/on-device use. | Compare for expressive speech after Kokoro. “3× realtime on eight CPU cores” is a maintainer claim with unspecified relevance to this Mac; hosted sub-200ms claims are not local guarantees. |
| [PersonaPlex 7B](https://github.com/NVIDIA/personaplex) | Full-duplex speech-to-speech with text role prompts and audio voice conditioning; based on Moshi. Official instructions emphasize GPU deployment and CPU offload. | Interesting later experiment for interruption/backchannel behavior. No verified ordinary-Mac real-time path here. It also needs a separate auditable grading/transcript design. |
| [Sesame CSM 1B](https://github.com/SesameAILabs/csm) | Context-conditioned audio generation; README explicitly says it **cannot generate text** and suggests a separate LLM. Example includes MPS/CPU selection, while requirements/testing emphasize CUDA. | TTS research alternative, not a complete conversational brain or the entire Sesame demo. Mac performance remains unmeasured. |

Recommended execution flow:

```text
Microphone → VAD/endpoint → ASR final transcript → actor → sentence-buffered TTS
                                  └──────────→ queued rubric grading → turn/replay feedback
Scheduled topic fetch → local topic cards ───→ actor context
```

Use one local application coordinator and existing inference endpoints. A multiagent framework is unnecessary. Keep persona state explicit: interests, speaking style, willingness to chat, known facts, and current topic. Give each character a few short examples; limit the actor to one or two spoken sentences and prohibit narrating the learner's actions.

Prioritize the next conversational reply over grading. On a constrained machine, serialize LLM requests and defer detailed analysis to replay. Two simultaneous requests can consume extra context memory and slow the actor. Ollama documents `keep_alive` to avoid repeated cold loads and `num_ctx` for explicit context sizing in its [FAQ](https://docs.ollama.com/faq).

Keep ASR, actor, TTS and grading timings separately. Measure speech-end to first audible response, not only tokens/second. A provisional product target is a warm median under two seconds; this is an evaluation goal, not a predicted result. Measure p95 too. On interruption, cancel generation and queued audio; retain only what the user actually heard in subsequent context.

For replay, store turn IDs, transcript revisions, timestamped audio when retained, scenario/persona state, topic-card snapshot, model digest, prompt/rubric version and scores. A retry branches from the pre-turn snapshot so the learner can compare responses against the same cue. Save actual generated output: a seed alone does not ensure reproducible inference across versions/backends.

Speech coaching should report observations such as pace or long pauses separately from conversational quality. VAD cannot diagnose confidence, and disfluency is not automatically poor communication. Validate filler preservation against audio before counting fillers. Let learners correct ASR errors and regrade; an uncertain transcript should produce uncertainty rather than a penalty.

## 6. External SSD setup for later

The commands below are **documentation only; none were executed**. Replace `MicrotalksSSD` with the actual mounted volume name. Set destinations before the first future download or model load that can trigger one.

### Ollama on macOS

Official [Ollama FAQ](https://docs.ollama.com/faq): models default to `~/.ollama/models`; `OLLAMA_MODELS` changes that path. For the macOS application, set environment variables with `launchctl`, then restart the app. An `export` in Terminal does not configure an already-running GUI server.

After connecting the SSD, verify the real mount in Finder or with `ls "/Volumes"`. Create the chosen writable directory, quit Ollama, then use:

```sh
launchctl setenv OLLAMA_MODELS "/Volumes/MicrotalksSSD/AI/ollama"
launchctl getenv OLLAMA_MODELS
```

Reopen Ollama after setting it. Treat `launchctl setenv` as login-session configuration, not a durable configuration file: verify/reapply after login/reboot, or later arrange a startup mechanism that waits for the SSD mount. Do not start downloading when the expected mount is absent or renamed.

If running a manually managed server from Terminal instead of the GUI app, quit the app first and launch that server with its own environment:

```sh
OLLAMA_MODELS="/Volumes/MicrotalksSSD/AI/ollama" ollama serve
```

Setting the variable does not migrate existing files. If models exist later, stop the server, copy the complete models directory including `blobs` and `manifests`, restart with the new location, and verify models are recognized before removing the original. After a future authorized download, check that files appear on the SSD; `ollama list` checks registration and `ollama ps` checks loaded models, but neither alone proves the disk location. Keep the SSD mounted while models are in use.

### Hugging Face and other runtimes

Official [environment reference](https://huggingface.co/docs/huggingface_hub/en/package_reference/environment_variables) says environment variables are read at import time. Set them **before** starting Python, a notebook kernel or the service:

```sh
export HF_HOME="/Volumes/MicrotalksSSD/AI/huggingface"
export HF_HUB_CACHE="$HF_HOME/hub"
export HF_XET_CACHE="$HF_HOME/xet"
export HF_ASSETS_CACHE="$HF_HOME/assets"
```

`HF_HOME` supplies defaults for the other three; explicit settings make pre-existing overrides less surprising. It also relocates the default token file. If desired, configure `HF_TOKEN_PATH` separately to keep credentials on the internal drive. Give GUI/service processes the same environment and restart them; shell settings affect only inheriting processes. Persist future shell settings in the appropriate shell startup file only when implementing setup.

The official [download guide](https://huggingface.co/docs/huggingface_hub/en/guides/download) supports `cache_dir` for a specific cache or `local_dir` / CLI `--local-dir` for a normal directory. `local_dir` creates `.cache/huggingface` metadata inside that directory. Choose one acquisition approach per artifact to avoid extra copies; select the intended quantization/files rather than every format in a repository. Pin the revision. The documented `--dry-run` can estimate future download size without fetching weights.

After acquisition, point the runtime at its local path or the configured cache. `HF_HUB_OFFLINE=1` and supported `local_files_only=True` loading prevent Hub fetching and fail when files are missing. These settings do not control unrelated network clients. Whisper.cpp model paths and non-HF voice assets need their own SSD paths; `HF_HOME` is not a universal cache switch. Preserve HF cache links during any later migration; a Mac-native filesystem such as APFS is the simpler cache choice than a filesystem without symlink support.

Budget disk for all selected quantizations, voices and possible caches. Budget runtime memory separately for weights, KV/recurrent state, buffers and concurrent speech models. SSD throughput chiefly affects cold loading and memory-mapped page access; swapping to disk can make conversation unusably slow. None of these environment settings enlarges usable RAM.

## 7. Current topics for personalities

Use retrieval to refresh facts; fine-tuning for daily news is unnecessary. A lightweight scheduled fetcher can populate local topic cards before a session. For a technology-interested personality, the official [Hacker News API](https://github.com/HackerNews/API) provides `topstories`, `newstories` and item fields including title, URL, timestamp and score. HN ranking indicates interest in that community, not campus-wide popularity or factual verification.

Add campus event feeds and primary announcements for the actual university once its location is known. For sports or entertainment personalities, select relevant official league/event/release feeds rather than forcing technology headlines into every conversation.

Each card should contain title, two or three supported facts, source URL, publication/event date, retrieval time, expiry and interest tags. Distinguish the time an article was posted from when its event happens. Deduplicate, filter stale items and retrieve one to three cards by persona interests and current conversation; keyword matching is sufficient initially. BGE reranking is optional when the collection grows.

Refresh outside the voice-turn path, perhaps every 6–24 hours depending on source. Keep source links accessible in replay. Treat fetched content as untrusted factual input, never as instructions; extract bounded text rather than injecting whole pages. Cache a session snapshot so a retry sees the same facts. With no fresh source, use timeless topics or explicitly dated cached topics. This gives local inference with optional online content updates; a fully offline session cannot know newly published events.

## 8. Small evaluation before committing to models

Build a **120-example pilot**, with context and learner response, labelled independently by two people familiar with the target campus audience. Use 40 development examples for prompt/threshold decisions and 80 held-out examples for the first comparison, split by conversation/scenario. This is a model-selection pilot, not enough to certify rare-case reliability.

Include introductions, finding shared interests, awkward silence, disappointment, boundaries and exits. Within those scenarios cover indirect cues, repeated questions, polite intrusiveness, cultural style differences, concise good answers and ASR errors. Annotators mark applicability, 0–2 scores, evidence and uncertainty; resolve disagreements and report human agreement before interpreting model agreement.

Compare the authored/keyword baseline, Qwen3.5 4B, and one larger candidate. Test actor quality separately with blinded short conversations using at least four distinct personalities. Keep prompts, context limits and quantization records consistent. Add a specialist only when a specific error pattern justifies it.

Report:

- Per-dimension macro-F1 or ordinal agreement, weighted kappa, applicability errors, abstention coverage and human–human agreement. Do not hide boundary failures in an aggregate score.
- Boundary false positives and false negatives, with counts; a small test has wide uncertainty. Check whether paraphrases and longer versions of the same reply receive unjustified score changes.
- Evidence-quote accuracy, JSON validity and repeated-run rating stability. Replay alternatives should win blinded human pairwise comparisons often enough to justify recommending them.
- Actor naturalness and persona distinction, memory errors, verbosity, and tendency to become a tutor or flatter every learner reply.
- Voice word-error rate plus semantic errors affecting grading, warm/cold speech-end-to-first-audio latency (median/p95), audio gaps, interruptions and peak memory. Use an initial set of about 20 short recordings with varied speaking styles and noise.

Suggested prototype gates, to revise after the human baseline: every feedback quote must match its transcript; fewer than 1% schema failures; at least 90% unchanged turn labels on repeat runs; zero missed **explicit** boundaries in a dedicated challenge subset before enabling confident boundary ratings. These are proposed acceptance criteria, not reported results, and zero errors in a small subset does not establish zero deployment risk.

Choose the smallest configuration that meets the agreed quality and latency goals. If grading remains inconsistent, retain authored scoring for structured lessons and label freeform feedback as tentative while collecting domain examples. The main unresolved inputs are the Mac chip/RAM, target languages and university/location for topic sources.
