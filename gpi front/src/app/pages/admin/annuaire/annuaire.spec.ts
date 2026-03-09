import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Annuaire } from './annuaire';

describe('Annuaire', () => {
  let component: Annuaire;
  let fixture: ComponentFixture<Annuaire>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Annuaire]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Annuaire);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
