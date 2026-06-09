const assert = require('assert');
const playwright = require('playwright');

async function signIn(page) {
  await page.goto('http://localhost:3000/signin');
  await page.fill('input[type="email"]', 'venividivichi3105@gmail.com');
  await page.fill('input[type="password"]', 'Clave1234**A');
  await Promise.all([page.waitForNavigation(), page.click('.bg-primary')]);
}

(async () => {
  const request = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  // Unauthenticated access
  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents');
  assert.ok(page.url().includes('/signin'));

  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents/envelope_arbdlczztznuihmd/edit');
  assert.ok(page.url().includes('/signin'));

  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents/envelope_arbdlczztznuihmd/logs');
  assert.ok(page.url().includes('/signin'));

  const unauthDocResponse = await request.get('/api/trpc/document.findDocumentsInternal', {
    params: {
      input: '%7B%22json%22%3A%7B%22folderId%22%3Anull%7D%7D',
    },
  });
  assert.ok([401, 403].includes(unauthDocResponse.status()));

  const unauthEnvelopeResponse = await request.get(
    '/api/trpc/envelope.editor.get?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22envelopeId%22%3A%22envelope_arbdlczztznuihmd%22%7D%7D%7D',
  );
  assert.ok([401, 403].includes(unauthEnvelopeResponse.status()));

  // Authorized access
  await signIn(page);
  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents');
  assert.ok(page.url().includes('/documents'));

  await page.click('.bg-primary > .flex');
  await page.waitForTimeout(2000);
  const uploadInput = page.locator('[data-testid="document-upload-input"]');
  await uploadInput.setInputFiles('tests/cypress/fixtures/momento 1 - Lenin Ospina - 1037668556.pdf');
  await page.waitForURL('**/edit**');
  assert.ok(page.url().includes('/edit'));

  // Sign link security
  await signIn(page);
  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents');
  await page.waitForTimeout(2000);
  await page.click('.bg-primary > .flex');
  await page.waitForTimeout(2000);
  await uploadInput.setInputFiles('tests/cypress/fixtures/momento 1 - Lenin Ospina - 1037668556.pdf');
  await page.waitForURL('**/edit**');

  await page.fill('[data-testid="signer-email-input"]', 'venividivichi3105@gmail.com');
  await page.fill('input[name*="name"], input[placeholder*="nombre"], input[placeholder*="Name"]', 'programador');
  await page.click('.text-primary-foreground:nth-child(1)');
  await page.click('.group:nth-child(2)');
  await page.click('canvas:first-of-type');
  await page.click('.text-primary-foreground');
  await page.waitForTimeout(1000);
  await page.locator('button', { hasText: 'None' }).click();
  await page.locator('button', { hasText: 'Generate Links' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/edit'));

  const signLink = await page.locator('a', { hasText: 'Sign' }).first();
  assert.ok(await signLink.isVisible());

  const invalidLinkResponse = await request.get('/sign/invalid-token-123');
  assert.ok([404, 400].includes(invalidLinkResponse.status()));

  await browser.close();
  await request.dispose();
})();
