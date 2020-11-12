import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {SinglePromptComponent} from './single-prompt.component';

describe('SinglePromptComponent', () => {
  let component: SinglePromptComponent;
  let fixture: ComponentFixture<SinglePromptComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [SinglePromptComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SinglePromptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
