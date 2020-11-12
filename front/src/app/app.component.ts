import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {animate, query, sequence, state, style, transition, trigger} from '@angular/animations';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.styl'],
  animations: [
    trigger('routeAnimation', [
      state('*', style({bottom: '-450px'})),
      state('upload', style({bottom: '0'})),
      transition('* => upload', [
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({bottom: '0'})),
      ]),
      transition('upload => *', [
        sequence([
          animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
            style({bottom: '-450px'})),
          query(':leave', animate('300ms 300ms')),
        ]),
      ]),
    ])
  ]
})
export class AppComponent {
  title = 'Luminous';

  getAnimationData(outlet: RouterOutlet): string {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData.animation;
  }

  constructor() {

  }
}
