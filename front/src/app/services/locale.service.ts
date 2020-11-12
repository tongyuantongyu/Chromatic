import {Inject, Injectable} from '@angular/core';
import {ReplaySubject} from 'rxjs';
import {TransTable} from '../langs';
import {map} from 'rxjs/operators';
import {PreferenceService} from './preference.service';
import {environment} from '../../environments/environment';
import {DOCUMENT} from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class LocaleService {
  public dict$ = new ReplaySubject<{ [key: string]: string }>(1);
  public dict: { [key: string]: string } = {other: 'Loading...'};

  private static getUsersLocale(defaultValue: string = 'en'): string {
    if (!environment.production) {
      return 'en';
    }

    if (typeof window === 'undefined' || typeof window.navigator === 'undefined') {
      return defaultValue;
    }
    const wn = window.navigator as any;
    let lang = wn.languages ? wn.languages[0] : defaultValue;
    lang = lang || wn.language || wn.browserLanguage || wn.userLanguage;
    return lang;
  }

  constructor(private pref: PreferenceService,
              @Inject(DOCUMENT) private document: Document) {

    this.dict$.next(TransTable.en);
    this.pref.listen('locale').pipe(
      map((locale?: string) => {
        if (!locale) {
          locale = LocaleService.getUsersLocale();
        }

        let dict: { [key: string]: string } = TransTable[locale];

        if (!dict) {
          locale = locale.split('-')[0];
          dict = TransTable[locale];
        }

        if (!dict) {
          locale = 'en';
          dict = TransTable.en;
        }

        if (!environment.production) {
          console.log('Current locale: ', locale, ', Current dict: ', dict);
        }

        this.document.documentElement.lang = locale;

        return dict;
      }),
    ).subscribe(dict => {
      this.dict$.next(dict);
      this.dict = dict;
    });
  }
}
