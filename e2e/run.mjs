// End-to-end walk-through at iPhone size. Usage: node e2e/run.mjs <baseUrl> <outDir>
import { createRequire } from 'node:module';

// Uses the globally installed Playwright (require works via NODE_PATH; ESM import does not).
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const [base = 'http://localhost:4173/', out = 'e2e/screens'] = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 14'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const waitFaceDown = () => page.waitForSelector('.study[data-phase="faceDown"]');
// Wait for the card to land face down, tap to flip it, then wait for the prompt.
const waitPrompt = async () => {
  await waitFaceDown();
  await page.click('.stage');
  await page.waitForSelector('.study[data-phase="prompt"]');
};
const waitAnswer = () => page.waitForSelector('.study[data-phase="answer"]');

await page.goto(base);
await page.waitForSelector('.home');
await shot('01-home-empty');

// Add 10 new cards from all categories and study French -> English.
await page.click('.add .secondary');
await page.waitForSelector('.start:not([disabled])');
await shot('02-home-with-cards');
await page.click('.start');
await page.waitForTimeout(300);
await shot('03-card-rising');
await waitFaceDown();
await shot('03b-face-down');
await waitPrompt();
await shot('04-prompt-fr-en');
await page.click('.stage');
await page.waitForTimeout(300);
await shot('05-revealing');
await waitAnswer();
await shot('06-answer-fr-en');
for (const g of [1, 3, 4]) {
  await page.click(`.grade.g${g}`);
  await waitPrompt();
  await page.click('.stage');
  await waitAnswer();
}
await page.click('.study-bar [aria-label="Undo"]');
await waitPrompt();
await page.click('.study-bar [aria-label="Close"]');

// English -> French.
await page.click('.segmented button:has-text("EN → FR")');
await page.click('.start');
await waitPrompt();
await shot('07-prompt-en-fr');
await page.click('.stage');
await waitAnswer();
await shot('08-answer-en-fr');
await page.click('.study-bar [aria-label="Close"]');

// Typing mode.
await page.click('.segmented button:has-text("FR → EN")');
await page.click('.segmented button:has-text("Type")');
await page.click('.start');
await waitPrompt();
await page.fill('.answer-input', 'I have');
await shot('09-typing');
await page.click('.check-btn');
await waitAnswer();
await shot('10-typed-result');

// Finish the session quickly with "Easy".
for (let i = 0; i < 600 && !(await page.$('.summary')); i++) {
  if (await page.$('.study[data-phase="answer"]')) await page.click('.grade.g4');
  else if (await page.$('.study[data-phase="prompt"] .type-form:not([hidden])')) await page.click('.check-btn');
  else if (await page.$('.study[data-phase="prompt"], .study[data-phase="faceDown"]')) await page.click('.stage');
  await page.waitForTimeout(150);
}
await page.waitForSelector('.summary');
await shot('11-summary');
await page.click('.summary .primary');

// Vowels only, to see a pronunciation card.
await page.click('.segmented button:has-text("Flip")');
for (const name of ['The “ay” sound', 'Accents é è ê ë', 'Nasal sounds', 'Verbs']) await page.click(`.cat-row:has-text("${name}")`);
await page.click('.add .secondary');
await page.click('.start');
await waitPrompt();
await shot('12-pronunciation');
await page.click('.study-bar [aria-label="Close"]');

await page.click('[aria-label="Statistics"]');
await shot('13-stats');
await page.click('[aria-label="Back"]');
await page.click('[aria-label="Settings"]');
await shot('14-settings');
await page.click('.segmented button:has-text("Français")');
await page.click('[aria-label="Retour"]');
await shot('15-home-french');

// Progress survives a reload.
await page.reload();
await page.waitForSelector('.home');
const stillThere = await page.textContent('.start');
console.log('after reload:', stillThere);
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors');
await browser.close();
