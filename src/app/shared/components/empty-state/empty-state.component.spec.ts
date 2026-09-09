import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render default title', () => {
    fixture.detectChanges();
    const titleEl = fixture.nativeElement.querySelector('.empty-title');
    expect(titleEl?.textContent).toContain('No data available');
  });

  it('should render custom title and description and icon', () => {
    component.title = 'No endpoints found';
    component.description = 'This resource has no documented operations.';
    component.icon = 'search_off';
    fixture.detectChanges();

    const titleEl = fixture.nativeElement.querySelector('.empty-title');
    const descEl = fixture.nativeElement.querySelector('.empty-description');
    const iconEl = fixture.nativeElement.querySelector('.empty-icon');

    expect(titleEl?.textContent).toContain('No endpoints found');
    expect(descEl?.textContent).toContain('This resource has no documented operations.');
    expect(iconEl?.textContent).toContain('search_off');
  });

  it('should apply compact class when compact is true', () => {
    component.compact = true;
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.empty-state-card');
    expect(card.classList.contains('compact')).toBe(true);
  });
});
