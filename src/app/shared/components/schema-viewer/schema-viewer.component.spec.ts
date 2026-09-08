import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SchemaViewerComponent } from './schema-viewer.component';
import { ApiSchema } from '../../../core/models/api-schema.model';

describe('SchemaViewerComponent', () => {
  let component: SchemaViewerComponent;
  let fixture: ComponentFixture<SchemaViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchemaViewerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SchemaViewerComponent);
    component = fixture.componentInstance;
  });

  it('should create and display empty message when schema is undefined', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No schema definition available');
  });

  it('should render primitive schema details', () => {
    const schema: ApiSchema = {
      type: 'string',
      format: 'email',
      description: 'User email address',
      default: 'test@example.com'
    };

    fixture.componentRef.setInput('schema', schema);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('string');
    expect(compiled.textContent).toContain('<email>');
    expect(compiled.textContent).toContain('test@example.com');
  });

  it('should render object properties, marking required fields', () => {
    const schema: ApiSchema = {
      type: 'object',
      title: 'UserProfile',
      properties: {
        id: { type: 'integer', format: 'int64', required: true },
        username: { type: 'string', minLength: 3 },
        status: { type: 'string', enum: ['active', 'inactive', 'pending'] }
      },
      requiredProperties: ['id', 'username']
    };

    fixture.componentRef.setInput('schema', schema);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('UserProfile');
    expect(compiled.textContent).toContain('id');
    expect(compiled.textContent).toContain('username');
    expect(compiled.textContent).toContain('status');
    expect(compiled.textContent).toContain('required');
    expect(compiled.textContent).toContain('active');
  });

  it('should render nested object schemas and arrays', () => {
    const schema: ApiSchema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' }
          }
        },
        tags: {
          type: 'array',
          items: {
            type: 'string'
          }
        }
      }
    };

    fixture.componentRef.setInput('schema', schema);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('address');
    expect(compiled.textContent).toContain('street');
    expect(compiled.textContent).toContain('city');
    expect(compiled.textContent).toContain('tags');
    expect(compiled.textContent).toContain('Array<string>');
  });

  it('should toggle to example JSON view mode', () => {
    const schema: ApiSchema = {
      type: 'object',
      properties: {
        id: { type: 'integer', example: 42 },
        name: { type: 'string', example: 'Antigravity' }
      }
    };

    fixture.componentRef.setInput('schema', schema);
    fixture.detectChanges();

    component.viewMode.set('example');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('"id": 42');
    expect(compiled.textContent).toContain('"name": "Antigravity"');
  });
});
