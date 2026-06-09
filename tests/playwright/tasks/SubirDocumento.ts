import { Task } from '@serenity-js/core';
import { Click } from '../interactions/Click';
import { Navigate } from '../interactions/Navigate';
import { Upload } from '../interactions/Upload';

export class SubirDocumento {
  static llamado(fileName: string) {
    return Task.where(`#actor sube el documento ${fileName}`, async (actor) =>
      actor.attemptsTo(
        Navigate.to('/t/personal_kbudzsciukycrosn/documents'),
        Click.on('.bg-primary > .flex'),
        Upload.file(fileName).to('[data-testid="document-upload-input"]'),
      ),
    );
  }
}
