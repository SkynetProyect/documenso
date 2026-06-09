import { Task } from '@serenity-js/core';
import { Click } from '../interactions/Click';

export class GenerarEnlacesFirma {
  static ahora() {
    return Task.where('#actor genera los enlaces de firma', async (actor) =>
      actor.attemptsTo(Click.on('button:has-text("None")'), Click.on('button:has-text("Generate Links")')),
    );
  }
}
