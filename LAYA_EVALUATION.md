# Laya for Microtalks — research and evaluation proposal

**Status:** researched from primary documentation/source; not installed, downloaded, or benchmarked here. The SSD remained ejected. This is a proposal for the next session, not an implemented replacement.

## Recommendation

Laya is worth a **small, controlled evaluation as Microtalks' fast decision layer**. It could classify conversation events and narrow response qualities without tying up the generative actor for a multi-second grading response.

Do not adopt it as an authoritative social-skills judge out of the box. Its own authors report domain-transfer weaknesses, overconfidence, and poor held-out moderation results. The model is better understood as a base to evaluate and potentially specialise.

It would complement the existing stack:

```text
microphone → speech recognition → actor → timed voice → playback
                    │
                    └─ compact context → Laya decisions → tentative move label / scene policy
                                               └─ explanation template or deferred RAG coach
```

Laya does **not** generate the character's dialogue or natural-language feedback. It does not perform STT/TTS, detect acoustic overlap, recover fillers omitted by ASR, or infer vocal emotion from audio. It cannot fix slow actor generation by itself.

## 1. Sources and inspected revisions

Primary links:

1. [Model card](https://huggingface.co/convaiinnovations/laya)
2. [Author benchmark report](https://github.com/NandhaKishorM/laya/blob/c7527708f9f5220c669d8aa385077cd28d04708a/BENCHMARKS.md)
3. [SDK agent implementation](https://github.com/NandhaKishorM/laya/blob/c7527708f9f5220c669d8aa385077cd28d04708a/laya/agent.py)
4. [Sequence construction / model / confidence implementation](https://github.com/NandhaKishorM/laya/blob/c7527708f9f5220c669d8aa385077cd28d04708a/laya/common.py)
5. [Router implementation](https://github.com/NandhaKishorM/laya/blob/c7527708f9f5220c669d8aa385077cd28d04708a/laya/router.py)
6. [Package metadata](https://github.com/NandhaKishorM/laya/blob/c7527708f9f5220c669d8aa385077cd28d04708a/pyproject.toml)
7. [Pinned root checkpoint configuration](https://huggingface.co/convaiinnovations/laya/blob/1c5edc17a7acd8701df6fc341c0d179f1c62c982/rl_agent_config.json)
8. [Pinned encoder configuration](https://huggingface.co/convaiinnovations/laya/blob/1c5edc17a7acd8701df6fc341c0d179f1c62c982/encoder/config.json)

The inspected HF repository revision was **`1c5edc17a7acd8701df6fc341c0d179f1c62c982`**, last modified September 20, 2026 according to the API. Inspected GitHub main was **`c7527708f9f5220c669d8aa385077cd28d04708a`**, dated September 22, 2026; its package metadata declares **0.3.6**. These are separate repositories: record both the actual installed SDK version/source and checkpoint revision in any test.

The card, benchmark markdown, and package evolve and differ slightly in rounded results. Numbers below are attributed to the authors, not independently reproduced Microtalks results.

## 2. What it actually does

Laya is a **non-autoregressive text decision model**: an encoder plus decision heads. A request provides text/JSON state and typed questions. Options are supplied with the request.

| Primitive | Output | Possible use here |
|---|---|---|
| `choice` | Selected label and distribution over the supplied options | Respecting a boundary, relevant follow-up, acknowledgment versus topic change |
| `noul` | Probability for a binary proposition | “Has the learner explicitly asked to end this exchange?” |
| `score` | Expected ordinal category index plus its distribution | A narrow, validated rubric dimension—not a universal charisma score |

The SDK batches questions into a forward call, but increasing questions still increases compute and memory. “One forward pass” does not mean an unlimited number of questions cost the same as one.

The absence of generated prose prevents invented prose explanations; it **does not prevent confidently wrong classifications**.

## 3. Checkpoints and context budgets

| Checkpoint | Backbone / parameters | Published default context | Fit for this project |
|---|---|---|---|
| English root `convaiinnovations/laya` | ModernBERT-large + heads, **421M total** | **512**, with `head_max_len=192` | First English-language baseline |
| `multilingual` | mmBERT-base + heads, **322M** | **1024**, head budget 256; larger encoder context is documented | Consider only if target languages require it; test English separately |
| `typed-decisions` | ModernBERT-large + heads, **421M** | **1024**, head budget 256 | Fine-tuned on four specific workflows, not a general “better social judge” |

The root weights are advertised at roughly **808 MB** on the card; inspect exact bytes during a future pinned download. Download size is not resident memory.

### A particularly important truncation trap

The inspected SDK places question/options before the state and defaults to preserving the **beginning** of state text (`truncate_left=False`). A large object that puts all history first and the current learner reply last may silently lose the exact reply we intend to grade.

For the English root:

- Budget around **320 tokens for state** at the nominal 192-token question budget; the actual remaining room depends on the rendered question/options.
- Put the **latest learner reply and immediate partner cue first**.
- Follow with a short target and explicit relevant boundary facts.
- Include earlier context only if it fits.
- Do not append a full conversation and several RAG articles.
- Inspect the actual tokenized sequence and verify inclusion of the critical cue/reply in tests. Raising `max_len` alone is not proof of quality at that length.

## 4. Where it might help—and where it is risky

### Useful experiments

- Classify a clear goodbye/request for space versus an invitation to continue.
- Distinguish a relevant follow-up, acknowledgment, self-disclosure, and unrelated change of topic.
- Assess whether a stated boundary was respected, pushed, or not applicable.
- Given **measured overlap metadata plus transcript context**, distinguish a short backchannel from taking the floor.
- Select a small feedback template or relevant coaching topic, with uncertainty preserved.

### Do not assume

- That sentiment, positivity, or a toxicity flag equals social appropriateness.
- That the base model can reliably distinguish an insult from quoted speech, self-deprecation, reclaimed language, or frustration about a situation.
- That `typed-decisions`' benchmark gain transfers to peer conversation.
- That an ordinal score times 100 measures the learner's social skill.
- That a high returned confidence establishes correctness in an unseen domain.
- That it knows the learner interrupted unless the audio system actually measured overlap.

Keep existing narrow ending rules as a baseline. Do not replace them until a measured classifier comparison is better on both false exits and missed boundaries.

## 5. The authors' evidence includes substantial caveats

| Reported finding | Interpretation for Microtalks |
|---|---|
| Root single-question latency **39.5 ms on T4**; multilingual **32.8 ms** | Potentially fast, but these are not M4 results |
| English root 5-question batch **84.5 ms on T4** | Useful comparison size; test an equivalent small rubric locally |
| Preloaded CPU results advertised around **193–464 ms** | Hardware/workload differs; do not promise this latency on the user's Mac |
| Typed-decisions base accuracy approximately **0.36**, below a **0.461 majority baseline** | Arbitrary typed schemas are not automatically solved zero-shot |
| Fine-tuned typed-decisions accuracy **0.766** | Obtained for those workflows using their training split, not social training |
| Held-out toxic-chat accuracy **0.530**, macro-F1 **0.400** | Directly relevant caution for insult/hostility classification |
| Ordinal SST-5 result **0.372** | Avoid making overall ordinal move quality the first experiment |
| Overconfidence; calibration improves after domain fitting | Need a separate calibration set before probability-gated actions |
| Option-order sensitivity exists | Permute labels in tests, not just input phrasing |

The headline “mathematically calibrated” describes the training objective. It is **not a guarantee of empirically calibrated probabilities on Microtalks**. The model card's “Honest Limits” section and benchmark report make that distinction material.

The published comparisons against TypeSafe Jev reuse third-party numbers with different samples/prompts; the authors say they did not run Jev themselves. Do not treat those as a controlled head-to-head result for this app.

## 6. SDK details relevant to the M4 / 24 GB machine

Verified from the inspected source:

- Dependencies include **PyTorch, Transformers >=4.48, safetensors, huggingface_hub, and NumPy**. These are not already installed as a Laya stack in the current ONNX voice environment.
- Automatic device selection prefers CUDA, then **MPS**, then CPU. Explicit `device="cpu"` / `device="mps"` are supported in code.
- CPU/MPS use **float32**, with autocast enabled only for CUDA. Model construction/loading follows a float32 path; half-precision checkpoint storage does not imply a half-precision Mac resident model.
- The encoder configuration explicitly declares `dtype="float32"` and a saved Transformers version of **5.0.0**. The package's broad minimum dependency version is not a substitute for a tested, pinned compatibility set.
- 421M float32 parameters alone are roughly **1.69 GB decimal**, before activations, PyTorch overhead, loading copies, and other services. This is arithmetic, not a measured peak.
- MPS placement/fallback code exists, but that is not evidence that every relevant operation performs well on this Mac. Actual CPU/MPS correctness, latency, memory, and fallback behavior remain untested.
- The loader disables ModernBERT `reference_compile`, avoiding an inappropriate compile path for these small batches.
- The SDK's single-model loader limits downloads to requested checkpoint files/subfolders. `Router(preload=True)` deliberately loads the family; avoid that default for the first English-only experiment.
- The loader can rewrite tokenizer configuration for compatibility. Use an isolated writable local checkpoint directory and record the original revision plus any local adjustments.
- `USE_TF=0` is a documented workaround for TensorFlow-related import deadlocks.
- Plan a Python inference component for Laya, separate from the Ollama actor. The inspected examples use the dedicated SDK, not an Ollama chat endpoint.

### Confidence field semantics

In the inspected SDK:

- `choice` / `score` **`confidence = 1 − normalized entropy`**. It measures concentration of the option distribution, not “probability this decision is correct.”
- `choice.probabilities[label]` contains the option probabilities after the configured temperature transform; their domain calibration still needs testing.
- `noul` returns the estimated positive-class probability; its confidence is the larger of positive/negative probability.
- Some shipped temperatures are clamped by the SDK, with a warning. The root checkpoint includes a very small `choice:11+` temperature that falls outside the inspected allowed interval. Capture such warnings and exact SDK/checkpoint versions.

Do not gate punitive ratings using `confidence > 0.8` and describe that as 80% certainty. Determine thresholds and abstention using a held-out Microtalks calibration set.

## 7. Proposed first schema

This is an **untested example**, not production code or a recommended fixed threshold. Evaluate contextual dimensions before an overall “brilliant/blunder” question.

```python
# Run only after reconnecting the SSD, explicitly installing dependencies,
# and placing the pinned English checkpoint in this directory.
import laya

agent = laya.load(
    "/Volumes/Extreme SSD/Microtalks/models/laya-english",
    device="cpu",  # establish CPU baseline; compare MPS separately
)

state = {
    # Keep the critical exchange at the beginning; the SDK may truncate the tail.
    "learner_reply": "Of course. Have you tried the new campus café?",
    "partner_last_turn": "I'd rather not talk about my grades.",
    "lesson_target": "Respect a topic boundary and continue naturally.",
    "explicit_boundary": "Do not discuss the partner's grades.",
}

questions = {
    "boundary_response": {
        "type": "choice",
        "instructions": "How does LEARNER_REPLY respond to the PARTNER's stated boundary?",
        "criteria": {
            "respected": "accepts the boundary or changes topic without pressure",
            "pushed": "pressures the partner to discuss the refused topic",
            "not_applicable": "the partner did not state a relevant boundary",
            "unclear": "the available exchange does not support a decision",
        },
    },
    "learner_requests_exit": {
        "type": "noul",
        "instructions": "Does the LEARNER explicitly request ending this conversation now?",
    },
    "response_relevance": {
        "type": "choice",
        "instructions": "Does the learner's response fit the current conversational cue?",
        "criteria": {
            "fits": "acknowledges, follows up, or appropriately changes topic after a boundary",
            "misses": "ignores or contradicts the current cue without a conversational reason",
            "unclear": "not enough context to decide",
        },
    },
}

result = agent.predict(state, questions)
# Record full distributions and compare with human labels.
# Do not equate result['answers'][...]['confidence'] with correctness.
```

An explicit “unclear” option does not guarantee effective abstention; test it. The model can still confidently choose another label on ambiguous input.

## 8. Evaluation before integration

1. **Build a labelled pilot.** Start with roughly 150–300 context/response examples, reviewed by at least two people. This is a planning range, not a guarantee of data sufficiency.
2. **Separate development, calibration, and untouched test sets by conversation/scenario.** Keep paraphrases and replay variants from the same conversation together. If later fine-tuning is needed, expand the training set and retain independent evaluation data.
3. **Include hard contrasts:**
   - “You're stupid” versus “I feel stupid” versus “This stupid assignment.”
   - A quoted insult versus an insult directed at the partner.
   - Friendly wording that nevertheless pressures a refusal.
   - A short good goodbye versus an unrelated terse answer.
   - A respectful topic change after “I don't want to discuss that.”
   - Negative-worded empathy versus upbeat dismissal of distress.
   - “Mm-hm” during speech versus a genuine floor takeover, using actual timing metadata.
   - ASR omissions, partial turns, sarcasm, long prior context, and ambiguous cues.
4. **Compare baselines:** existing narrow rules, the current Qwen coach, Laya root, and only then other checkpoints if justified. Do not measure only hand-picked examples.
5. **Measure per-dimension precision/recall, confusion matrices, Brier score, calibration, abstention coverage, and option-order stability.** Track false boundary violations/false exits explicitly rather than hiding them in an average.
6. **Benchmark end to end:** cold load, warm p50/p95, one versus several questions, CPU versus MPS, peak memory/swap, and actor first-audio latency while the classifier is active.
7. **Require demonstrated benefit.** Promote a dimension only if it improves the task's agreed quality/latency trade-off. If zero-shot performance is weak, narrow the task or fine-tune; do not paper over it with higher confidence thresholds.

Initial useful integration could be **fast tentative flags + deterministic feedback templates**, with richer RAG-backed explanations deferred until the conversation ends or the learner requests review. An explanation generator must not manufacture evidence to justify a wrong classifier label.

## 9. Future SSD installation boundaries

Not executed in this handoff:

- Verify the actual mounted SSD first.
- Create a separate classifier evaluation environment under SSD `runtime/`; do not casually upgrade the tested voice environment's dependencies.
- Put model files under SSD `models/laya-english`, and set `HF_HOME`, `HF_HUB_CACHE`, `UV_CACHE_DIR`, and `TMPDIR` before acquisition/loading. The ExFAT environment should use copied files rather than rely on symlinks/hardlinks.
- Acquire only root `rl_agent_config.json`, `model.safetensors`, `tokenizer/*`, and `encoder/*`, pinned to the chosen revision; do not fetch all sibling checkpoints by default.
- Use the dedicated SDK loader, not an assumption that Hugging Face's autogenerated generic pipeline snippet is sufficient for this custom checkpoint layout.
- Start with one resident checkpoint. Measure CPU first so a potential classifier benefit is not hidden by GPU contention with Qwen/Whisper.
- Record hashes, package versions, device/dtype, calibration settings, input truncation, and actual measurements.

**Bottom line:** Laya is a plausible way to make Microtalks' decision layer faster. The source evidence supports an experiment, not a claim that it already solves realistic social grading, missed speech fillers, or the entire voice latency problem.
