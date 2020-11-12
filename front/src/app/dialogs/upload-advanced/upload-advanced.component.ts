import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {PreferenceService} from '../../services/preference.service';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {ConfirmationComponent} from '../confirmation/confirmation.component';
import {ApiService, Response} from '../../services/api.service';
import {FormControl} from '@angular/forms';
import {combineLatest, merge, Observable, of, Subscriber} from 'rxjs';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material/chips';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {ImagesOriginalDataResult} from '../edit-images/edit-images.component';
import {catchError, first, map, startWith} from 'rxjs/operators';
import {generateOriginHints} from '../../utils';
import {AuthService} from '../../services/auth.service';
import {MessageService} from '../../services/message.service';
import {HttpEventType, HttpProgressEvent, HttpResponse} from '@angular/common/http';
import {EOk} from '../../errors';
import {animate, style, transition, trigger} from '@angular/animations';

@Component({
  selector: 'app-upload-advanced',
  templateUrl: './upload-advanced.component.html',
  styleUrls: ['./upload-advanced.component.styl'],
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({height: '0', opacity: '0', overflow: 'hidden'}),
        animate('0.2s ease-in-out',
          style({height: '*', opacity: '1'})),
      ]),
      transition(':leave', [
        style({overflow: 'hidden'}),
        animate('0.2s ease-in-out',
          style({height: '0', opacity: '0'})),
      ]),
    ])
  ]
})
export class UploadAdvancedComponent implements OnInit {

  uploading = false;
  uploaded = false;
  errored = false;
  errorMessage = '';

  readonly formats = ['jpeg', 'png', 'webp', 'avif'];

  progress = 0;

  files: { [key: string]: Blob | null } = {
    jpeg: null,
    png: null,
    webp: null,
    avif: null,
  };

  @ViewChild('originsInput') originsInput: ElementRef<HTMLInputElement>;

  selectedTab = 0;
  tagControl = new FormControl('');
  originsControl = new FormControl();

  originsChangedS: Subscriber<undefined>;
  origins: string[] = ['*'];
  originsSet: Set<string> = new Set<string>(['*']);
  separatorKeysCodes: number[] = [ENTER, COMMA];

  filteredTags$: Observable<string[]>;
  suggestOrigins$: Observable<{ origin: string, type: string, bad: boolean }[]>;

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

  get result(): ImagesOriginalDataResult {
    return {
      tag: this.tagControl.value,
      origins: this.origins,
      field: this.selectedTab === 0 ? 'tag' : 'origins'
    };
  }

  setFile(el: HTMLInputElement, format: string): void {
    if (this.files[format] === undefined) {
      return;
    }

    if (!(el && el.files && el.files.length > 0)) {
      return;
    }

    this.files[format] = el.files[0];
  }

  close(): void {
    if (!this.errored && (this.uploading || (!this.uploaded && this.hasFile))) {
      this.dialog.open(ConfirmationComponent, {
        data: {
          type: 'upload',
          severe: true,
        }
      }).afterClosed().subscribe(decision => {
        if (decision) {
          this.dialogRef.close(true);
        }
      });
    } else {
      this.dialogRef.close(this.uploaded);
    }
  }

  upload(): void {
    if (this.uploaded || this.errored) {
      this.close();
    }

    if (this.uploading) {
      return;
    }

    this.uploading = true;

    this.api.UploadAdvanced(this.tagControl.value, this.origins.join(','), this.files).subscribe({
      next: event => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progress = event as HttpProgressEvent;
            this.progress = progress.loaded / progress.total;
            return;
          case HttpEventType.Response:
            const response = event as unknown as HttpResponse<Response>;
            if (response.status !== 200) {
              this.errored = true;
              this.uploading = false;
              this.errorMessage = this.locale.dict.http_error.replace('%1', String(response.status));
              break;
            }

            const body = response.body;

            if (!body.status || !body.data) {
              this.errored = true;
              this.uploading = false;
              this.errorMessage = this.locale.dict['9999'];
              break;
            } else if (body.status !== EOk) {
              this.errored = true;
              this.uploading = false;
              this.errorMessage = this.locale.dict[body.status] || this.locale.dict['9999'];
              break;
            }
        }
      },
      error: _ => {
        this.errored = true;
        this.uploading = false;
        this.errorMessage = this.locale.dict['9999'];
      },
      complete: () => {
        this.uploading = false;
        this.uploaded = true;
      }
    });
  }

  get hasFile(): boolean {
    return Object.values(this.files).reduce((a, c) => !!(a || c), false);
  }

  constructor(public locale: LocaleService,
              public pref: PreferenceService,
              private dialog: MatDialog,
              private api: ApiService,
              private auth: AuthService,
              private msg: MessageService,
              public dialogRef: MatDialogRef<UploadAdvancedComponent>) {
  }

  ngOnInit(): void {
    this.auth.user$.subscribe(user => {
      this.filteredTags$ = combineLatest([this.api.ListImageTags(user.id).pipe(
        catchError(error => {
          this.locale.dict$.pipe(first()).subscribe(dict => {
            this.msg.SendMessage(dict.gallery_tag_failed_message.replace('%1', dict[error]));
          });
          return of([] as string[]);
        }),
      ),
        this.tagControl.valueChanges.pipe(startWith([undefined]))
      ]).pipe(map(([tags, _]) => {
        const filterValue = this.tagControl.value || '';
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
  }

}
