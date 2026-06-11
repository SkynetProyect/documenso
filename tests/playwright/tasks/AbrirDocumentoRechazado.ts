import { Task } from '@serenity-js/core';
import { Click } from '../interactions/Click';
import { Navigate } from '../interactions/Navigate';

export class AbrirDocumentoRechazado {
  /**
   * Abre, desde la lista de documentos del propietario, el documento más
   * reciente (el recién rechazado). Esa vista renderiza el PDF ya con el
   * sello "DOCUMENT REJECTED" aplicado por `addRejectionStampToPdf`.
   */
  static masReciente() {
    return Task.where(
      '#actor abre el documento rechazado más reciente desde la lista de documentos',
      Navigate.to('/t/kbudzsciukycrosn/documents'),
      Click.on('table tbody tr:first-child a'),
    );
  }
}
