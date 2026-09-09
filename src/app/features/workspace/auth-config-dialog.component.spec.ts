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
  });

  it('should initialize inputToken with current session token if present', () => {
    session.setBearerToken('existing-session-token');

    const newFixture = TestBed.createComponent(AuthConfigDialogComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComponent.inputToken).toBe('existing-session-token');
    expect(newComponent.hasBearerToken()).toBe(true);
  });

  it('should save entered token to session on onSave and emit close', () => {
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.inputToken = 'new-secret-jwt';
    component.onSave();

    expect(session.bearerToken()).toBe('new-secret-jwt');
    expect(session.hasBearerToken()).toBe(true);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should clear token from session on onClearSessionToken and emit close', () => {
    session.setBearerToken('some-token');
    expect(session.hasBearerToken()).toBe(true);

    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.onClearSessionToken();

    expect(session.bearerToken()).toBeNull();
    expect(session.hasBearerToken()).toBe(false);
    expect(component.inputToken).toBe('');
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should toggle password visibility flag', () => {
    expect(component.showPassword()).toBe(false);
    component.toggleShowPassword();
    expect(component.showPassword()).toBe(true);
    component.toggleShowPassword();
    expect(component.showPassword()).toBe(false);
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
