import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CreateRecordDialogComponent } from './create-record-dialog.component';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiExecutorService } from '../../core/services/api-executor.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiOperation } from '../../core/models/api-operation.model';
import { ApiExecutionResult } from '../../core/models/api-execution-result.model';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('CreateRecordDialogComponent', () => {
  let component: CreateRecordDialogComponent;
  let fixture: ComponentFixture<CreateRecordDialogComponent>;
  let mockExecutor: { execute: ReturnType<typeof vi.fn> };
  let mockSession: {
    baseUrl: ReturnType<typeof signal>;
    uiConfiguration: ReturnType<typeof signal>;
    getResourceForOperation: ReturnType<typeof vi.fn>;
    notifyResourceMutation: ReturnType<typeof vi.fn>;
  };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  const postOp: ApiOperation = {
    id: 'create_order',
    operationId: 'createOrder',
    method: 'POST',
    path: '/api/v1/orders',
    type: 'create',
    summary: 'Create a new customer order',
    parameters: [],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          customerName: { type: 'string', title: 'Customer Name', required: true },
          total: { type: 'number', title: 'Total Amount' }
        },
        requiredProperties: ['customerName']
      }
    },
    responses: []
  };

  const nestedPostOp: ApiOperation = {
    id: 'create_order_item',
    operationId: 'createOrderItem',
    method: 'POST',
    path: '/api/v1/orders/{orderId}/items',
    type: 'create',
    summary: 'Add an item to an existing order',
    parameters: [
      {
        name: 'orderId',
        location: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Target Order ID'
      }
    ],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          productName: { type: 'string', title: 'Product Name', required: true },
          quantity: { type: 'number', title: 'Quantity' }
        },
        requiredProperties: ['productName']
      }
    },
    responses: []
  };

  beforeEach(async () => {
    mockExecutor = {
      execute: vi.fn()
    };
    mockSession = {
      baseUrl: signal('https://api.example.com'),
      uiConfiguration: signal(null),
      getResourceForOperation: vi.fn(() => ({ id: 'orders', name: 'Orders' })),
      notifyResourceMutation: vi.fn()
    };
    mockRouter = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CreateRecordDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ApiExecutorService, useValue: mockExecutor },
        { provide: ApiSessionService, useValue: mockSession },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateRecordDialogComponent);
    component = fixture.componentInstance;
    component.operation = postOp;
    fixture.detectChanges();
  });

  it('should create and initialize with operation and form schema', () => {
    expect(component).toBeTruthy();
    expect(component.activeOperation()).toBe(postOp);
    expect(component.requestBodySchema()).toBeTruthy();
    expect(component.requestBodySchema()?.properties?.['customerName']).toBeDefined();
  });

  it('should prompt for required path parameters when endpoint is parameterized', () => {
    component.operation = nestedPostOp;
    component.ngOnChanges({
      operation: {
        currentValue: nestedPostOp,
        previousValue: postOp,
        firstChange: false,
        isFirstChange: () => false
      }
    });
    fixture.detectChanges();

    expect(component.activeMissingParams().length).toBe(1);
    expect(component.activeMissingParams()[0].name).toBe('orderId');
    expect(component.areAllMissingParamsProvided()).toBe(false);

    // Provide path parameter value
    component.onParamChange('orderId', 'ord-999');
    expect(component.userParamValues()['orderId']).toBe('ord-999');
    expect(component.areAllMissingParamsProvided()).toBe(true);
  });

  it('should validate dynamic form before submission and set validation error if invalid', () => {
    component.operation = postOp;
    fixture.detectChanges();

    // Required field customerName is empty
    component.onSave();

    expect(mockExecutor.execute).not.toHaveBeenCalled();
    expect(component.validationError()).toContain('Please fill in all required fields');
  });

  it('should execute POST operation via ApiExecutorService, notify session mutation and emit created and close events on success', () => {
    const successResult: ApiExecutionResult = {
      status: 201,
      statusText: 'Created',
      data: { id: 'ord-100', customerName: 'Alice', total: 150.0 },
      duration: 40,
      durationMs: 40,
      isSuccess: true
    };

    mockExecutor.execute.mockReturnValue(of(successResult));
    const createdSpy = vi.spyOn(component.created, 'emit');
    const closeSpy = vi.spyOn(component.close, 'emit');

    if (component.dynamicFormRef?.form) {
      component.dynamicFormRef.form.patchValue({ customerName: 'Alice', total: 150.0 });
    }
    component.onDynamicFormChange({ customerName: 'Alice', total: 150.0 });
    component.onSave();

    expect(mockExecutor.execute).toHaveBeenCalledWith(
      'https://api.example.com',
      postOp,
      expect.objectContaining({
        path: {},
        body: expect.objectContaining({ customerName: 'Alice', total: 150.0 })
      })
    );

    expect(mockSession.notifyResourceMutation).toHaveBeenCalledWith('orders', 'create_order', successResult);
    expect(createdSpy).toHaveBeenCalledWith(successResult);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should handle API execution errors and display error message and expandable payload', () => {
    const errorResult: ApiExecutionResult = {
      status: 422,
      statusText: 'Unprocessable Entity',
      data: { error: 'Validation failed', fields: ['customerName'] },
      duration: 30,
      durationMs: 30,
      isSuccess: false,
      error: {
        message: 'Unprocessable Entity',
        status: 422,
        details: { error: 'Validation failed' },
        hint: 'Check payload values'
      }
    };

    mockExecutor.execute.mockReturnValue(of(errorResult));

    if (component.dynamicFormRef?.form) {
      component.dynamicFormRef.form.patchValue({ customerName: 'Alice' });
    }
    component.onDynamicFormChange({ customerName: 'Alice' });
    component.onSave();

    expect(component.executionResult()).toBe(errorResult);
    expect(component.hasErrorPayload()).toBe(true);

    component.toggleErrorExpanded();
    expect(component.isErrorExpanded()).toBe(true);
  });

  it('should handle unexpected HTTP error stream rejection gracefully', () => {
    mockExecutor.execute.mockReturnValue(
      throwError(() => ({
        status: 500,
        statusText: 'Internal Server Error',
        message: 'Connection timed out'
      }))
    );

    if (component.dynamicFormRef?.form) {
      component.dynamicFormRef.form.patchValue({ customerName: 'Alice' });
    }
    component.onDynamicFormChange({ customerName: 'Alice' });
    component.onSave();

    expect(component.isExecuting()).toBe(false);
    expect(component.executionResult()?.isSuccess).toBe(false);
    expect(component.executionResult()?.status).toBe(500);
  });

  it('should navigate to workbench when onOpenFullOperation is triggered', () => {
    const closeSpy = vi.spyOn(component.close, 'emit');
    component.onOpenFullOperation();

    expect(closeSpy).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/operation', 'createOrder']);
  });

  it('should emit close on backdrop click', () => {
    const closeSpy = vi.spyOn(component.close, 'emit');
    const mockEvent = {
      target: {
        classList: {
          contains: (cls: string) => cls === 'dialog-backdrop'
        }
      }
    } as unknown as MouseEvent;

    component.onBackdropClick(mockEvent);
    expect(closeSpy).toHaveBeenCalled();
  });
});
