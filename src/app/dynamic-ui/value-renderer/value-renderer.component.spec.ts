import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ValueRendererComponent } from './value-renderer.component';

describe('ValueRendererComponent', () => {
  let fixture: ComponentFixture<ValueRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValueRendererComponent]
    }).compileComponents();
  });

  it('should create the component', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render null as styled null label', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent.trim();
    expect(text).toBe('null');
  });

  it('should render undefined as styled null label', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    fixture.componentRef.setInput('value', undefined);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent.trim();
    expect(text).toBe('null');
  });

  it('should render true boolean with success badge and check icon', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    fixture.componentRef.setInput('value', true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.badge-bool.is-true')).toBeTruthy();
    expect(compiled.textContent).toContain('true');
  });

  it('should render false boolean with danger badge and close icon', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    fixture.componentRef.setInput('value', false);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.badge-bool.is-false')).toBeTruthy();
    expect(compiled.textContent).toContain('false');
  });

  it('should render numbers with monospace font', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    fixture.componentRef.setInput('value', 149.99);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const numEl = compiled.querySelector('.val-number.font-mono');
    expect(numEl).toBeTruthy();
    expect(numEl?.textContent).toBe('149.99');
  });

  it('should render strings directly', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    fixture.componentRef.setInput('value', 'Standard Product Title');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Standard Product Title');
  });

  it('should detect and format ISO date strings', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    fixture.componentRef.setInput('value', '2026-03-15T14:30:00Z');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const dateEl = compiled.querySelector('time.val-date');
    expect(dateEl).toBeTruthy();
    expect(dateEl?.textContent).toContain('2026-03-15');
  });

  it('should detect and format Date instances', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    fixture.componentRef.setInput('value', new Date('2026-01-01T00:00:00Z'));
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('time.val-date')).toBeTruthy();
  });

  it('should render arrays of primitives cleanly without [object Object]', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    fixture.componentRef.setInput('value', ['electronics', 'gadgets', 'sale']);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('[object Object]');
    expect(compiled.textContent).toContain('electronics');
    expect(compiled.textContent).toContain('gadgets');
  });

  it('should render empty array as []', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    fixture.componentRef.setInput('value', []);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent.trim()).toBe('[]');
  });

  it('should render arrays of objects with count and never [object Object]', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    fixture.componentRef.setInput('value', [
      { id: 1, name: 'First' },
      { id: 2, name: 'Second' }
    ]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('[object Object]');
    expect(compiled.textContent).toContain('[2 items]');
  });

  it('should render nested objects cleanly and never display [object Object]', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    fixture.componentRef.setInput('value', { source: 'warehouse-1', active: true });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('[object Object]');
    expect(compiled.textContent).toContain('source');
    expect(compiled.textContent).toContain('warehouse-1');
  });

  it('should render empty object as {}', () => {
    fixture = TestBed.createComponent(ValueRendererComponent);
    fixture.componentRef.setInput('value', {});
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent.trim()).toBe('{}');
  });
});
