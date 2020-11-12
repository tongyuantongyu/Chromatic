import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {Image} from '../../types';
import {LocaleService} from '../../services/locale.service';
import {animate, group, query, stagger, state, style, transition, trigger} from '@angular/animations';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {filter} from 'rxjs/operators';
import {merge, Observable, Subscriber, Subscription} from 'rxjs';
import {GenCodeSingleComponent} from '../../dialogs/gen-code-single/gen-code-single.component';
import {EditImagesComponent, ImagesOriginalData, ImagesOriginalDataResult} from '../../dialogs/edit-images/edit-images.component';
import {stringError} from '../../utils';
import {ApiService} from '../../services/api.service';
import {MessageService} from '../../services/message.service';
import {ConfirmationComponent} from '../../dialogs/confirmation/confirmation.component';
import {ImageInfoComponent} from '../../dialogs/image-info/image-info.component';
import {AuthService} from '../../services/auth.service';

// noinspection DuplicatedCode
@Component({
  selector: 'app-gallery-overlay',
  templateUrl: './gallery-overlay.component.html',
  styleUrls: ['./gallery-overlay.component.styl'],
  animations: [
    trigger('panelFrame', [
      state('hide', style(
        {opacity: 0, transform: 'translateY(100px)'}
      )),
      state('show', style(
        {opacity: 1, transform: 'none'}
      )),
      state('closed', style(
        {opacity: 0, transform: 'none'}
      )),
      transition('hide => show', [
        group([
          animate('400ms cubic-bezier(0.35, 0, 0.25, 1)',
            style({opacity: 1, transform: 'none'})),
          query('.action-button-container', [
            style({opacity: 0, transform: 'translateY(100px)'}),
            stagger(30, [
              animate('400ms cubic-bezier(0.35, 0, 0.25, 1)', style({opacity: 1, transform: 'none'}))
            ])
          ])
        ]),
      ]),
      transition('show => hide', [
        group([
          animate('400ms 200ms cubic-bezier(0.35, 0, 0.25, 1)',
            style({opacity: 0, transform: 'translateY(100px)'})),
        ]),
      ]),
      transition('show => closed', [
        group([
          animate('200ms cubic-bezier(0.35, 0, 0.25, 1)',
            style({opacity: 0, transform: 'translateY(100px)'})),
        ]),
      ])
    ]),
    trigger('loading', [
      transition(':leave', [
        style({opacity: 1}),
        animate('0.15s ease-out',
          style({opacity: 0}))
      ])
    ])
  ]
})
export class GalleryOverlayComponent implements OnInit, OnDestroy {

  init = true;
  loading = true;
  imageChanged = false;
  imageDeleted = false;

  decreaseTimeouts: Set<number>;
  showPanelVote = 0;
  closeFired = false;
  imageCloseClickedS: Subscriber<MouseEvent>;
  disableClick = false;
  enableClickTimeoutId: number;
  clickSubscription: Subscription;

  get canEdit(): boolean {
    return this.auth?.user?.name === 'admin' || this.auth?.user?.id === this.image.user_id || false;
  }

  increaseShowPanel(): void {
    this.showPanelVote++;
    this.dialogRef.disableClose = true;
  }

  decreaseShowPanel(): void {
    if (this.showPanelVote > 0) {
      this.showPanelVote--;
    }

    if (this.showPanelVote === 0) {
      this.dialogRef.disableClose = false;
    }
  }

  waitDecreaseShowPanel(): void {
    const timeoutId = setTimeout(() => {
      if (this.decreaseTimeouts.has(timeoutId)) {
        this.decreaseShowPanel();
        this.decreaseTimeouts.delete(timeoutId);
      }

    }, 500);

    this.decreaseTimeouts.add(timeoutId);
  }

  hidePanel(): void {
    this.decreaseTimeouts.forEach(id => clearTimeout(id));
    this.decreaseTimeouts.clear();
    this.showPanelVote = 0;
    this.dialogRef.disableClose = false;
  }

