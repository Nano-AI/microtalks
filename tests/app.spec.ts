import { test, expect, type Page } from '@playwright/test';

async function hearAllLines(page: Page) {
  const controls = page.locator('.dialogue-controls');
  await expect(controls).toBeVisible();
  for (let i = 0; i < 12; i++) {
    if (await controls.getAttribute('data-turn-ready') === 'true') return;
    const next = page.getByRole('button', { name: 'Continue', exact: true });
    await expect(next).toBeEnabled();
    await next.click();
  }
  await expect(controls).toHaveAttribute('data-turn-ready', 'true');
}

async function suggestedReply(page: Page, index = 0) {
  await hearAllLines(page);
  await page.getByRole('button', { name: 'Need an idea?' }).click();
  await page.locator('.suggested-replies button').nth(index).click();
  await page.getByRole('button', { name: 'Send reply' }).click();
  await hearAllLines(page);
}

test('golden path: first conversation, specific review, replay, and durable progress', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Small talk. Big little wins.' })).toBeVisible();
  await page.getByRole('button', { name: 'Start a conversation', exact: true }).click();
  await expect(page.getByText('Use the situation you share to start a conversation.')).toBeVisible();
  await page.getByRole('button', { name: 'Let’s talk' }).click();
  await hearAllLines(page);
  await expect(page.getByRole('button', { name: 'Send reply' })).toBeDisabled();
  await suggestedReply(page);
  await suggestedReply(page);
  await suggestedReply(page);
  await page.getByRole('button', { name: 'Review my moves' }).click();
  await expect(page.getByRole('heading', { name: 'There’s a little win in every try.' })).toBeVisible();
  await expect(page.getByText('You answered their question and shared a small experience.')).toBeVisible();
  await page.locator('.move-list-item').nth(1).click();
  await page.getByRole('button', { name: 'Replay from here' }).click();
  await expect(page.getByText('Move 2 of 3', { exact: true })).toBeVisible();
  await expect(page.locator('.message.you')).toHaveCount(1);
  await suggestedReply(page);
  await suggestedReply(page);
  await page.getByRole('button', { name: 'Review my moves' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'My progress', exact: true }).click();
  await expect(page.locator('.progress-summary > div').last()).toContainText('1');
  await expect(page.locator('.progress-summary > div').nth(1)).toContainText('85');
  expect(errors).toEqual([]);
});

test('a joke after a serious cue earns a mistake and offers a turning-point replay', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Lesson 3.*Read the room/ }).click();
  await page.getByLabel('Arcade mode').check();
  await page.getByRole('button', { name: 'Let’s talk' }).click();
  await suggestedReply(page, 1);
  await suggestedReply(page, 1);
  await expect(page.locator('.live-review').last()).toContainText('Mistake');
  await suggestedReply(page, 0);
  await page.getByRole('button', { name: 'Review my moves' }).click();
  await expect(page.locator('.detail-top')).toContainText('Move 2 of 3');
  await expect(page.getByText('They explicitly said they were worried. Another joke misses that clear shift.')).toBeVisible();
});

test('mobile, dark theme, unsupported voice fallback, and keyboard reply', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => { Object.defineProperty(window, 'SpeechRecognition', { value: undefined }); Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined }); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(29, 40, 34)');
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(237, 242, 233)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Start a conversation', exact: true }).click();
  await page.getByRole('button', { name: 'Voice Say it out loud' }).click();
  await page.getByRole('button', { name: 'Let’s talk' }).click();
  await hearAllLines(page);
  await expect(page.getByText('Voice input isn’t supported here. Try Chrome or type below.')).toBeVisible();
  await page.getByLabel('Your reply').fill('Yes, this is the psychology lecture. I got lost too!');
  await page.getByLabel('Your reply').press('Enter');
  await hearAllLines(page);
  await expect(page.getByText('Move 2 of 3', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Leave practice', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Keep going' }).click();
  await expect(page.getByLabel('Your reply')).toBeVisible();
});

test('voice permission errors are actionable and do not prevent text practice', async ({ page }) => {
  await page.addInitScript(() => {
    class DeniedRecognition {
      onerror?: (e: { error: string }) => void;
      onend?: () => void;
      start() { this.onerror?.({ error: 'not-allowed' }); this.onend?.(); }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: DeniedRecognition });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start a conversation', exact: true }).click();
  await page.getByRole('button', { name: 'Let’s talk' }).click();
  await hearAllLines(page);
  await page.getByRole('button', { name: 'Voice', exact: true }).click();
  await page.getByRole('button', { name: 'Record your reply' }).click();
  await expect(page.getByRole('alert')).toContainText('Microphone access was denied');
  await expect(page.getByLabel('Your reply')).toBeEnabled();
});

test('visual checkpoints: desktop, mobile, conversation, and review', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Start a conversation', exact: true }).click();
  await page.getByRole('button', { name: 'Let’s talk' }).click();
  await expect(page.locator('.spoken-line')).toBeVisible();
  await page.screenshot({ path: 'test-results/conversation-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'test-results/conversation-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await suggestedReply(page);
  await suggestedReply(page);
  await suggestedReply(page);
  await page.getByRole('button', { name: 'Review my moves' }).click();
  await page.screenshot({ path: 'test-results/review-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.screenshot({ path: 'test-results/home-mobile-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Keep practising', exact: true }).click();
  await page.screenshot({ path: 'test-results/character-picker.png', fullPage: true });
  await page.getByRole('button', { name: 'Leo Cautious, then playful' }).click();
  await page.getByRole('button', { name: 'Let’s talk' }).click();
  await page.setViewportSize({ width: 320, height: 812 });
  await expect(page.locator('.stage-person .character-leo')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/conversation-mobile-dark.png', fullPage: true });
});

test('a character delivers one bubble at a time and only the current line is read aloud', async ({ page }) => {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    Object.defineProperty(window, 'speechSynthesis', { value: { speak: (utterance: { text: string }) => spoken.push(utterance.text), cancel: () => {} } });
    Object.defineProperty(window, 'testSpokenLines', { value: spoken });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start a conversation', exact: true }).click();
  await expect(page.locator('.persona-option .character')).toHaveCount(3);
  await page.getByRole('button', { name: 'Let’s talk' }).click();
  await expect(page.locator('.stage-person .character-maya')).toBeVisible();
  await expect(page.locator('.spoken-line')).toHaveText('Please tell me this is the psychology lecture.');
  await expect(page.getByLabel('Your reply')).toHaveCount(0);
  await page.getByRole('button', { name: 'Read partner replies aloud' }).click();
  expect(await page.evaluate(() => (window as unknown as { testSpokenLines: string[] }).testSpokenLines.at(-1))).toBe('Please tell me this is the psychology lecture.');
  await page.getByRole('button', { name: 'Continue', exact: true }).press('Enter');
  await expect(page.locator('.spoken-line')).toHaveText('I’ve already been in the wrong building once today.');
  await expect(page.getByLabel('Your reply')).toBeFocused();
  await page.getByLabel('Your reply').fill('Yes, you’re in the right place! I got lost finding it too.');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await expect(page.locator('.spoken-line')).toHaveText('Oh, good.');
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeFocused();
  await hearAllLines(page);
  await page.getByText('Conversation so far', { exact: false }).click();
  await expect(page.locator('.recap-transcript .message.you')).toContainText('I got lost finding it too');
});
