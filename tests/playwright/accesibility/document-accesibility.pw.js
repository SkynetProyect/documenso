const assert = require('assert');
const playwright = require('playwright');

async function addAxe(page) {
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.0/axe.min.js' });
  const results = await page.evaluate(async () => await axe.run());
  assert.strictEqual(results.violations.length, 0, `AXE violations: ${JSON.stringify(results.violations, null, 2)}`);
}

(async () => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  // Sign in page accessibility
  await page.goto('http://localhost:3000/signin');
  await page.setViewportSize({ width: 927, height: 963 });
  await addAxe(page);

  const emailInputId = await page.getAttribute('input[type="email"]', 'id');
  assert.ok(emailInputId, 'Email input should have an id');
  assert.strictEqual(await page.locator(`label[for="${emailInputId}"]`).count(), 1);

  const passwordInputId = await page.getAttribute('input[type="password"]', 'id');
  assert.ok(passwordInputId, 'Password input should have an id');
  assert.strictEqual(await page.locator(`label[for="${passwordInputId}"]`).count(), 1);

  assert.ok(await page.locator('.bg-primary').isVisible());

  await page.focus('input[type="email"]');
  assert.ok(await page.evaluate(() => document.activeElement?.matches('input[type="email"]')));
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.activeElement?.matches('input[type="password"]')));
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.activeElement?.matches('.bg-primary')));

  // Documents page accessibility
  await page.goto('http://localhost:3000/signin');
  await page.fill('input[type="email"]', 'venividivichi3105@gmail.com');
  await page.fill('input[type="password"]', 'Clave1234**A');
  await Promise.all([page.waitForNavigation(), page.click('.bg-primary')]);

  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents');
  await page.setViewportSize({ width: 1854, height: 963 });
  await addAxe(page);

  assert.ok(await page.locator('.bg-primary > .flex').isVisible());
  const hrefs = await page.$$eval('a', (els) => els.map((el) => el.getAttribute('href')));
  hrefs.forEach((href) => assert.notStrictEqual(href, '#'));
  assert.ok((await page.locator('h1, h2, h3').count()) > 0);

  // Envelope editor accessibility
  await page.click('.bg-primary > .flex');
  await page.waitForTimeout(2000);
  const fixturePath = 'tests/cypress/fixtures/momento 1 - Lenin Ospina - 1037668556.pdf';
  await page.setInputFiles('[data-testid="document-upload-input"]', fixturePath);
  await page.waitForURL('**/edit**');
  await page.waitForTimeout(2000);

  const envelopeUrl = page.url();
  await page.goto(envelopeUrl);
  await page.waitForTimeout(4000);
  await addAxe(page);
  assert.ok(await page.locator('[data-testid="signer-email-input"]').isVisible());

  const inputIds = await page.$$eval('input', (elements) =>
    elements.map((input) => input.getAttribute('id')).filter((id) => Boolean(id)),
  );
  for (const id of inputIds) {
    assert.strictEqual(await page.locator(`label[for="${id}"]`).count(), 1);
  }

  // Sign page accessibility
  await page.goto(envelopeUrl);
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
  await addAxe(page);

  assert.ok(await page.locator('.hover\\:text-destructive').isVisible());

  await browser.close();
})();