  imageLoad(): void {
    this.loading = false;
    this.dialogRef.removePanelClass('gallery-overlay-loading');
  }

  imageLongPress(event?: Event): void {
    if (this.enableClickTimeoutId) {
      clearTimeout(this.enableClickTimeoutId);
      this.enableClickTimeoutId = 0;
    }

    this.disableClick = true;

    event?.stopPropagation();
    this.increaseShowPanel();
  }

  imageLongPressEnd(e?: Event): void {
    e?.preventDefault();
    if (this.enableClickTimeoutId) {
      clearTimeout(this.enableClickTimeoutId);
    }

    this.enableClickTimeoutId = setTimeout(() => {
      this.disableClick = false;
      this.enableClickTimeoutId = 0;
    }, 100);
  }

  imageClicked(event?: MouseEvent): void {
    if (this.disableClick) {
      return;
    }

    event?.stopPropagation();

    this.imageCloseClickedS.next(event);
  }

  close(): void {
    this.closeFired = true;
    setTimeout(() => {
      this.dialogRef.close({changed: this.imageChanged, deleted: this.imageDeleted});
    }, 200);
  }

  showInfo(): void {
    this.dialog.open(ImageInfoComponent, {
      panelClass: ['scrollable-inner-y', 'scrollable-inner'],
      data: this.image,
      maxHeight: '80vh',
    });
  }

  editImage(): void {
    const original: ImagesOriginalData = {
      tag: this.image.tag,
      origins: this.image.origins
    };

    this.dialog.open(EditImagesComponent, {
      panelClass: ['scrollable-inner-y', 'scrollable-inner'],
      data: original,
      maxHeight: '80vh',
    }).afterClosed().subscribe((result?: ImagesOriginalDataResult) => {
      if (!result) {
        return;
      }

      let data: string;
      if (result.field === 'tag') {
        data = result.tag;
      } else {
        data = result.origins.join(',');
      }

      this.api.SetImageInfo({
        data,
        field: result.field,
        targets: [this.image.id]
      }).subscribe({
        next: _ => {
          this.msg.SendMessage(this.locale.dict.edit_images_result_success);
          this.imageChanged = true;
          this.close();
        },
        error: err => {
          this.msg.SendMessage(this.locale.dict.edit_images_result_failed.replace('%1', stringError.call(this, err)));
        }
      });
    });
  }

  deleteImage(): void {
    this.dialog.open(ConfirmationComponent, {
      data: {
        type: 'delete_this',
        severe: true,
      }
    }).afterClosed().subscribe(decision => {
      if (!decision) {
        return;
      }

      this.api.RemoveImage([this.image.id]).subscribe({
        next: _ => {
          this.msg.SendMessage(this.locale.dict.delete_images_result_success);
          this.imageDeleted = true;
          this.close();
        },
        error: err => {
          this.msg.SendMessage(this.locale.dict.delete_images_result_failed.replace('%1', stringError.call(this, err)));
        }
      });
    });
  }

  showCode(): void {
    this.dialog.open(GenCodeSingleComponent, {
      data: this.image.id
    });
  }

  constructor(public locale: LocaleService,
              private dialog: MatDialog,
              private api: ApiService,
              private msg: MessageService,
              private auth: AuthService,
              public dialogRef: MatDialogRef<GalleryOverlayComponent>,
              @Inject(MAT_DIALOG_DATA) public image?: Image) {
  }

  ngOnInit(): void {
    this.decreaseTimeouts = new Set();

    this.clickSubscription = merge(
      this.dialogRef.backdropClick(),
      new Observable<MouseEvent>(s => this.imageCloseClickedS = s)
    ).pipe(
      filter(() => this.dialogRef.disableClose)
    ).subscribe(_ => {
      this.hidePanel();
    });

    this.dialogRef.addPanelClass('gallery-overlay-loading');
    setTimeout(() => {
      this.init = false;
    }, 1000);
  }

  ngOnDestroy(): void {
    this.clickSubscription.unsubscribe();
  }
}
