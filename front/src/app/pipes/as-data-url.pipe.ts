import {Pipe, PipeTransform} from '@angular/core';
import {Observable} from 'rxjs';
import {FileReaderService} from '../services/file-reader.service';

@Pipe({
  name: 'asDataUrl'
})
export class AsDataUrlPipe implements PipeTransform {

  transform(value: Blob): Observable<string> {
    return this.reader.read(value, 'dataUrl');
  }

  constructor(private reader: FileReaderService) {
  }

}
