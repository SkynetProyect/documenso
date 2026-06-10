import { Question } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/web';

export const AtributoDelElemento = {
  de: (selector: string, atributo: string) =>
    Question.about(`el atributo ${atributo} de ${selector}`, async (actor) => {
      const page = await BrowseTheWeb.as(actor).currentPage();
      const nativePage = await page.nativePage();
      return nativePage.locator(selector).getAttribute(atributo);
    }),
};
