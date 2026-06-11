describe('Document rejection regression', () => {
  it('R-CY-00 - app home page loads', () => {
    cy.visit('/');
    cy.url().should('include', 'localhost:3000');
  });

  it('R-CY-01 - rejecting a document changes its status to rejected', () => {
    cy.intercept('POST', '**/reject**').as('rejectDocument');

    cy.contains('Reject').click();
    cy.get('textarea[name="rejectionReason"]').type('Documento rechazado por prueba');
    cy.contains('Confirm').click();

    cy.wait('@rejectDocument').its('response.statusCode').should('be.oneOf', [200, 201]);

    cy.contains('Rejected').should('be.visible');
  });

  it('R-CY-02 - rejected documents use a _rejected.pdf file name', () => {
    cy.intercept('POST', '**/reject**').as('rejectDocument');
    cy.intercept('GET', '**/*.pdf').as('getRejectedPdf');

    cy.contains('Reject').click();
    cy.get('textarea[name="rejectionReason"]').type('Documento rechazado para validar PDF');
    cy.contains('Confirm').click();

    cy.wait('@rejectDocument');

    // Cambia esto por el botón o enlace real para abrir/descargar el PDF
    cy.contains(/download|descargar|open pdf|ver pdf/i).click();

    cy.wait('@getRejectedPdf').then((interception) => {
      const url = interception.request.url;
      expect(url).to.include('_rejected.pdf');
    });
  });

  it('R-CY-03 - a non-rejected completed document does not use _rejected.pdf', () => {
    // Cambia esta ruta por un documento que NO esté rechazado
    cy.visit('/documents/456');

    cy.intercept('GET', '**/*.pdf').as('getSignedPdf');

    cy.contains(/download|descargar|open pdf|ver pdf/i).click();

    cy.wait('@getSignedPdf').then((interception) => {
      const url = interception.request.url;
      expect(url).to.not.include('_rejected.pdf');
    });
  });

  it('R-CY-04 - rejecting without a reason shows a validation error', () => {
    cy.contains('Reject').click();

    // No escribimos motivo
    cy.contains('Confirm').click();

    // Ajusta este texto según tu interfaz real
    cy.contains(/reason is required|el motivo es obligatorio|required/i).should('be.visible');
  });

  it('R-CY-05 - after reload the document still appears as rejected', () => {
    cy.intercept('POST', '**/reject**').as('rejectDocument');

    cy.contains('Reject').click();
    cy.get('textarea[name="rejectionReason"]').type('Rechazo persistente');
    cy.contains('Confirm').click();

    cy.wait('@rejectDocument');
    cy.contains('Rejected').should('be.visible');

    cy.reload();

    cy.contains('Rejected').should('be.visible');
  });
});
