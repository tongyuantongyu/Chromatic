import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {GenCodeMultiComponent} from './gen-code-multi.component';

describe('GenCodeMultiComponent', () => {
  let component: GenCodeMultiComponent;
  let fixture: ComponentFixture<GenCodeMultiComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GenCodeMultiComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GenCodeMultiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
