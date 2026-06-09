const assert = require('assert');
const playwright = require('playwright');

(async () => {
  const request = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });

  const csrfResponse = await request.get('/api/auth/csrf');
  assert.strictEqual(csrfResponse.status(), 200);
  const csrfBody = await csrfResponse.json();
  assert.ok(csrfBody.csrfToken, 'Expected csrfToken in response');

  async function authenticate() {
    const authResponse = await request.post('/api/auth/email-password/authorize', {
      data: {
        email: 'venividivichi3105@gmail.com',
        password: 'Clave1234**A',
      },
    });

    assert.ok(
      [200, 201].includes(authResponse.status()),
      `Expected valid credentials to return 200 or 201, got ${authResponse.status()}`,
    );
  }

  async function assertUnauthorized(url, options = {}) {
    const response = await request.fetch(url, options);
    assert.ok(
      [401, 403, 400, 422].includes(response.status()),
      `Expected unauthorized status for ${url}, got ${response.status()}`,
    );
  }

  // Authentication API
  await authenticate();
  const sessionResponse = await request.get('/api/auth/session-json');
  assert.strictEqual(sessionResponse.status(), 200);
  assert.ok((await sessionResponse.text()).length > 0);

  const validAuthResponse = await request.post('/api/auth/email-password/authorize', {
    data: {
      email: 'venividivichi3105@gmail.com',
      password: 'Clave1234**A',
    },
  });
  assert.ok([200, 201].includes(validAuthResponse.status()));

  const invalidAuthResponse = await request.post('/api/auth/email-password/authorize', {
    data: {
      email: 'venividivichi3105@gmail.com',
      password: 'WrongPassword123',
    },
  });
  assert.ok([401, 403].includes(invalidAuthResponse.status()));

  const missingAuthResponse = await request.post('/api/auth/email-password/authorize', {
    data: {},
  });
  assert.ok([400, 401, 422].includes(missingAuthResponse.status()));

  // Limits API
  await assertUnauthorized('/api/limits');
  await authenticate();
  const limitsResponse = await request.get('/api/limits');
  assert.strictEqual(limitsResponse.status(), 200);
  assert.ok((await limitsResponse.text()).length > 0);

  // Document tRPC API
  await assertUnauthorized(
    '/api/trpc/document.findDocumentsInternal?input=%7B%22json%22%3A%7B%22folderId%22%3Anull%7D%7D',
  );
  await authenticate();
  const documentsResponse = await request.get(
    '/api/trpc/document.findDocumentsInternal?input=%7B%22json%22%3A%7B%22folderId%22%3Anull%7D%2C%22meta%22%3A%7B%22values%22%3A%7B%22folderId%22%3A%5B%22undefined%22%5D%7D%2C%22v%22%3A1%7D%7D',
  );
  assert.strictEqual(documentsResponse.status(), 200);
  assert.ok((await documentsResponse.text()).length > 0);

  const inboxCountResponse = await request.get(
    '/api/trpc/document.inbox.getCount?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22readStatus%22%3A%22NOT_OPENED%22%7D%7D%7D',
  );
  assert.strictEqual(inboxCountResponse.status(), 200);
  assert.ok((await inboxCountResponse.text()).length > 0);

  await assertUnauthorized(
    '/api/trpc/document.inbox.getCount?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22readStatus%22%3A%22NOT_OPENED%22%7D%7D%7D',
  );

  // Envelope tRPC API
  await assertUnauthorized(
    '/api/trpc/envelope.editor.get?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22envelopeId%22%3A%22envelope_arbdlczztznuihmd%22%7D%7D%7D',
  );
  await authenticate();
  const envelopeResponse = await request.get(
    '/api/trpc/envelope.editor.get?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22envelopeId%22%3A%22envelope_arbdlczztznuihmd%22%7D%7D%7D',
  );
  assert.ok([200, 404].includes(envelopeResponse.status()));

  const envelopeRecipientResponse = await request.post('/api/trpc/envelope.recipient.set?batch=1', {
    data: {},
  });
  assert.ok([401, 403].includes(envelopeRecipientResponse.status()));

  // Organisation tRPC API
  await assertUnauthorized('/api/trpc/organisation.internal.getOrganisationSession?input=%7B%22json%22%3Anull%7D');
  await authenticate();
  const orgResponse = await request.get(
    '/api/trpc/organisation.internal.getOrganisationSession?input=%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%2C%22v%22%3A1%7D%7D',
  );
  assert.strictEqual(orgResponse.status(), 200);
  assert.ok((await orgResponse.text()).length > 0);

  // Folder tRPC API
  await assertUnauthorized(
    '/api/trpc/folder.getFolders?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22type%22%3A%22DOCUMENT%22%2C%22parentId%22%3Anull%7D%7D%7D',
  );

  await request.dispose();
})();
