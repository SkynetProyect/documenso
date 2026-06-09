import { Interaction } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/playwright';
import path from 'path';

export class Upload {
  static file(fileName: string) {
    return {
      to: (selector: string) =>
        Interaction.where(`#actor sube el archivo ${fileName}`, async (actor) => {
          const page = BrowseTheWeb.as(actor).currentPage();
          const fixturePath = path.resolve(process.cwd(), 'tests/cypress/fixtures', fileName);
          await page.setInputFiles(selector, fixturePath);
        }),
    };
  }
}
