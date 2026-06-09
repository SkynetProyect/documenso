const assert = require('assert');
const playwright = require('playwright');

async function signIn(page) {
  await page.goto('http://localhost:3000/signin');
  await page.fill('input[type="email"]', 'venividivichi3105@gmail.com');
  await page.fill('input[type="password"]', 'Clave1234**A');
  await Promise.all([page.waitForNavigation(), page.click('.bg-primary')]);
}

(async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  await signIn(page);
  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents');
  await page.setViewportSize({ width: 1854, height: 963 });

  await Promise.all([
    page.waitForURL('**/envelope_clcunmlwnudymcbe**'),
    page.click('[href="/t/personal_kbudzsciukycrosn/documents/envelope_clcunmlwnudymcbe"]'),
  ]);

  await page.click('html');
  await Promise.all([
    page.waitForURL('**/logs**'),
    page.click('[href="/t/personal_kbudzsciukycrosn/documents/envelope_clcunmlwnudymcbe/logs"]'),
  ]);

  await page.click('.group');
  await page.evaluate(() => window.scrollTo(0, 552));
  await page.evaluate(() => window.scrollTo(0, 138));
  await page.click('.h-12:nth-child(3)');

  assert.ok(page.url().includes('/logs'));
  await browser.close();
})();
