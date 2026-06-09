import { Interaction } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/playwright';

export class Scroll {
  static to(y: number) {
    return Interaction.where(`#actor hace scroll hasta ${y}`, async (actor) => {
      const page = BrowseTheWeb.as(actor).currentPage();
      await page.evaluate((distance: number) => window.scrollTo(0, distance), y);
    });
  }
}
