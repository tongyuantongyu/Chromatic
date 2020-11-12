import {Component, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {FormatPreferenceComponent} from '../../dialogs/format-preference/format-preference.component';
import {MatDialog} from '@angular/material/dialog';
import {TitleService} from '../../services/title.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.styl']
})
export class MainComponent implements OnInit {

  openPreference(): void {
    this.dialog.open(FormatPreferenceComponent);
  }

  constructor(public locale: LocaleService,
              private dialog: MatDialog,
              private title: TitleService) {
  }

  ngOnInit(): void {
    this.title.firstPart = '';
  }

}
