import {Component, OnDestroy, OnInit} from '@angular/core';
import {AbstractControl, FormControl, FormGroup, FormGroupDirective, NgForm, ValidationErrors, Validators} from '@angular/forms';
import {catchError, map, takeUntil} from 'rxjs/operators';
import {LocaleService} from '../../services/locale.service';
import {AuthService} from '../../services/auth.service';
import {ApiService} from '../../services/api.service';
import {MessageService} from '../../services/message.service';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, of, Subject} from 'rxjs';
import {ErrorStateMatcher} from '@angular/material/core';
import {TitleService} from '../../services/title.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.styl']
})
export class RegisterComponent implements OnInit, OnDestroy {

  readonly destroy$: Subject<void>;

  registerForm: FormGroup;

  passwordVisible = false;
  passwordErrorStateMatcher = new RepeatedErrorStateMatcher();

  register(directive: FormGroupDirective): void {
    this.api.Register({
      name: this.registerForm.controls.username.value,
      password: this.registerForm.controls.password.value,
      invite_code: this.registerForm.controls.invite_code.value,
      recaptcha: this.registerForm.controls.recaptcha.value
    }).subscribe({
      next: user => {
        this.auth.updateUser(user).subscribe(_ => {
          this.msg.SendMessage(this.locale.dict.login_success_message);
          this.router.navigateByUrl('/login').then();
        });
      },
      error: e => {
        this.msg.SendMessage(this.locale.dict.login_failed_message.replace('%1',
          this.locale.dict[e] || this.locale.dict[9999]));
        this.registerForm.reset();
        directive.resetForm();
      }
    });
  }

  UserExistValidator = (
    control: AbstractControl
  ): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> => {
    if (!control.value) {
      return null;
    }
    return this.api.UserExist(control.value).pipe(
      map(exist => exist ? {userExist: {value: control.value}} : null),
      catchError(_ => of(null))
    );
  }

  PasswordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }
    const value = control.value.toString();
    if (value.length < 8) {
      return {weakPassword: {value}};
    }
    let hasNumber = false;
    let hasLowerCase = false;
    let hasUpperCase = false;
    let i = value.length;
    while (i--) {
      const ord = value.charCodeAt(i);
      if (ord > 96 && ord < 123) {
        hasLowerCase = true;
      } else if (ord > 64 && ord < 91) {
        hasUpperCase = true;
      } else if (ord > 47 && ord < 58) {
        hasNumber = true;
      }
    }
    return (hasNumber && hasUpperCase && hasLowerCase) ? null : {weakPassword: {value}};
  }

  PasswordIdenticalValidator(control: FormGroup): ValidationErrors | null {
    const password = control.value.password;
    const passwordConfirm = control.value.passwordConfirm;
    return password && passwordConfirm && password === passwordConfirm ? null : {passwordMismatch: true};
  }

  constructor(public locale: LocaleService,
              private auth: AuthService,
              private api: ApiService,
              private msg: MessageService,
              private router: Router,
              private route: ActivatedRoute,
              private title: TitleService) {
    this.registerForm = new FormGroup({
      username: new FormControl(null, {
        validators: Validators.required,
        asyncValidators: this.UserExistValidator,
        updateOn: 'blur'
      }),
      password: new FormControl(null, {
        validators: [Validators.required, this.PasswordStrengthValidator],
        updateOn: 'blur'
      }),
      passwordConfirm: new FormControl(null, {
        validators: Validators.required,
        updateOn: 'blur'
      }),
      invite_code: new FormControl(null, Validators.required),
      recaptcha: new FormControl(null, Validators.required)
    }, {
      validators: this.PasswordIdenticalValidator,
    });

    this.destroy$ = new Subject<void>();
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(_ => {
      this.locale.dict$.pipe(takeUntil(this.destroy$)).subscribe(dict => {
        this.title.firstPart = dict.title_register;
      });

      if (this.auth.user && this.auth.user.id) {
        this.router.navigateByUrl('/gallery').then();
      }

      this.registerForm.reset();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

}

export class RepeatedErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    return !!(control.value && form.hasError('passwordMismatch'));
  }
}
