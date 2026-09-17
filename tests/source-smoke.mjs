import { chromium } from 'playwright';

const url = process.env.SMOKE_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist'
  ]
});

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  const failedRequests = [];
  const consoleErrors = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  if (!response || !response.ok()) {
    throw new Error(`page load failed: ${response?.status() ?? 'no response'}`);
  }

  let result = null;
  for (let i = 0; i < 40; i++) {
    result = await page.evaluate(() => ({
      errorHidden: document.getElementById('error')?.hidden ?? false,
      errorText: document.getElementById('error')?.textContent ?? '',
      roster: document.getElementById('roster')?.textContent ?? '',
      frames: Number(document.getElementById('stats')?.dataset.frames || 0),
      status: document.getElementById('status')?.textContent ?? ''
    }));
    if (!result.errorHidden || result.frames > 2) break;
    await page.waitForTimeout(250);
  }

  if (!result?.errorHidden) {
    throw new Error(`scene error: ${result?.errorText || 'unknown'} | status=${result?.status || ''}`);
  }
  if ((result?.frames || 0) < 3) {
    throw new Error(`render loop did not advance: ${result?.frames || 0} | status=${result?.status || ''} | pageErrors=${pageErrors.join(' | ')} | requestFailures=${failedRequests.join(' | ')} | consoleErrors=${consoleErrors.join(' | ')}`);
  }

  await page.evaluate(() => {
    const select = document.getElementById('enemy-mode');
    if (!select) throw new Error('enemy-mode select missing');
    select.value = 'water';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await page.waitForTimeout(1000);
  result = await page.evaluate(() => ({
    errorHidden: document.getElementById('error')?.hidden ?? false,
    errorText: document.getElementById('error')?.textContent ?? '',
    roster: document.getElementById('roster')?.textContent ?? '',
    frames: Number(document.getElementById('stats')?.dataset.frames || 0)
  }));

  if (!result.errorHidden) throw new Error(`scene error after Water Calf reset: ${result.errorText}`);
  if (!result.roster.includes('Water Calf')) throw new Error(`Water Calf missing from roster: ${result.roster}`);
  if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(' | ')}`);
  if (failedRequests.length) throw new Error(`request failures: ${failedRequests.join(' | ')}`);

  console.log('source-first runtime smoke passed', result);
} finally {
  await browser.close();
}
