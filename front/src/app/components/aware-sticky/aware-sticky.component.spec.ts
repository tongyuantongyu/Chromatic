import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {AwareStickyComponent} from './aware-sticky.component';

describe('AwareStickyComponent', () => {
  let component: AwareStickyComponent;
  let fixture: ComponentFixture<AwareStickyComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AwareStickyComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AwareStickyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
