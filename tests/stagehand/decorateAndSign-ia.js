const { Stagehand } = require('@browserbasehq/stagehand');
const path = require('path');
const assert = require('assert');

(async () => {
  const stagehand = new Stagehand({
    env: 'LOCAL',
    model: {
      modelName: 'groq/meta-llama/llama-4-scout-17b-16e-instruct',
      apiKey: process.env.OPENROUTER_API_KEY,
    },
  });

  await stagehand.init();
  const page = [...stagehand.ctx.pagesByTarget.values()][0];

  // Login
  console.log('1 - Login');
  await page.goto('http://localhost:3000/signin');
  await stagehand.act('click on the email input field');
  await stagehand.act('type "venividivichi3105@gmail.com" in the email input field');
  await stagehand.act('click on the password input field');
  await stagehand.act('type "Clave1234**A" in the password input field');
  await stagehand.act('click the sign in button');
  await page.waitForURL((url) => !url.includes('/signin'));

  // Navegar a documentos
  console.log('2 - Navegando a documentos');
  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents');
  await page.setViewportSize({ width: 1854, height: 963 });
  await page.waitForLoadState('networkidle');

  // Abrir dialogo de subida
  console.log('3 - Abriendo dialogo de subida');
  await stagehand.act('click the upload document button');
  await page.waitForLoadState('networkidle');

  // Subir archivo
  console.log('4 - Subiendo archivo');
  const fixturePath = path.join(
    __dirname,
    '..',
    '..',
    'tests',
    'cypress',
    'fixtures',
    'momento 1 - Lenin Ospina - 1037668556.pdf',
  );
  await page.setInputFiles('[data-testid="document-upload-input"]', fixturePath);
  await page.waitForURL('**/edit**');

  assert.ok(page.url().includes('/edit'), 'Debería estar en el editor de sobre');
  console.log('✓ Archivo subido correctamente');

  // Regresar a documentos
  console.log('5 - Regresando a documentos');
  await stagehand.act('click the back to documents link');
  await page.waitForURL('**/documents**');

  assert.ok(page.url().includes('/documents'), 'Debería estar en la página de documentos');
  console.log('✓ Test de subida completado exitosamente');

  await stagehand.close();
})();
