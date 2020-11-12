import {Component, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {MessageService} from '../../services/message.service';
import {ApiService} from '../../services/api.service';
import {MatDialogRef} from '@angular/material/dialog';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {stringError} from '../../utils';

@Component({
  selector: 'app-add-code',
  templateUrl: './add-code.component.html',
  styleUrls: ['./add-code.component.styl']
})
export class AddCodeComponent implements OnInit {

  codeForm = new FormGroup({
    code: new FormControl(null, Validators.required),
    times: new FormControl(0, Validators.min(0))
  });

  addCode(): void {
    if (this.codeForm.invalid) {
      return;
    }

    this.api.AddInvite({
      code: this.codeForm.controls.code.value,
      times: this.codeForm.controls.times.value
    }).subscribe({
      next: _ => {
        this.msg.SendMessage(this.locale.dict.add_code_success_msg.replace('%1', this.codeForm.controls.code.value));
        this.dialogRef.close(true);
      },
      error: err => {
        this.msg.SendMessage(this.locale.dict.add_code_error_msg.replace('%1', stringError.call(this, err)));
        this.dialogRef.close(false);
      }
    });
  }

  constructor(public locale: LocaleService,
              private msg: MessageService,
              private api: ApiService,
              private dialogRef: MatDialogRef<AddCodeComponent>) {
  }

  ngOnInit(): void {
  }

}
