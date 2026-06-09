const assert = require('assert');
const path = require('path');
const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/signin');
  await page.fill('input[type="email"]', 'venividivichi3105@gmail.com');
  await page.fill('input[type="password"]', 'Clave1234**A');
  await Promise.all([page.waitForNavigation(), page.click('.bg-primary')]);

  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents');
  await page.setViewportSize({ width: 1854, height: 963 });

  await page.click('.bg-primary > .flex');

  const fixturePath = path.join(__dirname, '..', 'cypress', 'fixtures', 'momento 1 - Lenin Ospina - 1037668556.pdf');
  await page.setInputFiles('[data-testid="document-upload-input"]', fixturePath);
  await page.waitForURL('**/edit**');

  await Promise.all([page.waitForURL('**/documents**'), page.click('[href="/t/personal_kbudzsciukycrosn/documents"]')]);

  assert.ok(page.url().includes('/documents'));
  await browser.close();
})();
