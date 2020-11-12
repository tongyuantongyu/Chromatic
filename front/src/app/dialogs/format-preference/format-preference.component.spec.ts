import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {FormatPreferenceComponent} from './format-preference.component';

describe('FormatPreferenceComponent', () => {
  let component: FormatPreferenceComponent;
  let fixture: ComponentFixture<FormatPreferenceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [FormatPreferenceComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormatPreferenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
