const playwright = require('playwright');
(async () => {
  const browser = await playwright['chromium'].launch({
    // headless: false, slowMo: 100, // Uncomment to visualize test
  });
  const page = await browser.newPage();

  // Load "http://localhost:3000/t/personal_kbudzsciukycrosn/documents/envelope_arbdlczztznuihmd/edit"
  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents/envelope_arbdlczztznuihmd/edit');

  // Resize window to 1854 x 963
  await page.setViewportSize({ width: 1854, height: 963 });

  // Scroll wheel by X:0, Y:654
  await page.mouse.wheel(0, 654);

  // Click on <input> [data-testid="signer-email-input"]
  await page.click('[data-testid="signer-email-input"]');

  // Fill "venividivichi3105@gmail.com" on <input> [data-testid="signer-email-input"]
  await page.fill('[data-testid="signer-email-input"]', 'venividivichi3105@gmail.com');

  // Press Tab on input
  await page.press('[data-testid="signer-email-input"]', 'Tab');

  // Fill "programador" on <input> #\:r27t\:-form-item
  await page.fill('#:r27t:-form-item', 'programador');

  // Scroll wheel by X:0, Y:414
  await page.mouse.wheel(0, 414);

  // Scroll wheel by X:0, Y:-360
  await page.mouse.wheel(0, -360);

  // Scroll wheel by X:0, Y:240
  await page.mouse.wheel(0, 240);

  // Click on <button> "Agregar Campos"
  await page.click('.text-primary-foreground:nth-child(1)');

  // Scroll wheel by X:0, Y:720
  await page.mouse.wheel(0, 720);

  // Click on <button> "Correo electrónico"
  await page.click('.group:nth-child(2)');

  // Click on <canvas> canvas
  await page.click('canvas');

  // Click on <button> "Firma"
  await page.click('.h-12:nth-child(1)');

  // Click on <canvas> canvas
  await page.click('canvas');

  // Click on <button> "Enviar documento"
  await page.click('.text-primary-foreground');

  // Click on <button> "Ninguno"
  await page.click('#radix-:r2c1:-trigger-NONE');

  // Click on <button> "Correo electrónico"
  await page.click('#radix-:r2c1:-trigger-EMAIL');

  // Click on <button> "Ninguno"
  await page.click('#radix-:r2c1:-trigger-NONE');

  // Click on <button> "Generar enlaces"
  await Promise.all([page.click('.bg-primary:nth-child(2)'), page.waitForNavigation()]);

  // Scroll wheel by X:0, Y:552
  await page.mouse.wheel(0, 552);

  // Scroll wheel by X:0, Y:-414
  await page.mouse.wheel(0, -414);

  // Scroll wheel by X:0, Y:894
  await page.mouse.wheel(0, 894);

  // Click on <canvas> .konvajs-content > canvas
  await page.click('.konvajs-content > canvas');

  // Click on <canvas> .konvajs-content > canvas
  await page.click('.konvajs-content > canvas');

  // Click on <canvas> .konvajs-content > canvas
  await page.click('.konvajs-content > canvas');

  // Click on <button> "Completo"
  await page.click('.bg-primary:nth-child(2)');

  // Click on <button> "Firmar"
  await Promise.all([page.click('.flex > .bg-primary'), page.waitForNavigation()]);

  // Click on <div> "Todos han firmado"
  await page.click('.mt-4');

  // Click on <a> "Regresar a casa"
  await Promise.all([page.click('[href="/"]:nth-child(2)'), page.waitForNavigation()]);

  await browser.close();
})();
