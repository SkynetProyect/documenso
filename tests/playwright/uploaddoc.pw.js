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

  // Click on <button> "Cargar Documento"
  await page.click('.bg-primary');

  // Fill "C:\fakepath\Actividad Momento 1 - Módulo Innovación y Emprendimiento - tiempo normal Cohorte 118.pdf" on <input> [data-testid="document-upload-input"]
  await Promise.all([
    page.type(
      '[data-testid="document-upload-input"]',
      'C:\fakepathActividad Momento 1 - Módulo Innovación y Emprendimiento - tiempo normal Cohorte 118.pdf',
    ),
    page.waitForNavigation(),
  ]);

  // Click on <input> [data-testid="envelope-title-input"]
  await page.click('[data-testid="envelope-title-input"]');

  // Click on <input> [data-testid="envelope-title-input"]
  await page.click('[data-testid="envelope-title-input"]');

  // Press c on input
  await page.press('[data-testid="envelope-title-input"]', 'c');

  await browser.close();
})();
