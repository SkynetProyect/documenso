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

  // Agregar solo campo de email
  console.log('8 - Agregando campo de email');
  await stagehand.act('click the Add Fields button');
  await page.waitForTimeout(1000);

  await stagehand.act('click the email field button');
  await page.locator('canvas').first().click();

  // Enviar documento
  console.log('9 - Enviando documento');
  await stagehand.act('click the send document button');
  await page.waitForTimeout(1000);

  await stagehand.act('click the None delivery method button');
  await stagehand.act('click the Generate Links button');
  await page.waitForURL((url) => !url.pathname.includes('/edit'));
  await page.waitForTimeout(2000);

  // Navegar a página de firma
  console.log('10 - Navegando a página de firma');
  await Promise.all([page.waitForURL('**/sign/**'), stagehand.act('click the Sign link')]);
  await page.waitForTimeout(2000);

  // Rechazar documento
  console.log('11 - Rechazando documento');
  await stagehand.act('click the Reject Document button');
  await page.waitForTimeout(500);

  await stagehand.act('type "motivo" in the rejection reason textarea');
  await page.waitForTimeout(500);

  await stagehand.act('click the confirm reject button');

  console.log('✓ Test de rechazo completado exitosamente');

  await stagehand.close();
})();
