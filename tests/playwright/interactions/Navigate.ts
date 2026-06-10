import { Interaction } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/web';

export class Navigate {
  static to(url: string) {
    return Interaction.where(`#actor navega a ${url}`, async (actor) => {
      const page = await BrowseTheWeb.as(actor).currentPage();
      const nativePage = await page.nativePage();
      await nativePage.goto(url);
      await nativePage.waitForLoadState('networkidle');
    });
  }
}
