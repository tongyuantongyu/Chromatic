import {Component, Inject, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {ImageCroppedEvent} from 'ngx-image-cropper';
import {Observable} from 'rxjs';
import {MessageService} from '../../services/message.service';
import {ApiService} from '../../services/api.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-change-avatar',
  templateUrl: './change-avatar.component.html',
  styleUrls: ['./change-avatar.component.styl']
})
export class ChangeAvatarComponent implements OnInit {

  imageChangedEvent: Event = null;
  imageCroppedEvent: ImageCroppedEvent = null;
  cropDirty = false;
  croppedImage: any = '';
  uploading = false;

  fileChangeEvent(event: any): void {
    this.imageChangedEvent = event;
    this.cropperUp();
  }

  imageCropped(event: ImageCroppedEvent): void {
    this.imageCroppedEvent = event;
    this.cropDirty = true;
  }

  // Workaround to make preview refresh correctly
  cropperUp(): void {
    setTimeout(() => {
      if (this.cropDirty) {
        this.croppedImage = this.imageCroppedEvent.base64;
        this.cropDirty = false;
      }
    }, 100);
  }

  loadImageFailed(): void {
    this.msg.SendMessage(this.locale.dict.change_avatar_file_bad);
  }

  getCroppedBlob(): Observable<Blob> {
    return new Observable(sub => {
      fetch(this.croppedImage).then(
        resp => resp.blob()
      ).then(
        blob => sub.next(blob)
      ).catch(err => sub.error(err));
    });
  }

  setAvatar(): void {
    if (!this.croppedImage || this.uploading) {
      return;
    }

    this.uploading = true;

    this.getCroppedBlob().subscribe(f => {
      let resp: Observable<undefined>;
      if (!this.id) {
        resp = this.api.SetAvatar(f);
      } else {
        resp = this.api.SetAvatarP(f, this.id);
      }
      resp.subscribe({
        next: () => {
          this.msg.SendMessage(this.locale.dict.change_avatar_success);
          this.dialogRef.close(true);
        },
        error: err => {
          this.msg.SendMessage(this.locale.dict.change_avatar_failed.replace(
            '%1', this.locale.dict[err] || this.locale.dict[9999]));
          this.dialogRef.close(false);
        }
      });
    });
  }

  constructor(private msg: MessageService,
              public locale: LocaleService,
              private api: ApiService,
              private dialogRef: MatDialogRef<ChangeAvatarComponent>,
              @Inject(MAT_DIALOG_DATA) public readonly id?: string) {
  }

  ngOnInit(): void {
  }
}
