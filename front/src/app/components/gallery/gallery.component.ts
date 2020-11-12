import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ScrollService} from '../../services/scroll.service';
import {FormControl} from '@angular/forms';
import {LocaleService} from '../../services/locale.service';
import {BrokerService} from '../../services/broker.service';
import {combineLatest, Observable, of, Subject, Subscription} from 'rxjs';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthService} from '../../services/auth.service';
import {catchError, first, map, startWith, takeUntil} from 'rxjs/operators';
import {ApiService} from '../../services/api.service';
import {MessageService} from '../../services/message.service';
import {GalleryManagerService, ImageGroup} from '../../services/gallery-manager.service';
import {PreferenceService} from '../../services/preference.service';
import {SelectionModel} from '@angular/cdk/collections';
import {Image} from '../../types';
import {GalleryImageSelectEvent} from '../gallery-image/gallery-image.component';
import {animate, group, query, sequence, stagger, state, style, transition, trigger} from '@angular/animations';
import {MatDialog} from '@angular/material/dialog';
import {Overlay} from '@angular/cdk/overlay';
import {GalleryOverlayComponent} from '../gallery-overlay/gallery-overlay.component';
import {EditImagesComponent, ImagesOriginalData, ImagesOriginalDataResult} from '../../dialogs/edit-images/edit-images.component';
import {ConfirmationComponent} from '../../dialogs/confirmation/confirmation.component';
import {stringError} from '../../utils';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {GenCodeMultiComponent} from '../../dialogs/gen-code-multi/gen-code-multi.component';
import {TitleService} from '../../services/title.service';

@Component({
  selector: 'app-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.styl'],
  animations: [
    trigger('selectToggle', [
      transition(':enter', [
        style({width: '0', opacity: '0'}),
        group([
          animate('0.2s ease-in-out',
            style({width: '*'})),
          animate('0.2s 0.1s ease-in-out',
            style({opacity: 1}))
        ])
      ]),
      transition(':leave', [
        style({width: '*', opacity: '1'}),
        sequence([
          animate('0.2s ease-in-out',
            style({opacity: 0})),
          animate('0.2s ease-in-out',
            style({width: '0'}))
        ])
      ])
    ]),
    trigger('panelFrame', [
      state('hide', style(
        {opacity: 0, transform: 'translateY(100px)'}
      )),
      state('show', style(
        {opacity: 1, transform: 'none'}
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
        animate('400ms 200ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({opacity: 0, transform: 'translateY(100px)'})),
      ])
    ]),
    trigger('imageContainer', [
      transition('* => *', [
        query('.gallery-image:enter', [
          style({opacity: 0, transform: 'translateY(100px)'}),
          stagger(30, animate('300ms cubic-bezier(0.35, 0, 0.25, 1)',
            style({opacity: 1, transform: 'none'})))
        ], {optional: true})
      ])
    ]),
  ]
})
export class GalleryComponent implements OnInit, OnDestroy {

  constructor(private scroll: ScrollService,
              public locale: LocaleService,
              public broker: BrokerService,
              private route: ActivatedRoute,
              private auth: AuthService,
              private api: ApiService,
              private msg: MessageService,
              public gMgr: GalleryManagerService,
              public pref: PreferenceService,
              private dialog: MatDialog,
              private router: Router,
              private overlay: Overlay,
              private title: TitleService) {
    this.destroy$ = new Subject<void>();
  }

  @ViewChild('container', {static: true}) container: ElementRef<HTMLElement>;

  readonly destroy$: Subject<void>;

  selection = new SelectionModel<Image>(true, []);

  userId: string;
  isSelf = false;
  canEdit = false;

  tagForm = new FormControl('');

  groupMode: 'tag' | 'upload' = 'tag';
  timeSpan: 'day' | 'week' | 'month' | 'year' = 'day';

  filteredTags$: Observable<string[]>;

  reloadSubscription: Subscription;

  toInt = i => Number.parseInt(i, 10);

  forItemCheckBy(index: number, item: Image): string {
    return item.id;
  }

  spanFormat(dict: { [key: string]: string }): string {
    return dict['time_' + this.timeSpan];
  }

  postFormat(s: string, dict: { [key: string]: string }): string {
    return dict['time_' + this.timeSpan + '_post'].replace('%1', s);
  }

  changeGroup(value: 'tag' | 'upload'): void {
    this.gMgr.setGrouper(value);
    this.reload();
  }

  changeSpan(value: 'day' | 'week' | 'month' | 'year'): void {
    this.gMgr.setSpan(value);
  }

  setTagByEnter(): void {
    this.setTag(this.tagForm.value);
  }

  setTagByAutoComplete(e: MatAutocompleteSelectedEvent): void {
    this.setTag(e.option.value);
  }

  setTag(value: string): void {
    if (String(value) === this.gMgr.useTag) {
      return;
    }

    if (value) {
      this.gMgr.useTag = value;
      this.gMgr.onlyTag = true;
    } else {
      this.gMgr.useTag = '';
      this.gMgr.onlyTag = false;
    }

    this.reload();
  }

  toggleImage(event: GalleryImageSelectEvent): void {
    if (event.selected) {
      this.selection.select(event.image);
    } else {
      this.selection.deselect(event.image);
    }
  }

