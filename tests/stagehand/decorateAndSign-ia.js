const { Stagehand } = require('@browserbasehq/stagehand');
const path = require('path');
const assert = require('assert');

async function signIn(stagehand, page) {
  console.log('1 - Navegando a signin');
  await page.goto('http://localhost:3000/signin');

  console.log('2 - Llenando credenciales');
  await stagehand.act('click on the email input field');
  await stagehand.act('type "venividivichi3105@gmail.com" in the email input field');
  await stagehand.act('click on the password input field');
  await stagehand.act('type "Clave1234**A" in the password input field');

  console.log('3 - Iniciando sesión');
  await stagehand.act('click the sign in button');
  await page.waitForURL((url) => !url.includes('/signin'));
}

(async () => {
  const stagehand = new Stagehand({
    env: 'LOCAL',
    model: {
      modelName: 'ollama/qwen3.5:2b',
      apiKey: 'ollama',
      baseURL: 'http://localhost:11434/api',
    },
  });

  await stagehand.init();
  const page = [...stagehand.ctx.pagesByTarget.values()][0];

  // Login
  await signIn(stagehand, page);

  // Navegar a documentos
  console.log('4 - Navegando a documentos');
  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents');
  await page.setViewportSize({ width: 1854, height: 963 });
  await page.waitForLoadState('networkidle');

  // Subir documento
  console.log('5 - Abriendo dialogo de subida');
  await stagehand.act('click the upload document button');
  await page.waitForLoadState('networkidle');

  console.log('6 - Subiendo archivo');
  const fixturePath = path.join(__dirname, '..', 'cypress', 'fixtures', 'momento 1 - Lenin Ospina - 1037668556.pdf');
  await page.setInputFiles('[data-testid="document-upload-input"]', fixturePath);
  await page.waitForURL('**/edit**');
  await page.waitForTimeout(2000);

  // Configurar firmante
  console.log('7 - Configurando firmante');
  await stagehand.act('click on the signer email input field');
  await stagehand.act('type "venividivichi3105@gmail.com" in the signer email input field');
  await stagehand.act('type "programador" in the signer name input field');

  // Agregar campos
  console.log('8 - Agregando campos');
  await stagehand.act('click the Add Fields button');
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, 1668));

  await stagehand.act('click the email field button');
  await page.locator('canvas').first().click();

  await stagehand.act('click the signature field button');
  await page.locator('canvas').first().click();

  // Enviar documento
  console.log('9 - Enviando documento');
  await stagehand.act('click the send document button');
  await page.waitForTimeout(1000);

  await stagehand.act('click the None delivery method button');
  await stagehand.act('click the Generate Links button');
  await page.waitForURL((url) => !url.pathname.includes('/edit'));
  await page.waitForTimeout(2000);

  // Scroll y firma en Konva
  console.log('10 - Firmando en canvas Konva');
  await page.evaluate(() => window.scrollTo(0, 552));
  await page.evaluate(() => window.scrollTo(0, 1032));

  const canvas = page.locator('.konvajs-content > canvas').first();
  await canvas.click();
  await canvas.click();
  await canvas.click();

  // Navegar a página de firma
  console.log('11 - Navegando a página de firma');
  await Promise.all([page.waitForURL('**/sign/**'), stagehand.act('click the Sign link')]);
  await page.waitForTimeout(2000);

  // Firmar documento
  console.log('12 - Firmando documento');
  await stagehand.act('click the Next Field button');
  await page.waitForTimeout(1000);

  await page.locator('div:nth-child(1) > .relative canvas').first().click();
  await page.waitForTimeout(1000);

  await stagehand.act('click the Complete button');
  await page.waitForTimeout(1000);

  await stagehand.act('click the Sign button');
  await page.waitForURL((url) => !url.pathname.includes('/sign/'));

  assert.ok(!page.url().includes('/sign/'), 'El documento debería estar firmado');
  console.log('✓ Test de firma completado exitosamente');

  await stagehand.close();
})();
