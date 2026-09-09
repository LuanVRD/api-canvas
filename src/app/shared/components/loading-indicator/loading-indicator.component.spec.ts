import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingIndicatorComponent } from './loading-indicator.component';

describe('LoadingIndicatorComponent', () => {
  let component: LoadingIndicatorComponent;
  let fixture: ComponentFixture<LoadingIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingIndicatorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render default message', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('.loading-message');
    expect(text?.textContent).toContain('Loading...');
  });

  it('should render custom message', () => {
    component.message = 'Fetching details from API...';
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('.loading-message');
    expect(text?.textContent).toContain('Fetching details from API...');
  });

  it('should apply inline class when inline is true', () => {
    component.inline = true;
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector('.loading-container');
    expect(container.classList.contains('inline')).toBe(true);
  });

  it('should apply correct size class', () => {
    component.size = 'sm';
    fixture.detectChanges();
    let container = fixture.nativeElement.querySelector('.loading-container');
    expect(container.classList.contains('size-sm')).toBe(true);

    const fixture2 = TestBed.createComponent(LoadingIndicatorComponent);
    fixture2.componentInstance.size = 'lg';
    fixture2.detectChanges();
    container = fixture2.nativeElement.querySelector('.loading-container');
    expect(container.classList.contains('size-lg')).toBe(true);
  });
});
