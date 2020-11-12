import {AfterViewInit, Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {AvailableLanguages} from '../../langs';
import {LocaleService} from '../../services/locale.service';
import {PreferenceService} from '../../services/preference.service';
import {MatMenuTrigger} from '@angular/material/menu';

@Component({
  selector: 'app-language-picker',
  templateUrl: './language-picker.component.html',
  styleUrls: ['./language-picker.component.styl']
})
export class LanguagePickerComponent implements OnInit, AfterViewInit {

  @ViewChild('menuTrigger') menuTrigger: MatMenuTrigger;

  @Input() iconStyle: 'fab' | 'icon' = 'fab';
  @Output() menuOpened = new EventEmitter<void>();
  @Output() menuClosed = new EventEmitter<void>();

  languages = Object.entries(AvailableLanguages);

  setLanguage(lang: string): void {
    this.pref.set('locale', lang).subscribe();
  }

  constructor(private pref: PreferenceService,
              public locale: LocaleService) {
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.menuTrigger.menuOpened.subscribe(i => this.menuOpened.emit(i));
    this.menuTrigger.menuClosed.subscribe(i => this.menuClosed.emit(i));
  }

}
