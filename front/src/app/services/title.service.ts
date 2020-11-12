import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class TitleService {

  // tslint:disable-next-line:variable-name
  _firstPart = '';
  // tslint:disable-next-line:variable-name
  _secondPart = '';

  get firstPart(): string {
    return this._firstPart;
  }

  set firstPart(value: string) {
    this._firstPart = value;
    this.updateTitle();
  }

  get secondPart(): string {
    return this._secondPart;
  }

  set secondPart(value: string) {
    this._secondPart = value;
    this.updateTitle();
  }

  updateTitle(): void {
    const t = ['Chromatic'];
    if (this._firstPart) {
      t.push(this._firstPart);
    }

    if (this._secondPart) {
      t.push(this._secondPart);
    }

    this.title.setTitle(t.join(' - '));
  }

  constructor(private title: Title) {
    this.updateTitle();
  }
}
