import {Component, Input, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';

@Component({
  // tslint:disable-next-line:component-selector
  selector: '[app-plural]',
  template: `
    <ng-container [ngPlural]="value">
      <ng-template ngPluralCase="=0">
        {{(pluralSource + '_0') | i18nSelect:locale.dict}}
      </ng-template>
      <ng-template ngPluralCase="one">
        {{(pluralSource + '_1') | i18nSelect:locale.dict}}
      </ng-template>
      <ng-template ngPluralCase="other">
        {{value}}
        {{(pluralSource + '_other') | i18nSelect:locale.dict}}
      </ng-template>
    </ng-container>
  `,
})
export class PluralComponent implements OnInit {

  // tslint:disable-next-line:no-input-rename
  @Input('app-plural') value: number;
  @Input() pluralSource: string;

  constructor(public locale: LocaleService) {
  }

  ngOnInit(): void {
  }

}
