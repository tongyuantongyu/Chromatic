import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ScrollService} from '../../services/scroll.service';
import {LocaleService} from '../../services/locale.service';
import {MatPaginator, MatPaginatorIntl, PageEvent} from '@angular/material/paginator';
import {CollectionViewer, DataSource, ListRange, SelectionModel} from '@angular/cdk/collections';
import {InviteCode, User} from '../../types';
import {combineLatest, merge, Observable, Subject, Subscriber, Subscription} from 'rxjs';
import {ApiService} from '../../services/api.service';
import {map, takeUntil} from 'rxjs/operators';
import {MessageService} from '../../services/message.service';
import {ChangeAvatarComponent} from '../../dialogs/change-avatar/change-avatar.component';
import {MatDialog} from '@angular/material/dialog';
import {ConfirmationComponent} from '../../dialogs/confirmation/confirmation.component';
import {stringError} from '../../utils';
import {SinglePromptComponent} from '../../dialogs/single-prompt/single-prompt.component';
import {ChoiceComponent} from '../../dialogs/choice/choice.component';
import {AddUserComponent} from '../../dialogs/add-user/add-user.component';
import {AddCodeComponent} from '../../dialogs/add-code/add-code.component';
import {TitleService} from '../../services/title.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.styl']
})
export class AdminComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('container', {static: true}) container: ElementRef<HTMLElement>;
  @ViewChild('userPaginator') userPaginator: MatPaginator;
  @ViewChild('codePaginator') codePaginator: MatPaginator;

  readonly destroy$: Subject<void>;

  userFilter = '';
  userDataSource: UserDataSource;
  userSelection = new SelectionModel<User>(true, []);
  userUpdating = false;

  userColumns: string[] = ['select', 'user', 'privileged', 'frozen', 'operation'];

  avatarChangedUsers: Set<string>;
  avatarRefreshParam = '';

  codeDataSource: CodeDataSource;
  codeSelection = new SelectionModel<InviteCode>(true, []);
  codeUpdating = false;

  codeColumns: string[] = ['select', 'code', 'times', 'operation'];

  getRefresh(id: string): string {
    if (this.avatarChangedUsers.has(id)) {
      return '?refresh=' + this.avatarRefreshParam;
    } else {
      return '';
    }
  }

  constructor(private scroll: ScrollService,
              public locale: LocaleService,
              private api: ApiService,
              private msg: MessageService,
              private dialog: MatDialog,
              private title: TitleService) {
    this.destroy$ = new Subject<void>();
  }

  userIsAllSelected(): boolean {
    const numSelected = this.userSelection.selected.length;
    const numRows = this.userDataSource.data.length;
    return numRows && numSelected === numRows;
  }

  userMasterToggle(): void {
    this.userIsAllSelected() ?
      this.userSelection.clear() :
      this.userDataSource.data.forEach(row => this.userSelection.select(row));
  }

  userApplyFilter(): void {
    this.userDataSource.keyword = this.userFilter;
    this.userSelection.clear();
  }

  userSetAvatar(user: User): void {
    this.dialog.open(ChangeAvatarComponent, {
      panelClass: ['scrollable-inner-y', 'scrollable-inner'],
      data: user.id,
      maxHeight: '80vh',
    }).afterClosed().subscribe(result => {
      if (result) {
        this.avatarChangedUsers.add(user.id);
      }
    });
  }

  userSetPermission(user: User, privileged: boolean, frozen: boolean): void {
    this.userUpdating = true;

    this.api.SetUserPermission({
      user_id: user.id,
      privileged: privileged ? !user.privileged : user.privileged,
      frozen: frozen ? !user.frozen : user.frozen,
    }).subscribe({
      next: _ => {
        if (privileged) {
          this.msg.SendMessage(this.locale.dict.admin_user_privileged_set);
        }

        if (frozen) {
          this.msg.SendMessage(this.locale.dict.admin_user_frozen_set);
        }

        this.userDataSource.reload();
        this.userUpdating = false;
      },
      error: err => {
        if (privileged) {
          this.msg.SendMessage(this.locale.dict.admin_user_privileged_failed.replace(
            '%1', this.locale.dict[err] || this.locale.dict[9999]));
        }

        if (frozen) {
          this.msg.SendMessage(this.locale.dict.admin_user_frozen_failed.replace(
            '%1', this.locale.dict[err] || this.locale.dict[9999]));
        }

        this.userUpdating = false;
      }
    });
  }

  userSetPassword(user: User): void {
    this.dialog.open(SinglePromptComponent, {
      data: {
        type: 'set_password',
        input: 'text'
      }
    }).afterClosed().subscribe(password => {
      if (!password) {
        return;
      }

      this.api.SetPassword({
        user_id: user.id,
        password
      }).subscribe({
        next: _ => {
          this.msg.SendMessage(this.locale.dict.admin_user_password_ok);
        },
        error: err => {
          this.msg.SendMessage(this.locale.dict.admin_user_password_failed.replace('%1', stringError.call(this, err)));
        }
      });
    });
  }

  userDelete(user: User | User[], multiple: boolean): void {
    this.dialog.open(ChoiceComponent, {
      data: {
        type: multiple ? 'delete_users' : 'delete_user',
        severe: true,
      }
    }).afterClosed().subscribe(adopt => {
      this.dialog.open(ConfirmationComponent, {
        data: {
          type: multiple ? 'delete_users' : 'delete_user',
          severe: true,
        }
      }).afterClosed().subscribe(decision => {
        if (!decision) {
          return;
        }

        this.userUpdating = true;
        this.api.RemoveUser({
          users: multiple ? (user as User[]).map(u => u.id) : [(user as User).id],
          cascade: !adopt
        }).subscribe({
          next: _ => {
            this.msg.SendMessage(this.locale.dict[multiple ? 'admin_user_delete_selected_ok' : 'admin_user_delete_ok']);
            this.userSelection.clear();
            this.userDataSource.reload();
            this.userUpdating = false;
          },
          error: err => {
            this.msg.SendMessage(this.locale.dict[multiple ? 'admin_user_delete_selected_failed' : 'admin_user_delete_failed']
              .replace('%1', stringError.call(this, err)));
            this.userSelection.clear();
            this.userDataSource.reload();
            this.userUpdating = false;
          }
        });
      });
    });
  }

  userAdd(): void {
    this.dialog.open(AddUserComponent).afterClosed().subscribe(result => {
      if (result) {
        this.userDataSource.reload();
        this.userSelection.clear();
      }
    });
  }

  codeIsAllSelected(): boolean {
    const numSelected = this.codeSelection.selected.length;
    const numRows = this.codeDataSource.data.length;
    return numRows && numSelected === numRows;
  }

  codeMasterToggle(): void {
    this.codeIsAllSelected() ?
      this.codeSelection.clear() :
      this.codeDataSource.data.forEach(row => this.codeSelection.select(row));
  }

  codeAdd(): void {
    this.dialog.open(AddCodeComponent).afterClosed().subscribe(result => {
      if (result) {
        this.codeDataSource.reload();
        this.codeSelection.clear();
      }
    });
  }

  codeDelete(code: InviteCode): void {
    this.dialog.open(ConfirmationComponent, {
      data: {
        type: 'delete_code',
        severe: true,
      }
    }).afterClosed().subscribe(decision => {
      if (!decision) {
        return;
      }

      this.codeUpdating = true;
      this.api.RemoveInvite(code.code).subscribe({
        next: _ => {
          this.msg.SendMessage(this.locale.dict.admin_code_delete_ok);
          this.codeSelection.clear();
          this.codeDataSource.reload();
          this.codeUpdating = false;
        },
        error: err => {
          this.msg.SendMessage(this.locale.dict.admin_code_delete_failed
            .replace('%1', stringError.call(this, err)));
          this.codeSelection.clear();
          this.codeDataSource.reload();
          this.codeUpdating = false;
        }
      });
    });
  }

  codeSetTimes(code: InviteCode): void {
    this.dialog.open(SinglePromptComponent, {
      data: {
        type: 'code_times',
        input: 'number'
      }
    }).afterClosed().subscribe(times => {
      if (!times) {
        return;
      }

      this.codeUpdating = true;

      this.api.SetInviteTimes({
        code: code.code,
        times: Number(times)
      }).subscribe({
        next: _ => {
          this.msg.SendMessage(this.locale.dict.admin_times_set_ok);
          this.codeUpdating = false;
          this.codeDataSource.reload();
        },
        error: err => {
          this.msg.SendMessage(this.locale.dict.admin_times_set_failed.replace('%1', stringError.call(this, err)));
          this.codeUpdating = false;
          this.codeDataSource.reload();
        }
      });
    });
  }

  ngOnInit(): void {
    this.avatarChangedUsers = new Set();
    this.userDataSource = new UserDataSource(this.api, this.locale, this.msg);
    this.codeDataSource = new CodeDataSource(this.api, this.locale, this.msg);
    this.avatarRefreshParam = new Date().getTime().toString(10);
    this.locale.dict$.pipe(takeUntil(this.destroy$)).subscribe(dict => {
      this.title.firstPart = dict.title_admin;
    });
  }

  ngAfterViewInit(): void {
    this.userDataSource.paginator = this.userPaginator;
    this.codeDataSource.paginator = this.codePaginator;
    this.scroll.WatchOn(this.container.nativeElement);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.scroll.UnwatchOn(this.container.nativeElement);
  }

}

