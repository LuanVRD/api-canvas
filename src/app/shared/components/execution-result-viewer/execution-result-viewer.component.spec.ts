import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExecutionResultViewerComponent } from './execution-result-viewer.component';
import { ApiExecutionResult } from '../../../core/models/api-execution-result.model';

describe('ExecutionResultViewerComponent', () => {
  let component: ExecutionResultViewerComponent;
  let fixture: ComponentFixture<ExecutionResultViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExecutionResultViewerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ExecutionResultViewerComponent);
    component = fixture.componentInstance;
  });

  it('should create the component and render idle state when result is null', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    const idleEl = fixture.nativeElement.querySelector('.result-idle');
    expect(idleEl).toBeTruthy();
  });

  it('should render loading indicator when loading is true', () => {
    component.loading = true;
    component.loadingMessage = 'Custom sending message...';
    fixture.detectChanges();

    const loadingEl = fixture.nativeElement.querySelector('.result-loading');
    expect(loadingEl).toBeTruthy();
    expect(loadingEl.textContent).toContain('Custom sending message...');
  });

  it('should render 200 OK success result with status badge and duration', () => {
    const mockResult: ApiExecutionResult = {
      status: 200,
      statusText: 'OK',
      durationMs: 45,
      isSuccess: true,
      headers: { 'content-type': 'application/json' },
      data: { id: 1, name: 'Item 1' }
    };
    component.result = mockResult;
    component.loading = false;
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.status-badge');
    expect(badge?.textContent).toContain('HTTP 200 OK');
    expect(badge?.getAttribute('data-status-group')).toBe('2xx');

    const duration = fixture.nativeElement.querySelector('.duration-badge');
    expect(duration?.textContent).toContain('45ms');
  });

  it('should render CORS/Network error diagnostic alert with hint and category', () => {
    const mockResult: ApiExecutionResult = {
      status: 0,
      statusText: 'CORS or Network Error',
      durationMs: 12,
      isSuccess: false,
      error: {
        message: 'Falha de rede ou restrição de CORS ao conectar a https://api.example.com',
        category: 'CORS_OR_NETWORK',
        hint: 'Verifique se o backend está online e permite CORS.'
      }
    };
    component.result = mockResult;
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('.alert-error');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('CORS_OR_NETWORK');
    expect(alert.textContent).toContain('Falha de rede ou restrição de CORS');
    expect(alert.textContent).toContain('Verifique se o backend está online e permite CORS.');
  });

  it('should render HTTP 500 error with server details', () => {
    const mockResult: ApiExecutionResult = {
      status: 500,
      statusText: 'Internal Server Error',
      durationMs: 80,
      isSuccess: false,
      error: {
        message: 'Internal error in DB',
        category: 'HTTP_ERROR',
        details: { code: 'DB_DOWN' }
      }
    };
    component.result = mockResult;
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.status-badge');
    expect(badge?.getAttribute('data-status-group')).toBe('5xx');
    const alert = fixture.nativeElement.querySelector('.alert-error');
    expect(alert.textContent).toContain('Internal error in DB');
  });

  it('should switch between tabs: body, headers, and raw', () => {
    const mockResult: ApiExecutionResult = {
      status: 200,
      statusText: 'OK',
      isSuccess: true,
      headers: { 'x-total-count': '42' },
      data: { test: true }
    };
    component.result = mockResult;
    fixture.detectChanges();

    component.activeTab.set('headers');
    fixture.detectChanges();
    const headersTable = fixture.nativeElement.querySelector('.headers-table');
    expect(headersTable?.textContent).toContain('x-total-count');

    component.activeTab.set('raw');
    fixture.detectChanges();
    const rawPane = fixture.nativeElement.querySelector('.tab-content-pane');
    expect(rawPane?.textContent).toContain('Full Execution Result');
  });
});
