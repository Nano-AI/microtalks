export type Rating = 'brilliant' | 'great' | 'good' | 'missed' | 'mistake' | 'blunder' | 'unrated';
export const ratings: Record<Rating, { label: string; symbol: string; points: number }> = {
  blunder: { label: 'Blunder', symbol: '??', points: 5 },
  unrated: { label: 'Not rated', symbol: '–', points: 0 },
  brilliant: { label: 'Brilliant move', symbol: '!!', points: 30 },
  great: { label: 'Great move', symbol: '!', points: 25 },
  good: { label: 'Good move', symbol: '✓', points: 20 },
  missed: { label: 'Missed opportunity', symbol: '?!', points: 15 },
  mistake: { label: 'Mistake', symbol: '?', points: 10 },
};
export type PersonaId = 'maya' | 'leo' | 'sam';
export const people = {
  maya: { name: 'Maya', animal: 'Dog', tag: 'Warm & curious', initials: 'M', color: 'peach', bio: 'An enthusiastic dog who loves meeting someone new. Warm and curious, with boundaries of her own.', reaction: 'I’m glad you said that.' },
  leo: { name: 'Leo', animal: 'Fox', tag: 'Cautious, then playful', initials: 'L', color: 'lilac', bio: 'A fox who takes a little time to warm up. Find a shared interest and the playful side comes out.', reaction: 'Okay, fair point.' },
  sam: { name: 'Sam', animal: 'Owl', tag: 'Reserved & direct', initials: 'S', color: 'blue', bio: 'An observant owl who prefers a thoughtful exchange. Comfortable with silence, direct when he needs space.', reaction: 'Yeah, exactly.' },
};
export const biomes = [
  { id: 'meadow' as const, name: 'Meadow', title: 'First connections', description: 'Find an opening. Follow a thread.', lessonIds: ['opening', 'follow'] },
  { id: 'woodland' as const, name: 'Woodland', title: 'Read & share', description: 'Notice a shift. Let someone know you.', lessonIds: ['room', 'share'] },
  { id: 'riverside' as const, name: 'Riverside', title: 'Find your place', description: 'Join in and leave on a good note.', lessonIds: ['join', 'exit'] },
  { id: 'highlands' as const, name: 'Highlands', title: 'Care & calm', description: 'Make room for the harder feelings.', lessonIds: ['deescalate', 'support'] },
];
export const biomeFor = (lessonId: string) => biomes.find(b => b.lessonIds.includes(lessonId)) ?? biomes[0];
export const LOCAL_MAX_TURNS = 6;
export const LOCAL_XP_PER_TURN = 15;
export type ConversationMood = 'open' | 'playful' | 'reserved' | 'guarded' | 'annoyed' | 'sad' | 'calmer';
export type ConversationState = { mood: ConversationMood; ended: boolean; endReason: 'none' | 'goodbye' | 'hostility' | 'natural' | 'session_limit'; memories: { speaker: 'learner' | 'partner'; quote: string }[] };
export function isConversationState(value: unknown): value is ConversationState {
  if (!value || typeof value !== 'object') return false;
  const s = value as ConversationState;
  return ['open', 'playful', 'reserved', 'guarded', 'annoyed', 'sad', 'calmer'].includes(s.mood) && typeof s.ended === 'boolean' && ['none', 'goodbye', 'hostility', 'natural', 'session_limit'].includes(s.endReason) && Array.isArray(s.memories) && s.memories.length <= 10 && s.memories.every(m => m && ['learner', 'partner'].includes(m.speaker) && typeof m.quote === 'string' && m.quote.length <= 180);
}
export function initialConversationState(persona: PersonaId, lessonId: string): ConversationState {
  return { mood: lessonId === 'deescalate' ? 'annoyed' : lessonId === 'support' ? 'sad' : lessonId === 'room' ? 'guarded' : persona === 'maya' ? 'open' : 'reserved', ended: false, endReason: 'none', memories: [] };
}
export type Choice = { text: string; rating: Rating; why: string };
export type Step = { prompt: string; cue: string; hint: string; keywords: string[]; choices: Choice[]; positive: string; neutral: string; negative: string };
export type Lesson = { id: string; title: string; skill: string; description: string; place: string; context: string; target: string; icon: 'chat' | 'ear' | 'spark' | 'coffee' | 'hand' | 'door'; color: string; partner: PersonaId; steps: Step[]; challenge: string };
const choice = (text: string, rating: Rating, why: string): Choice => ({ text, rating, why });

