import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {animate, style, transition, trigger} from '@angular/animations';
import {Image} from '../../types';

export class GalleryImageSelectEvent {
  selected: boolean;
  image: Image;
}

@Component({
  selector: 'app-gallery-image',
  templateUrl: './gallery-image.component.html',
  styleUrls: ['./gallery-image.component.styl'],
  animations: [
    trigger('loading', [
      transition(':leave', [
        style({opacity: 1}),
        animate('0.15s ease-out',
          style({opacity: 0}))
      ])
    ])
  ]
})
export class GalleryImageComponent implements OnInit {

  constructor(public locale: LocaleService) {
  }

  @Input() image: Image | null;
  @Input() size = '100%';
  @Input() selected = false;

  @Input() showSelect = true;
  @Input() alwaysShowSelect = false;

  @Output() toggled = new EventEmitter<GalleryImageSelectEvent>();
  @Output() clicked = new EventEmitter<Image>();

  loaded = false;
  error = false;

  disableClick = false;
  enableClickTimeoutId: number;

  onload = () => this.loaded = true;
  onerror = () => {
    this.error = true;
    this.loaded = true;
  }

  selectClick = (event?: Event) => {
    event?.stopPropagation();
    this.toggled.emit({selected: !this.selected, image: this.image});
  }

  longPressStart = () => {
    if (this.enableClickTimeoutId) {
      clearTimeout(this.enableClickTimeoutId);
      this.enableClickTimeoutId = 0;
    }

    this.disableClick = true;
  }

  longPressEnd = (e?: Event) => {
    e.preventDefault();
    if (this.enableClickTimeoutId) {
      clearTimeout(this.enableClickTimeoutId);
    }

    this.enableClickTimeoutId = setTimeout(() => {
      this.disableClick = false;
      this.enableClickTimeoutId = 0;
    }, 100);
  }

  overlayClick = (event?: Event) => {
    if (this.disableClick) {
      return;
    }

    if (this.selected || this.alwaysShowSelect) {
      this.selectClick(event);
    } else {
      this.clicked.emit(this.image);
    }
  }

  ngOnInit(): void {
    this.loaded = false;
    this.error = false;
  }

}
