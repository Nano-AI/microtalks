import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dialogueLines, evaluate, fillerCount, lessons, loadProgress, streak, type Session } from './engine.ts';

test('every lesson has a playable three-turn route with evidence-grounded feedback', () => {
  for (const lesson of lessons) {
    assert.equal(lesson.steps.length, 3);
    lesson.steps.forEach((step, i) => {
      const best = step.choices[0];
      const move = evaluate(lesson, i, best.text, lesson.partner, 'text', true, step.prompt);
      assert.ok(move.points >= 20, `${lesson.id} turn ${i}`);
      assert.equal(move.why, best.why);
      assert.ok(move.reply.length > 10);
      assert.equal(move.prompt, step.prompt);
    });
  }
});
test('clear serious cues override a playful personality; recovery and boundaries earn credit', () => {
  const lesson = lessons.find(l => l.id === 'room')!;
  const mistake = evaluate(lesson, 1, 'You should charge them consultancy fees. Haha.', 'leo', 'text', true, lesson.steps[1].prompt);
  assert.equal(mistake.rating, 'mistake');
  assert.match(mistake.reply, /actually stressed/);
  const recovery = evaluate(lesson, 1, 'That sounds rough. How much have you got left?', 'leo', 'text', true, lesson.steps[1].prompt);
  assert.equal(recovery.rating, 'great');
  assert.ok(recovery.points > mistake.points);
  assert.equal(evaluate(lesson, 2, lesson.steps[2].choices[0].text, 'leo', 'text', true, '').rating, 'brilliant');
});
test('voice deductions are capped, optional, and never apply to typed text or meaningful like', () => {
  const lesson = lessons[0];
  const text = 'Um uh um uh, like, is this the psychology lecture?';
  const voice = evaluate(lesson, 0, text, 'maya', 'voice', true, '');
  assert.equal(voice.fillers, 5);
  assert.equal(voice.deduction, 6);
  assert.equal(evaluate(lesson, 0, text, 'maya', 'voice', false, '').deduction, 0);
  assert.equal(evaluate(lesson, 0, text, 'maya', 'text', true, '').fillers, 0);
  assert.equal(fillerCount('I like photography. It looks like rain. I would like to go.'), 0);
});
test('personalities respond differently without blanket joke penalties', () => {
  const step = lessons[0].steps[0];
  const playful = evaluate(lessons[0], 0, 'Haha I need a degree in campus maps', 'leo', 'text', false, step.prompt);
  const reserved = evaluate(lessons[0], 0, 'Haha I need a degree in campus maps', 'sam', 'text', false, step.prompt);
  assert.equal(playful.rating, 'great');
  assert.equal(reserved.rating, 'good');
  assert.notEqual(playful.reply, reserved.reply);
});
test('storage rejects malformed entries and blank replies fail clearly', () => {
  assert.deepEqual(loadProgress('broken').sessions, []);
  assert.deepEqual(loadProgress('{"version":1,"sessions":[{}],"challengeDates":[]}').sessions, []);
  assert.deepEqual(loadProgress('{"version":2,"sessions":[],"challengeDates":[]}').sessions, []);
  assert.throws(() => evaluate(lessons[0], 0, '  ', 'maya', 'text', true, ''), /reply first/);
});
test('streak counts unique local calendar days, allows yesterday, and expires after a gap', () => {
  const session = (day: number) => ({ date: new Date(2026, 8, day, 12).toISOString() } as Session);
  assert.equal(streak([session(20), session(21), session(21)], new Date(2026, 8, 22, 12)), 2);
  assert.equal(streak([session(20), session(22)], new Date(2026, 8, 22, 12)), 1);
  assert.equal(streak([session(19), session(20)], new Date(2026, 8, 22, 12)), 0);
  assert.equal(streak([], new Date()), 0);
});

test('dialogue is delivered in complete, punctuated thoughts without losing words', () => {
  assert.deepEqual(dialogueLines('Oh, good. I’ve been here before! Have you?'), ['Oh, good.', 'I’ve been here before!', 'Have you?']);
  assert.deepEqual(dialogueLines(''), []);
  assert.deepEqual(dialogueLines('Still listening'), ['Still listening']);
  for (const lesson of lessons) {
    for (const step of lesson.steps) {
      assert.equal(dialogueLines(step.prompt).join(' '), step.prompt);
    }
  }
});

test('short local conversations survive storage while short guided attempts do not', () => {
  const move = evaluate(lessons[0], 0, lessons[0].steps[0].choices[0].text, 'maya', 'text', false, lessons[0].steps[0].prompt);
  const session = { id: 'early-exit', lessonId: 'opening', persona: 'maya', date: new Date().toISOString(), moves: [{ ...move, points: 15, state: { mood: 'annoyed', ended: true, endReason: 'hostility', memories: [] } }], xp: 15, engine: 'local' };
  assert.equal(loadProgress(JSON.stringify({ version: 1, sessions: [session], challengeDates: [] })).sessions.length, 1);
  assert.equal(loadProgress(JSON.stringify({ version: 1, sessions: [{ ...session, engine: 'guided' }], challengeDates: [] })).sessions.length, 0);
});
