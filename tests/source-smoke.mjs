import { chromium } from 'playwright';

const url = process.env.SMOKE_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
});

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  if (!response || !response.ok()) {
    throw new Error(`page load failed: ${response?.status() ?? 'no response'}`);
  }

  await page.waitForFunction(() => {
    const error = document.getElementById('error');
    const stats = document.getElementById('stats');
    return (!error || error.hidden) && stats && Number(stats.dataset.frames || 0) > 2;
  }, { timeout: 30000 });

  await page.evaluate(() => {
    const select = document.getElementById('enemy-mode');
    if (!select) throw new Error('enemy-mode select missing');
    select.value = 'water';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => ({
    errorHidden: document.getElementById('error')?.hidden ?? false,
    errorText: document.getElementById('error')?.textContent ?? '',
    roster: document.getElementById('roster')?.textContent ?? '',
    frames: Number(document.getElementById('stats')?.dataset.frames || 0)
  }));

  if (!result.errorHidden) throw new Error(`scene error: ${result.errorText}`);
  if (!result.roster.includes('Water Calf')) throw new Error(`Water Calf missing from roster: ${result.roster}`);
  if (result.frames < 3) throw new Error(`render loop did not advance: ${result.frames}`);
  if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(' | ')}`);

  console.log('source-first runtime smoke passed', result);
} finally {
  await browser.close();
}
