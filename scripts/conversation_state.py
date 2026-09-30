"""Fictional character continuity and conservative, explicit conversation boundaries."""
import re

MAX_TURNS = 6
MOODS = ['open', 'playful', 'reserved', 'guarded', 'annoyed', 'sad', 'calmer']
VOICE_CHOICES = {
    'maya': [{'id': 'bf_emma', 'label': 'Warm British'}, {'id': 'bf_isabella', 'label': 'Soft British'}],
    'leo': [{'id': 'bm_fable', 'label': 'British storyteller'}, {'id': 'bm_daniel', 'label': 'Clear British'}, {'id': 'bm_george', 'label': 'Mellow British'}],
    'sam': [{'id': 'bm_george', 'label': 'Mellow British'}, {'id': 'bm_daniel', 'label': 'Clear British'}],
}
END_REASONS = ['none', 'goodbye', 'hostility', 'natural', 'session_limit']
PROFILES = {
    'maya': {
        'name': 'Maya', 'voice': 'bf_emma', 'speed': 1.02, 'mood': 'open',
        'description': 'A fictional golden dog student. Warm, curious and enthusiastic. Shares small stories, gives people room, and gets firm when disrespected.',
        'facts': 'First-year psychology student from Coventry. Likes cooking, running and live music. Lives in student accommodation.',
        'style': 'Everyday British English, relaxed contractions. Warm but not relentlessly upbeat. Usually one or two sentences. Avoid interviewing people with a question every turn.',
        'example': 'Oh, I did the same thing on Monday. The signs here are not doing us any favours.',
        'exit': 'That was rude. I’m not going to stay and be insulted. I’m leaving.',
        'goodbye': 'Of course. It was nice talking to you. See you around!',
    },
    'leo': {
        'name': 'Leo', 'voice': 'bm_fable', 'speed': .96, 'mood': 'reserved',
        'description': 'A fictional red fox student. Cautious and a little shy with strangers; becomes lively and playfully witty when comfortable. Firm when disrespected.',
        'facts': 'First-year media student from Birmingham. Likes football and stand-up comedy. Takes psychology as an elective.',
        'style': 'Understated British storybook wit: dry, quietly amused, concise and a little mischievous. Start cautiously, then become animated around a genuine common interest. Do not imitate or name a particular actor or film character. Serious about real distress.',
        'example': 'Twenty minutes in the wrong lecture? Honestly, that is impressive commitment.',
        'exit': 'Yeah, no. You don’t get to talk to me like that. I’m out.',
        'goodbye': 'Catch you later. Good luck finding the right room this time.',
    },
    'sam': {
        'name': 'Sam', 'voice': 'bm_george', 'speed': .94, 'mood': 'reserved',
        'description': 'A fictional owl student. Observant, quiet and matter-of-fact. Warms up around shared interests and ends uncomfortable conversations directly.',
        'facts': 'First-year computer science student from Sheffield. Takes a psychology elective. Enjoys bird photography with a camera inherited from a grandparent.',
        'style': 'Plain British English. Often one short sentence. Reserved is not hostile. Opens up a little about photography. Do not turn every short answer into a question.',
        'example': 'Mostly birds. Got a decent photo of a heron this morning, actually.',
        'exit': 'Don’t call me that. I’m done with this conversation.',
        'goodbye': 'Sure. See you next time.',
    },
}

