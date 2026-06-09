import { Question } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/playwright';

export const TextoDelElemento = {
  del: (selector: string) =>
    Question.about(`el texto de ${selector}`, async (actor) => {
      const page = BrowseTheWeb.as(actor).currentPage();
      return page.locator(selector).innerText();
    }),
};