export class UserDataSource implements DataSource<User> {
  forceChangeS: Subscriber<undefined>;
  paginatorChangeS: Subscriber<PageEvent>;
  data: User[];
  dataStreamS: Subscriber<User[] | ReadonlyArray<User>>;
  changeSubscription: Subscription;
  paginatorSubscription: Subscription;
  // tslint:disable-next-line:variable-name
  _keyword = '';
  // tslint:disable-next-line:variable-name
  _paginator: MatPaginator;

  get paginator(): MatPaginator {
    return this._paginator;
  }

  set paginator(paginator: MatPaginator) {
    this._paginator = paginator;
    this.paginatorSubscription?.unsubscribe();
    this.paginatorSubscription = paginator.page.subscribe(e => this.paginatorChangeS?.next(e));
    this.forceChangeS?.next();
  }

  get keyword(): string {
    return this._keyword;
  }

  set keyword(keyword: string) {
    this._keyword = keyword;
    this.reload();
  }

  reload(): void {
    this.paginator.pageIndex = 0;
    this.forceChangeS?.next();
  }

  fetch(range: ListRange): void {
    this.api.ListUser({
      keyword: this.keyword,
      offset: range.start,
      limit: range.end > 100 ? 10 : range.end
    }).subscribe({
      next: value => {
        this.data = value.users;
        this.dataStreamS.next(value.users);
        if (this.paginator) {
          this.paginator.length = value.total;
        }
      },
      error: err => {
        this.msg.SendMessage(this.locale.dict.admin_user_fetch_failed.replace(
          '%1', this.locale.dict[err] || this.locale.dict[9999]));
        this.dataStreamS.next([]);
        if (this.paginator) {
          this.paginator.length = 0;
          this.paginator.pageIndex = 0;
        }
      }
    });
  }

