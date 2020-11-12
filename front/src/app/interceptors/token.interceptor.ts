import {Injectable} from '@angular/core';
import {HttpEvent, HttpEventType, HttpHandler, HttpHeaderResponse, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Observable} from 'rxjs';
import {AuthService} from '../services/auth.service';
import {first, tap} from 'rxjs/operators';
import {Router} from '@angular/router';
import {ApiService, Response} from '../services/api.service';
import {ECredentialExpired} from '../errors';
import {MessageService} from '../services/message.service';
import {LocaleService} from '../services/locale.service';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  constructor(private auth: AuthService,
              private router: Router,
              private locale: LocaleService,
              private msg: MessageService,
              private api: ApiService) {
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (request.url.includes('/api/')) {
      return new Observable<HttpEvent<unknown>>(observer => {
        this.auth.get().subscribe(token => {
          if (token) {
            const authReq = request.clone({
              setHeaders: {Authorization: 'Bearer ' + token}
            });

            next.handle(authReq).subscribe({
              next: i => {
                this.updateToken(i);
                observer.next(i);
              },
              complete: () => observer.complete(),
              error: e => observer.error(e)
            });
          } else {
            next.handle(request).subscribe({
              next: i => {
                this.updateToken(i);
                observer.next(i);
              },
              complete: () => observer.complete(),
              error: e => observer.error(e)
            });
          }
        });
      });
    } else {
      return next.handle(request).pipe(
        tap(this.updateToken)
      );
    }
  }

  private updateToken(httpEvent: HttpEvent<unknown>): void {
    if (httpEvent.type === HttpEventType.Response || httpEvent.type === HttpEventType.ResponseHeader) {
      const token = (httpEvent as HttpHeaderResponse).headers.get('X-Update-Authorization');
      if (token) {
        this.auth.set(token).subscribe(_ => {
          this.auth.user$.pipe(first()).subscribe(oldUser => {
            if (oldUser?.id) {
              this.api.GetUser(oldUser.id).subscribe(user => this.auth.updateUser(user).subscribe());
            }
          });
        });
      }

      if (httpEvent.type === HttpEventType.Response) {
        const response = (httpEvent as HttpResponse<Response>);
        if (response && response.body && response.body.status === ECredentialExpired) {
          this.auth.clear().subscribe(_ => {
            this.router.navigateByUrl('/login').then();
            this.msg.SendMessage(this.locale.dict.login_expired);
          });
        }
      }
    }
  }
}
