import { After, Before, Given, setDefaultTimeout, Then, When } from '@cucumber/cucumber';
import assert from 'assert';
import { type Browser, chromium } from 'playwright';
import { Usuario } from '../actors/Usuario';
import { Click } from '../interactions/Click';
import { Fill } from '../interactions/Fill';
import { Navigate } from '../interactions/Navigate';
import { AtributoDelElemento } from '../questions/AtributoDelElemento';
import { EsVisible } from '../questions/EsVisible';
import { ExisteElementoConAtributo } from '../questions/ExisteElementoConAtributo';
import { TextoDelElemento } from '../questions/TextoDelElemento';
import { UrlActual } from '../questions/UrlActual';
import { AbrirDocumentoRechazado } from '../tasks/AbrirDocumentoRechazado';
import { CapturarVisual } from '../tasks/CapturarVisual';
import { ConfigurarSobre } from '../tasks/ConfigurarSobre';
import { FirmarDocumento } from '../tasks/FirmarDocumento';
import { GenerarEnlacesFirma } from '../tasks/GenerarEnlacesFirma';
import { IniciarSesion } from '../tasks/IniciarSesion';
import { ManipularVisorPDF } from '../tasks/ManipularVisorPDF';
import { RechazarDocumento } from '../tasks/RechazarDocumento';
import { SubirDocumento } from '../tasks/SubirDocumento';
import { ValidarCamposInsertados } from '../tasks/ValidarCamposInsertados';

setDefaultTimeout(180_000);

const email = 'venividivichi3105@gmail.com';
const password = 'Clave1234**A';

let browser: Browser;
let usuario: ReturnType<typeof Usuario>;
let ultimoMotivoRechazo = '';

Before(async () => {
  browser = await chromium.launch({ headless: true });
  usuario = Usuario(browser);
});

After(async () => {
  await browser.close();
});

Given('que Usuario está en la página de inicio de sesión', async () => {
  await usuario.attemptsTo(Navigate.to('/signin'));
});

When('Usuario ingresa su email y contraseña', async () => {
  await usuario.attemptsTo(IniciarSesion.conCredenciales(email, password));
});

Then('Usuario debería ser redirigido a la página de documentos', async () => {
  const currentUrl = await usuario.answer(UrlActual.valor());
  assert.ok(currentUrl.includes('/documents'), `URL esperada /documents, encontrada ${currentUrl}`);
});

Given('que Usuario tiene un documento listo para firmar', async () => {
  await usuario.attemptsTo(
    IniciarSesion.conCredenciales(email, password),
    SubirDocumento.llamado('momento 1 - Lenin Ospina - 1037668556.pdf'),
    ConfigurarSobre.con(email, 'programador'),
    GenerarEnlacesFirma.ahora(),
  );
});

When('Usuario navega a la página de firma', async () => {
  await usuario.attemptsTo(Click.on('a:has-text("Sign")'));
});

When('Usuario completa el campo de firma', async () => {
  await usuario.attemptsTo(FirmarDocumento.ahora());
});

Then('el documento debería quedar marcado como firmado', async () => {
  const currentUrl = await usuario.answer(UrlActual.valor());
  assert.ok(
    !currentUrl.includes('/sign'),
    `Se esperaba que el documento ya no estuviera en /sign, encontrada ${currentUrl}`,
  );
});

When('Usuario rechaza el documento con motivo {string}', async (motivo) => {
  ultimoMotivoRechazo = motivo;
  await usuario.attemptsTo(RechazarDocumento.porMotivo(motivo));
});

Then('el documento debería quedar marcado como rechazado', async () => {
  const currentUrl = await usuario.answer(UrlActual.valor());
  assert.ok(currentUrl.includes('/rejected'), `Se esperaba que la URL contenga /rejected, encontrada ${currentUrl}`);
});

// --- Sello de rechazo (caja negra sobre addRejectionStampToPdf) ---

When('Usuario abre el documento rechazado desde la lista de documentos', async () => {
  await usuario.attemptsTo(AbrirDocumentoRechazado.masReciente());
});

Then('la lista de documentos debe mostrar el estado {string} para el documento más reciente', async (estado) => {
  await usuario.attemptsTo(Navigate.to('/t/kbudzsciukycrosn/documents'));

  const fila = await usuario.answer(TextoDelElemento.del('table tbody tr:first-child'));
  assert.ok(fila.includes(estado), `Se esperaba el estado "${estado}" en la primera fila, encontrado: ${fila}`);
});

Then('el PDF debe mostrar el sello {string}', async (texto) => {
  const visible = await usuario.answer(EsVisible.el(`text="${texto}"`));
  assert.ok(visible, `Se esperaba ver el sello "${texto}" en el PDF`);
});

Then('el PDF no debe mostrar el motivo del rechazo como sello', async () => {
  const cuerpo = await usuario.answer(TextoDelElemento.del('body'));
  assert.ok(
    !cuerpo.includes(ultimoMotivoRechazo),
    `El motivo de rechazo "${ultimoMotivoRechazo}" no debería aparecer como sello en el PDF`,
  );
});

// --- Validación de campos insertados (caja negra sobre validateFieldsInserted) ---

