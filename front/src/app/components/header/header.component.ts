import {Component, OnDestroy, OnInit} from '@angular/core';
import {AuthService} from '../../services/auth.service';
import {auditTime, map, takeUntil} from 'rxjs/operators';
import {animate, sequence, state, style, transition, trigger} from '@angular/animations';
import {LocaleService} from '../../services/locale.service';
import {Observable, Subscriber} from 'rxjs';
import {ScrollService} from '../../services/scroll.service';
import {BrokerService} from '../../services/broker.service';
import {MatDialog} from '@angular/material/dialog';
import {ChangePasswordComponent} from '../../dialogs/change-password/change-password.component';
import {Router} from '@angular/router';
import {ChangeAvatarComponent} from '../../dialogs/change-avatar/change-avatar.component';
import {FormatPreferenceComponent} from '../../dialogs/format-preference/format-preference.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.styl'],
  animations: [
    trigger('header', [
      state('minified', style(
        {width: '40px', right: '12px', top: '12px', padding: '0', borderRadius: '20px', backgroundColor: 'transparent'}
      )),
      state('expanded', style(
        {width: '*', right: '0', top: '0', borderRadius: '0', padding: '12px', backgroundColor: '*'}
      )),
      transition('minified => expanded', sequence([
        animate('10ms', style(
          {width: '40px', right: '12px', top: '12px', borderRadius: '20px', padding: '0', backgroundColor: '*'}
        )),
        animate('225ms ease-in-out', style(
          {width: '40px', right: '0', top: '0', borderRadius: '5px', padding: '12px', backgroundColor: '*'}
        )),
        animate('225ms ease-in-out', style(
          {width: '*', right: '0', top: '0', borderRadius: '0', padding: '12px', backgroundColor: '*'}
        )),
      ])),
      transition('expanded => minified', sequence([
        animate('225ms ease-in-out', style(
          {width: '40px', right: '0', top: '0', borderRadius: '5px', padding: '12px', backgroundColor: '*'}
        )),
        animate('225ms ease-in-out', style(
          {width: '40px', right: '12px', top: '12px', borderRadius: '20px', padding: '0', backgroundColor: '*'}
        )),
        animate('10ms', style(
          {width: '40px', right: '12px', top: '12px', padding: '0', borderRadius: '20px', backgroundColor: 'transparent'}
        )),
      ]))
    ]),
  ],
})
export class HeaderComponent implements OnInit, OnDestroy {

  constructor(public auth: AuthService,
              public locale: LocaleService,
              private scroll: ScrollService,
              private dialog: MatDialog,
              private router: Router,
              public broker: BrokerService) {
    this.destroy$ = new Observable<undefined>(s => {
      this.destroyS = s;
    });
  }

  isLogin$ = this.auth.user$.pipe(map(user => user && user.id));
  isAdmin$ = this.auth.user$.pipe(map(user => user && user.name === 'admin'));
  isFrozen$ = this.auth.user$.pipe(map(user => user && user.frozen));

  destroy$: Observable<undefined>;
  destroyS: Subscriber<undefined>;

  scrollExpand = true;
  hoverExpand = false;
  subExpand = 0;
  lastEvent = 0;

  avatarError = false;
  refresh = '';

  ngOnDestroy(): void {
    this.destroyS.next();
  }

  updateData(): void {
    this.broker.set('header-status', this.scrollExpand || this.hoverExpand || this.subExpand);
  }

  enterHeader(): void {
    if (this.lastEvent) {
      clearTimeout(this.lastEvent);
      this.lastEvent = 0;
    }

    this.hoverExpand = true;
    this.updateData();
  }

  leaveHeader(): void {
    if (this.lastEvent) {
      clearTimeout(this.lastEvent);
    }

    this.lastEvent = setTimeout(() => {
      this.hoverExpand = false;
      this.updateData();
      this.lastEvent = 0;
    }, 500);
  }

  openSub(): void {
    this.subExpand++;
    this.updateData();
  }

  closeSub(): void {
    if (this.subExpand > 0) {
      setTimeout(() => {
        this.subExpand--;
        this.updateData();
      }, 1000);
    }
  }

  changeAvatar(): void {
    this.dialog.open(ChangeAvatarComponent, {
      panelClass: ['scrollable-inner-y', 'scrollable-inner'],
      maxHeight: '80vh',
    }).afterClosed().subscribe(result => {
      if (result) {
        this.avatarError = false;
        this.refresh = '?refresh=' + new Date().getTime();
      }
    });
  }

  changePassword(): void {
    this.dialog.open(ChangePasswordComponent, {
      panelClass: ['scrollable-inner-y', 'scrollable-inner'],
      maxHeight: '80vh',
    });
  }

  logout(): void {
    this.auth.clear().subscribe(_ => {
      this.router.navigateByUrl('/login').then();
    });
  }

  showUpload(): void {
    this.router.navigate([{outlets: {upload: 'show'}}]).then();
  }

  openPreference(): void {
    this.dialog.open(FormatPreferenceComponent);
  }

  ngOnInit(): void {
    this.updateData();

    this.scroll.status$.pipe(auditTime(50), takeUntil(this.destroy$)).subscribe(e => {
      this.scrollExpand = e.offsetH < 50;
      this.updateData();
    });
  }

}

