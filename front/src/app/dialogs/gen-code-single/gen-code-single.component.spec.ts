import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {GenCodeSingleComponent} from './gen-code-single.component';

describe('GenCodeSingleComponent', () => {
  let component: GenCodeSingleComponent;
  let fixture: ComponentFixture<GenCodeSingleComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GenCodeSingleComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GenCodeSingleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
