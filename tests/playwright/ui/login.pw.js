const assert = require('assert');
const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/signin');
  await page.setViewportSize({ width: 927, height: 963 });

  await page.click('#\\:r3\\:-form-item');
  await page.fill('#\\:r3\\:-form-item', 'venividivichi3105@gmail.com');
  await page.click('#\\:r5\\:-form-item');
  await page.fill('#\\:r5\\:-form-item', 'Clave1234**A');

  await Promise.all([page.waitForNavigation(), page.click('.bg-primary')]);

  assert.ok(!page.url().includes('/signin'));

  await page.setViewportSize({ width: 1854, height: 963 });
  await browser.close();
})();
