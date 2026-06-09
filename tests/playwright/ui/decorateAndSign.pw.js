const assert = require('assert');
const path = require('path');
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

  await page.click('.bg-primary > .flex');
  const fixturePath = path.join(__dirname, '..', 'cypress', 'fixtures', 'momento 1 - Lenin Ospina - 1037668556.pdf');
  await page.setInputFiles('[data-testid="document-upload-input"]', fixturePath);
  await page.waitForURL('**/edit**');
  await page.waitForTimeout(2000);

  await page.click('[data-testid="signer-email-input"]');
  await page.fill('[data-testid="signer-email-input"]', 'venividivichi3105@gmail.com');
  await page.fill('input[name*="name"], input[placeholder*="nombre"], input[placeholder*="Name"]', 'programador');

  await page.click('.text-primary-foreground:nth-child(1)');
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, 1668));
  await page.click('.group:nth-child(2)');
  await page.click('canvas:first-of-type');

  await page.click('.h-12:nth-child(1)');
  await page.click('canvas:first-of-type');
  await page.click('.text-primary-foreground');
  await page.waitForTimeout(1000);

  await page.locator('button', { hasText: 'None' }).click();
  await page.locator('button', { hasText: 'Generate Links' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/edit'));
  await page.waitForTimeout(2000);

  await page.evaluate(() => window.scrollTo(0, 552));
  await page.evaluate(() => window.scrollTo(0, 1032));

  const canvas = page.locator('.konvajs-content > canvas').first();
  await canvas.click();
  await canvas.click();
  await canvas.click();

  await Promise.all([page.waitForURL('**/sign/**'), page.locator('a', { hasText: 'Sign' }).click()]);

  await page.waitForTimeout(2000);
  await page.locator('button', { hasText: 'Next Field' }).click();
  await page.waitForTimeout(1000);
  await page.locator('div:nth-child(1) > .relative canvas').first().click();
  await page.waitForTimeout(1000);
  await page.locator('button', { hasText: 'Complete' }).click();
  await page.waitForTimeout(1000);
  await page.locator('button', { hasText: 'Sign' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/sign/'));

  assert.ok(!page.url().includes('/sign/'));
  await browser.close();
})();
