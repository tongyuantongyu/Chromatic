import {Component, Inject, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {MessageService} from '../../services/message.service';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {Options} from 'sortablejs';

const htmlTemplate = `<img src="%url%" alt="">`;
const htmlBetween = `<br />\n`;

const bbcodeTemplate = `[img]%url%[/img]`;
const bbcodeBetween = `\n`;

const urlTemplate = `%url%`;
const urlBetween = `\n`;

@Component({
  selector: 'app-gen-code-multi',
  templateUrl: './gen-code-multi.component.html',
  styleUrls: ['./gen-code-multi.component.styl']
})
export class GenCodeMultiComponent implements OnInit {

  type = 'html';

  customizeTemplate = `%url%`;
  customizeBetween = `\n`;

  dragOptions: Options = {
    group: 'file-links',
    animation: 250,
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
    delayOnTouchOnly: true,
    dragClass: 'dragging-file',
    delay: 100,
    disabled: false,
    ghostClass: 'ghost-file'
  };

  private static get host(): string {
    return window.location.host;
  }

  private static url(id: string): string {
    return `https://${GenCodeMultiComponent.host}/image/${id}.i`;
  }

  get code(): string {
    let template: string;
    let between: string;
    switch (this.type) {
      case 'html':
        template = htmlTemplate;
        between = htmlBetween;
        break;
      case 'bbcode':
        template = bbcodeTemplate;
        between = bbcodeBetween;
        break;
      case 'url':
        template = urlTemplate;
        between = urlBetween;
        break;
      case 'custom':
        template = this.customizeTemplate;
        between = this.customizeBetween;
    }

    return this.ids.map(id => template.replace('%url%', GenCodeMultiComponent.url(id))).join(between);
  }

  copied(): void {
    this.msg.SendMessage(this.locale.dict.generate_result_copied);
  }

  reverse(): void {
    this.ids.reverse();
  }

  constructor(public locale: LocaleService,
              private msg: MessageService,
              @Inject(MAT_DIALOG_DATA) public ids?: string[]) {
  }

  ngOnInit(): void {
  }

}
