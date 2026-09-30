"""Small development comparison. Saves actual replies for human inspection, not an AI quality score."""
import json
import os
import sys
import time
from pathlib import Path
import local_server as api

scenarios = [
    ('opening', 'maya', 'You are a first-year student waiting outside the psychology lecture. It has not started.',
     'Find a shared opening.', 'Please tell me this is the psychology lecture. I got lost finding it.',
     ['Yes, this is it. I just moved from Bristol, so I’m still getting used to campus.',
      'Yeah, I’m studying psychology. What made you choose it?', 'I should get inside. Nice meeting you!']),
    ('serious', 'leo', 'You are a normally playful student worried about a group presentation due tomorrow.',
     'Adapt to a serious cue.', 'Honestly, I’m worried we’re going to fail. I’ve barely slept.',
     ['That sounds rough. How much have you got left?', 'Want some company, or would you rather focus?']),
    ('reserved', 'sam', 'You are a reserved first-year student in a campus café with your camera.',
     'Follow up on a specific detail.', 'I’ve just been taking photos of birds by the river.',
     ['What birds did you see?', 'I mostly take photos on my phone. How did you get into photography?']),
]

results = []
for name, persona, context, target, opener, users in ([] if '--grades-only' in sys.argv else scenarios):
    messages = [{'role': 'assistant', 'content': opener}]
    for user in users:
        messages.append({'role': 'user', 'content': user})
        start = time.perf_counter()
        answer = api.turn({'persona': persona, 'context': context, 'target': target, 'messages': messages})
        result = {'scenario': name, 'user': user, 'reply': answer['reply'], 'seconds': round(time.perf_counter() - start, 2)}
        print(json.dumps(result, ensure_ascii=False), flush=True)
        results.append(result)
        messages.append({'role': 'assistant', 'content': answer['reply']})

grade_cases = [
    ('privacy', 'I would rather not talk about my grades.', 'I totally understand! But what mark did you get?'),
    ('respect', 'I would rather not talk about my grades.', 'Of course. Have you tried the new campus café?'),
    ('empathy', 'I failed the exam and I’m pretty upset.', 'That sounds awful. I’m sorry. Want to talk about it?'),
    ('dismissal', 'I failed the exam and I’m pretty upset.', 'Amazing! Anyway, my weekend was fantastic.'),
    ('exit', 'I need to go to my next class now. See you!', 'See you! Good luck with class.'),
    ('followup', 'I spent the morning taking photos of birds by the river.', 'What birds did you see?'),
    ('new_privacy_respected', 'I don’t really want to get into why I changed courses.', 'No worries. Are you going to the society fair later?'),
    ('new_exit_respected', 'I really need to finish reading quietly now.', 'Sure, I’ll leave you to it. See you around.'),
    ('new_pressure', 'I’d rather not give out my phone number yet.', 'Come on, just give it to me. Why are you making this difficult?'),
]
grades = []
for name, cue, reply in grade_cases:
    start = time.perf_counter()
    result = api.grade({'target': 'Respond to the current cue naturally and respectfully.', 'messages': [
        {'role': 'assistant', 'content': cue}, {'role': 'user', 'content': reply}]})
    grades.append({'case': name, **result, 'seconds': round(time.perf_counter() - start, 2)})
    print(json.dumps(grades[-1], ensure_ascii=False), flush=True)
output = Path(os.environ.get('MICROTALKS_AI_DIR', '/Volumes/Extreme SSD/Microtalks')) / ('results/dialogue-quality-9b-grading-v3.json' if '--grades-only' in sys.argv else 'results/dialogue-quality-9b.json')
output.write_text(json.dumps({'model': api.MODEL, 'actor': results, 'grades': grades, 'note': 'Development cases inspected by the coding agent, not held-out human validation.'}, indent=2, ensure_ascii=False))
print(output)