export const lessons: Lesson[] = [
  {
    id: 'opening', title: 'Break the ice', skill: 'Find an opening', description: 'A shared moment is all you need.', place: 'Outside the lecture hall', icon: 'chat', color: 'green', partner: 'maya',
    context: 'It’s your first week. You’re waiting outside a lecture hall next to another first-year student.', target: 'Use the situation you share to start a conversation.', challenge: 'Before your next lecture, comment on something you and a classmate are both experiencing.',
    steps: [
      { prompt: 'Please tell me this is the psychology lecture. I’ve already been in the wrong building once today.', cue: 'They’re uncertain about the room and offering a small story.', hint: 'Answer the practical question, then add a little of your own experience.', keywords: ['room', 'psychology', 'lost', 'building', 'same', 'lecture', 'map'], positive: 'Oh, good. The campus map and I are not getting along.', neutral: 'I’ll double-check the room number, just in case.', negative: 'I’m actually asking. I really don’t want to miss it.', choices: [choice('Yes, you’re in the right place! I got lost finding it too.', 'great', 'You answered their question and shared a small experience. That gives them an easy way to continue.'), choice('Yes.', 'missed', 'You answered clearly, but left little to build on. One extra detail could open the conversation.'), choice('How do you manage to get lost this much?', 'mistake', 'Teasing someone you have just met can sound like criticism, especially when they are asking for help.')] },
      { prompt: 'I moved here last weekend, so everything’s still pretty new.', cue: 'Moving is a new thread you can pick up.', hint: 'Ask about one detail: the move, the city, or settling in.', keywords: ['move', 'from', 'settling', 'city', 'weekend', 'home', 'where'], positive: 'I came from a small town. It’s a big change, but I’ve found a little café near my flat.', neutral: 'Still finding my feet, really. I found a café near my flat, at least.', negative: 'Anyway. There’s a café near my flat that’s been a nice break.', choices: [choice('How are you finding it so far? I’m still getting used to the place.', 'brilliant', 'You followed their moving story and offered something about yourself, so it does not feel like an interview.'), choice('What course? What year? Where do you live?', 'missed', 'Several questions at once can be a lot to answer. Follow one thread first.'), choice('Cool. The weather’s nice.', 'missed', 'That is a valid topic, but you passed over the moving story they offered.')] },
      { prompt: 'Have you found anywhere good around here yet?', cue: 'They’ve invited you to share something about yourself.', hint: 'Share a small preference or experience. You can be honest if you haven’t explored yet.', keywords: ['café', 'cafe', 'coffee', 'found', 'yet', 'explor', 'park', 'food'], positive: 'That sounds good. Let’s compare notes after the lecture.', neutral: 'We’ll have plenty of time to explore, I guess.', negative: 'Right. Looks like the doors are opening.', choices: [choice('Not yet, but finding good coffee is definitely on my list. What’s the café called?', 'brilliant', 'You shared a preference and connected it to something they already mentioned.'), choice('No, not really.', 'good', 'An honest, clear answer is fine. Adding what you would like to explore could keep it going.'), choice('Why are you asking?', 'mistake', 'They offered a friendly invitation to share. This response can sound defensive in this context.')] },
    ],
  },
  {
    id: 'follow', title: 'Follow the thread', skill: 'Ask a better follow-up', description: 'Find the interesting detail hiding in plain sight.', place: 'The campus café', icon: 'ear', color: 'blue', partner: 'sam',
    context: 'You’re sharing a table in a busy café. The person opposite you sets down a camera beside their coffee.', target: 'Pick up a specific detail, rather than changing the subject.', challenge: 'Listen for one detail in someone’s answer and ask about it.',
    steps: [
      { prompt: 'Sorry about all the stuff. I’ve just come back from taking photos by the river.', cue: 'The camera and the river give you a specific opening.', hint: 'Ask about the photos rather than a whole new topic.', keywords: ['photo', 'river', 'camera', 'shoot', 'picture'], positive: 'Mostly birds. I finally got a decent shot of a kingfisher.', neutral: 'I was photographing birds. There was a kingfisher today.', negative: 'Photography is something I really enjoy, actually.', choices: [choice('What were you photographing by the river?', 'great', 'You picked up the specific activity they mentioned and made it easy to answer.'), choice('What do you study?', 'missed', 'It is a fine question, but it skips a topic they have just offered.'), choice('Birdwatching sounds pretty boring.', 'mistake', 'Dismissing their interest closes off a thread before you have explored it.')] },
      { prompt: 'I had to wait almost an hour for it. I’m still learning how to use the camera.', cue: 'They mention both patience and learning something new.', hint: 'Acknowledge the effort, then ask about getting started.', keywords: ['learn', 'start', 'hour', 'patien', 'camera', 'wait'], positive: 'My grandad gave me his old camera. I’ve been trying to figure it out since.', neutral: 'It was my grandad’s camera, so I’d like to get better with it.', negative: 'I don’t mind the wait. It was my grandad’s camera.', choices: [choice('An hour takes some patience! What got you into photography?', 'brilliant', 'You acknowledged their effort and invited a personal story without prying.'), choice('What camera is it? How much? How old?', 'missed', 'Try one question at a time so they can choose how much to share.'), choice('You should just use your phone.', 'mistake', 'Unasked-for advice overlooks the enjoyment they get from the process.')] },
      { prompt: 'Do you have anything you do to get away from studying?', cue: 'They’re giving you a turn to contribute.', hint: 'Share one real interest, even something ordinary.', keywords: ['i', 'my', 'walk', 'music', 'game', 'read', 'cook'], positive: 'That sounds like a good way to switch off. Nice to have something outside coursework.', neutral: 'Fair enough. We all need a break sometimes.', negative: 'Okay. I’ll let you get back to your coffee.', choices: [choice('I go on walks with music on. I’m very much a phone-camera person, though.', 'great', 'You shared a small, relatable detail and connected it to the conversation.'), choice('Not much. What else do you do?', 'missed', 'You can ask back, but sharing even one small thing keeps the exchange balanced.'), choice('I’m too busy for hobbies.', 'good', 'That may be true. A little context would help it land as sharing rather than dismissal.')] },
    ],
  },
  {
    id: 'room', title: 'Read the room', skill: 'Adapt to their tone', description: 'Know when to joke. Know when to listen.', place: 'The library, 4:30 pm', icon: 'spark', color: 'yellow', partner: 'leo',
    context: 'A classmate has a presentation tomorrow. They normally joke around, but today their laptop is surrounded by notes.', target: 'Notice a shift in tone and adjust your response.', challenge: 'Notice one change in someone’s tone today. Give them room to explain.',
    steps: [
      { prompt: 'Love a group project where the “group” is apparently just me.', cue: 'The joke might be covering genuine frustration.', hint: 'You can acknowledge the humour while checking how they’re doing.', keywords: ['stress', 'help', 'happen', 'rough', 'work', 'okay', 'alright'], positive: 'Thanks. I’m trying to laugh about it, but it’s a lot.', neutral: 'Ha. Yeah, I wish it were just a joke.', negative: 'I’m not really in the mood to be teased about it.', choices: [choice('The group has gone solo? Seriously though, are you doing okay?', 'brilliant', 'You matched their humour, then made room for the feeling underneath.'), choice('Classic. Teamwork makes the dream work.', 'good', 'A light joke can signal solidarity here. Watch what they say next before continuing.'), choice('Maybe nobody wants to work with you.', 'mistake', 'This makes the stressed person the target rather than sharing the frustration.')] },
      { prompt: 'Honestly, I’m worried we’re going to fail. I’ve barely slept.', cue: 'They’ve now directly signalled worry and exhaustion.', hint: 'This is a moment to acknowledge the stress, not double down on the joke.', keywords: ['stress', 'rough', 'sorry', 'help', 'left', 'sleep', 'hard', 'much', 'need'], positive: 'Thanks for taking it seriously. I’ve got two slides left and then I can stop.', neutral: 'I really just need to finish these last two slides.', negative: 'I know you’re joking, but I’m actually stressed. I’ve still got two slides left.', choices: [choice('That sounds rough. How much have you got left?', 'great', 'You noticed the change in tone and asked a concrete, manageable question.'), choice('You should charge them consultancy fees. Haha.', 'mistake', 'They explicitly said they were worried. Another joke misses that clear shift.'), choice('I’m sure it’ll be fine.', 'missed', 'Reassurance is well meant, but acknowledging their worry first would help them feel heard.')] },
      { prompt: 'I think I just need a quiet half hour to get this done.', cue: 'They are asking for space, clearly and politely.', hint: 'Respect the request. A warm ending is a successful outcome.', keywords: ['space', 'leave', 'luck', 'later', 'focus', 'let you', 'catch', 'quiet'], positive: 'Thanks, I appreciate it. Catch you after the presentation.', neutral: 'Thanks. I’ll message you later.', negative: 'Really, I need to focus now. Let’s talk another time.', choices: [choice('Of course. I’ll let you focus. Good luck tomorrow!', 'brilliant', 'You respected their request for space and left the interaction warmly.'), choice('Want to get coffee right now instead?', 'mistake', 'They asked for quiet working time. An invitation now works against that request.'), choice('Okay.', 'good', 'You respected their boundary. A small sign-off could add warmth, but isn’t required.')] },
    ],
  },
  {
    id: 'share', title: 'Your turn to share', skill: 'Go beyond one-word answers', description: 'Give them something to work with.', place: 'The shared kitchen', icon: 'coffee', color: 'peach', partner: 'maya',
    context: 'You’re making dinner in your accommodation. A flatmate is waiting for the kettle to boil.', target: 'Answer with a small detail, then leave room for them.', challenge: 'Add one small detail the next time someone asks about your day.',
    steps: [
      { prompt: 'That smells good. What are you making?', cue: 'An easy invitation to share something ordinary.', hint: 'Name the food and add a little story or preference.', keywords: ['pasta', 'cook', 'rice', 'dinner', 'food', 'recipe', 'making'], positive: 'I’m very much a toast-for-dinner person. Trying to branch out, though.', neutral: 'Nice. I’m trying to learn a few proper meals myself.', negative: 'Okay. I was just curious.', choices: [choice('Pasta. It’s my mum’s recipe, so we’ll see how close I get!', 'great', 'You gave a simple answer and a personal detail they can follow up on.'), choice('Food.', 'missed', 'It answers literally, but gives them very little to build on.'), choice('Can’t you tell?', 'mistake', 'That can make a friendly question feel unwelcome.')] },
      { prompt: 'Did you cook much before moving here?', cue: 'They’re asking about your experience, not testing you.', hint: 'A short honest story works, even if you are a beginner.', keywords: ['i', 'home', 'learn', 'before', 'mum', 'dad', 'burn'], positive: 'That makes me feel better. I burned rice yesterday. Didn’t know that was possible.', neutral: 'I’m learning too. Yesterday’s rice was a disaster.', negative: 'Well, I’m pretty new to it myself.', choices: [choice('Barely. I once burned soup, so this is already progress. How about you?', 'brilliant', 'A small story and a return question keep the conversation balanced.'), choice('No.', 'missed', 'One extra detail would give them a way to connect.'), choice('Yes, I’m much better at it than most people.', 'good', 'Confidence is fine. A concrete story would be easier to connect with than a comparison.')] },
      { prompt: 'Maybe I need to learn one reliable meal first.', cue: 'They’ve offered a small shared interest.', hint: 'You can offer something low-pressure without taking over.', keywords: ['recipe', 'pasta', 'show', 'try', 'easy', 'want', 'together'], positive: 'I’d like that. Let’s try it sometime this week.', neutral: 'I’ll look for something easy to start with.', negative: 'I think I’ll figure it out at my own pace.', choices: [choice('This one’s pretty forgiving. I can send you the recipe if you want.', 'great', 'Your offer is specific and easy to accept or decline.'), choice('You need to learn ten basic dishes immediately.', 'mistake', 'They suggested a small first step. Turning it into a big assignment can be discouraging.'), choice('Yeah, good idea.', 'good', 'A supportive response fits. You could also offer a small suggestion if they want one.')] },
    ],
  },
  {
    id: 'join', title: 'Find your way in', skill: 'Join a conversation', description: 'You don’t need a show-stopping entrance.', place: 'Photography society meetup', icon: 'hand', color: 'lilac', partner: 'leo',
    context: 'You’re standing with two students at a society meetup. They’re talking about getting lost on campus. One turns towards you.', target: 'Connect to the current topic before introducing a new one.', challenge: 'At your next group event, react to the current topic before asking a new question.',
    steps: [
      { prompt: 'I sat in the wrong lecture for twenty minutes yesterday. In my defence, economics sounded like philosophy at first.', cue: 'The pause and turn towards you create an opening.', hint: 'React to their story or share a similar moment.', keywords: ['lecture', 'realise', 'realize', 'lost', 'twenty', 'same', 'happen'], positive: 'The graphs were the giveaway. Very few graphs in philosophy.', neutral: 'Eventually the graphs gave it away.', negative: 'We were just talking about the lecture mix-up.', choices: [choice('Twenty minutes! What finally gave it away?', 'great', 'You joined the existing story with an easy, specific follow-up.'), choice('Anyway, what’s everyone’s favourite movie?', 'missed', 'A new topic can work later. Right now it interrupts a story that is still unfolding.'), choice('That’s such a stupid thing to do.', 'mistake', 'You made the person the target rather than laughing with their story.')] },
      { prompt: 'Please say I’m not the only one who’s had a disastrous first week.', cue: 'They’re inviting shared experience and reassurance.', hint: 'A small honest mishap is enough; you don’t need to outdo their story.', keywords: ['i', 'my', 'same', 'lost', 'week', 'once'], positive: 'Okay, that makes me feel less alone. We’ll know our way around eventually.', neutral: 'Maybe we’ll all get the hang of it next week.', negative: 'I guess everyone’s experience is different.', choices: [choice('I’ve been walking around with the campus map permanently open. You’re not alone.', 'great', 'You shared a related experience without competing over whose week was worse.'), choice('Mine was ten times worse than yours.', 'missed', 'You can share your story without turning it into a competition.'), choice('No, my week was fine.', 'good', 'Honesty is fine. You could acknowledge their story before moving to yours.')] },
      { prompt: 'Is this your first society meetup too?', cue: 'You’ve been included. Share and give the conversation back.', hint: 'Answer and mention what brought you here.', keywords: ['first', 'photo', 'camera', 'meet', 'yes', 'yeah', 'new'], positive: 'Nice. Let’s see what they’ve got planned tonight.', neutral: 'Well, welcome. We can figure it out together.', negative: 'Okay. The organiser looks ready to start.', choices: [choice('Yeah! I’m a complete beginner with a camera, but thought I’d give it a go. You?', 'brilliant', 'You answered, added a small personal detail, and invited them back in.'), choice('Yes.', 'missed', 'A little detail about why you came would make this easier to build on.'), choice('I only came because I was bored.', 'good', 'That can be honest; mentioning what caught your interest could give it a warmer landing.')] },
    ],
  },
  {
    id: 'exit', title: 'Leave on a good note', skill: 'End comfortably', description: 'A short conversation can still be a good one.', place: 'After a seminar', icon: 'door', color: 'green', partner: 'sam',
    context: 'You’ve chatted with a classmate after a seminar. They glance at the time and start putting their notes away.', target: 'Notice an exit cue and end warmly without overexplaining.', challenge: 'Try a simple “Nice talking to you, see you next time” when your next conversation winds down.',
    steps: [
      { prompt: 'I could talk about that seminar for ages, but I’ve got a lab across campus in ten minutes.', cue: 'They have named a real time constraint.', hint: 'Acknowledge that they need to go.', keywords: ['go', 'lab', 'later', 'catch', 'let you', 'time'], positive: 'Thanks. It’s a bit of a walk.', neutral: 'Yeah, I should probably head off soon.', negative: 'I really can’t be late to this lab.', choices: [choice('I’ll let you get going, then. It was good talking to you.', 'great', 'You noticed the time constraint and made it comfortable to leave.'), choice('Just one more thing, this will take five minutes.', 'mistake', 'They have little time to cross campus. Respecting that is more useful than keeping the chat alive.'), choice('Oh, okay.', 'good', 'You acknowledged the cue. A friendly sign-off would make the ending clearer.')] },
      { prompt: 'Are you in this seminar next week as well?', cue: 'They’re leaving a small opening for future contact.', hint: 'Answer simply; you don’t need to make a big plan.', keywords: ['next', 'week', 'yes', 'yeah', 'see', 'there'], positive: 'Great. We can compare notes then.', neutral: 'Maybe I’ll see you there.', negative: 'No worries. I should get going.', choices: [choice('Yeah, same time. See you here next week!', 'great', 'You made the next interaction easy and kept it brief.'), choice('Why, do you want to see me again?', 'missed', 'This adds pressure to a simple, friendly question. A direct answer would be easier.'), choice('Probably.', 'good', 'That is a reasonable answer if you are unsure. You can still end warmly.')] },
      { prompt: 'Alright, I’d better run. See you!', cue: 'The conversation is ending.', hint: 'A short goodbye is enough.', keywords: ['see', 'bye', 'luck', 'later', 'enjoy', 'take care'], positive: 'See you next week!', neutral: 'Bye!', negative: 'Sorry, I have to go. Bye!', choices: [choice('See you! Good luck with the lab.', 'brilliant', 'You ended warmly and remembered where they were going.'), choice('Wait, what are you doing this weekend?', 'mistake', 'They have said goodbye and need to leave. Save the new topic for next time.'), choice('Bye!', 'good', 'Short, friendly, and appropriate. Endings don’t have to be elaborate.')] },
    ],
  },
  {
    id: 'deescalate', title: 'Turn down the heat', skill: 'De-escalate frustration', description: 'Acknowledge the problem without matching the anger.', place: 'The shared kitchen', icon: 'spark', color: 'peach', partner: 'leo',
    context: 'A flatmate has found their labelled lunch missing again. They are frustrated, but don’t know who took it.', target: 'Acknowledge the frustration, then find a next step together.', challenge: 'When someone is frustrated, name the specific problem before offering a fix.',
    steps: [
      { prompt: 'Someone’s taken my lunch again. It literally had my name on it. I’m so fed up with this.', cue: 'They’re frustrated by a repeated problem, not asking to be told how to feel.', hint: 'Show that you understand what is frustrating. You don’t have to accept blame.', keywords: ['frustrat', 'annoy', 'again', 'name', 'fair', 'happen'], positive: 'Exactly. It’s happened twice this week and I’d planned my day around that lunch.', neutral: 'It’s happened twice now. I’m tired of it.', negative: 'Telling me to calm down doesn’t bring my lunch back.', choices: [choice('That’s really frustrating, especially when you’d labelled it. Has it happened more than once?', 'great', 'You acknowledged the specific problem without accepting blame or dismissing the frustration.'), choice('Calm down. It’s just lunch.', 'mistake', 'Minimizing the problem and directing their feelings can make them feel less heard.'), choice('Everyone in this flat is terrible.', 'missed', 'Joining the anger may amplify it without helping understand what happened.')] },
      { prompt: 'I’m tempted to send a really angry message to the whole flat.', cue: 'They’re considering an action while still angry.', hint: 'Acknowledge the impulse and offer a calmer next step, without lecturing.', keywords: ['message', 'together', 'ask', 'understand', 'clear', 'want'], positive: 'Maybe. I want them to actually listen, not just get defensive.', neutral: 'I just want it to stop.', negative: 'I’m not looking for another argument.', choices: [choice('I get why you want to. Want to write something clear together so the point doesn’t get lost?', 'brilliant', 'You acknowledged the impulse and offered practical support while leaving the decision with them.'), choice('Absolutely. Tell them all to get lost.', 'mistake', 'This encourages escalation when a clear request could be more useful.'), choice('You’re overreacting again.', 'mistake', 'A personal criticism shifts attention away from the repeated problem.')] },
      { prompt: 'Yeah. I just need everyone to ask before taking my stuff.', cue: 'They’ve named a clear, reasonable boundary.', hint: 'Support the boundary. Let them choose what happens next.', keywords: ['fair', 'ask', 'clear', 'boundary', 'message', 'reasonable'], positive: 'Thanks. I’m still annoyed, but that feels like a better way to say it.', neutral: 'Right. I’ll put that in the message.', negative: 'No, I’m allowed to ask people not to take my food.', choices: [choice('That’s fair. Saying exactly that sounds like a good start.', 'great', 'You supported a clear boundary without promising that everyone will respond perfectly.'), choice('Just let people take it. It’s easier.', 'mistake', 'De-escalation does not require someone to give up a reasonable boundary.'), choice('Okay, send it.', 'good', 'A brief supportive response fits. They don’t need a speech.')] },
    ],
  },
  {
    id: 'support', title: 'Be there for someone', skill: 'Offer support', description: 'Sometimes listening is the most useful thing.', place: 'Outside the seminar room', icon: 'ear', color: 'blue', partner: 'maya',
    context: 'A friend has failed an exam they studied hard for. They are upset and embarrassed, and have stayed behind after class.', target: 'Acknowledge how they feel and ask what kind of support they want.', challenge: 'Ask whether someone wants advice, company, or a listening ear before trying to fix a problem.',
    steps: [
      { prompt: 'I failed it. I worked so hard and I still failed. I feel really embarrassed.', cue: 'They’re sharing disappointment and embarrassment.', hint: 'Acknowledge the effort and disappointment without rushing to make it positive.', keywords: ['sorry', 'hard', 'rough', 'disappoint', 'work', 'upset'], positive: 'Thanks. I know one exam isn’t everything, but right now it feels awful.', neutral: 'It just feels awful at the moment.', negative: 'I know other people have it worse. That doesn’t make this feel better.', choices: [choice('I’m sorry. You put a lot into it, so I can see why this hurts.', 'great', 'You acknowledged their effort and disappointment without telling them how they should feel.'), choice('Look on the bright side. Other people have it worse.', 'mistake', 'Forced positivity can dismiss the feeling they just trusted you with.'), choice('What score did you get?', 'missed', 'The emotional cue matters more than the exact mark right now.')] },
      { prompt: 'Everyone else seems to have it figured out. I’m not sure what I need right now.', cue: 'They’re uncertain and comparing themselves with others.', hint: 'Offer a choice rather than deciding what they need.', keywords: ['listen', 'company', 'space', 'advice', 'want', 'sit'], positive: 'Company, I think. I don’t really want advice yet.', neutral: 'I don’t really want advice yet.', negative: 'I’m not ready for a whole plan. Can we just leave that for a bit?', choices: [choice('Would company help, or would you rather have some space? We don’t have to figure it out now.', 'brilliant', 'You offered support without requiring them to solve the problem or talk more than they want.'), choice('Here’s exactly how you need to revise from now on.', 'mistake', 'They have not asked for a study plan. Check what support they want first.'), choice('You’ll be fine.', 'missed', 'This may be well meant, but it doesn’t engage with their uncertainty.')] },
      { prompt: 'Could we just sit somewhere for a bit? I don’t want to talk about the exam anymore.', cue: 'They’ve asked for company and set a topic boundary.', hint: 'Respect both requests. Quiet company is a valid response.', keywords: ['sure', 'course', 'sit', 'bench', 'company', 'quiet', 'okay'], positive: 'Thanks. That’s enough for now.', neutral: 'Thanks for staying.', negative: 'I really don’t want to go over the exam again.', choices: [choice('Of course. There’s a bench just outside. We can sit for a bit.', 'great', 'You respected their topic boundary and offered the kind of company they actually requested.'), choice('First, tell me which questions you got wrong.', 'blunder', 'They explicitly asked to stop discussing the exam. This pushes past that boundary.'), choice('Okay.', 'good', 'A simple acknowledgment and quiet company can be enough.')] },
    ],
  },
];

