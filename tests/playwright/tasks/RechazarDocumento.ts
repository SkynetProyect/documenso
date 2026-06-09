import { Task } from '@serenity-js/core';
import { Click } from '../interactions/Click';
import { Fill } from '../interactions/Fill';

export class RechazarDocumento {
  static porMotivo(motivo: string) {
    return Task.where(`#actor rechaza el documento por motivo ${motivo}`, async (actor) =>
      actor.attemptsTo(
        Click.on('a:has-text("Sign")'),
        Click.on('.hover\\:text-destructive'),
        Fill.theValue(motivo).into('textarea'),
        Click.on('.bg-destructive'),
      ),
    );
  }
}
