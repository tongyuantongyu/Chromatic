import {Injectable} from '@angular/core';
import {fromEvent, ReplaySubject} from 'rxjs';
import {auditTime, startWith} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {

  public mode: 'mobile' | 'desktop' = 'desktop';
  public mode$ = new ReplaySubject<'mobile' | 'desktop'>(1);

  constructor() {
    fromEvent(window, 'resize').pipe(auditTime(500), startWith([undefined])).subscribe(_ => {
      this.mode = window.innerWidth > 599 ? 'desktop' : 'mobile';
      this.mode$.next(this.mode);
    });
  }
}
