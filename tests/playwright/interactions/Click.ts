import { Interaction } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/web';

export class Click {
  static on(selector: string) {
    return Interaction.where(`#actor hace clic en ${selector}`, async (actor) => {
      const page = await BrowseTheWeb.as(actor).currentPage();
      const nativePage = await page.nativePage();
      await nativePage.locator(selector).click();
      await nativePage.waitForLoadState('networkidle').catch(() => {});
    });
  }
}
