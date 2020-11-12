import {Directive, EventEmitter, HostBinding, HostListener, Input, Output} from '@angular/core';

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[longPress]'
})
export class LongPressDirective {
  pressingStart = false;
  pressingState = false;
  touchStart: {X: number, Y: number} = {X: 0, Y: 0};

  timeoutId: number;
  intervalId: number;

  @Input() longPress = 0;
  @Input() pressingInterval = 0;

  @Output() longPressStart = new EventEmitter<Event>();
  @Output() longPressEnd = new EventEmitter<Event>();
  @Output() longPressing = new EventEmitter<Event>();

  @HostBinding('class.pressing') get press(): boolean {
    return this.pressingStart;
  }

  @HostBinding('class.long-pressing') get longPressState(): boolean {
    return this.pressingState;
  }

  @HostListener('touchstart', ['$event'])
  @HostListener('mousedown', ['$event']) startPress(event: Event): void {
    // don't handle multi touches
    const touch = event as TouchEvent;
    if (touch.touches) {
      if (touch.touches.length !== 1) {
        return;
      } else {
        this.touchStart = {
          X: touch.touches[0].clientX,
          Y: touch.touches[0].clientY
        };
      }
    }

    this.pressingStart = true;
    this.pressingState = false;
    this.timeoutId = setTimeout(() => {
      this.pressingState = true;
      this.longPressStart.emit(event);
      this.longPressing.emit(event);
      if (this.pressingInterval > 0) {
        this.intervalId = setInterval(() => {
          this.longPressing.emit(event);
        }, this.pressingInterval);
      }
    }, this.longPress || 500);
  }

  @HostListener('touchmove', ['$event']) touchMove(event: TouchEvent): void {
    if (event.touches.length !== 1) {
      return;
    }

    const dX = this.touchStart.X - event.touches[0].clientX;
    const dY = this.touchStart.Y - event.touches[0].clientY;

    if (dX * dX + dY * dY > 200 && this.timeoutId) {
      this.pressingStart = false;
      this.pressingState = false;
      clearTimeout(this.timeoutId);
      this.timeoutId = 0;
    }
  }

  @HostListener('touchend', ['$event'])
  @HostListener('mouseup', ['$event'])
  @HostListener('mouseleave', ['$event']) endPress(event: Event): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = 0;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = 0;
    }

    if (this.pressingState) {
      event.preventDefault();
      this.longPressEnd.emit(event);
    }

    this.pressingStart = false;
    this.pressingState = false;
  }
}
