import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JsonViewerComponent } from './json-viewer.component';

describe('JsonViewerComponent', () => {
  let component: JsonViewerComponent;
  let fixture: ComponentFixture<JsonViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonViewerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(JsonViewerComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should format object as prettified JSON', () => {
    component.data = { id: 1, name: 'Item' };
    fixture.detectChanges();

    const code = fixture.nativeElement.querySelector('code');
    expect(code?.textContent).toContain('"id": 1');
    expect(code?.textContent).toContain('"name": "Item"');
  });

  it('should compute line count and byte size', () => {
    component.data = { id: 123, status: 'active' };
    fixture.detectChanges();

    expect(component.lineCount()).toBeGreaterThan(1);
    expect(component.byteSizeFormatted()).toContain('B');
  });

  it('should handle string JSON and primitives', () => {
    component.data = '{"test": true}';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('code')?.textContent).toContain('"test": true');

    const fixture2 = TestBed.createComponent(JsonViewerComponent);
    fixture2.componentInstance.data = 42;
    fixture2.detectChanges();
    expect(fixture2.nativeElement.querySelector('code')?.textContent).toContain('42');
  });

  it('should handle copy action', () => {
    component.data = { message: 'hello' };
    fixture.detectChanges();
    component.onCopy();
    expect(component.copied()).toBe(true);
  });
});
