// Authentication helpers
export const ADMIN_EMAIL = 'admin1@parkontrol.com';
export const ADMIN_PASSWORD = 'Admin1234';
export const OPERATOR_EMAIL = 'Oper1@parkontrol.com';
export const OPERATOR_PASSWORD = 'Oper1234';
export const USER_EMAIL = 'user4@parkontrol.com';
export const USER_PASSWORD = 'user1234';

export function loginAsAdmin() {
  cy.visit('http://localhost:4200/login');
  cy.get('input[formcontrolname="correo"]').fill(ADMIN_EMAIL);
  cy.get('input[formcontrolname="contrasena"]').fill(ADMIN_PASSWORD);
  cy.get('#login-admin-card').click();
  cy.url().should('include', '/dashboard');
}

export function loginAsOperator() {
  cy.visit('http://localhost:4200/login');
  cy.get('input[formcontrolname="correo"]').fill(OPERATOR_EMAIL);
  cy.get('input[formcontrolname="contrasena"]').fill(OPERATOR_PASSWORD);
  cy.get('#login-operator-card').click();
  cy.url().should('include', '/operador-dashboard');
}

export function loginAsUser() {
  cy.visit('http://localhost:4200/login');
  cy.get('input[formcontrolname="correo"]').fill(USER_EMAIL);
  cy.get('input[formcontrolname="contrasena"]').fill(USER_PASSWORD);
  cy.get('#login-submit-btn').click();
  cy.get('.contenedor-cliente').should('be.visible');
}

// Utility functions
export function buildUniqueNumeroDocumento() {
  const timestamp = Date.now().toString();
  return timestamp.slice(-10);
}

export function buildUniqueCorreo() {
  const suffix = Date.now().toString().slice(-8);
  return `cliente.${suffix}@e2e.test`;
}

export function buildUniqueNumeroVehiculo() {
  const timestamp = Date.now().toString();
  return `AUTO${timestamp.slice(-6)}`;
}

export function logout() {
  cy.get('[matmenuTrigger]').first().click();
  cy.get('[matmenuitem]')
    .contains(/Salir|Logout|Close session/i)
    .click();
  cy.url().should('include', '/login');
}

// Dialog/Modal helpers
export function openDialogModal(buttonText) {
  cy.get(`button:contains("${buttonText}")`).click();
  cy.get('mat-dialog-container').should('be.visible');
}

export function getFormControl(formControlName) {
  return cy.get(`[formcontrolname="${formControlName}"]`);
}

export function getMatSelect(formControlName) {
  return cy.get(`mat-select[formcontrolname="${formControlName}"]`);
}

export function selectMatOption(index = 0) {
  cy.get(`mat-option:not([disabled])`).eq(index).click();
}