SCENES = {
    'opening': 'First week. Waiting outside a psychology lecture that has not started. You got lost earlier; this is the correct building. You and the learner have just met.',
    'follow': 'Sharing a table in the campus café after photographing birds by the river. Your camera was inherited from your grandad. Today you photographed a kingfisher. You are learning photography.',
    'room': 'You have a group presentation TOMORROW. Teammates have not helped. TWO slides remain. You have barely slept and want quiet time to finish. The learner is NOT in your project group. Start genuinely worried, not playful.',
    'share': 'Shared accommodation kitchen. The LEARNER is cooking. YOU are waiting for the kettle and learning to cook. You burned rice yesterday. Do not claim to be cooking the learner’s meal.',
    'join': 'Your first photography society meetup. You accidentally stayed in an economics lecture for twenty minutes yesterday. You are telling that story to another student; the learner is joining the conversation.',
    'exit': 'After a seminar. You have a lab across campus in ten minutes and genuinely need to leave soon. Answer briefly, then end warmly within two learner turns. Do not invent an urgent emergency.',
    'deescalate': 'Shared kitchen. Your clearly labelled lunch has disappeared for the SECOND time this week. You are frustrated and feel ignored. You do NOT know who took it, and the learner did not admit taking it. Do not accuse them as a fact. Acknowledgment and a practical, agreed next step can gradually calm you; "calm down" or minimizing the problem can annoy you. You can remain frustrated even after a good response.',
    'support': 'After class. You failed an exam you studied hard for and feel sad and embarrassed. You want someone to listen, not a motivational lecture. No immediate crisis or self-harm scenario. Acknowledgment or quiet company helps gradually; forced positivity and unsolicited fixes feel dismissive. You do not become instantly happy after one supportive sentence.',
}


def initial_mood(persona, scene):
    return 'annoyed' if scene == 'deescalate' else 'sad' if scene == 'support' else 'guarded' if scene == 'room' else PROFILES[persona]['mood']


def end_intent(value):
    normalized = value.lower().replace('’', "'")
    # Quoted examples and reported speech are not necessarily directed at the partner.
    normalized = re.sub(r'["“][^"”]*["”]', '', normalized)
    if re.search(r"\b(?:not saying|not calling) you", normalized):
        return None
    insult = re.search(
        r"\b(?:fuck you|fuck off|go fuck yourself|shut (?:the fuck )?up)\b|"
        r"\b(?:you(?:'re| are)|ur|are you)\s+(?:(?:a|an|so|such|really|fucking|bloody|damn|just|very|absolute|total)\s+){0,5}(?:stupid|idiot|moron|dumb|asshole|bitch|dickhead)\b|"
        r"\byou\s+(?:fucking\s+)?(?:idiot|moron|asshole|bitch|dickhead)\b", normalized)
    if insult:
        return 'hostility'
    goodbye = re.search(
        r"^(?:bye|goodbye|bye bye)[!. ]*$|\bsee (?:you|ya) (?:later|around|next\b)|"
        r"\b(?:i (?:need to|have to|should|must)|i've got to|gotta) (?:go(?! (?:over|through|with)\b)|leave|head (?:in|into|off|out|to)|get (?:going|inside|back))\b|"
        r"\b(?:leave me alone|go away|don't talk to me|let's end this|i'm leaving|i'm heading (?:off|out))\b", normalized)
    return 'goodbye' if goodbye else None


def valid_memories(items, messages):
    if not isinstance(items, list):
        return []
    found = []
    for item in items[:12]:
        if not isinstance(item, dict) or item.get('speaker') not in ('learner', 'partner'):
            continue
        quote = item.get('quote')
        if not isinstance(quote, str) or not 3 <= len(quote) <= 180:
            continue
        role = 'user' if item['speaker'] == 'learner' else 'assistant'
        if any(quote in m['content'] for m in messages if m['role'] == role) and item not in found:
            found.append({'speaker': item['speaker'], 'quote': quote})
    return found


def state_for(persona, scene, raw, messages):
    raw = raw if isinstance(raw, dict) else {}
    return {'mood': raw.get('mood') if raw.get('mood') in MOODS else initial_mood(persona, scene),
            'ended': raw.get('ended') is True, 'endReason': raw.get('endReason') if raw.get('endReason') in END_REASONS else 'none',
            'memories': valid_memories(raw.get('memories', []), messages)}


ACTOR_SCHEMA = {'type': 'object', 'additionalProperties': False, 'properties': {
    'reply': {'type': 'string'}, 'ended': {'type': 'boolean'},
    'endReason': {'type': 'string', 'enum': END_REASONS},
    'mood': {'type': 'string', 'enum': MOODS},
    'remember': {'type': 'array', 'maxItems': 2, 'items': {'type': 'object', 'additionalProperties': False,
        'properties': {'speaker': {'type': 'string', 'enum': ['learner', 'partner']}, 'quote': {'type': 'string'}},
        'required': ['speaker', 'quote']}},
}, 'required': ['reply', 'ended', 'endReason', 'mood', 'remember']}
