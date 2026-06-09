import { Question } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/playwright';

export const UrlActual = {
  valor: () =>
    Question.about('la URL actual', async (actor) => {
      const page = BrowseTheWeb.as(actor).currentPage();
      return page.url();
    }),
};
