# Microtalks

Working name: **Microtalks**

## The idea

A website for practising small talk and building micro social skills through short, interactive conversations. Think Duolingo-style lessons with voice or text practice and chess-style move reviews.

The initial audience is students heading into university who want more practice starting conversations, keeping them going, and getting beyond generic exchanges.

The goal is to help people notice something worth saying and navigate what happens next. Ordinary opening questions are fine; the learning comes from following up, sharing, reading cues, and adapting.

## Core lesson loop

1. **Get a specific skill or target.** For example: “Find an opening into this conversation” or “Follow up on one detail they mention.”
2. **Get brief context.** Where are you, who are you talking to, and what is happening?
3. **Start in voice or text mode.** A character opens the conversation, asks a question, or an existing conversation begins playing.
4. **Navigate the interaction.** Respond naturally while trying to apply the target skill and read the other person's reactions.
5. **Review your moves.** Get feedback on specific moments, using chess-inspired ratings and explanations.
6. **Replay a turning point.** Try another response from the same moment, or practise the skill in a different situation.

An optional hint before starting and an “I'm stuck” button could support beginners. Later lessons can remove that support.

## Skills to train

- Starting a one-to-one conversation using shared context.
- Finding a moment to join a group conversation.
- Picking up a detail and asking a relevant follow-up.
- Giving answers with enough detail for someone else to build on.
- Sharing something about yourself rather than only asking questions.
- Taking a basic topic one step deeper.
- Reading humour, interest, distraction, and changes in tone.
- Adapting when an approach does not land.
- Handling short answers and conversational pauses.
- Ending a conversation comfortably.
- Turning a repeated interaction into a small invitation, such as coffee after class.

Starting a conversation and entering an existing group conversation should be separate skills, with group scenarios introduced later.

## Characters and personalities

Different characters should respond differently to the same answer. The learner has to work out what fits in the moment through conversational cues.

Possible tendencies:

| Dimension | Examples |
| --- | --- |
| Humour | Playful, sassy, dry, literal, serious |
| Openness | Shares freely, reserved, slow to warm up |
| Communication | Direct, tentative, concise, talkative |
| Current mood | Relaxed, stressed, distracted, excited |
| Interest | Curious, neutral, busy, keen on a particular topic |

Examples:

- A sassy character might enjoy light teasing or playful pushback.
- A strict, serious character might respond poorly to jokes, especially during a stressful task.
- A reserved character might open up when a shared interest comes up.
- A friendly character might still need to leave or concentrate.

**Design direction:** personality affects the response, but scoring should use the cues available to the learner. Avoid requiring the learner to guess an undisclosed personality rule. A joke that does not land can become an opportunity to practise recovery.

Characters should not all be endlessly enthusiastic or willing to carry the conversation.

## Chess-style conversation ratings

Make practice funny and engaging through familiar move labels, icons, and replayable moments.

| Rating | Possible meaning |
| --- | --- |
| Brilliant / Amazing move!! | Notices a subtle cue, makes a thoughtful connection, or recovers especially well |
| Best move | Especially effective for the lesson's target and the current context |
| Great move! | Follows a promising thread or adapts well |
| Good move | A natural contribution that fits the moment |
| Missed opportunity?! | Passes over a useful detail or conversational opening |
| Mistake? | Misses a clear cue or keeps using an approach that is not working |
| Blunder?? | Pushes past an explicit boundary or doubles down after clear discomfort |

These labels are provisional. There can be several equally good responses, and the app should explain what worked rather than claim there is one perfect sentence.

Use “blunder” sparingly. A slightly awkward sentence is different from ignoring an explicit boundary.

### Example: adapting to seriousness

**Target:** Adjust your approach when someone's tone changes.

> Character: “I'm trying to finish this group presentation. Nobody's done their part.”
>
> Learner: “Classic group project. Teamwork makes the dream work.”
>
> Character: “Yeah. I'm genuinely worried we're going to fail.”

Possible next moves:

