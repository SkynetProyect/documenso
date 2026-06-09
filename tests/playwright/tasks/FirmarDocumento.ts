import { Task } from '@serenity-js/core';
import { Click } from '../interactions/Click';

export class FirmarDocumento {
  static ahora() {
    return Task.where('#actor firma el documento', async (actor) =>
      actor.attemptsTo(
        Click.on('a:has-text("Sign")'),
        Click.on('button:has-text("Next Field")'),
        Click.on('div:nth-child(1) > .relative canvas'),
        Click.on('button:has-text("Complete")'),
        Click.on('button:has-text("Sign")'),
      ),
    );
  }
}
