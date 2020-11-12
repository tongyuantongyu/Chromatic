import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {LocaleService} from '../../services/locale.service';
import {ScrollService} from '../../services/scroll.service';
import {TitleService} from '../../services/title.service';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

const depsLiteral = '[{"name": "angular", "license": "MIT", "link": "https://github.com/angular/angular"}, {"name": "angular/components", "license": "MIT", "link": "https://github.com/angular/components"}, {"name": "@ngx-pwa/local-storage", "license": "MIT", "link": "https://github.com/cyrilletuzi/angular-async-local-storage"}, {"name": "css-loader", "license": "MIT", "link": "https://github.com/webpack-contrib/css-loader"}, {"name": "ip-regex", "license": "MIT", "link": "https://github.com/sindresorhus/ip-regex"}, {"name": "is-ip", "license": "MIT", "link": "https://github.com/sindresorhus/is-ip"}, {"name": "ng-recaptcha", "license": "MIT", "link": "https://github.com/DethAriel/ng-recaptcha"}, {"name": "ngx-image-cropper", "license": "MIT", "link": "https://github.com/Mawi137/ngx-image-cropper"}, {"name": "ngx-sortablejs", "license": "MIT", "link": "https://github.com/sortablejs/ngx-sortablejs"}, {"name": "rxjs", "license": "Apache-2.0", "link": "https://github.com/ReactiveX/rxjs"}, {"name": "sortablejs", "license": "MIT", "link": "https://github.com/SortableJS/Sortable"}, {"name": "zone.js", "license": "MIT", "link": "https://github.com/angular/angular/tree/master/packages/zone.js"}, {"name": "toml", "license": "MIT", "link": "https://github.com/BurntSushi/toml"}, {"name": "xxhash", "license": "Apache-2.0", "link": "https://github.com/OneOfOne/xxhash"}, {"name": "jwt-go", "license": "MIT", "link": "https://github.com/dgrijalva/jwt-go"}, {"name": "gin", "license": "MIT", "link": "https://github.com/gin-gonic/gin"}, {"name": "gzipped", "license": "BSD-3-Clause", "link": "https://github.com/lpar/gzipped"}, {"name": "jsoniter", "license": "MIT", "link": "https://github.com/json-iterator/go"}, {"name": "jpegquality", "license": "MIT", "link": "https://github.com/liut/jpegquality"}, {"name": "mongo-driver", "license": "Apache-2.0", "link": "https://go.mongodb.org/mongo-driver"}, {"name": "mozjpeg", "license": "other", "link": "https://github.com/mozilla/mozjpeg"}, {"name": "libpng", "license": "other", "link": "https://github.com/glennrp/libpng"}, {"name": "libwebp", "license": "BSD-3-Clause", "link": "https://chromium.googlesource.com/webm/libwebp"}, {"name": "libavif", "license": "other", "link": "https://github.com/AOMediaCodec/libavif"}, {"name": "libaom", "license": "BSD-2-Clause", "link": "https://aomedia.googlesource.com/aom"}, {"name": "dav1d", "license": "BSD-2-Clause", "link": "https://code.videolan.org/videolan/dav1d"}]';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.styl']
})
export class AboutComponent implements OnInit, OnDestroy {
  @ViewChild('container', {static: true}) container: ElementRef<HTMLElement>;

  readonly deps = JSON.parse(depsLiteral) as { name: string, license: string, link: string }[];
  readonly destroy$: Subject<void>;

  constructor(public locale: LocaleService,
              private scroll: ScrollService,
              private title: TitleService) {
    this.destroy$ = new Subject<void>();
  }

  ngOnInit(): void {
    this.locale.dict$.pipe(takeUntil(this.destroy$)).subscribe(dict => {
      this.title.firstPart = dict.title_about;
    });
    this.title.firstPart = this.locale.dict.title_about;
    this.scroll.WatchOn(this.container.nativeElement);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.scroll.UnwatchOn(this.container.nativeElement);
  }

}
