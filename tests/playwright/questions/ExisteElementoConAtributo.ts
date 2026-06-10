import { Question } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/web';

export const ExisteElementoConAtributo = {
  /** `true` si algún elemento del documento tiene el atributo dado (con cualquier valor). */
  con: (atributo: string) =>
    Question.about(`si existe algún elemento con el atributo ${atributo}`, async (actor) => {
      const page = await BrowseTheWeb.as(actor).currentPage();
      const nativePage = await page.nativePage();
      const count = await nativePage.locator(`[${atributo}]`).count();
      return count > 0;
    }),
};
