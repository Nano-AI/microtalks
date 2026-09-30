"""Exercise real services; outputs stay on the SSD. Not a subjective voice-quality evaluation."""
import io
import json
import os
from pathlib import Path
import urllib.request
import numpy as np
import soundfile as sf
from benchmark_local_ai import transcribe, word_error_rate

ROOT = Path(os.environ.get('MICROTALKS_AI_DIR', '/Volumes/Extreme SSD/Microtalks'))
RESULTS = ROOT / 'results'
BASE = 'http://127.0.0.1:8765/api/local/'

def call(path, data=None):
    request = urllib.request.Request(BASE + path, data=json.dumps(data).encode() if data else None, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=180) as response:
        return response.read() if path == 'speech' else json.load(response)

output = {'health': call('health'), 'voices': [], 'conversations': []}
sentence = 'Oh, lovely. Another corridor that looks exactly like the last one. Shall we try the next door?'
for voice in ['bm_fable', 'bm_daniel', 'bm_george']:
    raw = call('speech', {'persona': 'leo', 'voice': voice, 'text': sentence})
    audio, rate = sf.read(io.BytesIO(raw))
    file = RESULTS / f'fox-{voice}.wav'; file.write_bytes(raw)
    recognition = transcribe(file, f'fox-check-{voice}')
    item = {'voice': voice, 'sample_rate': rate, 'seconds': round(len(audio) / rate, 2), 'peak': round(float(np.max(np.abs(audio))), 3), 'transcript': recognition['text'], 'normalized_wer': word_error_rate(sentence, recognition['text'])}
    output['voices'].append(item); print(json.dumps(item), flush=True)

base = {'persona': 'maya', 'lessonId': 'opening', 'context': 'Waiting outside a lecture.', 'target': 'Find an opening.'}
messages = [{'role': 'assistant', 'content': 'Please tell me this is the psychology lecture. I got lost finding it.'}]
state = None
for user in ['Yes, this is the right place. I’m Alex, from Bristol, and I’m studying law.', 'I play badminton on weekends. I’m still finding my way around campus.', 'Do you remember my name and what I’m studying?']:
    messages.append({'role': 'user', 'content': user})
    result = call('turn', {**base, 'state': state, 'messages': messages})
    messages.append({'role': 'assistant', 'content': result['reply']}); state = result['state']
    output['conversations'].append({'user': user, **result}); print(json.dumps(result, ensure_ascii=False), flush=True)
output['memory_recall_pass'] = 'alex' in result['reply'].lower() and 'law' in result['reply'].lower()

for lesson, opener, reply in [
    ('deescalate', 'Someone’s taken my labelled lunch again. I’m fed up with this.', 'That’s really frustrating when you’d clearly labelled it. Has it happened before?'),
    ('support', 'I failed that exam. I studied so hard and I feel embarrassed.', 'I’m sorry. You worked hard, so I can see why that hurts. Would company help?'),
]:
    result = call('turn', {**base, 'lessonId': lesson, 'messages': [{'role': 'assistant', 'content': opener}, {'role': 'user', 'content': reply}]})
    output['conversations'].append({'lesson': lesson, **result}); print(json.dumps(result, ensure_ascii=False), flush=True)

for reply in ["You're fucking stupid.", 'I need to go. See you later!']:
    result = call('turn', {**base, 'persona': 'leo', 'messages': [{'role': 'assistant', 'content': 'Hi there.'}, {'role': 'user', 'content': reply}]})
    assert result['state']['ended'], result
    output['conversations'].append({'user': reply, **result}); print(json.dumps(result, ensure_ascii=False), flush=True)

# A real synthesized clip with trailing silence for Chromium's automatic-endpoint test.
raw = call('speech', {'persona': 'maya', 'text': 'Hello, I am Alex. I just moved here from Bristol.'})
audio, rate = sf.read(io.BytesIO(raw))
sf.write(RESULTS / 'hands-free-mic.wav', np.concatenate([audio, np.zeros(int(rate * 3))]), rate, subtype='PCM_16')
(RESULTS / 'live-feature-check.json').write_text(json.dumps(output, indent=2, ensure_ascii=False))
print('Memory recall check:', output['memory_recall_pass'])
print('Results:', RESULTS / 'live-feature-check.json')
