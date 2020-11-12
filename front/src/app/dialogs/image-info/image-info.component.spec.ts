import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {ImageInfoComponent} from './image-info.component';

describe('ImageInfoComponent', () => {
  let component: ImageInfoComponent;
  let fixture: ComponentFixture<ImageInfoComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ImageInfoComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
