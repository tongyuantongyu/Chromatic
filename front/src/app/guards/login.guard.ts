import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {AuthService} from '../services/auth.service';
import {first, map} from 'rxjs/operators';
import {MessageService} from '../services/message.service';
import {LocaleService} from '../services/locale.service';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate, CanActivateChild {
  constructor(private auth: AuthService, private router: Router, private msg: MessageService, private locale: LocaleService) {
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.auth.user$.pipe(first(), map(user => {
      if (user && user.id) {
        return true;
      } else {
        this.auth.setRedirect(state.url);
        this.locale.dict$.pipe(first()).subscribe(dict => {
          this.msg.SendMessage(dict.guard_need_login_message);
        });
        return this.router.parseUrl('/login');
      }
    }));
  }

  canActivateChild(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.canActivate(next, state);
  }
}
