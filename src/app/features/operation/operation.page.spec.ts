import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OperationPage } from './operation.page';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiExecutorService } from '../../core/services/api-executor.service';
import { ApiDefinition } from '../../core/models/api-definition.model';
import { ApiOperation } from '../../core/models/api-operation.model';
import { ApiExecutionResult } from '../../core/models/api-execution-result.model';

describe('OperationPage', () => {
  let component: OperationPage;
  let fixture: ComponentFixture<OperationPage>;
  let sessionService: ApiSessionService;
  let executorService: ApiExecutorService;
  let routerNavigateSpy: any;

  const mockActionOperation: ApiOperation = {
    id: 'post_api_orders_checkout',
    operationId: 'checkoutOrder',
    method: 'POST',
    path: '/api/orders/{orderId}/checkout',
    summary: 'Process Order Checkout',
    description: 'Executes the payment workflow and finalizes the order status.',
    type: 'action',
    deprecated: false,
    tags: ['Orders', 'Checkout'],
    parameters: [
      {
        name: 'orderId',
        location: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'Target order unique identifier'
      },
      {
        name: 'dryRun',
        location: 'query',
        required: false,
        schema: { type: 'boolean', default: false },
        description: 'Simulate checkout without charging'
      },
      {
        name: 'X-Idempotency-Key',
        location: 'header',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'Unique key to avoid duplicate charge'
      },
      {
        name: 'session_auth',
        location: 'cookie',
        required: false,
        schema: { type: 'string' },
        description: 'User session cookie'
      }
    ],
    requestBody: {
      contentType: 'application/json',
      required: true,
      description: 'Payment gateway token and customer note',
      schema: {
        type: 'object',
        properties: {
          paymentToken: { type: 'string', required: true },
          customerNote: { type: 'string', maxLength: 200 }
        },
        requiredProperties: ['paymentToken']
      }
    },
    responses: [
      {
        statusCode: '200',
        description: 'Order successfully checked out',
        contentType: 'application/json',
        headers: {
          'X-Transaction-ID': { type: 'string', description: 'Payment gateway reference ID' }
        },
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transactionId: { type: 'string' }
          }
        }
      },
      {
        statusCode: '400',
        description: 'Invalid payment token',
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    ]
  };

  const mockUnknownOperation: ApiOperation = {
    id: 'get_api_system_health',
    operationId: 'getHealthCheck',
    method: 'GET',
    path: '/api/system/health',
    summary: 'System health probe',
    description: 'Returns the health status of internal nodes',
    type: 'unknown',
    parameters: [
      {
        name: 'verbose',
        location: 'query',
        required: false,
        schema: { type: 'boolean' },
        description: 'Include detailed subsystem stats'
      }
    ],
    responses: [
      {
        statusCode: '200',
        description: 'Healthy'
      }
    ]
  };

  const mockApiDefinition: ApiDefinition = {
    title: 'Acme Platform API',
    version: '1.4.0',
    description: 'Enterprise API spec',
    baseUrl: 'https://api.acme.com',
    resources: [
      {
        id: 'orders',
        name: 'orders',
        label: 'Orders',
        operations: [mockActionOperation]
      },
      {
        id: 'system',
        name: 'system',
        label: 'System',
        operations: [mockUnknownOperation]
      }
    ]
  };

  beforeEach(async () => {
    const routerMock = {
      navigate: vi.fn()
    };

    const routeMock = {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'operationId' ? 'checkoutOrder' : null)
        }
      }
    };

    const executorMock = {
      execute: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [OperationPage],
      providers: [
        ApiSessionService,
        { provide: ApiExecutorService, useValue: executorMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    }).compileComponents();

    sessionService = TestBed.inject(ApiSessionService);
    executorService = TestBed.inject(ApiExecutorService);
    routerNavigateSpy = TestBed.inject(Router).navigate;
    sessionService.setSession(mockApiDefinition);

    fixture = TestBed.createComponent(OperationPage);
    component = fixture.componentInstance;
  });

  it('should create and load operation details from active session', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.currentOperation()).toEqual(mockActionOperation);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('POST');
    expect(compiled.textContent).toContain('/api/orders/{orderId}/checkout');
    expect(compiled.textContent).toContain('Process Order Checkout');
    expect(compiled.textContent).toContain('checkoutOrder');
    expect(compiled.textContent).toContain('action');
  });

  it('should generate inputs for path, query, and header parameters with default values', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    // Path parameter input
    expect(compiled.textContent).toContain('orderId');
    const pathInput = compiled.querySelector('input[aria-label="Path parameter orderId"]') as HTMLInputElement;
    expect(pathInput).toBeTruthy();

    // Query parameter input
    expect(compiled.textContent).toContain('dryRun');
    const queryInput = compiled.querySelector('input[aria-label="Query parameter dryRun"]') as HTMLInputElement;
    expect(queryInput).toBeTruthy();

    // Header parameter input
    expect(compiled.textContent).toContain('X-Idempotency-Key');
    const headerInput = compiled.querySelector('input[aria-label="Header parameter X-Idempotency-Key"]') as HTMLInputElement;
    expect(headerInput).toBeTruthy();
  });

  it('should allow adding, editing and removing custom request headers', () => {
    fixture.detectChanges();
    expect(component.customHeaders().length).toBe(0);

    component.onAddCustomHeader();
    expect(component.customHeaders().length).toBe(1);

    const item = component.customHeaders()[0];
    component.onCustomHeaderChange(item.id, 'key', 'Authorization');
    component.onCustomHeaderChange(item.id, 'value', 'Bearer token123');
    expect(component.customHeaders()[0].key).toBe('Authorization');
    expect(component.customHeaders()[0].value).toBe('Bearer token123');

    component.onRemoveCustomHeader(item.id);
    expect(component.customHeaders().length).toBe(0);
  });

  it('should populate sample JSON for request body and allow formatting and clearing', () => {
    fixture.detectChanges();
    expect(component.requestBodyText()).toBeTruthy();
    expect(component.requestBodyText()).toContain('paymentToken');

    // Test format with unformatted JSON
    component.onRequestBodyChange('{"paymentToken":"tok_abc","customerNote":"Urgent"}');
    component.onFormatJson();
    expect(component.requestBodyText()).toContain('{\n  "paymentToken": "tok_abc"');

    // Test clear
    component.onClearBody();
    expect(component.requestBodyText()).toBe('');

    // Test regenerate sample
    component.onGenerateSampleBody();
    expect(component.requestBodyText()).toContain('paymentToken');
  });

  it('should validate JSON syntax before executing request and display error', () => {
    fixture.detectChanges();

    // Provide path parameter so path validation passes
    component.onPathParamChange('orderId', 'ord-12345');
    // Set invalid JSON
    component.onRequestBodyChange('{ invalid json structure: true ');

    component.onExecute();

    expect(component.requestBodyFormatError()).toBeTruthy();
    expect(component.validationError()).toContain('JSON syntax error');
    expect(executorService.execute).not.toHaveBeenCalled();
  });

  it('should validate missing required path parameters before executing', () => {
    fixture.detectChanges();
    // Path parameter 'orderId' is empty
    component.onPathParamChange('orderId', '');

    component.onExecute();

    expect(component.validationError()).toContain('Missing required path parameter: "orderId"');
    expect(executorService.execute).not.toHaveBeenCalled();
  });

  it('should execute request successfully and display response status, duration and body', () => {
    const mockResult: ApiExecutionResult = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json', 'x-transaction-id': 'tx_999' },
      data: { success: true, transactionId: 'tx_999' },
      duration: 45,
      durationMs: 45,
      isSuccess: true
    };
    (executorService.execute as any).mockReturnValue(of(mockResult));

    fixture.detectChanges();
    component.onPathParamChange('orderId', 'ord-12345');
    component.onHeaderParamChange('X-Idempotency-Key', 'idemp-key-777');
    component.onQueryParamChange('dryRun', 'false');
    component.onRequestBodyChange(JSON.stringify({ paymentToken: 'tok_live_123' }));

    component.onExecute();
    fixture.detectChanges();

    expect(executorService.execute).toHaveBeenCalledWith(
      'https://api.acme.com',
      mockActionOperation,
      {
        path: { orderId: 'ord-12345' },
        query: { dryRun: 'false' },
        headers: { 'X-Idempotency-Key': 'idemp-key-777' },
        body: { paymentToken: 'tok_live_123' }
      }
    );

    expect(component.executionResult()).toEqual(mockResult);
    expect(component.isExecuting()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('200 OK');
    expect(compiled.textContent).toContain('45ms');
    expect(compiled.textContent).toContain('tx_999');
  });

  it('should handle HTTP error responses (e.g. 400 Bad Request) without crashing and render error message', () => {
    const mockErrorResult: ApiExecutionResult = {
      status: 400,
      statusText: 'Bad Request',
      headers: { 'content-type': 'application/json' },
      data: { error: 'Card expired' },
      duration: 30,
      durationMs: 30,
      isSuccess: false,
      error: {
        message: 'Request failed with status code 400',
        status: 400,
        details: { error: 'Card expired' }
      }
    };
    (executorService.execute as any).mockReturnValue(of(mockErrorResult));

    fixture.detectChanges();
    component.onPathParamChange('orderId', 'ord-999');
    component.onExecute();
    fixture.detectChanges();

    expect(component.executionResult()).toEqual(mockErrorResult);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('400 Bad Request');
    expect(compiled.textContent).toContain('Request failed with status code 400');
    expect(compiled.textContent).toContain('Card expired');
  });

  it('should execute unknown and action operations seamlessly', () => {
    const mockResult: ApiExecutionResult = {
      status: 200,
      statusText: 'OK',
      data: { status: 'healthy', uptime: 3600 },
      duration: 12,
      durationMs: 12,
      isSuccess: true
    };
    (executorService.execute as any).mockReturnValue(of(mockResult));

    fixture.componentRef.setInput('operationId', 'getHealthCheck');
    fixture.detectChanges();

    expect(component.currentOperation()).toEqual(mockUnknownOperation);

    component.onQueryParamChange('verbose', 'true');
    component.onExecute();
    fixture.detectChanges();

    expect(executorService.execute).toHaveBeenCalledWith(
      'https://api.acme.com',
      mockUnknownOperation,
      {
        path: {},
        query: { verbose: 'true' },
        headers: {},
        body: undefined
      }
    );

    expect(component.executionResult()).toEqual(mockResult);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('200 OK');
    expect(compiled.textContent).toContain('healthy');
  });

  it('should trigger execution on Ctrl+Enter keyboard shortcut', () => {
    const executeSpy = vi.spyOn(component, 'onExecute');
    const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true });
    component.onKeyDown(event);
    expect(executeSpy).toHaveBeenCalled();
  });

  it('should copy response body to clipboard when onCopyResponse is called', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy
      }
    });

    const res: ApiExecutionResult = {
      status: 200,
      statusText: 'OK',
      data: { result: 'ok' },
      duration: 10,
      durationMs: 10,
      isSuccess: true
    };

    component.onCopyResponse(res);
    expect(writeTextSpy).toHaveBeenCalledWith(JSON.stringify({ result: 'ok' }, null, 2));
  });

  it('should navigate back to parent resource when back button is clicked', () => {
    fixture.detectChanges();
    component.onNavigateBack();

    expect(routerNavigateSpy).toHaveBeenCalledWith(['/workspace', 'orders']);
  });
});
