const { Stagehand } = require('@browserbasehq/stagehand');
const path = require('path');
const fs = require('fs');

const email = 'venividivichi3105@gmail.com';
const password = 'Clave1234**A';

const PREGUNTA_ESTADO =
  'Look at the signing page and answer in one short sentence: ' +
  'is a "Sign" confirmation dialog visible (validation passed)? ' +
  'is any pending field highlighted with an orange ring (validation failed, field highlighted)? ' +
  'did the PDF viewer jump/scroll to a different page (validation failed, page jump requested)? ' +
  'Mention only what is actually visible.';

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

function nuevoStagehand() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY no está definido');
  }

  return new Stagehand({
    env: 'LOCAL',
    model: {
      // Stagehand parte modelName en el primer "/": subProvider="openai", subModelName=OPENROUTER_MODEL
      // (p.ej. "openai/gpt-4o-mini"), y crea un cliente OpenAI apuntando a OpenRouter via baseURL.
      modelName: `openai/${OPENROUTER_MODEL}`,
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    },
  });
}

/**
 * El objeto `page` de Stagehand no expone `waitForURL` (sí `url()` síncrono),
 * así que esperamos por sondeo a que la URL actual cumpla/incumpla `fragmento`.
 */
async function esperarUrl(page, fragmento, { negar = false, timeout = 30_000 } = {}) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeout) {
    const actual = page.url();
    const coincide = actual.includes(fragmento);
    if (negar ? !coincide : coincide) {
      return;
    }
    await page.waitForTimeout(200);
  }
  throw new Error(`Timeout esperando URL ${negar ? 'sin' : 'con'} "${fragmento}" (actual: ${page.url()})`);
}

async function iniciarSesion(stagehand, page) {
  await page.goto('http://localhost:3000/signin');
  await stagehand.act('click on the email input field');
  await stagehand.act(`type "${email}" in the email input field`);
  await stagehand.act('click on the password input field');
  await stagehand.act(`type "${password}" in the password input field`);
  await stagehand.act('click the sign in button');
  await esperarUrl(page, '/signin', { negar: true, timeout: 60_000 });
}

async function subirYConfigurarSobre(stagehand, page, fixture) {
  await page.goto('http://localhost:3000/t/kbudzsciukycrosn/documents');
  await page.setViewportSize({ width: 1854, height: 963 });
  await page.waitForLoadState('networkidle').catch(() => {});

  await stagehand.act('click the upload document button');
  await page.waitForLoadState('networkidle').catch(() => {});

  const fixturePath = path.join(__dirname, '..', 'cypress', 'fixtures', fixture);
  await page.locator('[data-testid="document-upload-input"]').setInputFiles(fixturePath);
  await esperarUrl(page, '/edit');
  await page.waitForTimeout(2000);

  await stagehand.act('click on the signer email input field');
  await stagehand.act(`type "${email}" in the signer email input field`);
  await stagehand.act('type "programador" in the signer name input field');

  await stagehand.act('click the Add Fields button');
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, 1668));

  await stagehand.act('click the signature field button');
  await page.locator('canvas').first().click();

  await stagehand.act('click the send document button');
  await page.waitForTimeout(1000);
  await stagehand.act('click the None delivery method button');
  await stagehand.act('click the Generate Links button');
  await esperarUrl(page, '/edit', { negar: true });
  await page.waitForTimeout(2000);
}

async function irAFirmar(stagehand, page) {
  await Promise.all([esperarUrl(page, '/sign/'), stagehand.act('click the Sign link')]);
  await page.waitForTimeout(2000);
}

/** TC-01 (P1): todos los campos insertados -> validación true. */
async function escenarioTC01() {
  const stagehand = nuevoStagehand();
  await stagehand.init();
  const page = [...stagehand.ctx.pagesByTarget.values()][0];

  await iniciarSesion(stagehand, page);
  await subirYConfigurarSobre(stagehand, page, 'momento 1 - Lenin Ospina - 1037668556.pdf');
  await irAFirmar(stagehand, page);

  await page.evaluate(() => window.scrollTo(0, 552));
  await page.evaluate(() => window.scrollTo(0, 1032));
  const canvas = page.locator('canvas').first();
  await canvas.click();
  await page.waitForTimeout(500);

  await page.locator('[role="dialog"] button[role="tab"]:has-text("Type")').click();
  await page
    .locator('[role="dialog"] input[type="text"], [role="dialog"] input:not([type])')
    .first()
    .fill('programador');
  await page.locator('[role="dialog"] button:has-text("Sign")').click();
  await page.waitForTimeout(1000);

  await stagehand.act('click the Complete button');
  await page.waitForTimeout(1000);

  const resultado = await stagehand.extract(PREGUNTA_ESTADO);

  await stagehand.close();
  return { escenario: 'TC-01', resultado: typeof resultado === 'string' ? resultado : JSON.stringify(resultado) };
}

