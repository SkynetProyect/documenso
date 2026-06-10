import { Interaction } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/web';

export class Fill {
  static theValue(value: string) {
    return {
      into: (selector: string) =>
        Interaction.where(`#actor escribe ${value} en ${selector}`, async (actor) => {
          const page = await BrowseTheWeb.as(actor).currentPage();
          const nativePage = await page.nativePage();
          await nativePage.fill(selector, value);
        }),
    };
  }
}