export type CoachSource = { id: string; title: string; url: string };
export type Delivery = { fillers: number; fillerWords: string[]; deduction: number; paceWpm: number | null; pitchSpanSemitones: number | null; durationSeconds: number; voicedSeconds: number; notes: string[]; caveat: string };
export type Move = { text: string; prompt: string; reply: string; rating: Rating; why: string; points: number; fillers: number; deduction: number; source: 'text' | 'voice'; guided: boolean; experimental?: boolean; evidence?: string; state?: ConversationState; delivery?: Delivery; sources?: CoachSource[]; live?: boolean };

export function dialogueLines(text: string): string[] {
  // These are authored, short dialogue lines; preserve punctuation and never cut a word into a typing effect.
  return (text.match(/[^.!?]+(?:[.!?]+[”’"]?|$)/g) ?? []).map(line => line.trim()).filter(Boolean);
}

export function fillerCount(text: string): number {
  // ponytail: conservative transcript heuristic; real audio alignment is needed for reliable delivery analysis.
  return (text.match(/\b(?:u+h+|u+m+|erm|er+|hmm)\b/gi)?.length ?? 0) + (text.match(/(?:^|,)\s*like\s*,/gi)?.length ?? 0);
}

export function evaluate(lesson: Lesson, index: number, text: string, persona: PersonaId, source: 'text' | 'voice', fluency: boolean, prompt: string): Move {
  const step = lesson.steps[index];
  const value = text.trim().slice(0, 600);
  if (!value) throw new Error('Write or record a reply first.');
  const authored = step.choices.find(c => c.text === value);
  let rating: Rating = authored?.rating ?? 'good';
  let why = authored?.why ?? 'Your reply keeps the exchange moving. Try connecting it to one specific detail in their last line.';
  if (!authored) {
    // ponytail: keyword-based demo coaching, not an LLM assessment. Replace at this boundary with grounded model feedback.
    const lower = value.toLowerCase();
    const relates = step.keywords.some(word => lower.includes(word));
    const shares = /\b(i|i’m|i'm|my|me)\b/i.test(value);
    const questions = (value.match(/\?/g) ?? []).length;
    const joke = /\b(haha|lol|lmao|consultancy|skill issue)\b/i.test(value);
    const dismisses = /\b(stupid|idiot|shut up|boring|who cares)\b/i.test(value);
    const seriousCue = (lesson.id === 'room' && index > 0) || ['exit', 'support', 'deescalate'].includes(lesson.id);
    if (dismisses || (joke && seriousCue)) {
      rating = 'mistake'; why = seriousCue ? 'Their last line signals worry or a need to leave. Try acknowledging that before adding humour.' : 'This wording may sound dismissive. React to their experience without making them the target.';
    } else if (questions > 2) {
      rating = 'missed'; why = 'Several questions at once can feel like an interview. Pick one detail and give them room to answer.';
    } else if (relates && (shares || questions === 1)) {
      rating = 'great'; why = 'You picked up a relevant detail and gave them something clear to respond to.';
    } else if (relates) {
      rating = 'good'; why = 'You stayed with the current topic. A small personal detail or a focused follow-up could take it further.';
    } else if (value.split(/\s+/).length < 4) {
      rating = 'missed'; why = 'A short answer can be fine. For this target, try adding one detail they can build on.';
    }
    if (joke && !seriousCue && !dismisses) {
      if (persona === 'leo') { rating = 'great'; why = 'A light joke fits this playful moment. Keep watching for a change in tone.'; }
      if (persona === 'sam') { rating = 'good'; why = 'The humour may land, but this partner is more direct. Their next response will give you a better cue.'; }
    }
  }
  const fillers = source === 'voice' ? fillerCount(value) : 0;
  const deduction = fluency ? Math.min(fillers * 2, 6) : 0;
  const positive = rating === 'great' || rating === 'brilliant';
  const reply = rating === 'mistake' || rating === 'blunder' ? step.negative : positive ? step.positive : step.neutral;
  return { text: value, prompt, reply: positive && persona !== lesson.partner ? `${people[persona].reaction} ${reply}` : reply, rating, why, points: ratings[rating].points - deduction, fillers, deduction, source, guided: Boolean(authored) };
}

export type Session = { id: string; lessonId: string; persona: PersonaId; date: string; moves: Move[]; xp: number; engine?: 'local' | 'guided'; model?: string; voice?: string };
export type Progress = { version: 1; sessions: Session[]; challengeDates: string[] };
export const emptyProgress = (): Progress => ({ version: 1, sessions: [], challengeDates: [] });
export function loadProgress(raw: string | null): Progress {
  try {
    const p = JSON.parse(raw ?? 'null');
    if (p?.version !== 1 || !Array.isArray(p.sessions) || !Array.isArray(p.challengeDates)) return emptyProgress();
    const sessions = p.sessions.filter((s: Session) => s && typeof s.id === 'string' && lessons.some(l => l.id === s.lessonId) && s.persona in people && typeof s.date === 'string' && Number.isFinite(Date.parse(s.date)) && Number.isFinite(s.xp) && s.xp >= 0 && s.xp <= 90 && Array.isArray(s.moves) && (s.engine === 'local' ? s.moves.length >= 1 && s.moves.length <= LOCAL_MAX_TURNS : s.moves.length === 3) && s.moves.every(m => m && typeof m.text === 'string' && typeof m.prompt === 'string' && typeof m.reply === 'string' && typeof m.why === 'string' && m.rating in ratings && Number.isFinite(m.points) && Number.isFinite(m.fillers) && Number.isFinite(m.deduction) && (m.state === undefined || isConversationState(m.state))));
    return { version: 1, sessions: sessions.slice(-60), challengeDates: p.challengeDates.filter((d: unknown) => typeof d === 'string').slice(-90) };
  } catch { return emptyProgress(); }
}
export function dayKey(date = new Date()): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function streak(sessions: Session[], now = new Date()): number {
  const days = new Set(sessions.map(s => dayKey(new Date(s.date))));
  const cursor = new Date(now); let count = 0;
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) { count++; cursor.setDate(cursor.getDate() - 1); }
  return count;
}
