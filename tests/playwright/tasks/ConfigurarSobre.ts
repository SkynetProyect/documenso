import { Task } from '@serenity-js/core';
import { Click } from '../interactions/Click';
import { Fill } from '../interactions/Fill';
import { Scroll } from '../interactions/Scroll';

export class ConfigurarSobre {
  static con(email: string, nombre: string) {
    return Task.where(`#actor configura el sobre con ${email} y ${nombre}`, async (actor) =>
      actor.attemptsTo(
        Click.on('[data-testid="signer-email-input"]'),
        Fill.theValue(email).into('[data-testid="signer-email-input"]'),
        Fill.theValue(nombre).into('input[name*="name"], input[placeholder*="nombre"], input[placeholder*="Name"]'),
        Click.on('.text-primary-foreground:nth-child(1)'),
        Scroll.to(1668),
        Click.on('.group:nth-child(2)'),
        Click.on('canvas:first-of-type'),
        Click.on('.h-12:nth-child(1)'),
        Click.on('canvas:first-of-type'),
        Click.on('.text-primary-foreground'),
      ),
    );
  }
}
