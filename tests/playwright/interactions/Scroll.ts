import { Interaction } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/web';

export class Scroll {
  static to(y: number) {
    return Interaction.where(`#actor hace scroll hasta ${y}`, async (actor) => {
      const page = await BrowseTheWeb.as(actor).currentPage();
      const nativePage = await page.nativePage();
      await nativePage.evaluate((distance: number) => window.scrollTo(0, distance), y);
    });
  }
}
