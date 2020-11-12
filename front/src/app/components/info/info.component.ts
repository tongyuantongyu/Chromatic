import {Component, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.styl']
})
export class InfoComponent implements OnInit {

  constructor(public locale: LocaleService) {
  }

  ngOnInit(): void {
  }

}