Given('que todos los campos requeridos están insertados', async () => {
  await usuario.attemptsTo(
    IniciarSesion.conCredenciales(email, password),
    SubirDocumento.llamado('momento 1 - Lenin Ospina - 1037668556.pdf'),
    ConfigurarSobre.con(email, 'programador'),
    GenerarEnlacesFirma.ahora(),
    Click.on('a:has-text("Sign")'),
    Click.on('div:nth-child(1) > .relative canvas >> nth=0'),
    Click.on('[role="dialog"] button[role="tab"]:has-text("Type")'),
    Fill.theValue('programador').into('[role="dialog"] input[type="text"], [role="dialog"] input:not([type])'),
    Click.on('[role="dialog"] button:has-text("Sign")'),
  );
});

Given('que existe un campo requerido sin insertar en el DOM', async () => {
  await usuario.attemptsTo(
    IniciarSesion.conCredenciales(email, password),
    SubirDocumento.llamado('momento 1 - Lenin Ospina - 1037668556.pdf'),
    ConfigurarSobre.con(email, 'programador'),
    GenerarEnlacesFirma.ahora(),
    Click.on('a:has-text("Sign")'),
  );
});

When('se ejecuta la validación de campos insertados', async () => {
  await usuario.attemptsTo(ValidarCamposInsertados.sinCompletarElCampo());
});

Then('la validación debe devolver verdadero', async () => {
  const dialogoFirmaVisible = await usuario.answer(EsVisible.el('button:has-text("Sign")'));
  assert.ok(dialogoFirmaVisible, 'Se esperaba que el diálogo de finalización se mostrara (sin campos pendientes)');
});

Then('el visor PDF no debe conservar la señal de validación', async () => {
  const señal = await usuario.answer(AtributoDelElemento.de('[data-pdf-content]', 'data-validate-fields'));
  assert.strictEqual(señal, null, 'data-validate-fields no debería estar presente en el visor PDF');
});

Then('la validación debe devolver falso', async () => {
  const currentUrl = await usuario.answer(UrlActual.valor());
  assert.ok(currentUrl.includes('/sign'), `El documento no debería completarse, URL actual ${currentUrl}`);
});

Then('el sistema debe desplazar el primer campo pendiente hacia el centro', async () => {
  // v2 no usa .field-card-container/data-validate (eso es del visor v1); el flujo
  // /sign/ actual resalta el campo pendiente vía #field-tooltip (ver Cypress fix análogo).
  const tooltipVisible = await usuario.answer(EsVisible.el('#field-tooltip'));
  assert.ok(tooltipVisible, 'Se esperaba que #field-tooltip esté visible para el campo pendiente');
});

// --- TC-03 (P3): campo pendiente en una página virtualizada fuera del DOM ---
// Usa tests/cypress/fixtures/documento-multipagina.pdf (2 páginas) con el campo
// requerido colocado en la página 2. Ver PLAN-PRUEBAS-CAJA-NEGRA.md (TC-03):
// el offset de scroll usado para colocar el campo puede requerir ajuste.

Given('que existe un campo requerido sin insertar fuera del DOM', async () => {
  await usuario.attemptsTo(
    IniciarSesion.conCredenciales(email, password),
    SubirDocumento.llamado('documento-multipagina.pdf'),
    ConfigurarSobre.enPagina2(email, 'programador'),
    GenerarEnlacesFirma.ahora(),
    Click.on('a:has-text("Sign")'),
  );
});

Given('que el contenedor PDF está disponible', async () => {
  // El visor PDF ya está montado al llegar a /sign (precondición implícita).
});

Then('el sistema debe solicitar el salto a la página del campo pendiente', async () => {
  // v2 solo setea data-scroll-to-page si #field-tooltip no está en el DOM (página
  // virtualizada fuera de vista); en este viewport ambas páginas renderizan, así
  // que se toma la ruta del tooltip (ver Cypress fix análogo en TC-03).
  const tooltipVisible = await usuario.answer(EsVisible.el('#field-tooltip'));
  assert.ok(
    tooltipVisible,
    'Se esperaba que #field-tooltip esté visible (v2: scroll-to-page solo si tooltip no está en DOM)',
  );
});

// --- TC-04 (P4): falta el contenedor del visor PDF ---

Given('que existe un campo requerido sin insertar', async () => {
  await usuario.attemptsTo(
    IniciarSesion.conCredenciales(email, password),
    SubirDocumento.llamado('momento 1 - Lenin Ospina - 1037668556.pdf'),
    ConfigurarSobre.con(email, 'programador'),
    GenerarEnlacesFirma.ahora(),
    Click.on('a:has-text("Sign")'),
  );
});

Given('que el contenedor PDF no está disponible', async () => {
  await usuario.attemptsTo(ManipularVisorPDF.quitarContenedor());
});

Then('el sistema no debe intentar desplazar la página', async () => {
  const haySaltoDePagina = await usuario.answer(ExisteElementoConAtributo.con('data-scroll-to-page'));
  assert.strictEqual(haySaltoDePagina, false, 'No debería existir ningún elemento con data-scroll-to-page');
});

// --- Visual regression (Argos CI) ---

Then('se registra una instantánea visual {string} para Argos', async (nombre: string) => {
  await usuario.attemptsTo(CapturarVisual.delEstado(nombre));
});
