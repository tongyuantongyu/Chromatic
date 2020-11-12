import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';

export declare type StickyState =
// the element behaves like a static element
  'static' // before: false, after true
  // the element is stuck at top
  | 'stuck' // before: true, after true
  // the element's bottom has reached the container's bottom, so got pushed up
  | 'push-up' // before: true, after false
  // the element's size is bigger than the container, so it overflowed like a static element
  | 'overflow'; // before: false, after false

export class StickyStateChangedEvent {
  state: StickyState;
}

@Component({
  // tslint:disable-next-line:component-selector
  selector: '*[awareSticky]',
  templateUrl: './aware-sticky.component.html',
  styleUrls: ['./aware-sticky.component.styl'],
  encapsulation: ViewEncapsulation.None
})
export class AwareStickyComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() stickyTop: number | string = 0;
  @Input() stickyBottom: number | string = 0;
  @Input() stickyContainer: HTMLElement | null = null;

  @Input() stickyClassPrefix: string | null = null;
  @Input() stickyStaticClass: string | null = null;
  @Input() stickyStuckClass: string | null = null;
  @Input() stickyPushUpClass: string | null = null;
  @Input() stickyOverflowClass: string | null = null;

  private bindClass = false;
  private staticClass: string;
  private stuckClass: string;
  private pushUpClass: string;
  private overflowClass: string;

  get bindingClasses(): string {
    switch (this.stickyState) {
      case 'static':
        return this.staticClass || '';
      case 'stuck':
        return this.stuckClass || '';
      case 'push-up':
        return this.pushUpClass || '';
      case 'overflow':
        return this.overflowClass || '';
    }
  }

  @Output() stateChanged = new EventEmitter<StickyStateChangedEvent>();

  @HostBinding('style.--sticky-top') get stickyTopRegularized(): string {
    return AwareStickyComponent.lengthRegularize(this.stickyTop);
  }

  @HostBinding('style.--sticky-bottom') get stickyBottomRegularized(): string {
    return AwareStickyComponent.lengthRegularize(this.stickyBottom);
  }

  @ViewChild('before', {static: true}) before: ElementRef<HTMLElement>;
  @ViewChild('after', {static: true}) after: ElementRef<HTMLElement>;

  private beforeStatus: boolean | undefined;
  private afterStatus: boolean | undefined;

  get stickyState(): StickyState {
    if (this.beforeStatus) {
      if (this.afterStatus) {
        return 'stuck';
      } else {
        return 'push-up';
      }
    } else {
      if (this.afterStatus) {
        return 'static';
      } else {
        return 'overflow';
      }
    }
  }

  private observer: IntersectionObserver;

  private static lengthRegularize(s: string | number): string {
    if (!s) {
      return '0px';
    }

    const n = Number.parseFloat(s as string);
    if (!Number.isNaN(n)) {
      return `${n}px`;
    } else {
      return s as string;
    }
  }

  private emitState(): void {
    if (this.beforeStatus === undefined || this.afterStatus === undefined) {
      return;
    }

    this.stateChanged.emit({state: this.stickyState});
  }

  constructor(private host: ElementRef) {
  }

  ngOnInit(): void {
    this.beforeStatus = undefined;
    this.afterStatus = undefined;

    if (!this.stickyClassPrefix &&
      !this.stickyStaticClass &&
      !this.stickyStuckClass &&
      !this.stickyPushUpClass &&
      !this.stickyOverflowClass) {
      this.bindClass = false;
    } else {
      this.bindClass = true;

      if (this.stickyClassPrefix) {
        this.staticClass = this.stickyClassPrefix + '__static';
        this.stuckClass = this.stickyClassPrefix + '__stuck';
        this.pushUpClass = this.stickyClassPrefix + '__push-up';
        this.overflowClass = this.stickyClassPrefix + '__overflow';
      }

      if (this.stickyStaticClass) {
        this.staticClass = this.stickyStaticClass;
      }

      if (this.stickyStuckClass) {
        this.stuckClass = this.stickyStuckClass;
      }

      if (this.stickyPushUpClass) {
        this.pushUpClass = this.stickyPushUpClass;
      }

      if (this.stickyOverflowClass) {
        this.overflowClass = this.stickyOverflowClass;
      }
    }

    if (this.bindClass) {
      let lastClass = '';
      this.stateChanged.subscribe(_ => {
        const newClass = this.bindingClasses;
        if (lastClass === newClass) {
          return;
        }

        if (lastClass) {
          this.host.nativeElement.classList.remove(lastClass);
        }

        lastClass = newClass;

        if (lastClass) {
          this.host.nativeElement.classList.add(lastClass);
        }
      });
    }
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        switch (entry.target.getAttribute('sentinel-type')) {
          case 'before':
            this.beforeStatus = entry.intersectionRatio !== 0;
            this.emitState();
            break;
          case 'after':
            this.afterStatus = entry.intersectionRatio !== 0;
            this.emitState();
            break;
        }
      });
    }, {
      root: this.stickyContainer ? this.stickyContainer : null,
      rootMargin: '0px',
      threshold: [0, 1]
    });

    this.observer.observe(this.before.nativeElement);
    this.observer.observe(this.after.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer.disconnect();
  }
}
