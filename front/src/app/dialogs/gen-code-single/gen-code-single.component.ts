import {Component, Inject, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {MessageService} from '../../services/message.service';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-gen-code-single',
  templateUrl: './gen-code-single.component.html',
  styleUrls: ['./gen-code-single.component.styl']
})
export class GenCodeSingleComponent implements OnInit {

  type = 'html';

  private static get host(): string {
    return window.location.host;
  }

  private get url(): string {
    return `https://${GenCodeSingleComponent.host}/image/${this.id}.i`;
  }

  get code(): string {
    switch (this.type) {
      case 'html':
        return `<img src="${this.url}" alt="">`;
      case 'bbcode':
        return `[img]${this.url}[/img]`;
      case 'url':
        return this.url;
    }
  }

  copied(): void {
    this.msg.SendMessage(this.locale.dict.generate_result_copied);
  }

  constructor(public locale: LocaleService,
              private msg: MessageService,
              @Inject(MAT_DIALOG_DATA) public id?: string) {
  }

  ngOnInit(): void {
  }

}
