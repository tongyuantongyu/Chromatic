import {Component, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {Options} from 'sortablejs';
import {MatDialogRef} from '@angular/material/dialog';
import {MessageService} from '../../services/message.service';

const TestWebp = `data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA`;
const TestAvif = `data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUEAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABsAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgS0AAAAAABNjb2xybmNseAACAAIAAQAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACNtZGF0EgAKBzgADtAgIBEyDhAQAABAAAAAAFey6gmI`;

@Component({
  selector: 'app-format-preference',
  templateUrl: './format-preference.component.html',
  styleUrls: ['./format-preference.component.styl']
})
export class FormatPreferenceComponent implements OnInit {

  supportWebp: boolean = null;
  supportAvif: boolean = null;

  currentPreference: string[] = ['avif', 'webp', 'jpeg', 'png'];

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

  get cookie(): string {
    return decodeURIComponent(document.cookie.replace(/(?:(?:^|.*;\s*)Preference\s*=\s*([^;]*).*$)|^.*$/, '$1'));
  }

  set cookie(value: string) {
    if (!value) {
      document.cookie = 'Preference=; expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=None;Secure';
    } else {
      document.cookie = `Preference=${encodeURIComponent(value)};expires=Fri, 31 Dec 9999 23:59:59 GMT;path=/;SameSite=None;Secure`;
    }
  }

  save(): void {
    this.cookie = JSON.stringify(this.currentPreference);
    this.msg.SendMessage(this.locale.dict.format_pref_save_done);
    this.dialogRef.close();
  }

  reset(): void {
    this.cookie = '';
    this.msg.SendMessage(this.locale.dict.format_pref_reset_done);
    this.dialogRef.close();
  }

  constructor(public locale: LocaleService,
              private dialogRef: MatDialogRef<FormatPreferenceComponent>,
              private msg: MessageService) {
  }

  ngOnInit(): void {
    if (this.cookie) {
      this.currentPreference = JSON.parse(this.cookie);
    }

    const webp = new Image();
    webp.onerror = () => this.supportWebp = false;
    webp.onload = () => this.supportWebp = (webp.width > 0 && webp.height > 0);
    webp.src = TestWebp;

    const avif = new Image();
    avif.onerror = () => this.supportAvif = false;
    avif.onload = () => this.supportAvif = (avif.width > 0 && avif.height > 0);
    avif.src = TestAvif;
  }

}
