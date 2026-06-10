import { Interaction } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/web';
import path from 'path';

export class Upload {
  static file(fileName: string) {
    return {
      to: (selector: string) =>
        Interaction.where(`#actor sube el archivo ${fileName}`, async (actor) => {
          const page = await BrowseTheWeb.as(actor).currentPage();
          const nativePage = await page.nativePage();
          const fixturePath = path.resolve(__dirname, '../../cypress/fixtures', fileName);
          await nativePage.setInputFiles(selector, fixturePath, { timeout: 60_000 });
        }),
    };
  }
}
