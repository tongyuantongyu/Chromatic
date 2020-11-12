import {Component, Inject, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormControl, Validators} from '@angular/forms';

export interface PromptConfig {
  type?: string;
  input?: string;
}

@Component({
  selector: 'app-single-prompt',
  templateUrl: './single-prompt.component.html',
  styleUrls: ['./single-prompt.component.styl']
})
export class SinglePromptComponent implements OnInit {

  inputValue = new FormControl(null, Validators.required);

  constructor(public locale: LocaleService,
              @Inject(MAT_DIALOG_DATA) public readonly config?: PromptConfig) {
    if (!config) {
      this.config = {type: 'default', input: 'text'};
    } else if (!config.type) {
      this.config.type = 'default';
    } else if (!config.input) {
      this.config.input = 'text';
    }
  }

  ngOnInit(): void {
  }

}
