import { Interaction, Task } from '@serenity-js/core';
import { BrowseTheWeb } from '@serenity-js/web';
import { Click } from '../interactions/Click';
import { Fill } from '../interactions/Fill';
import { Navigate } from '../interactions/Navigate';

export class IniciarSesion {
  static conCredenciales(email: string, password: string) {
    return Task.where(
      `#actor inicia sesión con credenciales`,
      Navigate.to('/signin'),
      Fill.theValue(email).into('input[type="email"]'),
      Fill.theValue(password).into('input[type="password"]'),
      Click.on('.bg-primary'),
      Interaction.where('#actor espera a salir de /signin', async (actor) => {
        const page = await BrowseTheWeb.as(actor).currentPage();
        const nativePage = await page.nativePage();
        await nativePage.waitForURL((url) => !url.pathname.startsWith('/signin'), { timeout: 60_000 }).catch(() => {});
      }),
    );
  }
}
