import { Interaction, Task } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/web';

const PDF_VIEWER_CONTENT_SELECTOR = '[data-pdf-content]';

export class ManipularVisorPDF {
  /**
   * Simula que el contenedor del visor PDF (`[data-pdf-content]`) no está disponible,
   * quitando el atributo que `validateFieldsInserted` usa para localizarlo
   * (`document.querySelector('[data-pdf-content]')` pasa a devolver `null`).
   */
  static quitarContenedor() {
    return Task.where(
      '#actor retira el contenedor del visor PDF del DOM',
      Interaction.where('#actor elimina el atributo data-pdf-content', async (a) => {
        const page = await BrowseTheWeb.as(a).currentPage();
        const nativePage = await page.nativePage();
        await nativePage.evaluate((selector) => {
          document.querySelector(selector)?.removeAttribute('data-pdf-content');
        }, PDF_VIEWER_CONTENT_SELECTOR);
      }),
    );
  }
}
