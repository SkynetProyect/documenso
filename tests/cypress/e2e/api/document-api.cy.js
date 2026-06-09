// tests/cypress/e2e/api/document-api.cy.js

describe('Document API Tests', () => {
  describe('Authentication API', () => {
    it('should return CSRF token', () => {
      cy.request({
        method: 'GET',
        url: '/api/auth/csrf',
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('csrfToken');
      });
    });

    it('should return session data for authenticated user', () => {
      cy.login();
      cy.request({
        method: 'GET',
        url: '/api/auth/session-json',
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.exist;
      });
    });

    it('should successfully authenticate with valid credentials', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/email-password/authorize',
        body: {
          email: 'venividivichi3105@gmail.com',
          password: 'Clave1234**A',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201]);
      });
    });

    it('should reject invalid credentials', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/email-password/authorize',
        body: {
          email: 'venividivichi3105@gmail.com',
          password: 'WrongPassword123',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([401, 403]);
      });
    });

    it('should reject missing credentials', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/email-password/authorize',
        body: {},
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 401, 422]);
      });
    });
  });

  describe('Limits API', () => {
    it('should return 401 for limits without authentication', () => {
      cy.request({
        method: 'GET',
        url: '/api/limits',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([401, 403]);
      });
    });

    it('should return limits for authenticated user', () => {
      cy.login();
      cy.request({
        method: 'GET',
        url: '/api/limits',
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.exist;
      });
    });
  });

  describe('Document tRPC API', () => {
    it('should return 401 for document list without authentication', () => {
      cy.request({
        method: 'GET',
        url: '/api/trpc/document.findDocumentsInternal?input=%7B%22json%22%3A%7B%22folderId%22%3Anull%7D%7D',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([401, 403]);
      });
    });

    it('should return document list for authenticated user', () => {
      cy.login();
      cy.request({
        method: 'GET',
        url: '/api/trpc/document.findDocumentsInternal?input=%7B%22json%22%3A%7B%22folderId%22%3Anull%7D%2C%22meta%22%3A%7B%22values%22%3A%7B%22folderId%22%3A%5B%22undefined%22%5D%7D%2C%22v%22%3A1%7D%7D',
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.exist;
      });
    });

    it('should return inbox count for authenticated user', () => {
      cy.login();
      cy.request({
        method: 'GET',
        url: '/api/trpc/document.inbox.getCount?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22readStatus%22%3A%22NOT_OPENED%22%7D%7D%7D',
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.exist;
      });
    });

    it('should return 401 for inbox count without authentication', () => {
      cy.request({
        method: 'GET',
        url: '/api/trpc/document.inbox.getCount?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22readStatus%22%3A%22NOT_OPENED%22%7D%7D%7D',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([401, 403]);
      });
    });
  });

  describe('Envelope tRPC API', () => {
    it('should return 401 for envelope data without authentication', () => {
      cy.request({
        method: 'GET',
        url: '/api/trpc/envelope.editor.get?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22envelopeId%22%3A%22envelope_arbdlczztznuihmd%22%7D%7D%7D',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([401, 403]);
      });
    });

    it('should return envelope data for authenticated user', () => {
      cy.login();
      cy.request({
        method: 'GET',
        url: '/api/trpc/envelope.editor.get?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22envelopeId%22%3A%22envelope_arbdlczztznuihmd%22%7D%7D%7D',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 404]);
      });
    });

    it('should return 401 for envelope recipient set without authentication', () => {
      cy.request({
        method: 'POST',
        url: '/api/trpc/envelope.recipient.set?batch=1',
        body: {},
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([401, 403]);
      });
    });
  });

  describe('Organisation tRPC API', () => {
    it('should return 401 for organisation session without authentication', () => {
      cy.request({
        method: 'GET',
        url: '/api/trpc/organisation.internal.getOrganisationSession?input=%7B%22json%22%3Anull%7D',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([401, 403]);
      });
    });

    it('should return organisation session for authenticated user', () => {
      cy.login();
      cy.request({
        method: 'GET',
        url: '/api/trpc/organisation.internal.getOrganisationSession?input=%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%2C%22v%22%3A1%7D%7D',
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.exist;
      });
    });
  });

  describe('Folder tRPC API', () => {
    it('should return 401 for folders without authentication', () => {
      cy.request({
        method: 'GET',
        url: '/api/trpc/folder.getFolders?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22type%22%3A%22DOCUMENT%22%2C%22parentId%22%3Anull%7D%7D%7D',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([401, 403]);
      });
    });

    it('should return folders for authenticated user', () => {
      cy.login();
      cy.request({
        method: 'GET',
        url: '/api/trpc/folder.getFolders?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22type%22%3A%22DOCUMENT%22%2C%22parentId%22%3Anull%7D%7D%7D',
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.exist;
      });
    });
  });

  describe('Team tRPC API', () => {
    it('should return 401 for team members without authentication', () => {
      cy.request({
        method: 'GET',
        url: '/api/trpc/team.member.getMany?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22teamId%22%3A7%7D%7D%7D',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([401, 403]);
      });
    });

    it('should return team members for authenticated user', () => {
      cy.login();
      cy.request({
        method: 'GET',
        url: '/api/trpc/team.member.getMany?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22teamId%22%3A7%7D%7D%7D',
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.exist;
      });
    });
  });
});
