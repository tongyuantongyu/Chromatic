import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {EnvironmentService} from '../../services/environment.service';
import {animate, sequence, state, style, transition, trigger} from '@angular/animations';
import {FormControl, FormGroup} from '@angular/forms';
import {combineLatest, merge, Observable, of, Subscriber} from 'rxjs';
import {PreferenceService} from '../../services/preference.service';
import {Options} from 'sortablejs';
import {catchError, first, map, startWith} from 'rxjs/operators';
import {ApiService, Response} from '../../services/api.service';
import {AuthService} from '../../services/auth.service';
import {MessageService} from '../../services/message.service';
import {MatChipInputEvent} from '@angular/material/chips';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {HttpEventType, HttpProgressEvent, HttpResponse} from '@angular/common/http';
import {EOk} from '../../errors';
import {ActivatedRoute, Router} from '@angular/router';
import {GalleryManagerService} from '../../services/gallery-manager.service';
import {generateOriginHints} from '../../utils';
import {MatDialog} from '@angular/material/dialog';
import {UploadAdvancedComponent} from '../../dialogs/upload-advanced/upload-advanced.component';
import {TitleService} from '../../services/title.service';
import {DomSanitizer} from '@angular/platform-browser';

interface Progress {
  progress: number;
  error: string;
  done: boolean;
}

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.styl'],
  animations: [
    trigger('panel', [
      state('expand', style(
        {bottom: '0', width: '*', height: '*'}
      )),
      state('mini', style(
        {bottom: '0', width: '*', height: '56px'}
      )),
      state('pico', style(
        {bottom: '60px', width: '56px', height: '56px'}
      )),
      transition('expand => mini',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          style({height: '56px'}))),
      transition('mini => expand',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          style({height: '*'}))),
      transition('expand => pico', sequence([
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          style({height: '116px'})),
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          style({bottom: '60px', height: '56px'})),
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          style({width: '56px'})),
      ])),
      transition('pico => expand', sequence([
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          style({width: '*'})),
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          style({bottom: '0', height: '*'})),
      ])),
      transition('pico => mini',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          style({width: '*', bottom: '0'}))),
      transition('mini => pico',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          style({width: '56px', bottom: '60px'}))),
    ]),
    trigger('fade', [
      transition(':leave', [
        style({opacity: 1}),
        animate('0.2s ease',
          style({opacity: 0}))
      ]),
      transition(':enter', [
        style({opacity: 0}),
        animate('0.2s ease',
          style({opacity: 1}))
      ])
    ])
  ]
})
export class UploadComponent implements OnInit {

  constructor(public locale: LocaleService,
              public env: EnvironmentService,
              public pref: PreferenceService,
              public san: DomSanitizer,
              private api: ApiService,
              private auth: AuthService,
              private msg: MessageService,
              private route: ActivatedRoute,
              private router: Router,
              private dialog: MatDialog,
              private gMgr: GalleryManagerService,
              private title: TitleService) {

  }

