import {AfterViewInit, Directive, ElementRef, EventEmitter, Input, OnDestroy, Output} from '@angular/core';

@Directive({
  selector: '[appIntersection]'
})
export class IntersectionDirective implements AfterViewInit, OnDestroy {

  // tslint:disable-next-line:no-input-rename
  @Input('intersectionContainer') container: HTMLElement | null = null;
  @Output() enter = new EventEmitter<IntersectionObserverEntry>();
  @Output() leave = new EventEmitter<IntersectionObserverEntry>();

  private observer: IntersectionObserver;

  constructor(private el: ElementRef<HTMLElement>) {
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target === this.el.nativeElement) {
          if (entry.intersectionRatio > 0) {
            this.enter?.emit(entry);
          } else {
            this.leave?.emit(entry);
          }
        }
      });
    }, {
      root: this.container ? this.container : null,
      rootMargin: '0px',
      threshold: [0, 1]
    });

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer.disconnect();
  }
}
