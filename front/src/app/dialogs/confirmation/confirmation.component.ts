import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {LocaleService} from '../../services/locale.service';

export interface ConfirmationConfig {
  type?: string;
  severe?: boolean;
}

@Component({
  selector: 'app-confirmation',
  templateUrl: './confirmation.component.html',
  styleUrls: ['./confirmation.component.styl']
})
export class ConfirmationComponent implements OnInit {

  constructor(public locale: LocaleService,
              @Inject(MAT_DIALOG_DATA) public readonly config?: ConfirmationConfig) {
    if (!config) {
      this.config = {type: 'default', severe: false};
    } else if (!config.type) {
      this.config.type = 'default';
    }
  }

  ngOnInit(): void {
  }

}
