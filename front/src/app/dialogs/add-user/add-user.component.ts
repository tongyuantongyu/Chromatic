import {Component, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {ApiService} from '../../services/api.service';
import {AbstractControl, FormControl, FormGroup, ValidationErrors, Validators} from '@angular/forms';
import {Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {stringError} from '../../utils';
import {MessageService} from '../../services/message.service';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-add-user',
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.styl']
})
export class AddUserComponent implements OnInit {

  userForm: FormGroup;

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

  addUser(): void {
    if (this.userForm.invalid) {
      return;
    }

    this.api.AddUser({
      name: this.userForm.controls.username.value,
      password: this.userForm.controls.password.value,
      privileged: this.userForm.controls.privileged.value
    }).subscribe({
      next: _ => {
        this.msg.SendMessage(this.locale.dict.add_user_success_msg.replace('%1', this.userForm.controls.username.value));
        this.dialogRef.close(true);
      },
      error: err => {
        this.msg.SendMessage(this.locale.dict.add_user_error_msg.replace('%1', stringError.call(this, err)));
        this.dialogRef.close(false);
      }
    });
  }

  constructor(public locale: LocaleService,
              private msg: MessageService,
              private api: ApiService,
              private dialogRef: MatDialogRef<AddUserComponent>) {
    this.userForm = new FormGroup({
      username: new FormControl(null, {
        validators: Validators.required,
        asyncValidators: this.UserExistValidator,
        updateOn: 'blur'
      }),
      password: new FormControl(null, Validators.required),
      privileged: new FormControl(false),
    });
  }

  ngOnInit(): void {
  }

}
