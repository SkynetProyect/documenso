const playwright = require('playwright');
(async () => {
  const browser = await playwright['chromium'].launch({
    // headless: false, slowMo: 100, // Uncomment to visualize test
  });
  const page = await browser.newPage();

  // Load "http://localhost:3000/t/personal_kbudzsciukycrosn/documents/envelope_clcunmlwnudymcbe/edit"
  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents/envelope_clcunmlwnudymcbe/edit');

  // Resize window to 1854 x 963
  await page.setViewportSize({ width: 1854, height: 963 });

  // Click on <input> [data-testid="signer-email-input"]
  await page.click('[data-testid="signer-email-input"]');

  // Fill "test@test.com" on <input> [data-testid="signer-email-input"]
  await page.fill('[data-testid="signer-email-input"]', 'test@test.com');

  // Click on <input> #\:r13l\:-form-item
  await page.click('#:r13l:-form-item');

  // Fill "prueba" on <input> #\:r13l\:-form-item
  await page.fill('#:r13l:-form-item', 'prueba');

  // Click on <button> "Agregar Campos"
  await page.click('.text-primary-foreground:nth-child(1)');

  // Scroll wheel by X:0, Y:1566
  await page.mouse.wheel(0, 1566);

  // Click on <button> "Correo electrónico"
  await page.click('.group:nth-child(2)');

  // Click on <canvas> canvas
  await page.click('canvas');

  // Click on <button> "Nombre"
  await page.click('.group:nth-child(3)');

  // Click on <canvas> canvas
  await page.click('canvas');

  // Scroll wheel by X:0, Y:690
  await page.mouse.wheel(0, 690);

  // Click on <button> "Vista previa Vista previa..."
  await page.click('[data-testid="envelope-editor-step-preview"]');

  // Scroll wheel by X:0, Y:1152
  await page.mouse.wheel(0, 1152);

  // Click on <button> "Descargar PDF"
  await page.click('[title="Descargar PDF"]');

  // Click on <button> "Original"
  await page.click('.flex-shrink-0 > .inline-flex');

  // Click on <svg> .lucide-x
  await page.click('.lucide-x');

  // Click on <button> "Enviar documento"
  await page.click('.text-primary-foreground');

  // Click on <button> "Ninguno"
  await page.click('#radix-:r193:-trigger-NONE');

  // Click on <button> "Generar enlaces"
  await Promise.all([page.click('.bg-primary:nth-child(2)'), page.waitForNavigation()]);

  // Scroll wheel by X:0, Y:552
  await page.mouse.wheel(0, 552);

  // Scroll wheel by X:0, Y:-276
  await page.mouse.wheel(0, -276);

  await browser.close();
})();
