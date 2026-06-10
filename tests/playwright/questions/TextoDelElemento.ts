import { Question } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/web';

export const TextoDelElemento = {
  del: (selector: string) =>
    Question.about(`el texto de ${selector}`, async (actor) => {
      const page = await BrowseTheWeb.as(actor).currentPage();
      const nativePage = await page.nativePage();
      return nativePage.locator(selector).innerText();
    }),
};
