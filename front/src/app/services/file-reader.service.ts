import {Inject, Injectable, InjectionToken, Optional} from '@angular/core';
import {Observable, Subscriber} from 'rxjs';
import {first} from 'rxjs/operators';

export const FILE_READER_CONCURRENT = new InjectionToken<number>('file-reader-concurrent');

@Injectable({
  providedIn: 'root'
})
export class FileReaderService {

  ResourceBorrow$: Observable<FileReader>;
  ResourceReturnS: Subscriber<FileReader>;

  read(file: Blob, type: 'dataUrl' | 'text'): Observable<string>;

  read(file: Blob, type: 'binaryString' | 'arrayBuffer'): Observable<ArrayBuffer>;

  read(file: Blob, type: 'dataUrl' | 'text' | 'binaryString' | 'arrayBuffer'): Observable<string | ArrayBuffer> {
    return new Observable(observer => {
      this.ResourceBorrow$.pipe(first()).subscribe(reader => {
        reader.onload = _ => {
          switch (type) {
            case 'dataUrl':
            case 'text':
              observer.next(reader.result as string);
              break;
            case 'binaryString':
            case 'arrayBuffer':
              observer.next(reader.result as ArrayBuffer);
          }
          observer.complete();
          this.ResourceReturnS.next(reader);
        };

        reader.onerror = _ => {
          observer.error(reader.error);
          this.ResourceReturnS.next(reader);
        };

        switch (type) {
          case 'dataUrl':
            reader.readAsDataURL(file);
            break;
          case 'text':
            reader.readAsText(file);
            break;
          case 'binaryString':
            reader.readAsBinaryString(file);
            break;
          case 'arrayBuffer':
            reader.readAsArrayBuffer(file);
        }
      });
    });
  }

  getObjectUrl(file: Blob): Observable<string> {
    return new Observable(observer => {
      this.ResourceBorrow$.pipe(first()).subscribe(_ => {
        observer.next(URL.createObjectURL(file));
      });
    });
  }

  constructor(@Optional() @Inject(FILE_READER_CONCURRENT) private readonly concurrent: number) {
    if (!concurrent) {
      this.concurrent = 1;
    }

    this.ResourceBorrow$ = new Observable(s => {
      this.ResourceReturnS = s;
      for (let i = 0; i < this.concurrent; i++) {
        s.next(new FileReader());
      }
    });
  }
}