  selectMany(images: Image[]): void {
    this.selection.select(...images);
  }

  deselectMany(images: Image[]): void {
    this.selection.deselect(...images);
  }

  selectAll(): void {
    this.selection.select(...this.gMgr.images);
  }

  reverseSelect(total?: Image[]): void {
    const selectedSet = new Set<Image>(this.selection.selected);

    if (!total) {
      this.selection.clear();
      this.selection.select(...this.gMgr.images.filter(image => !selectedSet.has(image)));
    } else {
      this.selection.deselect(...total);
      this.selection.select(...total.filter(image => !selectedSet.has(image)));
    }

  }

  reload(): void {
    this.gMgr.reset();
    this.selection.clear();
  }

  editSelect(): void {
    if (this.selection.selected.length === 0) {
      return;
    }

    let original: ImagesOriginalData;
    if (this.selection.selected.length === 1) {
      const image = this.selection.selected[0];
      original = {
        tag: image.tag,
        origins: image.origins
      };
    }

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
        targets: this.selection.selected.map(i => i.id)
      }).subscribe({
        next: _ => {
          this.msg.SendMessage(this.locale.dict.edit_images_result_success);
          this.reload();
        },
        error: err => {
          this.msg.SendMessage(this.locale.dict.edit_images_result_failed.replace('%1', stringError.call(this, err)));
        }
      });
    });
  }

  deleteSelect(): void {
    this.dialog.open(ConfirmationComponent, {
      data: {
        type: 'delete_select',
        severe: true,
      }
    }).afterClosed().subscribe(decision => {
      if (!decision) {
        return;
      }

      this.api.RemoveImage(this.selection.selected.map(i => i.id)).subscribe({
        next: _ => {
          this.msg.SendMessage(this.locale.dict.delete_images_result_success);
          this.reload();
        },
        error: err => {
          this.msg.SendMessage(this.locale.dict.delete_images_result_failed.replace('%1', stringError.call(this, err)));
        }
      });
    });
  }

  openOverlay(image: Image, gallery: ImageGroup): void {
    this.dialog.open(GalleryOverlayComponent, {
      panelClass: 'gallery-overlay-panel',
      data: image,
      closeOnNavigation: true,
      autoFocus: false,
      maxWidth: '100vw',
      maxHeight: '100vh',
      scrollStrategy: this.overlay.scrollStrategies.block()
    }).afterClosed().subscribe(r => {
      const result = r as { changed: boolean, deleted: boolean };
      if (!result) {
        return;
      }

      if (result.deleted) {
        this.gMgr.images.splice(this.gMgr.images.indexOf(image), 1);
        gallery.images.splice(gallery.images.indexOf(image), 1);

        if (gallery.images.length === 0) {
          this.gMgr.groups.splice(this.gMgr.groups.indexOf(gallery), 1);
        }
      } else if (result.changed) {
        this.reload();
      }
    });
  }

  loadMore(): void {
    if (this.gMgr.all) {
      return;
    }

    this.gMgr.requireLoading = true;

    if (!this.gMgr.loading) {
      this.gMgr.fetchMore();
    }
  }

  cancelLoadMore(): void {
    this.gMgr.requireLoading = false;
  }

  showCode(): void {
    this.dialog.open(GenCodeMultiComponent, {
      panelClass: ['scrollable-inner-y', 'scrollable-inner'],
      data: this.selection.selected.map(i => i.id),
      maxHeight: '80vh',
    });
  }

  showUpload(): void {
    this.router.navigate([{outlets: {upload: 'show'}}]).then();
  }

  ngOnInit(): void {
    this.reloadSubscription = this.gMgr.informReload.subscribe(_ => this.reload());
    this.route.paramMap.subscribe(param => {
      this.tagForm.reset();
      this.groupMode = 'tag';
      this.timeSpan = 'day';
      this.gMgr.clean();

      this.scroll.WatchOn(this.container.nativeElement);
      this.userId = param.get('id');
      if (!this.userId) {
        this.userId = this.auth.user.id;
        this.isSelf = true;
      }

      this.locale.dict$.pipe(takeUntil(this.destroy$)).subscribe(dict => {
        this.title.firstPart = this.isSelf ? dict.title_gallery_me : dict.title_gallery;
      });

      this.canEdit = this.auth.user?.id === this.userId || this.auth.user?.name === 'admin';

      this.gMgr.setID(this.userId);

      this.filteredTags$ = combineLatest([this.api.ListImageTags(this.userId).pipe(
        catchError(error => {
          this.locale.dict$.pipe(first()).subscribe(dict => {
            this.msg.SendMessage(dict.gallery_tag_failed_message.replace('%1', dict[error]));
          });
          return of([] as string[]);
        }),
      ),
        this.tagForm.valueChanges.pipe(startWith([undefined]))
      ]).pipe(map(([tags, _]) => {
        const filterValue = this.tagForm.value || '';
        return tags.filter(tag => tag && tag.toLowerCase().includes(filterValue.toLowerCase()));
      }));
    });
  }

  ngOnDestroy(): void {
    this.scroll.UnwatchOn(this.container.nativeElement);
    this.gMgr.reset();
    this.reloadSubscription.unsubscribe();
    this.destroy$.next();
  }

}
