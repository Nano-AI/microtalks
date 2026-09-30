import { test, expect, chromium, type Page } from '@playwright/test';
const state = (ended = false) => ({ mood: 'open', ended, endReason: ended ? 'goodbye' : 'none', memories: [] });

async function hearLines(page: Page) {
  const controls = page.locator('.dialogue-controls');
  await expect(controls).toBeVisible();
  for (let i = 0; i < 15; i++) {
    if (await controls.getAttribute('data-turn-ready') === 'true') return;
    await expect(page.locator('.speech-bubble .thinking-dots')).toHaveCount(0, { timeout: 90000 });
    if (await controls.getAttribute('data-turn-ready') === 'true') return;
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  throw new Error('Conversation did not yield a reply turn.');
}

test('local AI preserves drafts on failure, stores generated replies, and replays with the same engine', async ({ page }) => {
  await page.route('**/api/local/health', route => route.fulfill({ json: { ready: true, voice: true, transcription: true, model: 'qwen3.5:9b' } }));
  let attempts = 0;
  const prompts: unknown[] = [];
  await page.route('**/api/local/turn', route => {
    prompts.push(route.request().postDataJSON());
    attempts++;
    if (attempts === 1) return route.fulfill({ status: 503, json: { error: 'SSD is disconnected. Reconnect and retry.' } });
    return route.fulfill({ json: { reply: attempts === 2 ? 'A campus choir sounds fun. What do you like singing?' : attempts === 3 ? 'I like that too. I mostly sing on the way to lectures.' : 'Nice talking with you. See you next week!', state: state(attempts >= 4), model: 'qwen3.5:9b' } });
  });
  await page.route('**/api/local/grade', route => route.fulfill({ json: { rating: 'unrated', reason: 'No grounded evidence was found.', evidence: '', validated: false } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Try local AI', exact: true }).click();
  await page.getByRole('button', { name: 'Start local conversation' }).click();
  await hearLines(page);
  await page.getByLabel('Your reply').fill('I’m thinking of joining the campus choir.');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await expect(page.getByRole('alert')).toContainText('SSD is disconnected');
  await expect(page.getByLabel('Your reply')).toHaveValue('I’m thinking of joining the campus choir.');
  await expect(page.getByText('Move 1 · up to 6', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Send reply' }).click();
  await expect(page.locator('.spoken-line')).toHaveText('A campus choir sounds fun.');
  await expect(page.getByRole('region', { name: 'Your response rating' })).toContainText('Not rated');
  await expect(page.getByRole('region', { name: 'Your response rating' })).toContainText('No grounded evidence was found.');
  await hearLines(page);
  await page.getByLabel('Your reply').fill('Mostly indie songs. How about you?');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await hearLines(page);
  await page.getByLabel('Your reply').fill('I need to head in. See you next week!');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await hearLines(page);
  await page.getByRole('button', { name: 'Review my moves' }).click();
  await expect(page.getByText('Experimental AI coaching', { exact: true })).toBeVisible();
  await expect(page.locator('.xp-earned')).toContainText('45');
  await expect(page.locator('.detail-top')).toContainText('Not rated');
  await page.locator('.move-list-item').nth(1).click();
  await page.getByRole('button', { name: 'Replay from here' }).click();
  await expect(page.locator('.local-chip')).toContainText('Local AI');
  await expect(page.locator('.spoken-line')).toHaveText('A campus choir sounds fun.');
  expect(prompts).toHaveLength(4);
  await page.reload();
  await page.getByRole('button', { name: 'Move review', exact: true }).click();
  await page.locator('.history-row').click();
  await expect(page.getByText('Experimental AI coaching', { exact: true })).toBeVisible();
});

test('offline models give setup instructions and prevent a broken local session', async ({ page }) => {
  await page.route('**/api/local/health', route => route.fulfill({ json: { ready: false } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Try local AI', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start local conversation' })).toBeDisabled();
  await expect(page.getByText('Local service is offline')).toBeVisible();
  await expect(page.getByText('bash scripts/start-local-web.sh', { exact: true })).toBeVisible();
});

test('live ratings stay attached to their response without blocking the next reply', async ({ page }) => {
  await page.route('**/api/local/health', route => route.fulfill({ json: { ready: true, voice: true, transcription: true, model: 'qwen3.5:9b' } }));
  await page.route('**/api/local/turn', route => route.fulfill({ json: { reply: 'That makes sense. What are you studying?', model: 'qwen3.5:9b', state: state() } }));
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; });
  let gradeCalls = 0;
  await page.route('**/api/local/grade', async route => {
    const order = ++gradeCalls;
    if (order === 1) await firstGate;
    await route.fulfill({ json: { rating: order === 1 ? 'missed' : 'great', reason: order === 1 ? 'Feedback for the first response.' : 'Feedback for the second response.', evidence: 'A detail from the reply.' } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try local AI', exact: true }).click();
  await page.getByRole('button', { name: 'Start local conversation' }).click();
  await hearLines(page);
  await page.getByLabel('Your reply').fill('First response.');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await hearLines(page);
  await expect(page.getByRole('region', { name: 'Your response rating' })).toContainText('Reviewing your response');
  await page.getByLabel('Your reply').fill('Second response.');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await hearLines(page);
  await expect(page.getByRole('region', { name: 'Your response rating' })).toContainText('Feedback for the second response.');
  releaseFirst();
  await page.locator('.conversation-recap > summary').click();
  await expect(page.locator('.recap-move-rating').first()).toContainText('Missed opportunity');
  await expect(page.getByRole('region', { name: 'Your response rating' })).toContainText('Feedback for the second response.');
  await expect(page.locator('.recap-transcript .message.you')).toHaveCount(2);
});

test('live SSD models: browser microphone pipeline, generated conversation, Kokoro, and review', async () => {
  test.skip(process.env.MICROTALKS_LIVE !== '1', 'Requires the mounted SSD and local backend.');
  test.setTimeout(180000);
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--use-file-for-fake-audio-capture=/Volumes/Extreme SSD/Microtalks/results/voice-maya.wav'] });
  const context = await browser.newContext({ permissions: ['microphone'], viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:8765');
    await page.getByRole('button', { name: 'Try local AI', exact: true }).click();
    await expect(page.getByText('SSD models connected')).toBeVisible();
    await page.getByRole('button', { name: 'Local voice Whisper + Kokoro' }).click();
    const speech = page.waitForResponse(r => r.url().includes('/api/local/speech') && r.status() === 200, { timeout: 60000 });
    await page.getByRole('button', { name: 'Start local conversation' }).click();
    const speechResponse = await speech;
    console.log('Kokoro response headers:', speechResponse.headers());
    expect(Number(speechResponse.headers()['content-length'])).toBeGreaterThan(1000);
    await expect(page.locator('.stage-person .mood-speaking')).toBeVisible({ timeout: 10000 });
    await hearLines(page);
    await page.getByRole('button', { name: 'Record your reply' }).click();
    await expect(page.getByRole('button', { name: 'Finish recording' })).toBeVisible();
    // Let the fake microphone deliver the installed 4.3-second test recording through AudioWorklet.
    await page.waitForTimeout(4600);
    await page.getByRole('button', { name: 'Finish recording' }).click();
    await expect(page.getByLabel('Your reply')).not.toHaveValue('', { timeout: 90000 });
    console.log('Whisper browser transcript:', await page.getByLabel('Your reply').inputValue());
    await page.getByRole('button', { name: 'Send reply' }).click();
    await hearLines(page);
    console.log('Qwen response:', await page.locator('.spoken-line').innerText());
    await expect(page.getByRole('region', { name: 'Your response rating' })).toBeVisible();
    await expect(page.locator('.live-coach-pending')).toHaveCount(0, { timeout: 90000 });
    console.log('Live first-move rating:', await page.getByRole('region', { name: 'Your response rating' }).innerText());
    await page.screenshot({ path: 'test-results/local-ai-live.png', fullPage: true });
    await page.getByRole('button', { name: 'Text', exact: true }).click();
    for (const reply of ['I’m still exploring campus. Have you found anywhere you like?', 'I should head into class. Nice talking to you!']) {
      await page.getByLabel('Your reply').fill(reply);
      await page.getByRole('button', { name: 'Send reply' }).click();
      await hearLines(page);
    }
    await page.getByRole('button', { name: 'Review my moves' }).click();
    await expect(page.getByText('Experimental AI coaching', { exact: true })).toBeVisible({ timeout: 90000 });
    await expect(page.locator('.xp-earned')).toContainText('45');
    await page.screenshot({ path: 'test-results/local-ai-review-live.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});

test('live SSD models: hands-free auto submission and immutable review', async () => {
  test.skip(process.env.MICROTALKS_LIVE !== '1', 'Requires the SSD, backend, and hands-free-mic.wav fixture.');
  test.setTimeout(180000);
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--use-file-for-fake-audio-capture=/Volumes/Extreme SSD/Microtalks/results/hands-free-mic.wav'] });
  const context = await browser.newContext({ permissions: ['microphone'], viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:8765');
    await page.getByRole('button', { name: 'Try local AI', exact: true }).click();
    await page.getByRole('button', { name: /Leo.*the fox/ }).click();
    await page.getByRole('button', { name: 'Local voice Whisper + Kokoro' }).click();
    await page.getByRole('button', { name: 'Start local conversation' }).click();
    const generated = page.waitForResponse(r => r.url().endsWith('/api/local/turn') && r.status() === 200, { timeout: 90000 });
    await page.getByRole('button', { name: 'Start live practice' }).click();
    await expect(page.getByRole('button', { name: 'Finish recording' })).toBeVisible({ timeout: 30000 });
    await expect(page.getByLabel('Your reply')).toHaveAttribute('readonly', '');
    await generated;
    await expect(page.locator('.previous-reply')).toContainText(/Alex|Bristol/i, { timeout: 10000 });
    await page.getByRole('button', { name: 'Pause live' }).click();
    await hearLines(page);
    await page.screenshot({ path: 'test-results/fox-hands-free-live.png', fullPage: true });
    await page.getByRole('button', { name: 'Finish this session', exact: true }).click();
    await page.getByRole('button', { name: 'Review my moves' }).click();
    await expect(page.getByText('Experimental AI coaching', { exact: true })).toBeVisible({ timeout: 90000 });
    await expect(page.getByRole('button', { name: 'Start a new attempt' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Replay from here' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/live-delivery-review.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
