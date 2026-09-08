import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { OperationPage } from './operation.page';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiDefinition } from '../../core/models/api-definition.model';
import { ApiOperation } from '../../core/models/api-operation.model';

describe('OperationPage', () => {
  let component: OperationPage;
  let fixture: ComponentFixture<OperationPage>;
  let sessionService: ApiSessionService;
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
    parameters: [],
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

    await TestBed.configureTestingModule({
      imports: [OperationPage],
      providers: [
        ApiSessionService,
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    }).compileComponents();

    sessionService = TestBed.inject(ApiSessionService);
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

  it('should render path, query, header, and cookie parameters', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    // Path param
    expect(compiled.textContent).toContain('orderId');
    expect(compiled.textContent).toContain('Path Parameters');

    // Query param
    expect(compiled.textContent).toContain('dryRun');
    expect(compiled.textContent).toContain('Query Parameters');

    // Header param
    expect(compiled.textContent).toContain('X-Idempotency-Key');
    expect(compiled.textContent).toContain('Header Parameters');

    // Cookie param
    expect(compiled.textContent).toContain('session_auth');
    expect(compiled.textContent).toContain('Cookie Parameters');
  });

  it('should render request body section and its schema', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Request Body');
    expect(compiled.textContent).toContain('application/json');
    expect(compiled.textContent).toContain('paymentToken');
    expect(compiled.textContent).toContain('customerNote');
  });

  it('should render responses section with status code badges, headers and schemas', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Responses');
    expect(compiled.textContent).toContain('200');
    expect(compiled.textContent).toContain('400');
    expect(compiled.textContent).toContain('X-Transaction-ID');
    expect(compiled.textContent).toContain('transactionId');
  });

  it('should render unknown and non-CRUD operations correctly', () => {
    fixture.componentRef.setInput('operationId', 'getHealthCheck');
    fixture.detectChanges();

    expect(component.currentOperation()).toEqual(mockUnknownOperation);
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('GET');
    expect(compiled.textContent).toContain('/api/system/health');
    expect(compiled.textContent).toContain('unknown');
    expect(compiled.textContent).toContain('System health probe');
  });

  it('should display not-found message when operationId does not match any operation', () => {
    fixture.componentRef.setInput('operationId', 'non_existent_op');
    fixture.detectChanges();

    expect(component.currentOperation()).toBeNull();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Operation Not Found');
    expect(compiled.textContent).toContain('non_existent_op');
  });

  it('should navigate back to parent resource when back button is clicked', () => {
    fixture.detectChanges();
    component.onNavigateBack();

    expect(routerNavigateSpy).toHaveBeenCalledWith(['/workspace', 'orders']);
  });

  it('should copy path to clipboard when onCopyPath is called', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy
      }
    });

    component.onCopyPath('/api/test');
    expect(writeTextSpy).toHaveBeenCalledWith('/api/test');
  });
});
