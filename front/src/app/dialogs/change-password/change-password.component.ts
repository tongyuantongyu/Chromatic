import {Component, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {AbstractControl, FormControl, FormGroup, FormGroupDirective, ValidationErrors, Validators} from '@angular/forms';
import {RepeatedErrorStateMatcher} from '../../components/register/register.component';
import {ApiService} from '../../services/api.service';
import {AuthService} from '../../services/auth.service';
import {MessageService} from '../../services/message.service';
import {Router} from '@angular/router';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.styl']
})
export class ChangePasswordComponent implements OnInit {

  changePasswordForm: FormGroup;
  passwordVisible = false;
  passwordErrorStateMatcher = new RepeatedErrorStateMatcher();

  changePassword(directive: FormGroupDirective): void {
    this.api.ChangePassword({
      old_password: this.changePasswordForm.value.oldPassword,
      new_password: this.changePasswordForm.value.password,
    }).subscribe({
      next: _ => {
        this.auth.clear().subscribe(() => {
          this.msg.SendMessage(this.locale.dict.change_password_succeed);
          this.router.navigateByUrl('/login').then();
          this.dialogRef.close();
        });
      },
      error: err => {
        this.msg.SendMessage(this.locale.dict.change_password_failed.replace(
          '%1', this.locale.dict[err] || this.locale.dict[9999]));
        this.changePasswordForm.reset();
        directive.resetForm();
      }
    });
  }

  constructor(public locale: LocaleService,
              private api: ApiService,
              private auth: AuthService,
              private router: Router,
              private msg: MessageService,
              private dialogRef: MatDialogRef<ChangePasswordComponent>) {
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

  ngOnInit(): void {
    this.changePasswordForm = new FormGroup({
      oldPassword: new FormControl(null, {
        validators: [Validators.required],
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
    }, {
      validators: this.PasswordIdenticalValidator,
    });
  }

}
