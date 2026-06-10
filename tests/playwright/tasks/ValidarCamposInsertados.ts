import { Interaction, Task } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/web';
import { Click } from '../interactions/Click';

export class ValidarCamposInsertados {
  /**
   * Dispara `validateFieldsInserted` desde la UI sin completar el campo de firma,
   * usando el botón "Next Field" / "Complete" del visor de firma.
   *
   * Si "Next Field" está presente (campo aún pendiente), se usa ese. Si no
   * (todos los campos ya insertados), a este viewport hay dos botones "Complete"
   * en el DOM pero solo uno es visible (el otro es un duplicado oculto); se usa
   * el visible, que abre el diálogo de confirmación final.
   */
  static sinCompletarElCampo() {
    return Task.where(
      '#actor dispara la validación de campos sin completarlos',
      Interaction.where('#actor hace clic en "Next Field" o en el "Complete" visible', async (actor) => {
        const page = await BrowseTheWeb.as(actor).currentPage();
        const nativePage = await page.nativePage();
        const nextField = nativePage.locator('button:has-text("Next Field")');

        await nativePage
          .locator('button:has-text("Next Field"), button:has-text("Complete")')
          .first()
          .waitFor({ state: 'attached', timeout: 10_000 })
          .catch(() => {});

        if ((await nextField.count()) > 0) {
          await nextField.first().click();
        } else {
          await nativePage.waitForLoadState('networkidle').catch(() => {});

          const completeButton = nativePage.locator('button:has-text("Complete"):visible').first();
          const signDialogButton = nativePage.locator('[role="dialog"] button:has-text("Sign")');

          for (let intento = 0; intento < 3; intento++) {
            await completeButton.click();

            const visible = await signDialogButton
              .waitFor({ state: 'visible', timeout: 5_000 })
              .then(() => true)
              .catch(() => false);

            if (visible) {
              break;
            }
          }
        }

        await nativePage.waitForLoadState('networkidle').catch(() => {});
      }),
    );
  }

  /**
   * Completa el (único) campo de firma requerido y dispara `validateFieldsInserted`.
   */
  static completandoElCampo() {
    return Task.where(
      '#actor completa el campo de firma y dispara la validación',
      Click.on('div:nth-child(1) > .relative canvas >> nth=0'),
      Click.on('button:has-text("Next Field"), button:has-text("Complete") >> nth=0'),
    );
  }
}
