import { Task } from '@serenity-js/core';
import { Click } from '../interactions/Click';
import { Fill } from '../interactions/Fill';
import { Scroll } from '../interactions/Scroll';

export class ConfigurarSobre {
  static con(email: string, nombre: string) {
    return Task.where(
      `#actor configura el sobre con ${email} y ${nombre}`,
      Click.on('[data-testid="signer-email-input"]'),
      Fill.theValue(email).into('[data-testid="signer-email-input"]'),
      Fill.theValue(nombre).into('input[name*="name"], input[placeholder*="nombre"], input[placeholder*="Name"]'),
      Click.on('.text-primary-foreground:nth-child(1)'),
      Scroll.to(1668),
      Click.on('.group:nth-child(2)'),
      Click.on('canvas >> nth=0'),
      Click.on('.h-12:nth-child(1)'),
      Click.on('canvas >> nth=0'),
      Click.on('.text-primary-foreground'),
    );
  }

  /**
   * Igual que `con`, pero coloca el campo de firma en la página 2 de un documento
   * multipágina: hace scroll más abajo en el editor para que el visor virtualice
   * el canvas de la página 2 antes de soltar el campo.
   *
   * NOTA: el offset de scroll y el selector del canvas están calibrados para
   * `tests/cypress/fixtures/documento-multipagina.pdf` (2 páginas tamaño carta).
   * Verificar/ajustar ambos valores en la primera ejecución contra la app real
   * (ver tests/playwright/PLAN-PRUEBAS-CAJA-NEGRA.md, TC-03).
   */
  static enPagina2(email: string, nombre: string) {
    return Task.where(
      `#actor configura el sobre con ${email} y ${nombre} (campo en página 2)`,
      Click.on('[data-testid="signer-email-input"]'),
      Fill.theValue(email).into('[data-testid="signer-email-input"]'),
      Fill.theValue(nombre).into('input[name*="name"], input[placeholder*="nombre"], input[placeholder*="Name"]'),
      Click.on('.text-primary-foreground:nth-child(1)'),
      Scroll.to(2400),
      Click.on('.group:nth-child(2)'),
      Click.on('canvas >> nth=1'),
      Click.on('.h-12:nth-child(1)'),
      Click.on('canvas >> nth=1'),
      Click.on('.text-primary-foreground'),
    );
  }
}
