import {Component, OnDestroy, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {FormControl, FormGroup, FormGroupDirective, Validators} from '@angular/forms';
import {AuthService} from '../../services/auth.service';
import {ActivatedRoute, Router} from '@angular/router';
import {ApiService} from '../../services/api.service';
import {MessageService} from '../../services/message.service';
import {first, takeUntil} from 'rxjs/operators';
import {TitleService} from '../../services/title.service';
import {Subject} from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.styl']
})
export class LoginComponent implements OnInit, OnDestroy {

  constructor(public locale: LocaleService,
              private auth: AuthService,
              private api: ApiService,
              private msg: MessageService,
              private router: Router,
              private route: ActivatedRoute,
              private title: TitleService) {
    this.destroy$ = new Subject<void>();
  }

  loginForm = new FormGroup({
    username: new FormControl('', {
      validators: Validators.required,
      updateOn: 'blur'
    }),
    password: new FormControl('', {
      validators: Validators.required,
      updateOn: 'blur'
    }),
    recaptcha: new FormControl(null, Validators.required)
  });

  readonly destroy$: Subject<void>;

  login(directive: FormGroupDirective): void {
    this.api.Login({
      name: this.loginForm.controls.username.value,
      password: this.loginForm.controls.password.value,
      recaptcha: this.loginForm.controls.recaptcha.value
    }).subscribe({
      next: user => {
        this.auth.updateUser(user).subscribe(_ => {
          this.locale.dict$.pipe(first()).subscribe(dict => {
            this.msg.SendMessage(dict.login_success_message);
            this.router.navigateByUrl(this.auth.getRedirect() || '/gallery/me').then();
          });
        });
      },
      error: e => {
        this.locale.dict$.pipe(first()).subscribe(dict => {
          this.msg.SendMessage(dict.login_failed_message.replace('%1', dict[e]));
          this.loginForm.reset();
          directive.resetForm();
        });
      }
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(_ => {
      this.locale.dict$.pipe(takeUntil(this.destroy$)).subscribe(dict => {
        this.title.firstPart = dict.title_login;
      });
      if (this.auth.user && this.auth.user.id) {
        this.router.navigateByUrl('/gallery').then();
      }

      this.loginForm.reset();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

}
