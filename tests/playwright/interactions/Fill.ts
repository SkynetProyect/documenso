import { Interaction } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/playwright';

export class Fill {
  static theValue(value: string) {
    return {
      into: (selector: string) =>
        Interaction.where(`#actor escribe ${value} en ${selector}`, async (actor) => {
          const page = BrowseTheWeb.as(actor).currentPage();
          await page.fill(selector, value);
        }),
    };
  }
}
