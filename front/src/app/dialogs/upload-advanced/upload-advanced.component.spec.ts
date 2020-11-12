import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {UploadAdvancedComponent} from './upload-advanced.component';

describe('UploadAdvancedComponent', () => {
  let component: UploadAdvancedComponent;
  let fixture: ComponentFixture<UploadAdvancedComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [UploadAdvancedComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadAdvancedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
