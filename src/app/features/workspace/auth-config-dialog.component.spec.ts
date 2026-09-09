import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthConfigDialogComponent } from './auth-config-dialog.component';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiDefinition } from '../../core/models/api-definition.model';

describe('AuthConfigDialogComponent', () => {
  let component: AuthConfigDialogComponent;
  let fixture: ComponentFixture<AuthConfigDialogComponent>;
  let session: ApiSessionService;

  const mockDefWithAuth: ApiDefinition = {
    title: 'Secured API',
    baseUrl: 'https://secure.api.com',
    resources: [],
    securitySchemes: [
      {
        id: 'bearerAuth',
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Standard JWT Bearer scheme',
        isBearer: true
      },
      {
        id: 'apiKeyAuth',
        type: 'apiKey',
        name: 'X-API-KEY',
        in: 'header',
        isBearer: false
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthConfigDialogComponent],
      providers: [ApiSessionService]
    }).compileComponents();

    session = TestBed.inject(ApiSessionService);
    session.setSession(mockDefWithAuth);

    fixture = TestBed.createComponent(AuthConfigDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and render detected security schemes', () => {
    expect(component).toBeTruthy();
    expect(component.securitySchemes().length).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('bearerAuth');
    expect(compiled.textContent).toContain('BEARER');
    expect(compiled.textContent).toContain('apiKeyAuth');
    expect(compiled.textContent).toContain('X-API-KEY');
  });

  it('should initialize inputToken and inputApiKeys with current session credentials if present', () => {
    session.setBearerToken('existing-session-token');
    session.setApiKey('apiKeyAuth', 'existing-key-value');

    const newFixture = TestBed.createComponent(AuthConfigDialogComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComponent.inputToken).toBe('existing-session-token');
    expect(newComponent.inputApiKeys['apiKeyAuth']).toBe('existing-key-value');
    expect(newComponent.hasBearerToken()).toBe(true);
    expect(newComponent.hasAnyApiKey()).toBe(true);
  });

  it('should save entered token and api keys to session on onSave and emit close', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.inputToken = 'new-secret-jwt';
    component.inputApiKeys['apiKeyAuth'] = 'my-api-key-value';
    component.onSave();

    expect(session.bearerToken()).toBe('new-secret-jwt');
    expect(session.getApiKey('apiKeyAuth')).toBe('my-api-key-value');
    expect(session.hasBearerToken()).toBe(true);
    expect(session.hasAnyApiKey()).toBe(true);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should clear all credentials from session on onClearAllCredentials and emit close', () => {
    session.setBearerToken('some-token');
    session.setApiKey('apiKeyAuth', 'some-key');
    expect(session.hasAnyAuthCredential()).toBe(true);

    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.onClearAllCredentials();

    expect(session.bearerToken()).toBeNull();
    expect(session.getApiKey('apiKeyAuth')).toBeNull();
    expect(session.hasAnyAuthCredential()).toBe(false);
    expect(component.inputToken).toBe('');
    expect(component.inputApiKeys).toEqual({});
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should toggle password visibility flag for bearer token and api keys', () => {
    expect(component.showPassword()).toBe(false);
    component.toggleShowPassword();
    expect(component.showPassword()).toBe(true);
    component.toggleShowPassword();
    expect(component.showPassword()).toBe(false);

    expect(component.showKeyPassword['apiKeyAuth']).toBeFalsy();
    component.toggleShowKeyPassword('apiKeyAuth');
    expect(component.showKeyPassword['apiKeyAuth']).toBe(true);
    component.toggleShowKeyPassword('apiKeyAuth');
    expect(component.showKeyPassword['apiKeyAuth']).toBe(false);
  });

  it('should emit close on onEscape and onBackdropClick', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.onEscape();
    expect(closeSpy).toHaveBeenCalledTimes(1);

    const mockEvent = {
      target: {
        classList: {
          contains: (cls: string) => cls === 'dialog-backdrop'
        }
      }
    } as unknown as MouseEvent;

    component.onBackdropClick(mockEvent);
    expect(closeSpy).toHaveBeenCalledTimes(2);
  });
});
