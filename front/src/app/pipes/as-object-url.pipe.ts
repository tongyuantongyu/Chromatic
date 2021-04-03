import {OnDestroy, Pipe, PipeTransform} from '@angular/core';
import {FileReaderService} from '../services/file-reader.service';
import {Observable, of} from 'rxjs';
import {tap} from 'rxjs/operators';

@Pipe({
  name: 'asObjectUrl'
})
export class AsObjectUrlPipe implements PipeTransform, OnDestroy {

  constructor(private reader: FileReaderService) {
  }
  private objectUrl: string;

  transform(value: Blob): string {
    return URL.createObjectURL(value);
  }

  ngOnDestroy(): void {
    if (this.objectUrl) {
      console.log(`revoke ${this.objectUrl}`);
      URL.revokeObjectURL(this.objectUrl);
    }
  }

}
