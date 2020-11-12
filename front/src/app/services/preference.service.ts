import {Injectable} from '@angular/core';
import {Observable, ReplaySubject} from 'rxjs';
import {filter, first, map} from 'rxjs/operators';
import {LocalStorage} from '@ngx-pwa/local-storage';

export interface Preferences {
  locale?: string;

  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class PreferenceService {

  public pref$ = new ReplaySubject<Preferences>(1);
  private pref: Preferences = {};

  constructor(private storage: LocalStorage) {
    this.pref$.next({});
    this.storage.getItem('preference').subscribe((token: Preferences) => {
      this.pref$.next(token ? token : {});
    });

    this.pref$.subscribe(pref => this.pref = pref);
  }

  public get(key: string): Observable<any> {
    return this.pref$.pipe(first(), map(pref => pref[key]));
  }

  public listen(key: string): Observable<any> {
    return this.pref$.pipe(filter(pref => pref && pref !== {}), map(pref => pref[key]));
  }

  public getCurrent(key: string): any {
    return this.pref[key];
  }

  public set(key: string, value: any): Observable<undefined> {
    const newPreference = this.pref;
    newPreference[key] = value;
    return this.setPreference(newPreference);
  }

  public clear(key: string): Observable<undefined> {
    return new Observable(observer => {
      const newPreference = this.pref;
      newPreference[key] = undefined;
      this.storage.setItem('preference', newPreference).subscribe(_ => {
        this.pref$.next(newPreference);
        observer.next();
        observer.complete();
      });
    });
  }

  public getPreference(): Observable<Preferences> {
    return this.pref$.pipe(first());
  }

  public setPreference(preference: Preferences): Observable<undefined> {
    return new Observable(observer => {
      this.storage.setItem('preference', preference).subscribe(_ => {
        this.pref$.next(preference);
        observer.next();
        observer.complete();
      });
    });
  }

  public clearPreference(): Observable<undefined> {
    return new Observable(observer => {
      this.storage.setItem('preference', {}).subscribe(_ => {
        this.pref$.next({});
        observer.next();
        observer.complete();
      });
    });
  }
}
