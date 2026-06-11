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

  console.log('1');
  await page.goto('http://localhost:3000/signin');

  console.log('2');
  await stagehand.act('click on the email input field');

  console.log('3');
  await stagehand.act('type "venividivichi3105@gmail.com" in the email input field');

  console.log('4');
  await stagehand.act('click on the password input field');

  console.log('5');
  await stagehand.act('type "Clave1234**A" in the password input field');

  console.log('6');
  await stagehand.act('click the sign in button');

  console.log('7');
  await page.waitForURL((url) => !url.includes('/signin'));

  assert.ok(!page.url().includes('/signin'));

  await page.setViewportSize({ width: 1854, height: 963 });

  await stagehand.close();
})();
