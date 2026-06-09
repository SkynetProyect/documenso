const assert = require('assert');
const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  await page.goto('https://example.cypress.io');
  assert.ok(page.url().includes('example.cypress.io'));

  await browser.close();
})();
