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

  await page.goto('http://localhost:3000/signin');
  await page.setViewportSize({ width: 927, height: 963 });

  await page.fill('input[type="email"]', 'venividivichi3105@gmail.com');
  await page.fill('input[type="password"]', 'WrongPassword123');
  await page.click('.bg-primary');
  assert.ok(page.url().includes('/signin'));

  await page.goto('http://localhost:3000/signin');
  await page.click('.bg-primary');
  assert.ok(page.url().includes('/signin'));

  await page.goto('http://localhost:3000/signin');
  await page.fill('input[type="email"]', 'notanemail');
  await page.fill('input[type="password"]', 'Clave1234**A');
  await page.click('.bg-primary');
  assert.ok(page.url().includes('/signin'));

  await page.goto('http://localhost:3000/signin');
  await page.fill('input[type="email"]', 'venividivichi3105@gmail.com');
  await page.fill('input[type="password"]', 'Clave1234**A');
  await Promise.all([page.waitForNavigation(), page.click('.bg-primary')]);
  assert.ok(!page.url().includes('/signin'));

  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents');
  await page.setViewportSize({ width: 1854, height: 963 });
  await page.waitForTimeout(2000);

  assert.ok(await page.locator('.bg-primary > .flex').isVisible());

  await page.click('.bg-primary > .flex');
  assert.ok((await page.locator('[data-testid="document-upload-input"]').count()) > 0);

  await page.click('.bg-primary > .flex');
  await page.waitForTimeout(2000);
  const fixturePath = path.join(__dirname, '..', 'cypress', 'fixtures', 'momento 1 - Lenin Ospina - 1037668556.pdf');
  await page.setInputFiles('[data-testid="document-upload-input"]', fixturePath);
  await page.waitForURL('**/edit**');
  assert.ok(page.url().includes('/edit'));

  await page.click('[href="/t/personal_kbudzsciukycrosn/documents"]');
  await page.waitForURL('**/documents**');
  assert.ok(page.url().includes('/documents'));

  const documentEditorUrl = page.url();
  await page.goto(documentEditorUrl);
  await page.waitForTimeout(4000);
  assert.ok(await page.locator('[data-testid="signer-email-input"]').isVisible());

  await page.fill('[data-testid="signer-email-input"]', 'venividivichi3105@gmail.com');
  await page.fill('input[name*="name"], input[placeholder*="nombre"], input[placeholder*="Name"]', 'programador');
  assert.strictEqual(
    await page.locator('[data-testid="signer-email-input"]').inputValue(),
    'venividivichi3105@gmail.com',
  );

  await page.fill('[data-testid="signer-email-input"]', 'venividivichi3105@gmail.com');
  await page.fill('input[name*="name"], input[placeholder*="nombre"], input[placeholder*="Name"]', 'programador');
  await page.click('.text-primary-foreground:nth-child(1)');
  assert.ok((await page.locator('canvas').count()) > 0);

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
  assert.ok((await page.locator('a', { hasText: 'Sign' }).count()) > 0);

  await page.goto(documentEditorUrl);
  await page.waitForTimeout(4000);
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
  await page.fill('textarea', 'motivo de rechazo');
  await page.click('.bg-destructive');

  await browser.close();
})();
