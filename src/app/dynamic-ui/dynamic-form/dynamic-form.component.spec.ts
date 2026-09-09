import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DynamicFormComponent } from './dynamic-form.component';
import { FormFieldDescriptor } from './form-field.model';
import { FormSchemaService } from './form-schema.service';
import { ApiSchema } from '../../core/models/api-schema.model';

describe('DynamicFormComponent', () => {
  let component: DynamicFormComponent;
  let fixture: ComponentFixture<DynamicFormComponent>;

  const mockFields: FormFieldDescriptor[] = [
    {
      key: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      defaultValue: 'Alice'
    },
    {
      key: 'age',
      label: 'Age',
      type: 'number',
      required: false,
      defaultValue: 28
    },
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      required: false,
      options: ['admin', 'user']
    },
    {
      key: 'active',
      label: 'Is Active',
      type: 'boolean',
      required: false,
      defaultValue: true
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicFormComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [FormSchemaService]
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicFormComponent);
    component = fixture.componentInstance;
  });

  it('should create the dynamic form component', () => {
    component.form = new FormGroup({
      name: new FormControl('Alice', [Validators.required]),
      age: new FormControl(28),
      role: new FormControl('user'),
      active: new FormControl(true)
    });
    component.fields = mockFields;
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('should render all fields through dynamic-field components', () => {
    component.form = new FormGroup({
      name: new FormControl('Alice', [Validators.required]),
      age: new FormControl(28),
      role: new FormControl('user'),
      active: new FormControl(true)
    });
    component.fields = mockFields;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const dynamicFields = compiled.querySelectorAll('app-dynamic-field');
    expect(dynamicFields.length).toBe(4);
  });

  it('should initialize form and fields automatically when schema input is provided', () => {
    const schema: ApiSchema = {
      type: 'object',
      requiredProperties: ['title'],
      properties: {
        title: { type: 'string', title: 'Product Title' },
        price: { type: 'number', minimum: 0 }
      }
    };

    component.schema = schema;
    component.ngOnChanges({
      schema: {
        currentValue: schema,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    fixture.detectChanges();

    expect(component.form).toBeTruthy();
    expect(component.fields.length).toBe(2);
    expect(component.form?.contains('title')).toBe(true);
    expect(component.form?.contains('price')).toBe(true);
  });

  it('should emit formSubmit with request-body compatible payload when form is valid', () => {
    component.form = new FormGroup({
      name: new FormControl('Alice', [Validators.required]),
      age: new FormControl('28'),
      role: new FormControl('user'),
      active: new FormControl(true)
    });
    component.fields = mockFields;
    fixture.detectChanges();

    const submitSpy = vi.spyOn(component.formSubmit, 'emit');
    component.onSubmit();

    expect(submitSpy).toHaveBeenCalledWith({
      name: 'Alice',
      age: 28,
      role: 'user',
      active: true
    });
  });

  it('should not emit formSubmit and mark all controls touched when form is invalid', () => {
    component.form = new FormGroup({
      name: new FormControl('', [Validators.required]),
      age: new FormControl(28),
      role: new FormControl('user'),
      active: new FormControl(true)
    });
    component.fields = mockFields;
    fixture.detectChanges();

    const submitSpy = vi.spyOn(component.formSubmit, 'emit');
    component.onSubmit();

    expect(submitSpy).not.toHaveBeenCalled();
    expect(component.form.get('name')?.touched).toBe(true);
  });

  it('should handle reset and patch initialValue if provided', () => {
    component.form = new FormGroup({
      name: new FormControl('Alice'),
      age: new FormControl(28)
    });
    component.fields = mockFields.slice(0, 2);
    component.initialValue = { name: 'DefaultName', age: 20 };
    fixture.detectChanges();

    const resetSpy = vi.spyOn(component.formReset, 'emit');
    component.form.get('name')?.setValue('Changed');
    component.onReset();

    expect(resetSpy).toHaveBeenCalled();
    expect(component.form.get('name')?.value).toBe('DefaultName');
  });
});

