# Product research and MVP decisions

Reviewed September 22, 2026. These are observations from public product pages, not independent tests of their effectiveness.

| Reference | Observed pattern | Microtalks adaptation |
| --- | --- | --- |
| [Yoodli](https://yoodli.ai) | Choose a roleplay and speaking goal; speak; review feedback on content and delivery. Configurable personas and multi-persona practice. | A target before each scene, a distinct conversation partner, and specific post-conversation coaching. |
| [SmallTalk2Me](https://www.smalltalk2.me) | Short speaking lessons, scenario-based practice, and progress reports, predominantly for English learning and exams. | Short everyday university scenes. Focus on conversational choices rather than grammar or accent. |
| [Duolingo learning path](https://blog.duolingo.com/new-duolingo-home-screen-design/) | Guided lesson progression, practice within the path, recurring characters, and clear next steps. | A small visible skill path, first-run recommendation, earned XP, and easy replay. All prototype lessons remain available. |
| [Chess.com analysis](https://www.chess.com/analysis) | Dedicated analysis experience and persistent navigation. The public page is largely client rendered; this review could not inspect a signed-in game review. | Move list, rating symbols, selected-move explanations, and replay from a turning point, based on the user's requested chess-review mechanic. |

## Skills consulted

- `find-skills`: searched the skills directory and CLI.
- [Anthropic frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md): intentional visual identity and two-pass design critique.
- [Superpowers using-superpowers](https://github.com/obra/superpowers/blob/main/skills/using-superpowers/SKILL.md) and [verification-before-completion](https://github.com/obra/superpowers/blob/main/skills/verification-before-completion/SKILL.md): use applicable skills and verify claims with executable checks.
- [Ponytail](https://github.com/dietrichgebert/ponytail/blob/main/skills/ponytail/SKILL.md): native browser features, minimal dependencies, explicit ceilings on simplifications.
- Local React best-practices and last-20-percent guidance.

## Design contract

Product UI, not a marketing landing page. A calm clubhouse for practising conversation, with tactile green lesson buttons and a small speech-bubble character. Chess-inspired charcoal navigation; Duolingo-inspired progression, without copying their artwork or branding.

- Palette: canvas `#f7f8f5`, surface `#ffffff`, ink `#26342c`, forest `#376348`, leaf `#dceacb`, ochre `#e9b949`. Semantic review colours are distinct and always labelled.
- Type: locally bundled Nunito Sans; heavy, friendly headings and readable body text.
- Layout: slim left navigation, spacious central lesson area, narrow coaching rail. Mobile uses compact top navigation and a single column.
- Corners: 20px large panels, 12px controls, circular avatars and lesson nodes.
- Motion: short state transitions and tactile button feedback; reduced-motion support.
- Review critique: avoid a generic SaaS hero and invented statistics. Open straight into real lessons, with actual zero-state progress.

## The magic moment

Alex starts “Read the room,” jokes with a stressed classmate, sees the classmate become more serious, and adjusts. In review, Alex can select the missed cue, understand it, and replay from that exact line without starting over.

Acceptance: a new visitor can launch a lesson, complete three turns, inspect all ratings, replay a selected turn, and see progress survive reload. Voice has an explicit unsupported/denied fallback. No fabricated streaks, users, or accuracy metrics.

## Deliberate MVP limits

React + Vite; no account or backend. Progress stays in this browser. Hand-authored scenario branches and transparent keyword heuristics make it runnable without secrets or service setup. Suggested replies have authored feedback; free-text feedback is approximate. This is not a general conversational AI or a validated social-skills assessment.

Browser speech recognition and synthesis provide voice on supported browsers. Recognition may use the browser vendor's remote speech service. Audio is not stored by this app. Recognition may omit fillers; display this limitation. Score only recognizable “um/uh” and clearly punctuated filler “like,” with optional, capped delivery deductions. Never time or penalize silence in this MVP.

Next substantive upgrade: a server-side conversational model with structured, evidence-grounded feedback, tested against a diverse set of real conversations. Keep provider secrets off the client.
