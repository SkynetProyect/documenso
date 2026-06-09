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

  await page.fill('[data-testid="signer-email-input"]', 'venividivichi3105@gmail.com');
  await page.fill('input[name*="name"], input[placeholder*="nombre"], input[placeholder*="Name"]', 'programador');
  await page.click('.text-primary-foreground:nth-child(1)');
  await page.waitForTimeout(1000);
  await page.click('.group:nth-child(2)');
  await page.click('canvas:first-of-type');
  await page.click('.text-primary-foreground');
  await page.waitForTimeout(1000);

  await page.locator('button', { hasText: 'None' }).click();
  await page.locator('button', { hasText: 'Generate Links' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/edit'));
  await page.waitForTimeout(2000);

  await Promise.all([page.waitForURL('**/sign/**'), page.locator('a', { hasText: 'Sign' }).click()]);

  await page.waitForTimeout(2000);
  await page.locator('.hover\\:text-destructive').click();
  await page.fill('textarea', 'motivo');
  await page.click('.bg-destructive');

  await browser.close();
})();
