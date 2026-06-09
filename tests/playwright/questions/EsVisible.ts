import { Question } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/playwright';

export const EsVisible = {
  el: (selector: string) =>
    Question.about(`si ${selector} es visible`, async (actor) => {
      const page = BrowseTheWeb.as(actor).currentPage();
      return page.locator(selector).isVisible();
    }),
};
