import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DynamicFormComponent } from './dynamic-form.component';
import { FormFieldDescriptor } from './form-field.model';

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
      imports: [DynamicFormComponent, ReactiveFormsModule, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicFormComponent);
    component = fixture.componentInstance;
    component.form = new FormGroup({
      name: new FormControl('Alice', [Validators.required]),
      age: new FormControl(28),
      role: new FormControl('user'),
      active: new FormControl(true)
    });
    component.fields = mockFields;
    fixture.detectChanges();
  });

  it('should create the dynamic form component', () => {
    expect(component).toBeTruthy();
  });

  it('should render all fields through dynamic-field components', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const dynamicFields = compiled.querySelectorAll('app-dynamic-field');
    expect(dynamicFields.length).toBe(4);
  });

  it('should emit formSubmit with form values when submitted valid', () => {
    const submitSpy = vi.spyOn(component.formSubmit, 'emit');
    component.onSubmit();

    expect(submitSpy).toHaveBeenCalledWith({
      name: 'Alice',
      age: 28,
      role: 'user',
      active: true
    });
  });

  it('should not emit formSubmit when form is invalid', () => {
    component.form.get('name')?.setValue('');
    const submitSpy = vi.spyOn(component.formSubmit, 'emit');
    component.onSubmit();

    expect(submitSpy).not.toHaveBeenCalled();
  });
});
