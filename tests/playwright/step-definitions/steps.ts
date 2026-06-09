import { After, Before, Given, setDefaultTimeout, Then, When } from '@cucumber/cucumber';
import { BrowseTheWeb } from '@serenity-js/playwright';
import assert from 'assert';
import { type Browser, chromium } from 'playwright';
import { Usuario } from '../actors/Usuario';
import { Click } from '../interactions/Click';
import { Navigate } from '../interactions/Navigate';
import { UrlActual } from '../questions/UrlActual';
import { ConfigurarSobre } from '../tasks/ConfigurarSobre';
import { FirmarDocumento } from '../tasks/FirmarDocumento';
import { GenerarEnlacesFirma } from '../tasks/GenerarEnlacesFirma';
import { IniciarSesion } from '../tasks/IniciarSesion';
import { RechazarDocumento } from '../tasks/RechazarDocumento';
import { SubirDocumento } from '../tasks/SubirDocumento';

setDefaultTimeout(60_000);

const email = 'venividivichi3105@gmail.com';
const password = 'Clave1234**A';

let browser: Browser;
let usuario: ReturnType<typeof Usuario>;

Before(async () => {
  browser = await chromium.launch({ headless: true });
  usuario = Usuario(browser);
});

After(async () => {
  await BrowseTheWeb.as(usuario).browser().close();
});

Given('que Usuario está en la página de inicio de sesión', async () => {
  await usuario.attemptsTo(Navigate.to('/signin'));
});

When('Usuario ingresa su email y contraseña', async () => {
  await usuario.attemptsTo(IniciarSesion.conCredenciales(email, password));
});

Then('Usuario debería ser redirigido a la página de documentos', async () => {
  const currentUrl = await usuario.asks(UrlActual.valor());
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
  const currentUrl = await usuario.asks(UrlActual.valor());
  assert.ok(
    !currentUrl.includes('/sign'),
    `Se esperaba que el documento ya no estuviera en /sign, encontrada ${currentUrl}`,
  );
});

When('Usuario rechaza el documento con motivo {string}', async (motivo) => {
  await usuario.attemptsTo(RechazarDocumento.porMotivo(motivo));
});

Then('el documento debería quedar marcado como rechazado', async () => {
  const currentUrl = await usuario.asks(UrlActual.valor());
  assert.ok(!currentUrl.includes('/sign'), `Se esperaba que la página ya no sea /sign, encontrada ${currentUrl}`);
});
