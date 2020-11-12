import {Component, Inject, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';

export interface ChoiceConfig {
  type?: string;
  different?: boolean;
}

@Component({
  selector: 'app-choice',
  templateUrl: './choice.component.html',
  styleUrls: ['./choice.component.styl']
})
export class ChoiceComponent implements OnInit {

  constructor(public locale: LocaleService,
              @Inject(MAT_DIALOG_DATA) public readonly config?: ChoiceConfig) {
    if (!config) {
      this.config = {type: 'default', different: false};
    } else if (!config.type) {
      this.config.type = 'default';
    }
  }

  ngOnInit(): void {
  }

}
