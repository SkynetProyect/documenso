import { Interaction } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/playwright';

export class Navigate {
  static to(url: string) {
    return Interaction.where(`#actor navega a ${url}`, async (actor) => {
      const page = BrowseTheWeb.as(actor).currentPage();
      await page.goto(url);
    });
  }
}
