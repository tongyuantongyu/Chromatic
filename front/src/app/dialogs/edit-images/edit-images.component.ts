import {Component, ElementRef, Inject, OnInit, ViewChild} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {FormControl} from '@angular/forms';
import {combineLatest, merge, Observable, of, Subscriber} from 'rxjs';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipInputEvent} from '@angular/material/chips';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {catchError, first, map, startWith} from 'rxjs/operators';
import {AuthService} from '../../services/auth.service';
import {MessageService} from '../../services/message.service';
import {ApiService} from '../../services/api.service';
import {generateOriginHints} from '../../utils';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';

export interface ImagesOriginalData {
  origins: string[];
  tag: string;
}

export interface ImagesOriginalDataResult {
  origins: string[];
  tag: string;
  field: string;
}

@Component({
  selector: 'app-edit-images',
  templateUrl: './edit-images.component.html',
  styleUrls: ['./edit-images.component.styl']
})
export class EditImagesComponent implements OnInit {

  @ViewChild('originsInput') originsInput: ElementRef<HTMLInputElement>;

  selectedTab = 0;
  tagControl = new FormControl();
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

  constructor(public locale: LocaleService,
              private auth: AuthService,
              private api: ApiService,
              private msg: MessageService,
              @Inject(MAT_DIALOG_DATA) public data?: ImagesOriginalData) {
    if (data) {
      if (data.tag) {
        this.tagControl.setValue(data.tag);
      }

      if (data.origins) {
        this.origins = data.origins;
        this.originsSet = new Set(this.origins);
      }
    }
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