  connect(collectionViewer: CollectionViewer): Observable<User[] | ReadonlyArray<User>> {
    this.changeSubscription = combineLatest([
      merge(
        collectionViewer.viewChange,
        new Observable<PageEvent>(s => this.paginatorChangeS = s).pipe(
          map(e => ({start: e.pageIndex * e.pageSize, end: (e.pageIndex + 1) * e.pageSize} as ListRange))
        )
      ),
      new Observable(s => this.forceChangeS = s)
    ]).subscribe(([range, _]) => this.fetch(range));
    return new Observable(s => this.dataStreamS = s);
  }

  disconnect(collectionViewer: CollectionViewer): void {
    this.changeSubscription.unsubscribe();
  }

  constructor(private api: ApiService,
              private locale: LocaleService,
              private msg: MessageService) {

  }
}

export class CodeDataSource implements DataSource<InviteCode> {
  forceChangeS: Subscriber<undefined>;
  paginatorChangeS: Subscriber<PageEvent>;
  data: InviteCode[];
  dataStreamS: Subscriber<InviteCode[] | ReadonlyArray<InviteCode>>;
  changeSubscription: Subscription;
  paginatorSubscription: Subscription;
  // tslint:disable-next-line:variable-name
  _paginator: MatPaginator;

  get paginator(): MatPaginator {
    return this._paginator;
  }

