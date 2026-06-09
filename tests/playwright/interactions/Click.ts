import { Interaction } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/playwright';

export class Click {
  static on(selector: string) {
    return Interaction.where(`#actor hace clic en ${selector}`, async (actor) => {
      const page = BrowseTheWeb.as(actor).currentPage();
      await page.locator(selector).click();
    });
  }
}
