import { Task } from '@serenity-js/core';
import { Click } from '../interactions/Click';
import { Fill } from '../interactions/Fill';
import { Navigate } from '../interactions/Navigate';

export class IniciarSesion {
  static conCredenciales(email: string, password: string) {
    return Task.where(`#actor inicia sesión con credenciales`, async (actor) =>
      actor.attemptsTo(
        Navigate.to('/signin'),
        Fill.theValue(email).into('input[type="email"]'),
        Fill.theValue(password).into('input[type="password"]'),
        Click.on('.bg-primary'),
      ),
    );
  }
}