  set paginator(paginator: MatPaginator) {
    this._paginator = paginator;
    this.paginatorSubscription?.unsubscribe();
    this.paginatorSubscription = paginator.page.subscribe(e => this.paginatorChangeS?.next(e));
    this.forceChangeS?.next();
  }

  reload(): void {
    this.paginator.pageIndex = 0;
    this.forceChangeS?.next();
  }

  fetch(range: ListRange): void {
    this.api.ListInvite({
      offset: range.start,
      limit: range.end > 100 ? 10 : range.end
    }).subscribe({
      next: value => {
        this.data = value.codes;
        this.dataStreamS.next(value.codes);
        if (this.paginator) {
          this.paginator.length = value.total;
        }
      },
      error: err => {
        this.msg.SendMessage(this.locale.dict.admin_code_fetch_failed.replace(
          '%1', this.locale.dict[err] || this.locale.dict[9999]));
        this.dataStreamS.next([]);
        if (this.paginator) {
          this.paginator.length = 0;
          this.paginator.pageIndex = 0;
        }
      }
    });
  }

  connect(collectionViewer: CollectionViewer): Observable<InviteCode[] | ReadonlyArray<InviteCode>> {
    this.changeSubscription = combineLatest([
      merge(
        collectionViewer.viewChange,
        new Observable<PageEvent>(s => this.paginatorChangeS = s).pipe(
          map(e => ({start: e.pageIndex * e.pageSize, end: (e.pageIndex + 1) * e.pageSize} as ListRange))
        )
      ),
      new Observable(s => this.forceChangeS = s)
    ]).subscribe(([range, _]) => this.fetch(range));
    return new Observable(s => this.dataStreamS = s);
  }

  disconnect(collectionViewer: CollectionViewer): void {
    this.changeSubscription.unsubscribe();
  }

  constructor(private api: ApiService,
              private locale: LocaleService,
              private msg: MessageService) {
  }
}

export class LocalePaginatorIntl implements MatPaginatorIntl {
  private dict: { [key: string]: string } = {other: 'Loading...'};
  readonly changes = new Subject<void>();

  get firstPageLabel(): string {
    return this.dict.paginator_first_page || this.dict.other || '';
  }

  get itemsPerPageLabel(): string {
    return this.dict.paginator_per_page || this.dict.other || '';
  }

  get lastPageLabel(): string {
    return this.dict.paginator_last_page || this.dict.other || '';
  }

  get nextPageLabel(): string {
    return this.dict.paginator_next_page || this.dict.other || '';
  }

  get previousPageLabel(): string {
    return this.dict.paginator_previous_page || this.dict.other || '';
  }

  getRangeLabel(page: number, pageSize: number, length: number): string {
    length = Math.max(length, 0);

    if (length === 0) {
      return this.dict.paginator_position_none || this.dict.other || '';
    } else if (pageSize === 0) {
      return (this.dict.paginator_position_zero && this.dict.paginator_position_zero.replace('%1', String(length)))
        || this.dict.other || '';
    } else {
      const startIndex = page * pageSize;
      const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;
      return (this.dict.paginator_position &&
        this.dict.paginator_position
          .replace('%1', String(startIndex + 1))
          .replace('%2', String(endIndex))
          .replace('%3', String(length))) || this.dict.other || '';
    }
  }

  constructor(private locale: LocaleService) {
    this.locale.dict$.subscribe(dict => {
      this.dict = dict;
      this.changes.next();
    });
  }
}

export const LOCALE_PAGINATOR_INTL_PROVIDER = {
  provide: MatPaginatorIntl,
  deps: [LocaleService],
  useFactory: (locale: LocaleService) => new LocalePaginatorIntl(locale)
};
