import { Question } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/web';

export const EsVisible = {
  el: (selector: string) =>
    Question.about(`si ${selector} es visible`, async (actor) => {
      const page = await BrowseTheWeb.as(actor).currentPage();
      const nativePage = await page.nativePage();
      return nativePage
        .locator(selector)
        .waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
    }),
};
