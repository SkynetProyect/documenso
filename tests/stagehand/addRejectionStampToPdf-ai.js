const { Stagehand } = require('@browserbasehq/stagehand');
const path = require('path');
const fs = require('fs');

const email = 'venividivichi3105@gmail.com';
const password = 'Clave1234**A';

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

/**
 * El sello "DOCUMENT REJECTED" lo dibuja addRejectionStampToPdf en color
 * rgb(220,38,38) sobre un <canvas> (pdf.js). stagehand.extract() lee el árbol
 * de accesibilidad/DOM y no ve contenido de canvas, así que el chequeo visual
 * se hace leyendo los píxeles del canvas directamente (sin LLM, sin extract).
 */
async function detectarSelloRojoEnCanvas(page) {
  const resultado = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      return { error: 'no se encontró ningún <canvas> en la página' };
    }

    try {
      const ctx = canvas.getContext('2d');
      const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let pixelesRojos = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (Math.abs(r - 220) <= 15 && Math.abs(g - 38) <= 15 && Math.abs(b - 38) <= 15) {
          pixelesRojos++;
        }
      }

      return { pixelesRojos, width, height };
    } catch (err) {
      return { error: err.message };
    }
  });

  if (resultado.error) {
    return `No se pudo leer el canvas del PDF: ${resultado.error}`;
  }

  return resultado.pixelesRojos > 50
    ? `El canvas del PDF (${resultado.width}x${resultado.height}) contiene ${resultado.pixelesRojos} píxeles del color rojo del sello (rgb(220,38,38)), consistente con el sello diagonal "DOCUMENT REJECTED".`
    : `El canvas del PDF (${resultado.width}x${resultado.height}) NO contiene píxeles del color rojo del sello (rgb(220,38,38)) (${resultado.pixelesRojos} encontrados).`;
}

/** Lee el texto visible de la primera fila de la tabla de documentos. */
async function leerEstadoPrimeraFila(page) {
  return (await page.locator('table tbody tr:first-child').first().innerText()).trim();
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

/** Rechaza el documento desde la página de firma con el `motivo` indicado. */
async function rechazarDocumento(page, motivo) {
  await page.locator('.hover\\:text-destructive').click();
  await page.waitForTimeout(500);
  await page.locator('textarea').fill(motivo);
  await page.locator('.bg-destructive').click();
  // El flujo de rechazo redirige a /sign/<token>/rejected (sigue conteniendo "/sign/").
  await esperarUrl(page, '/rejected', { timeout: 60_000 });
  await page.waitForTimeout(2000);
}

/** Abre, desde la lista de documentos del propietario, el documento más reciente (recién rechazado). */
async function abrirDocumentoRechazado(page) {
  await page.goto('http://localhost:3000/t/kbudzsciukycrosn/documents');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('table tbody tr:first-child a').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
}

/** TC-01: documento rechazado -> el PDF muestra el sello "DOCUMENT REJECTED". */
async function escenarioTC01() {
  const stagehand = nuevoStagehand();
  await stagehand.init();
  const page = [...stagehand.ctx.pagesByTarget.values()][0];

  try {
    await iniciarSesion(stagehand, page);
    await subirYConfigurarSobre(stagehand, page, 'momento 1 - Lenin Ospina - 1037668556.pdf');
    await irAFirmar(stagehand, page);
    await rechazarDocumento(page, 'documento incorrecto');
    await abrirDocumentoRechazado(page);

    const selloPdf = await detectarSelloRojoEnCanvas(page);
    const cuerpo = await page.locator('body').innerText();
    const estadoVisible = cuerpo.includes('Rejected') ? 'Rejected' : 'no se encontró "Rejected" en la página';

    return {
      escenario: 'TC-01',
      resultado: `${selloPdf} Estado del documento: ${estadoVisible}.`,
    };
  } finally {
    await stagehand.close();
  }
}

/** TC-02: el documento rechazado aparece como "Rejected" en la lista y conserva el sello en el PDF. */
async function escenarioTC02() {
  const stagehand = nuevoStagehand();
  await stagehand.init();
  const page = [...stagehand.ctx.pagesByTarget.values()][0];

  try {
    await iniciarSesion(stagehand, page);
    await subirYConfigurarSobre(stagehand, page, 'momento 1 - Lenin Ospina - 1037668556.pdf');
    await irAFirmar(stagehand, page);
    await rechazarDocumento(page, 'documento incorrecto');

    await page.goto('http://localhost:3000/t/kbudzsciukycrosn/documents');
    await page.waitForLoadState('networkidle').catch(() => {});
    const filaLista = await leerEstadoPrimeraFila(page);

    await page.locator('table tbody tr:first-child a').first().click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    const selloPdf = await detectarSelloRojoEnCanvas(page);

    return {
      escenario: 'TC-02',
      resultado: `Primera fila de la lista de documentos: "${filaLista}". ${selloPdf}`,
    };
  } finally {
    await stagehand.close();
  }
}

/** TC-03: el sello ignora el motivo de rechazo provisto por el firmante. */
async function escenarioTC03() {
  const stagehand = nuevoStagehand();
  await stagehand.init();
  const page = [...stagehand.ctx.pagesByTarget.values()][0];

  try {
    await iniciarSesion(stagehand, page);
    await subirYConfigurarSobre(stagehand, page, 'momento 1 - Lenin Ospina - 1037668556.pdf');
    await irAFirmar(stagehand, page);

    const motivo = '<script>alert(1)</script> motivo malicioso';
    await rechazarDocumento(page, motivo);
    await abrirDocumentoRechazado(page);

    const selloPdf = await detectarSelloRojoEnCanvas(page);
    const cuerpo = await page.locator('body').innerText();
    const motivoVisible = cuerpo.includes(motivo);

    return {
      escenario: 'TC-03',
      resultado: `${selloPdf} El motivo de rechazo ${motivoVisible ? 'SÍ aparece' : 'NO aparece'} como texto en la página.`,
    };
  } finally {
    await stagehand.close();
  }
}

(async () => {
  const resultados = [];

  for (const escenario of [escenarioTC01, escenarioTC02, escenarioTC03]) {
    console.log(`Ejecutando ${escenario.name}...`);
    try {
      resultados.push(await escenario());
    } catch (err) {
      const nombre = escenario.name.replace('escenario', '');
      console.error(`${escenario.name} falló: ${err.message}`);
      resultados.push({ escenario: nombre, resultado: `ERROR: ${err.message}` });
    }
  }

  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'addRejectionStampToPdf.json'), JSON.stringify(resultados, null, 2));

  console.log('Resultados guardados en tests/stagehand/output/addRejectionStampToPdf.json');
})();
