const playwright = require('playwright');
(async () => {
  const browser = await playwright['chromium'].launch({
    // headless: false, slowMo: 100, // Uncomment to visualize test
  });
  const page = await browser.newPage();

  // Load "http://localhost:3000/t/personal_kbudzsciukycrosn/documents"
  await page.goto('http://localhost:3000/t/personal_kbudzsciukycrosn/documents');

  // Resize window to 1854 x 963
  await page.setViewportSize({ width: 1854, height: 963 });

  // Click on <html> "Documentos Plantillas

  await page.click('html');

  // Click on <html> "Documentos Plantillas

  await page.click('html');

  // Click on <div> "Eliminar"
  await page.click('.relative:nth-child(8)');

  // Click on <input> [placeholder="Por favor, escriba \'eliminar\' para confirmar"]
  await page.click('[placeholder="Por favor, escriba \'eliminar\' para confirmar"]');

  // Fill "eliminar" on <input> [placeholder="Por favor, escriba \'eliminar\' para confirmar"]
  await page.fill('[placeholder="Por favor, escriba \'eliminar\' para confirmar"]', 'eliminar');

  // Click on <button> "Eliminar"
  await page.click('.bg-destructive');

  await browser.close();
})();
