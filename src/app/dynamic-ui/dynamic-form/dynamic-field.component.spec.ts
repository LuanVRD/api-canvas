import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DynamicFieldComponent } from './dynamic-field.component';
import { FormFieldDescriptor } from './form-field.model';
import { FormSchemaService } from './form-schema.service';

describe('DynamicFieldComponent', () => {
  let component: DynamicFieldComponent;
  let fixture: ComponentFixture<DynamicFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicFieldComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [FormSchemaService]
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicFieldComponent);
    component = fixture.componentInstance;
  });

  const setupField = (field: FormFieldDescriptor, controlValue: unknown = '', validators: any[] = []) => {
    component.field = field;
    component.form = new FormGroup({
      [field.key]: new FormControl(controlValue, validators)
    });
    fixture.detectChanges();
  };

  it('should render a text input by default and display label and description hint', () => {
    setupField({
      key: 'username',
      label: 'User Name',
      type: 'text',
      required: true,
      description: 'Choose a distinct username'
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[matInput]') as HTMLInputElement;
    const hint = compiled.querySelector('mat-hint');

    expect(input).toBeTruthy();
    expect(hint?.textContent).toContain('Choose a distinct username');
  });

  it('should render a number input with min and max constraints', () => {
    setupField({
      key: 'quantity',
      label: 'Quantity',
      type: 'number',
      required: false,
      constraints: { minimum: 1, maximum: 100 }
    }, 5);

    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[type="number"]') as HTMLInputElement;

    expect(input).toBeTruthy();
    expect(input.getAttribute('min')).toBe('1');
    expect(input.getAttribute('max')).toBe('100');
  });

  it('should render a boolean toggle', () => {
    setupField({
      key: 'agreeToTerms',
      label: 'I accept terms',
      type: 'boolean',
      required: true,
      description: 'Mandatory agreement'
    }, true);

    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector('mat-slide-toggle');
    const hint = compiled.querySelector('.toggle-hint');

    expect(toggle).toBeTruthy();
    expect(hint?.textContent).toContain('Mandatory agreement');
  });

  it('should render a select dropdown for enum with options', () => {
    setupField({
      key: 'role',
      label: 'User Role',
      type: 'select',
      required: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Guest', value: 'guest' }
      ]
    }, 'admin');

    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('mat-select');

    expect(select).toBeTruthy();
  });

  it('should render a date input for type date', () => {
    setupField({
      key: 'birthDate',
      label: 'Birth Date',
      type: 'date',
      required: false
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[type="date"]');
    expect(input).toBeTruthy();
  });

  it('should render a datetime-local input for type datetime', () => {
    setupField({
      key: 'meetingTime',
      label: 'Meeting Time',
      type: 'datetime',
      required: false
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector('input[type="datetime-local"]');
    expect(input).toBeTruthy();
  });

  it('should render a textarea for type json and show fallback reason if isFallback', () => {
    setupField({
      key: 'metadata',
      label: 'Metadata JSON',
      type: 'json',
      required: false,
      isFallback: true,
      fallbackReason: 'Cyclic schema reference detected'
    }, '{"tier": "premium"}');

    const compiled = fixture.nativeElement as HTMLElement;
    const textarea = compiled.querySelector('textarea[matInput]');
    const fallbackNote = compiled.querySelector('.fallback-note');

    expect(textarea).toBeTruthy();
    expect(fallbackNote?.textContent).toContain('Cyclic schema reference detected');
  });

  it('should render nested object container with child fields', () => {
    const field: FormFieldDescriptor = {
      key: 'address',
      label: 'Mailing Address',
      type: 'object',
      required: true,
      children: [
        { key: 'street', label: 'Street', type: 'text', required: true },
        { key: 'zip', label: 'Zip Code', type: 'text', required: false }
      ]
    };

    component.field = field;
    component.form = new FormGroup({
      address: new FormGroup({
        street: new FormControl('123 Elm St', [Validators.required]),
        zip: new FormControl('90210')
      })
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const objectCard = compiled.querySelector('.nested-object-card');
    expect(objectCard).toBeTruthy();
    expect(objectCard?.querySelector('.nested-title')?.textContent).toContain('Mailing Address');

    const childFields = objectCard?.querySelectorAll('app-dynamic-field');
    expect(childFields?.length).toBe(2);
  });

  it('should render array container with items and allow adding and removing items', () => {
    const field: FormFieldDescriptor = {
      key: 'tags',
      label: 'Tags',
      type: 'array',
      required: false,
      itemDescriptor: {
        key: 'tags_item',
        label: 'Tag Name',
        type: 'text',
        required: true,
        defaultValue: 'new-tag'
      }
    };

    const tagsArray = new FormArray([
      new FormControl('alpha'),
      new FormControl('beta')
    ]);

    component.field = field;
    component.form = new FormGroup({
      tags: tagsArray
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const arrayCard = compiled.querySelector('.nested-array-card');
    expect(arrayCard).toBeTruthy();
    expect(arrayCard?.querySelector('.count-badge')?.textContent).toContain('[2]');

    // Add item
    const addBtn = arrayCard?.querySelector('.btn-add-item') as HTMLButtonElement;
    expect(addBtn).toBeTruthy();
    addBtn.click();
    fixture.detectChanges();

    expect(tagsArray.length).toBe(3);
    expect(tagsArray.at(2).value).toBe('new-tag');

    // Remove item at index 0
    const removeBtns = arrayCard?.querySelectorAll('.btn-remove-item');
    expect(removeBtns?.length).toBe(3);
    (removeBtns![0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(tagsArray.length).toBe(2);
    expect(tagsArray.at(0).value).toBe('beta');
  });

  describe('Validation Error Messages', () => {
    it('should display required error message when touched and invalid', () => {
      const field: FormFieldDescriptor = {
        key: 'email',
        label: 'Email Address',
        type: 'text',
        required: true
      };
      setupField(field, '', [Validators.required]);

      const ctrl = component.form.get('email');
      ctrl?.markAsTouched();
      fixture.detectChanges();

      expect(component.getErrorMessage()).toBe('Email Address is required.');
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('mat-error')?.textContent).toContain('Email Address is required.');
    });

    it('should display minlength and maxlength error messages', () => {
      const field: FormFieldDescriptor = {
        key: 'code',
        label: 'Code',
        type: 'text',
        required: false,
        constraints: { minLength: 3, maxLength: 6 }
      };
      setupField(field, 'ab', [Validators.minLength(3), Validators.maxLength(6)]);

      const ctrl = component.form.get('code');
      ctrl?.markAsDirty();
      fixture.detectChanges();

      expect(component.getErrorMessage()).toBe('Minimum length is 3 characters.');

      ctrl?.setValue('abcdefgh');
      fixture.detectChanges();
      expect(component.getErrorMessage()).toBe('Maximum length is 6 characters.');
    });

    it('should display min and max error messages for numbers', () => {
      const field: FormFieldDescriptor = {
        key: 'score',
        label: 'Score',
        type: 'number',
        required: false,
        constraints: { minimum: 10, maximum: 50 }
      };
      setupField(field, 5, [Validators.min(10), Validators.max(50)]);

      const ctrl = component.form.get('score');
      ctrl?.markAsDirty();
      fixture.detectChanges();

      expect(component.getErrorMessage()).toBe('Minimum value is 10.');

      ctrl?.setValue(99);
      fixture.detectChanges();
      expect(component.getErrorMessage()).toBe('Maximum value is 50.');
    });

    it('should display pattern error message', () => {
      const field: FormFieldDescriptor = {
        key: 'alphanumeric',
        label: 'Alphanumeric Code',
        type: 'text',
        required: false,
        constraints: { pattern: '^[A-Z0-9]+$' }
      };
      setupField(field, 'invalid-pattern!', [Validators.pattern('^[A-Z0-9]+$')]);

      const ctrl = component.form.get('alphanumeric');
      ctrl?.markAsDirty();
      fixture.detectChanges();

      expect(component.getErrorMessage()).toBe('Invalid format or pattern.');
    });

    it('should display invalidJson error message', () => {
      const field: FormFieldDescriptor = {
        key: 'payload',
        label: 'Payload',
        type: 'json',
        required: false
      };
      setupField(field, '{ bad json', [() => ({ invalidJson: true })]);

      const ctrl = component.form.get('payload');
      ctrl?.markAsDirty();
      fixture.detectChanges();

      expect(component.getErrorMessage()).toBe('Invalid JSON syntax.');
    });

    it('should render textarea for type textarea', () => {
      setupField({
        key: 'longBio',
        label: 'Long Biography',
        type: 'textarea',
        required: false,
        description: 'Tell us about yourself'
      }, 'Hello world');

      const compiled = fixture.nativeElement as HTMLElement;
      const textarea = compiled.querySelector('textarea.form-textarea') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();
      expect(textarea.value).toBe('Hello world');
    });
  });
});

