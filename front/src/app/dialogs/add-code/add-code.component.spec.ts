import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {AddCodeComponent} from './add-code.component';

describe('AddCodeComponent', () => {
  let component: AddCodeComponent;
  let fixture: ComponentFixture<AddCodeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AddCodeComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