- **“You should charge them consultancy fees.”** Mistake: continues joking after a clear signal of genuine worry.
- **“Ah, sorry—that sounds stressful. How much is still left?”** Great move: acknowledges the shift and invites them to explain.
- **“Want some company while you work, or do you need to focus?”** Great move: offers support and makes it easy to ask for space.

## Voice delivery: fillers and pauses

**Requested mechanic:** dock points for filler words or sounds such as “uhhh,” “um,” and filler uses of “like.” Pauses generally should not lose points unless they meaningfully disrupt the interaction or create an awkward moment.

Implementation details to settle:

- Whether every filler incurs a deduction or only repeated/excessive use.
- How large deductions should be relative to the actual conversational skill.
- Whether delivery scoring is always active or belongs to dedicated fluency lessons.
- How to distinguish filler “like” from meaningful uses such as “I like that course” or “It looks like rain.”
- How to identify a disruptive pause using context, rather than a fixed silence timer alone.

Proposed guardrails for useful feedback:

- Track delivery separately from conversational decisions so a thoughtful answer can still earn a good move rating.
- Treat normal thinking pauses as acceptable and leave enough time to respond.
- Do not penalise microphone latency, transcription errors, or the AI interrupting the learner.
- Avoid treating every hesitation as a failure. The intended skill is clearer communication, not perfectly scripted speech.
- Only assess audible fillers and timing in voice mode, where the necessary evidence exists.

Exact thresholds and scoring weights are still open.

## Feedback and game modes

### Arcade mode — proposed

- Live chess-style move icons and occasional sound effects.
- Short, replayable scenarios.
- Points tied to the target skill.
- More exaggerated characters for entertainment.

### Practice mode — proposed

- Uninterrupted voice or text conversation.
- Move-by-move review afterward.
- Feedback tied to something the learner actually said.
- Replay from a selected turning point.

Live ratings are engaging, but could also distract people during speech. Test whether they help, and let learners choose whether to see them.

### Example debrief

> **You found an opening.**
>
> You connected your experience to what they were already discussing, which gave them an easy way to include you.
>
> **Try next:** Keep your first contribution short, then give them room to respond.

A conversation can count as successful even if the other person does not warm up. Respectfully ending an interaction with someone who is busy is a valid skill.

## Progression

1. **Guided:** target, hint, and a forgiving conversation partner.
2. **Practice:** target, with hints available on request.
3. **Transfer:** same skill in a new setting or with a different personality.
4. **Mixed practice:** learner decides which skills fit without being told in advance.

Possible university settings:

- Waiting outside a lecture.
- Sitting next to someone before class.
- A society's first meetup.
- A shared kitchen.
- Working on a group project.
- Talking to someone you have met a couple of times.

## Optional real-world practice

End a lesson with a tiny challenge:

> “Before or after your next lecture, ask someone how they found one specific part of the class.”

Offer a short reflection: Did you try it? What happened? What would you like to practise next?

Reward the attempt rather than whether the other person liked the learner.

## Candidate first prototype

Start with one scenario: **waiting outside a lecture**.

- Target: follow up on something the other person mentions.
- A short conversation of roughly three to five exchanges.
- A small set of contrasting character personalities.
- Specific move ratings with a short explanation.
- One strength and one thing to try in the debrief.
- Replay a turning point.

Voice is an important part of the product vision; text provides another way to practise. Whether the first prototype includes both is undecided.

A broader initial release could cover roughly ten university scenarios and three core skills: opening, following up, and sharing.

## Open questions

- How prominent should live ratings be, particularly in voice mode?
- What makes feedback feel funny and motivating rather than judgmental?
- How should filler deductions work without outweighing a good conversational decision?
- How should characters signal their preferences clearly enough for fair scoring?
- Should personality information be revealed in the post-conversation review?
- What evidence would show that practice helps learners feel more comfortable in real conversations?
- What is the smallest voice experience that captures the idea well?

## Current status

Idea capture only. No tech stack, scoring formula, implementation plan, or final feature scope selected yet.
