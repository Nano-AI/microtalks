import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AudioEndpointer } from '../public/audio-endpoint.js';

function feed(detector, seconds, amplitude = 0) {
  const events = [];
  for (let t = 0; t < seconds * 100; t++) {
    const samples = new Float32Array(160).fill(amplitude);
    const event = detector.push(samples);
    if (event) events.push(event);
  }
  return events;
}
test('silence and an isolated click never submit a voice turn', () => {
  const detector = new AudioEndpointer(16000);
  assert.deepEqual(feed(detector, 1), []);
  assert.deepEqual(feed(detector, .02, .1), []);
  assert.deepEqual(feed(detector, 2), []);
});
test('speech followed by a configured pause yields exactly one endpoint', () => {
  const detector = new AudioEndpointer(16000, 1600);
  assert.deepEqual(feed(detector, .5, .05), ['speech-start']);
  assert.deepEqual(feed(detector, 1), []);
  assert.deepEqual(feed(detector, .4, .05), []);
  assert.deepEqual(feed(detector, 1.7), ['speech-end']);
  assert.deepEqual(feed(detector, 3), []);
});
test('an idle microphone pauses instead of creating an empty utterance', () => {
  const detector = new AudioEndpointer(16000);
  assert.deepEqual(feed(detector, 20.1, .001), ['idle']);
});
