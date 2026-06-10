import { argosScreenshot } from '@argos-ci/playwright';
import { Interaction, Task } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/web';

/**
 * Captures a visual snapshot of the current page and uploads it to Argos CI
 * for visual regression. Only runs when ARGOS_TOKEN is set, so local/CI runs
 * without Argos credentials are unaffected.
 */
export class CapturarVisual {
  static delEstado(nombre: string) {
    return Task.where(
      `#actor captura instantánea visual "${nombre}" para Argos`,
      Interaction.where(`#actor sube la instantánea "${nombre}" a Argos`, async (actor) => {
        if (!process.env.ARGOS_TOKEN) {
          return;
        }

        const page = await BrowseTheWeb.as(actor).currentPage();
        const nativePage = await page.nativePage();
        await argosScreenshot(nativePage, nombre);
      }),
    );
  }
}
