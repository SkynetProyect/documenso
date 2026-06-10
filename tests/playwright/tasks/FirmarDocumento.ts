import { Task } from '@serenity-js/core';
import { Click } from '../interactions/Click';
import { Fill } from '../interactions/Fill';

export class FirmarDocumento {
  static ahora() {
    return Task.where(
      '#actor firma el documento',
      Click.on('a:has-text("Sign")'),
      Click.on('div:nth-child(1) > .relative canvas >> nth=0'),
      Click.on('[role="dialog"] button[role="tab"]:has-text("Type")'),
      Fill.theValue('programador').into('[role="dialog"] input[type="text"], [role="dialog"] input:not([type])'),
      Click.on('[role="dialog"] button:has-text("Sign")'),
      Click.on('button:has-text("Complete")'),
      Click.on('button:has-text("Sign")'),
    );
  }
}
