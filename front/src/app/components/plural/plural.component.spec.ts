import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {PluralComponent} from './plural.component';

describe('PluralComponent', () => {
  let component: PluralComponent;
  let fixture: ComponentFixture<PluralComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PluralComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PluralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
