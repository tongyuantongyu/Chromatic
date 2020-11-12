import {Component, OnInit} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {ScrollService} from '../../services/scroll.service';
import {TitleService} from '../../services/title.service';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.styl']
})
export class NotFoundComponent implements OnInit {

  constructor(public locale: LocaleService,
              private scroll: ScrollService,
              private title: TitleService) {
  }

  ngOnInit(): void {
    this.title.firstPart = this.locale.dict.title_not_found;
    this.scroll.PseudoStatus({
      height: 1,
      width: 1,
      offsetH: 1,
      offsetW: 0,
    });
  }

}
