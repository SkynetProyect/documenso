import { Task } from '@serenity-js/core';
import { Navigate } from '../interactions/Navigate';
import { Upload } from '../interactions/Upload';

export class SubirDocumento {
  static llamado(fileName: string) {
    return Task.where(
      `#actor sube el documento ${fileName}`,
      Navigate.to('/t/kbudzsciukycrosn/documents'),
      Upload.file(fileName).to('[data-testid="document-upload-input"]'),
    );
  }
}
