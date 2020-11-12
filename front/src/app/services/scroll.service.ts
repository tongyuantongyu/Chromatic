import {Injectable} from '@angular/core';
import {fromEvent, Subject} from 'rxjs';
import {startWith, takeUntil} from 'rxjs/operators';

export interface ScrollStatus {
  height: number;
  width: number;
  offsetH: number;
  offsetW: number;
}

@Injectable({
  providedIn: 'root'
})
export class ScrollService {

  status$: Subject<ScrollStatus>;
  status: ScrollStatus = {height: 0, width: 0, offsetH: 0, offsetW: 0};
  private current: HTMLElement | Window | undefined;

  private cancelLast$: Subject<undefined>;

  public WatchOn(e: HTMLElement | Window): void {
    if (this.current) {
      this.cancelLast$.next();
    }
    this.current = e;
    fromEvent(e, 'scroll').pipe(startWith([undefined]), takeUntil(this.cancelLast$)).subscribe(_ => {
      const status = {
        height: (e as HTMLElement).scrollHeight || (e as Window).document.body.scrollHeight || 0,
        width: (e as HTMLElement).scrollWidth || (e as Window).document.body.scrollWidth || 0,
        offsetH: (e as HTMLElement).scrollTop || (e as Window).pageYOffset || 0,
        offsetW: (e as HTMLElement).scrollLeft || (e as Window).pageXOffset || 0
      };
      this.status$.next(status);
      this.status = status;
    });
  }

  public UnwatchOn(e: HTMLElement | Window): void {
    if (e === this.current) {
      this.cancelLast$.next();
      this.current = undefined;
    }
  }

  public UnWatch(): void {
    if (this.current) {
      this.cancelLast$.next();
      this.current = undefined;
    }
  }

  public PseudoStatus(s: ScrollStatus): void {
    this.status$.next(s);
    this.status = s;
  }

  constructor() {
    this.cancelLast$ = new Subject<undefined>();
    this.status$ = new Subject<ScrollStatus>();
  }
}
