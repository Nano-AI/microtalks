import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

function wav(seconds: number, voicedSeconds: number) {
  const rate = 16000, length = Math.round(rate * seconds);
  const buffer = Buffer.alloc(44 + length * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++) buffer.writeInt16LE(i < rate * voicedSeconds ? Math.round(Math.sin(i / rate * Math.PI * 400) * 6000) : 0, 44 + i * 2);
  return buffer;
}

test('hands-free captures a turn, submits after silence, locks text, and stops on an early ending', async () => {
  test.setTimeout(60000);
  const directory = await mkdtemp('/var/folders/n2/fp41fkxn2nz96bbnn693mlj00000gn/T/opencode/microtalks-mic-');
  const file = join(directory, 'microphone.wav');
  await writeFile(file, wav(5, 1.2));
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', `--use-file-for-fake-audio-capture=${file}`] });
  const context = await browser.newContext({ permissions: ['microphone'], reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  let submissions = 0;
  try {
    await page.route('**/api/local/health', r => r.fulfill({ json: { ready: true, voice: true, transcription: true, model: 'test-model' } }));
    await page.route('**/api/local/speech', r => r.fulfill({ contentType: 'audio/wav', body: wav(.4, .2) }));
    await page.route('**/api/local/transcribe', r => r.fulfill({ json: { text: r.request().postDataJSON().preview ? 'I’m Alex.' : 'I’m Alex. I need to go now. Goodbye.', truncated: false } }));
    await page.route('**/api/local/turn', r => {
      submissions++;
      expect(r.request().postDataJSON().messages.at(-1).content).toBe('I’m Alex. I need to go now. Goodbye.');
      return r.fulfill({ json: { reply: 'See you around, Alex.', model: 'test-model', state: { mood: 'open', ended: true, endReason: 'goodbye', memories: [{ speaker: 'learner', quote: 'I’m Alex.' }] } } });
    });
    await page.route('**/api/local/grade', r => r.fulfill({ json: { rating: 'great', reason: 'A clear, warm goodbye.', evidence: 'Goodbye.', sources: [] } }));
    await page.goto('http://127.0.0.1:5173');
    await page.getByRole('button', { name: 'Try local AI', exact: true }).click();
    await page.getByRole('button', { name: 'Local voice Whisper + Kokoro' }).click();
    await page.getByRole('button', { name: 'Start local conversation' }).click();
    await page.getByRole('button', { name: 'Start live practice' }).click();
    await expect(page.getByRole('button', { name: 'Finish recording' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel('Your reply')).toHaveAttribute('readonly', '');
    await expect(page.getByRole('button', { name: 'Send reply' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Review my moves' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Record your reply' })).toHaveCount(0);
    await expect(page.getByText('You wrapped things up. 15 XP earned.')).toBeVisible();
    expect(submissions).toBe(1);
    await page.getByText('What’s remembered in this scene?', { exact: true }).click();
    await expect(page.locator('.session-memory')).toContainText('I’m Alex.');
    await page.getByRole('button', { name: 'Review my moves' }).click();
    await expect(page.getByRole('button', { name: 'Replay from here' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Start a new attempt' })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Move review', exact: true }).click();
    await expect(page.locator('.history-row')).toHaveCount(1);
    expect(errors).toEqual([]);
  } finally { await browser.close(); await rm(directory, { recursive: true, force: true }); }
});
