const { Stagehand } = require('@browserbasehq/stagehand');
const path = require('path');
const assert = require('assert');

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
  console.log('1 - Navegando a signin');
  await page.goto('http://localhost:3000/signin');

  console.log('2 - Llenando email');
  await stagehand.act('click on the email input field');
  await stagehand.act('type "venividivichi3105@gmail.com" in the email input field');

  console.log('3 - Llenando contraseña');
  await stagehand.act('click on the password input field');
  await stagehand.act('type "Clave1234**A" in the password input field');

  console.log('4 - Iniciando sesión');
  await stagehand.act('click the sign in button');
  await page.waitForURL((url) => !url.includes('/signin'));

  // Navegar a documentos
  console.log('5 - Navegando a documentos');
  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents');
  await page.setViewportSize({ width: 1854, height: 963 });
  await page.waitForLoadState('networkidle');

  // Abrir dialogo de subida
  console.log('6 - Abriendo dialogo de subida');
  await stagehand.act('click the upload document button');
  await page.waitForLoadState('networkidle');

  // Subir archivo (directo con Playwright, sin IA)
  console.log('7 - Subiendo archivo');
  const fixturePath = path.join(__dirname, '..', 'cypress', 'fixtures', 'momento 1 - Lenin Ospina - 1037668556.pdf');
  await page.setInputFiles('[data-testid="document-upload-input"]', fixturePath);
  await page.waitForURL('**/edit**');
  console.log('8 - Archivo subido, en editor');

  // Regresar a documentos
  console.log('9 - Regresando a documentos');
  await stagehand.act('click the back to documents link');
  await page.waitForURL('**/documents**');

  assert.ok(page.url().includes('/documents'), 'Debería estar en la página de documentos');
  console.log('✓ Test completado exitosamente');

  await stagehand.close();
})();
