import {Injectable} from '@angular/core';
import {LocalStorage} from '@ngx-pwa/local-storage';
import {Observable, ReplaySubject} from 'rxjs';
import {first} from 'rxjs/operators';
import {User} from '../types';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private token$ = new ReplaySubject<string>(1);
  public user$ = new ReplaySubject<User | null>(1);
  public user: User;
  private loginRedirect: string | null = null;

  constructor(private storage: LocalStorage) {
    this.storage.getItem('token').subscribe((token: string) => {
      this.token$.next(token ? token : null);
    });
    this.storage.getItem('user').subscribe((user: User) => {
      this.user$.next(user);
    });
    this.user$.subscribe((user: User) => this.user = user);
  }

  public updateUser(user: User): Observable<undefined> {
    return new Observable(observer => {
      this.storage.setItem('user', user).subscribe(_ => {
        this.user$.next(user);
        observer.next();
        observer.complete();
      });
    });
  }

  public getRedirect(): string | null {
    const redirectUrl = this.loginRedirect;
    this.loginRedirect = null;
    return redirectUrl;
  }

  public setRedirect(redirectUrl: string): void {
    this.loginRedirect = redirectUrl;
  }

  public get(): Observable<string> {
    return this.token$.pipe(first());
  }

  public set(token: string): Observable<undefined> {
    return new Observable(observer => {
      this.storage.setItem('token', token).subscribe(_ => {
        this.token$.next(token);
        observer.next();
        observer.complete();
      });
    });
  }

  public clear(): Observable<undefined> {
    return new Observable(observer => {
      this.storage.setItem('token', null).subscribe(_ => {
        this.token$.next(null);
        this.updateUser(null).subscribe(() => {
          observer.next();
          observer.complete();
        });
      });
    });
  }
}
