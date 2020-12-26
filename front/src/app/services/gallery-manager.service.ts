import {EventEmitter, Inject, Injectable, InjectionToken, Optional} from '@angular/core';
import {ApiService} from './api.service';
import {Image, ListImageP} from '../types';
import {Observable} from 'rxjs';
import {MessageService} from './message.service';
import {LocaleService} from './locale.service';
import {stringError} from '../utils';

const MAX_SAFE_INTEGER = 9007199254740991;

function groupBy<T>(arr: T[], by: string): { [key: string]: T[] } {
  return arr.reduce((rv: { [key: string]: T[] }, x: T) => {
    (rv[x[by]] = rv[x[by]] || []).push(x);
    return rv;
  }, {});
}

function groupByFunc<T>(arr: T[], by: (v: T) => string): { [key: string]: T[] } {
  return arr.reduce((rv: { [key: string]: T[] }, x: T) => {
    const byV = by(x);
    (rv[byV] = rv[byV] || []).push(x);
    return rv;
  }, {});
}

export declare type TimeSpan = 'day' | 'week' | 'month' | 'year';

function NearestDay(stamp: string | number): number {
  return new Date(stamp).setHours(0, 0, 0, 0);
}

function NearestWeek(stamp: string | number): number {
  const d = new Date(stamp);
  d.setHours(0, 0, 0, 0);
  return d.setDate(d.getDate() - (d.getDay() + 6) % 7 - 1);
}

function NearestMonth(stamp: string | number): number {
  const d = new Date(stamp);
  d.setHours(0, 0, 0, 0);
  return d.setDate(1);
}

function NearestYear(stamp: string | number): number {
  const d = new Date(stamp);
  d.setHours(0, 0, 0, 0);
  return d.setMonth(0, 1);
}

export declare type ImageGroup = { by: string, images: Image[] };

export const GALLERY_LOAD_BATCH = new InjectionToken<number>('gallery_load_batch');

@Injectable({
  providedIn: 'root'
})
export class GalleryManagerService {

  constructor(private api: ApiService,
              private locale: LocaleService,
              private msg: MessageService,
              @Optional() @Inject(GALLERY_LOAD_BATCH) private readonly loadBatch: number) {
    if (!loadBatch) {
      this.loadBatch = 10;
    }
  }

  informReload = new EventEmitter<any>();

  id: string;

  images: Image[];
  groups: ImageGroup[];
  groupMode: 'tag' | 'upload' = 'tag';
  grouper: (i: Image[]) => ImageGroup[] = GalleryManagerService.byTag;
  keyFunction: (time: string) => number = NearestDay;

  current = 0;
  total: number = MAX_SAFE_INTEGER;
  loading = false;
  requireLoading = false;

  onlyTag = false;
  useTag = '';

  get all(): boolean {
    return this.current >= this.total;
  }

  private static byTag(i: Image[]): ImageGroup[] {
    return Object.entries(groupBy(i, 'tag'))
      .sort((a, b) => ((a[0] === b[0]) ? 0 : ((a[0] > b[0]) ? 1 : -1)))
      .map(([tag, images]) => {
        return {by: tag, images};
      });
  }

  private byTime(i: Image[]): ImageGroup[] {
    return Object.entries(groupByFunc(i, j => this.keyFunction(j.upload).toString()))
      .map(([timeString, images]) => [Number(timeString), images])
      .sort((a: [number, Image[]], b: [number, Image[]]) => b[0] - a[0])
      .map(([time, images]: [number, Image[]]) => {
        return {by: time.toString(), images};
      });
  }

  public reGroup(): void {
    if (this.images.length > 0) {
      this.groups = this.grouper(this.images);
    } else {
      this.groups = [];
    }
  }

  public clean(): void {
    this.reset();
    this.id = '';
    this.groupMode = 'tag';
    this.grouper = GalleryManagerService.byTag;
    this.keyFunction = NearestDay;
  }

  public setGrouper(g: 'tag' | 'upload'): void {
    this.reset();
    this.groupMode = g;

    switch (g) {
      case 'tag':
        this.grouper = GalleryManagerService.byTag;
        break;
      case 'upload':
        this.grouper = this.byTime;
    }

    // this.reGroup();
  }

  public setID(id: string): void {
    this.id = id;
    this.reset();
  }

  public setSpan(s: 'day' | 'week' | 'month' | 'year'): void {
    switch (s) {
      case 'day':
        this.keyFunction = NearestDay;
        break;
      case 'week':
        this.keyFunction = NearestWeek;
        break;
      case 'month':
        this.keyFunction = NearestMonth;
        break;
      case 'year':
        this.keyFunction = NearestYear;
    }

    this.reGroup();
  }

  public reset(): void {
    this.images = [];
    this.groups = [];
    this.current = 0;
    this.total = Number.POSITIVE_INFINITY;
  }

  public fetchMore(): void {
    if (this.all || this.loading) {
      return;
    }

    this.loading = true;

    let result: Observable<ListImageP>;

    if (this.onlyTag) {
      result = this.api.ListImageContainsTag({
        id: this.id,
        limit: this.loadBatch,
        offset: this.current,
        tag: this.useTag,
      });
    } else {
      result = this.api.ListImage({
        id: this.id,
        limit: this.loadBatch,
        offset: this.current,
        sort: this.groupMode
      });
    }

    result.subscribe({
      next: resp => {
        this.total = resp.total;
        if (resp.images) {
          this.push(resp.images);
        }
        this.current += resp.count;
        this.loading = false;

        setTimeout(() => {
          if (this.requireLoading) {
            this.fetchMore();
          }
        }, 500);
      },
      error: err => {
        this.msg.SendMessage(
          this.locale.dict.gallery_fetch_failed.replace('%1', stringError.call(this, err)),
          this.locale.dict.action_retry).onAction().subscribe(_ => {
          this.fetchMore();
        });
      }
    });

  }

  private push(images: Image[]): void {
    this.images = this.images.concat(images);
    const newGroup = this.grouper(images);
    if (this.groups.length > 0 && this.groups[this.groups.length - 1].by === newGroup[0].by) {
      this.groups[this.groups.length - 1].images = this.groups[this.groups.length - 1].images.concat(newGroup[0].images);
      this.groups = this.groups.concat(newGroup.slice(1));
    } else {
      this.groups = this.groups.concat(newGroup);
    }
  }
}
