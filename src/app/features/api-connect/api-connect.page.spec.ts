import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ApiConnectPage, httpUrlValidator, ApiConnectionConfig } from './api-connect.page';
import { FormControl } from '@angular/forms';
import { OpenApiLoaderService } from '../../openapi/services/openapi-loader.service';
import { of, throwError, Subject } from 'rxjs';

describe('ApiConnectPage', () => {
  let component: ApiConnectPage;
  let fixture: ComponentFixture<ApiConnectPage>;
  let openApiLoaderMock: { load: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    openApiLoaderMock = {
      load: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ApiConnectPage],
      providers: [
        provideAnimationsAsync(),
        { provide: OpenApiLoaderService, useValue: openApiLoaderMock }
      ]
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

  describe('Connection Submission with OpenApiLoaderService', () => {
    it('should not emit connected nor call loader when form is invalid', () => {
      let emitted: ApiConnectionConfig | undefined;
      component.connected.subscribe((val) => (emitted = val));

      component.onConnect();

      expect(openApiLoaderMock.load).not.toHaveBeenCalled();
      expect(emitted).toBeUndefined();
    });

    it('should trigger loader, set loading state, and emit connected with rawSpec upon success', () => {
      const mockRawSpec = { openapi: '3.0.0', info: { title: 'Petstore' } };
      openApiLoaderMock.load.mockReturnValue(of(mockRawSpec));

      let emitted: ApiConnectionConfig | undefined;
      component.connected.subscribe((val) => (emitted = val));

      component.form.setValue({
        openApiUrl: 'https://petstore.swagger.io/v2/swagger.json',
        baseUrl: 'https://api.custom.com'
      });

      component.onConnect();

      expect(openApiLoaderMock.load).toHaveBeenCalledWith('https://petstore.swagger.io/v2/swagger.json');
      expect(component.loading()).toBe(false);
      expect(emitted).toEqual({
        openApiUrl: 'https://petstore.swagger.io/v2/swagger.json',
        baseUrl: 'https://api.custom.com',
        rawSpec: mockRawSpec
      });
    });

    it('should omit baseUrl if blank when emitting connection payload', () => {
      const mockRawSpec = { swagger: '2.0', info: { title: 'Swagger API' } };
      openApiLoaderMock.load.mockReturnValue(of(mockRawSpec));

      let emitted: ApiConnectionConfig | undefined;
      component.connected.subscribe((val) => (emitted = val));

      component.form.setValue({
        openApiUrl: 'https://petstore.swagger.io/v2/swagger.json',
        baseUrl: '   '
      });

      component.onConnect();

      expect(emitted).toEqual({
        openApiUrl: 'https://petstore.swagger.io/v2/swagger.json',
        baseUrl: undefined,
        rawSpec: mockRawSpec
      });
    });

    it('should handle pending load by showing loading state', () => {
      const subject = new Subject<unknown>();
      openApiLoaderMock.load.mockReturnValue(subject.asObservable());

      component.form.setValue({
        openApiUrl: 'https://petstore.swagger.io/v2/swagger.json',
        baseUrl: ''
      });

      component.onConnect();
      fixture.detectChanges();

      expect(component.loading()).toBe(true);
      expect(component.form.disabled).toBe(true);

      subject.next({ openapi: '3.0.0' });
      subject.complete();
      fixture.detectChanges();

      expect(component.loading()).toBe(false);
      expect(component.form.disabled).toBe(false);
    });

    it('should display error banner and reset loading when loader fails with CORS/Network error', () => {
      const corsErrorMessage =
        'Falha de rede ou restrição de CORS. Verifique sua conexão e se o servidor da API permite requisições Cross-Origin (CORS).';
      openApiLoaderMock.load.mockReturnValue(throwError(() => new Error(corsErrorMessage)));

      let emitted: ApiConnectionConfig | undefined;
      component.connected.subscribe((val) => (emitted = val));

      component.form.setValue({
        openApiUrl: 'https://blocked-cors.example.com/openapi.json',
        baseUrl: ''
      });

      component.onConnect();
      fixture.detectChanges();

      expect(component.loading()).toBe(false);
      expect(emitted).toBeUndefined();
      expect(component.errorMessage()).toBe(corsErrorMessage);

      const banner = fixture.nativeElement.querySelector('.error-banner');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('CORS');
    });

    it('should display error banner when loader fails with invalid JSON error', () => {
      const jsonErrorMessage = 'O conteúdo retornado não pôde ser interpretado como um documento JSON válido.';
      openApiLoaderMock.load.mockReturnValue(throwError(() => new Error(jsonErrorMessage)));

      component.form.setValue({
        openApiUrl: 'https://example.com/invalid-doc.json',
        baseUrl: ''
      });

      component.onConnect();
      fixture.detectChanges();

      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBe(jsonErrorMessage);

      const banner = fixture.nativeElement.querySelector('.error-banner');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('JSON válido');
    });
  });
});
