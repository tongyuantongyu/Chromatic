import {TestBed} from '@angular/core/testing';

import {GalleryManagerService} from './gallery-manager.service';

describe('GalleryManagerService', () => {
  let service: GalleryManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GalleryManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