/** TC-02 (P2): campo pendiente visible en el DOM -> resaltado, validación false. */
async function escenarioTC02() {
  const stagehand = nuevoStagehand();
  await stagehand.init();
  const page = [...stagehand.ctx.pagesByTarget.values()][0];

  await iniciarSesion(stagehand, page);
  await subirYConfigurarSobre(stagehand, page, 'momento 1 - Lenin Ospina - 1037668556.pdf');
  await irAFirmar(stagehand, page);

  await stagehand.act('click the Next Field button, or the Complete button if that is what is shown');
  await page.waitForTimeout(1000);

  const resultado = await stagehand.extract(PREGUNTA_ESTADO);

  await stagehand.close();
  return { escenario: 'TC-02', resultado: typeof resultado === 'string' ? resultado : JSON.stringify(resultado) };
}

/** TC-03 (P3): campo pendiente fuera del DOM (página 2) -> salto de página, validación false. */
async function escenarioTC03() {
  const stagehand = nuevoStagehand();
  await stagehand.init();
  const page = [...stagehand.ctx.pagesByTarget.values()][0];

  await iniciarSesion(stagehand, page);
  await page.goto('http://localhost:3000/t/kbudzsciukycrosn/documents');
  await page.setViewportSize({ width: 1854, height: 963 });
  await page.waitForLoadState('networkidle').catch(() => {});

  await stagehand.act('click the upload document button');
  await page.waitForLoadState('networkidle').catch(() => {});

  const fixturePath = path.join(__dirname, '..', 'cypress', 'fixtures', 'documento-multipagina.pdf');
  await page.locator('[data-testid="document-upload-input"]').setInputFiles(fixturePath);
  await esperarUrl(page, '/edit');
  await page.waitForTimeout(2000);

  await stagehand.act('click on the signer email input field');
  await stagehand.act(`type "${email}" in the signer email input field`);
  await stagehand.act('type "programador" in the signer name input field');

  await stagehand.act('click the Add Fields button');
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, 2400));

  await stagehand.act('click the signature field button');
  await page.locator('canvas').nth(1).click();

  await stagehand.act('click the send document button');
  await page.waitForTimeout(1000);
  await stagehand.act('click the None delivery method button');
  await stagehand.act('click the Generate Links button');
  await esperarUrl(page, '/edit', { negar: true });
  await page.waitForTimeout(2000);

  await irAFirmar(stagehand, page);

  await stagehand.act('click the Next Field button, or the Complete button if that is what is shown');
  await page.waitForTimeout(1000);

  const resultado = await stagehand.extract(PREGUNTA_ESTADO);

  await stagehand.close();
  return { escenario: 'TC-03', resultado: typeof resultado === 'string' ? resultado : JSON.stringify(resultado) };
}

/** TC-04 (P4): falta el contenedor del visor PDF -> validación false, sin salto de página. */
async function escenarioTC04() {
  const stagehand = nuevoStagehand();
  await stagehand.init();
  const page = [...stagehand.ctx.pagesByTarget.values()][0];

  await iniciarSesion(stagehand, page);
  await subirYConfigurarSobre(stagehand, page, 'momento 1 - Lenin Ospina - 1037668556.pdf');
  await irAFirmar(stagehand, page);

  await page.evaluate(() => {
    document.querySelector('[data-pdf-content]')?.removeAttribute('data-pdf-content');
  });

  await stagehand.act('click the Next Field button, or the Complete button if that is what is shown');
  await page.waitForTimeout(1000);

  const resultado = await stagehand.extract(PREGUNTA_ESTADO);

  await stagehand.close();
  return { escenario: 'TC-04', resultado: typeof resultado === 'string' ? resultado : JSON.stringify(resultado) };
}

(async () => {
  const resultados = [];

  for (const escenario of [escenarioTC01, escenarioTC02, escenarioTC03, escenarioTC04]) {
    console.log(`Ejecutando ${escenario.name}...`);
    resultados.push(await escenario());
  }

  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'validacion-campos-insertados.json'), JSON.stringify(resultados, null, 2));

  console.log('Resultados guardados en tests/stagehand/output/validacion-campos-insertados.json');
})();
