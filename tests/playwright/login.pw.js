const playwright = require('playwright');
(async () => {
  const browser = await playwright['chromium'].launch({
    // headless: false, slowMo: 100, // Uncomment to visualize test
  });
  const page = await browser.newPage();

  // Load "http://localhost:3000/signin"
  await page.goto('http://localhost:3000/signin');

  // Resize window to 927 x 963
  await page.setViewportSize({ width: 927, height: 963 });

  // Click on <input> #\:r3\:-form-item
  await page.click('#:r3:-form-item');

  // Fill "venividivichi3105@gmail.com" on <input> #\:r3\:-form-item
  await page.fill('#:r3:-form-item', 'venividivichi3105@gmail.com');

  // Click on <input> #\:r5\:-form-item
  await page.click('#:r5:-form-item');

  // Fill "Clave1234**A" on <input> #\:r5\:-form-item
  await page.fill('#:r5:-form-item', 'Clave1234**A');

  // Click on <button> "Iniciar sesión"
  await Promise.all([page.click('.bg-primary'), page.waitForNavigation()]);

  // Resize window to 1854 x 963
  await page.setViewportSize({ width: 1854, height: 963 });

  await browser.close();
})();
