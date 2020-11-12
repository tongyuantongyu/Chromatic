import {Component, Inject, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {Image} from '../../types';
import {PreferenceService} from '../../services/preference.service';
import {ApiService} from '../../services/api.service';

@Component({
  selector: 'app-image-info',
  templateUrl: './image-info.component.html',
  styleUrls: ['./image-info.component.styl']
})
export class ImageInfoComponent implements OnInit {

  avatarError = false;
  toInt = i => Number.parseInt(i, 10);

  constructor(public locale: LocaleService,
              public pref: PreferenceService,
              public api: ApiService,
              @Inject(MAT_DIALOG_DATA) public image: Image) {
  }

  ngOnInit(): void {
    if (this.image && this.image.id) {
      this.api.GetImage(this.image.id).subscribe(i => this.image = i);
    }
  }

}