  private readonly AcceptedFileTypes = new Set<string>(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

  @ViewChild('filePicker') filePicker: ElementRef<HTMLInputElement>;
  @ViewChild('originsInput') originsInput: ElementRef<HTMLInputElement>;

  showAdvanced = false;

  expand = true;
  dragArea = true;
  dragOver = false;
  dragTimeoutId = 0;

  files: File[] = [];
  fileUrls: string[] = [];

  detail = false;
  limitHeight = true;

  uploading = false;
  uploaded = true;
  totalUploaded: number;
  totalSize: number;

  get totalProgress(): number {
    const p = this.totalUploaded / this.totalSize;
    return p > 1 ? 1 : p;
  }

  eachStatus: Map<File, Progress>;
  finishedCount = 0;
  errorCount = 0;

  dragOptions: Options = {
    group: 'upload-files',
    animation: 250,
    easing: 'cubic-bezier(0, 0, 0.2, 1)',
    delayOnTouchOnly: true,
    dragClass: 'dragging-upload-file',
    delay: 100,
    disabled: false,
    ghostClass: 'ghost-upload-file'
  };

  uploadInfoForm = new FormGroup({
    tag: new FormControl(),
  });

  originsControl = new FormControl();

  originsChangedS: Subscriber<undefined>;
  origins: string[];
  originsSet: Set<string>;
  separatorKeysCodes: number[] = [ENTER, COMMA];

  filteredTags$: Observable<string[]>;
  suggestOrigins$: Observable<{ origin: string, type: string, bad: boolean }[]>;

  get status(): string {
    if (this.uploading) {
      if (this.errorCount === 0) {
        return 'uploading_fine';
      } else {
        return 'uploading_some_error';
      }
    } else if (this.uploaded) {
      if (this.errorCount === 0) {
        return 'uploaded_fine';
      } else {
        return 'uploaded_some_error';
      }
    } else {
      if (this.files.length === 0) {
        return 'idle';
      } else {
        return 'select_files';
      }
    }
  }

  goAdvanced(): void {
    if (!this.showAdvanced) {
      return;
    }

    this.dialog.open(UploadAdvancedComponent, {
      maxHeight: '80vh',
      disableClose: true,
    }).afterClosed().subscribe(r => {
      if (r) {
        this.gMgr.informReload.emit();
      }
    });
  }

  fileSelectClick(): void {
    this.filePicker.nativeElement.click();
  }

  noDefault(e?: Event): void {
    e?.preventDefault();
    e?.stopPropagation();
  }

  fileDragEnter(e?: Event): void {
    this.noDefault(e);
    if (this.dragTimeoutId) {
      clearTimeout(this.dragTimeoutId);
      this.dragTimeoutId = 0;
    }

    this.dragOver = true;
  }

  fileDragLeave(e?: Event): void {

    this.noDefault(e);
    if (this.dragTimeoutId) {
      clearTimeout(this.dragTimeoutId);
    }
    this.dragTimeoutId = setTimeout(() => {
      this.dragOver = false;
    }, 100);
  }

  submitByDrop(e: DragEvent): void {
    this.noDefault(e);

    const files: File[] = [];

    if (e.dataTransfer.items) {
      for (const item of e.dataTransfer.items as any as Iterable<DataTransferItem>) {
        if (item.kind === 'file' && this.AcceptedFileTypes.has(item.type)) {
          files.push(item.getAsFile());
        }
      }
    } else {
      for (const file of e.dataTransfer.files as any as Iterable<File>) {
        if (this.AcceptedFileTypes.has(file.type)) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      this.dragArea = false;
      this.files = files;
    } else {
      this.msg.SendMessage(this.locale.dict.upload_submit_no_valid);
    }

    this.dragOver = false;
  }

  submitByButton(): void {
    const filePicker = this.filePicker.nativeElement;
    if (!filePicker || !filePicker.files || filePicker.files.length === 0) {
      return;
    }

    const files: File[] = [];

    for (const file of filePicker.files as any as Iterable<File>) {
      if (this.AcceptedFileTypes.has(file.type)) {
        files.push(file);
      }
    }

    if (files.length > 0) {
      this.dragArea = false;
      this.files = files;
    } else {
      this.msg.SendMessage(this.locale.dict.upload_submit_no_valid);
    }
  }

  finishLoading(el: HTMLElement): void {
    el.classList.add('loaded');
  }

  removeFile(file: File): void {
    this.files.splice(this.files.indexOf(file), 1);

    if (this.files.length === 0) {
      this.dragArea = true;
    }
  }

  originsInputSubmit(e: MatChipInputEvent): void {
    const input = e.input;

    if (input) {
      input.value = '';
    }

    this.originsControl.setValue(null);
  }

  addDomain(e: MatAutocompleteSelectedEvent): void {
    const domain = e.option.value as string;
    this.origins.push(domain);
    this.originsSet.add(domain);
    this.originsInput.nativeElement.value = '';
    this.originsControl.setValue(null);
    this.originsChangedS.next();
  }

  removeDomain(domain: string): void {
    this.origins.splice(this.origins.indexOf(domain), 1);
    this.originsSet.delete(domain);
    this.originsChangedS.next();
  }

  reset(): void {
    this.origins = ['*'];
    this.originsSet = new Set<string>(this.origins);
    this.expand = true;
    this.dragArea = true;
    this.dragOver = false;
    this.dragTimeoutId = 0;
    this.dragOptions.disabled = false;

    this.files = [];

    this.detail = false;
    this.limitHeight = true;

    this.uploadInfoForm.reset();
    this.uploadInfoForm.enable();
    this.originsControl.reset();
    this.originsControl.enable();

    this.uploading = false;
    this.uploaded = false;
    this.totalSize = 0;
    this.totalUploaded = 0;
    this.eachStatus = new Map();
    this.finishedCount = 0;
    this.errorCount = 0;

    this.title.secondPart = this.locale.dict.title_upload;
  }

  errorFile(file: File, error: string): void {
    this.eachStatus.set(file, {progress: -1, error, done: true});
    this.errorCount += 1;
  }

  post(): void {
    this.uploading = true;
    this.dragOptions.disabled = true;
    this.uploadInfoForm.disable();
    this.originsControl.disable();

    const tag = this.uploadInfoForm.controls.tag.value || '';
    const origins = this.origins.join(',');

    this.totalSize = 0;
    this.totalUploaded = 0;
    for (const file of this.files) {
      this.eachStatus.set(file, {progress: 0, error: '', done: false});
      this.totalSize += file.size;
    }

    const uploadNth = (index: number) => {
      if (index === this.files.length) {
        this.uploading = false;
        this.uploaded = true;
        this.gMgr.informReload.emit();
        if (this.errorCount === 0) {
          this.title.secondPart = this.locale.dict.title_uploaded.replace('%1', String(this.finishedCount));
        } else {
          this.title.secondPart = this.locale.dict.title_uploaded_error
            .replace('%1', String(this.finishedCount))
            .replace('%2', String(this.errorCount));
        }
        return;
      }

      if (this.errorCount === 0) {
        this.title.secondPart = this.locale.dict.title_uploading.replace('%1', String(this.finishedCount));
      } else {
        this.title.secondPart = this.locale.dict.title_uploading_error
          .replace('%1', String(this.finishedCount))
          .replace('%2', String(this.errorCount));
      }

      const file = this.files[index];

      const thisSize = file.size;
      let lastSize = 0;
      const updateStatus = (loaded: number, done: boolean = false) => {
        if (!this.eachStatus.get(file).error) {
          this.eachStatus.set(file, {progress: loaded / thisSize, error: '', done});
        }
      };

      this.api.UploadSimple(tag, origins, file).subscribe({
        next: event => {
          switch (event.type) {
            case HttpEventType.UploadProgress:
              const progress = event as HttpProgressEvent;
              this.totalUploaded += (progress.loaded - lastSize);
              lastSize = progress.loaded;
              updateStatus(progress.loaded);
              return;
            case HttpEventType.Response:
              const response = event as unknown as HttpResponse<Response>;
              if (response.status !== 200) {
                this.errorFile(file, this.locale.dict.http_error.replace('%1', String(response.status)));
                break;
              }

              const body = response.body;

              if (!body.status || !body.data) {
                this.errorFile(file, this.locale.dict['9999']);
                break;
              } else if (body.status !== EOk) {
                this.errorFile(file, this.locale.dict[body.status] || this.locale.dict['9999']);
                break;
              }

              // if (!environment.production) {
              //   console.log(`File #${index} updated successfully, with id ${body.data}`);
              // }

              break;
            // default:
            //   if (!environment.production) {
            //     console.log(`Other event type: ${HttpEventType[event.type]} when posting image #${index}:`, event);
            //   }
          }

          updateStatus(thisSize);
        },
        error: _ => {
          this.errorFile(file, this.locale.dict['9999']);
          // if (!environment.production) {
          //   console.log(`Failed uploading file #${index} with unexpected error: `, error);
          // }

          updateStatus(thisSize);
          uploadNth(index + 1);
        },
        complete: () => {
          // if (!environment.production) {
          //   console.log(`File #${index} uploaded.`);
          // }

          this.finishedCount++;

          updateStatus(thisSize, true);
          uploadNth(index + 1);
        }
      });
    };

    uploadNth(0);
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(__ => {
      this.reset();

      this.auth.user$.subscribe(user => {
        if (user.privileged) {
          this.showAdvanced = true;
        }
        this.filteredTags$ = combineLatest([this.api.ListImageTags(user.id).pipe(
          catchError(error => {
            this.locale.dict$.pipe(first()).subscribe(dict => {
              this.msg.SendMessage(dict.gallery_tag_failed_message.replace('%1', dict[error]));
            });
            return of([] as string[]);
          }),
        ),
          this.uploadInfoForm.controls.tag.valueChanges.pipe(startWith([undefined]))
        ]).pipe(map(([tags, _]) => {
          const filterValue = this.uploadInfoForm.controls.tag.value || '';
          return tags.filter(tag => tag.toLowerCase().includes(filterValue.toLowerCase()));
        }));
      });

      this.suggestOrigins$ = merge(
        this.originsControl.valueChanges,
        new Observable<undefined>(s => this.originsChangedS = s)
      ).pipe(
        startWith([undefined]),
        map(_ => {
          const input = this.originsControl.value || '';
          return generateOriginHints.call(this, input);
        }));
    });

  }

  close(): void {
    this.title.secondPart = '';
    this.router.navigate([{outlets: {upload: null}}]).then();
  }

}

