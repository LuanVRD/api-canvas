import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ApiConnectPage, httpUrlValidator, ApiConnectionConfig } from './api-connect.page';
import { FormControl } from '@angular/forms';

describe('ApiConnectPage', () => {
  let component: ApiConnectPage;
  let fixture: ComponentFixture<ApiConnectPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiConnectPage],
      providers: [provideAnimationsAsync()]
    }).compileComponents();

    fixture = TestBed.createComponent(ApiConnectPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('UI Brand and Identity', () => {
    it('should render the brand title "ApiCanvas" and tagline "Your API, rendered."', () => {
      const element: HTMLElement = fixture.nativeElement;
      const title = element.querySelector('.brand-title');
      const tagline = element.querySelector('.brand-tagline');

      expect(title?.textContent?.trim()).toBe('ApiCanvas');
      expect(tagline?.textContent?.trim()).toBe('Your API, rendered.');
    });
  });

  describe('Form Validation', () => {
    it('should initialize with an invalid form due to required openApiUrl', () => {
      expect(component.form.valid).toBe(false);
      expect(component.form.controls.openApiUrl.hasError('required')).toBe(true);
      expect(component.form.controls.baseUrl.valid).toBe(true);
    });

    it('should validate openApiUrl as required', () => {
      const control = component.form.controls.openApiUrl;
      control.setValue('');
      expect(control.hasError('required')).toBe(true);
      expect(control.valid).toBe(false);
    });

    it('should reject invalid URL formats for openApiUrl', () => {
      const control = component.form.controls.openApiUrl;

      control.setValue('not-a-valid-url');
      expect(control.hasError('invalidUrl')).toBe(true);

      control.setValue('ftp://invalid-protocol.com/spec.json');
      expect(control.hasError('invalidUrl')).toBe(true);

      control.setValue('javascript:alert(1)');
      expect(control.hasError('invalidUrl')).toBe(true);
    });

    it('should accept valid HTTP and HTTPS URLs for openApiUrl', () => {
      const control = component.form.controls.openApiUrl;

      control.setValue('https://petstore.swagger.io/v2/swagger.json');
      expect(control.errors).toBeNull();
      expect(control.valid).toBe(true);

      control.setValue('http://localhost:8080/openapi.json');
      expect(control.errors).toBeNull();
      expect(control.valid).toBe(true);
    });

    it('should treat baseUrl as optional when empty', () => {
      const control = component.form.controls.baseUrl;
      control.setValue('');
      expect(control.errors).toBeNull();
      expect(control.valid).toBe(true);

      control.setValue('   ');
      expect(control.errors).toBeNull();
      expect(control.valid).toBe(true);
    });

    it('should validate baseUrl URL format when provided', () => {
      const control = component.form.controls.baseUrl;

      control.setValue('invalid-base-url');
      expect(control.hasError('invalidUrl')).toBe(true);

      control.setValue('https://api.example.com/v1');
      expect(control.errors).toBeNull();
      expect(control.valid).toBe(true);
    });

    it('should be valid when openApiUrl is valid and baseUrl is empty or valid', () => {
      component.form.setValue({
        openApiUrl: 'https://petstore.swagger.io/v2/swagger.json',
        baseUrl: ''
      });
      expect(component.form.valid).toBe(true);

      component.form.setValue({
        openApiUrl: 'https://petstore.swagger.io/v2/swagger.json',
        baseUrl: 'https://api.custom-server.com'
      });
      expect(component.form.valid).toBe(true);
    });
  });

  describe('httpUrlValidator unit tests', () => {
    const validator = httpUrlValidator();

    it('should return null for empty values', () => {
      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl(null))).toBeNull();
      expect(validator(new FormControl('   '))).toBeNull();
    });

    it('should return invalidUrl error for non-http/https strings', () => {
      expect(validator(new FormControl('random-string'))).toEqual({ invalidUrl: true });
      expect(validator(new FormControl('ftp://files.example.com'))).toEqual({ invalidUrl: true });
      expect(validator(new FormControl('file:///path/to/spec.json'))).toEqual({ invalidUrl: true });
    });

    it('should return null for valid http/https URLs', () => {
      expect(validator(new FormControl('http://localhost:3000'))).toBeNull();
      expect(validator(new FormControl('https://api.domain.io/openapi.yaml'))).toBeNull();
    });
  });

  describe('Presets', () => {
    it('should populate openApiUrl when setPreset is called', () => {
      const testUrl = 'https://petstore.swagger.io/v2/swagger.json';
      component.setPreset(testUrl);

      expect(component.form.controls.openApiUrl.value).toBe(testUrl);
      expect(component.form.controls.openApiUrl.valid).toBe(true);
      expect(component.form.valid).toBe(true);
    });
  });

  describe('States: Loading & Error', () => {
    it('should show error banner when errorMessage signal is set', () => {
      component.setError('Failed to fetch OpenAPI document: 404 Not Found');
      fixture.detectChanges();

      const element: HTMLElement = fixture.nativeElement;
      const banner = element.querySelector('.error-banner');
      expect(banner).toBeTruthy();
      expect(banner?.textContent).toContain('Failed to fetch OpenAPI document: 404 Not Found');
    });

    it('should dismiss error when clearError is called', () => {
      component.setError('Some connection error');
      fixture.detectChanges();

      component.clearError();
      fixture.detectChanges();

      const element: HTMLElement = fixture.nativeElement;
      const banner = element.querySelector('.error-banner');
      expect(banner).toBeNull();
    });

    it('should update loading state and disable form when setLoading(true)', () => {
      component.setLoading(true);
      fixture.detectChanges();

      expect(component.loading()).toBe(true);
      expect(component.form.disabled).toBe(true);

      const element: HTMLElement = fixture.nativeElement;
      const button = element.querySelector('.connect-button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(element.querySelector('.button-spinner')).toBeTruthy();

      component.setLoading(false);
      fixture.detectChanges();
      expect(component.loading()).toBe(false);
      expect(component.form.disabled).toBe(false);
    });
  });

  describe('Connection Submission', () => {
    it('should not emit connected when form is invalid', () => {
      let emitted: ApiConnectionConfig | undefined;
      component.connected.subscribe((val) => (emitted = val));

      component.onConnect();
      expect(emitted).toBeUndefined();
    });

    it('should emit connected with config when form is valid', () => {
      let emitted: ApiConnectionConfig | undefined;
      component.connected.subscribe((val) => (emitted = val));

      component.form.setValue({
        openApiUrl: 'https://petstore.swagger.io/v2/swagger.json',
        baseUrl: 'https://api.custom.com'
      });

      component.onConnect();

      expect(emitted).toEqual({
        openApiUrl: 'https://petstore.swagger.io/v2/swagger.json',
        baseUrl: 'https://api.custom.com'
      });
    });

    it('should omit baseUrl if blank when emitting connection payload', () => {
      let emitted: ApiConnectionConfig | undefined;
      component.connected.subscribe((val) => (emitted = val));

      component.form.setValue({
        openApiUrl: 'https://petstore.swagger.io/v2/swagger.json',
        baseUrl: '   '
      });

      component.onConnect();

      expect(emitted).toEqual({
        openApiUrl: 'https://petstore.swagger.io/v2/swagger.json',
        baseUrl: undefined
      });
    });
  });
});
