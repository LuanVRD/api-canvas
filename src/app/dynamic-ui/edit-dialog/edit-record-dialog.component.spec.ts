import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditRecordDialogComponent } from './edit-record-dialog.component';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiExecutorService } from '../../core/services/api-executor.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiOperation } from '../../core/models/api-operation.model';
import { ApiExecutionResult } from '../../core/models/api-execution-result.model';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('EditRecordDialogComponent', () => {
  let component: EditRecordDialogComponent;
  let fixture: ComponentFixture<EditRecordDialogComponent>;
  let mockExecutor: { execute: ReturnType<typeof vi.fn> };
  let mockSession: { baseUrl: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  const putOp: ApiOperation = {
    id: 'update_product',
    operationId: 'updateProduct',
    method: 'PUT',
    path: '/api/v1/products/{id}',
    type: 'update',
    summary: 'Update entire product',
    parameters: [
      {
        name: 'id',
        location: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Product Title', required: true },
          price: { type: 'number', title: 'Price' }
        },
        requiredProperties: ['title']
      }
    },
    responses: []
  };

  const patchOp: ApiOperation = {
    id: 'patch_product',
    operationId: 'patchProduct',
    method: 'PATCH',
    path: '/api/v1/products/{id}',
    type: 'update',
    summary: 'Partially update product',
    parameters: [
      {
        name: 'id',
        location: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    requestBody: {
      required: false,
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Product Title' },
          price: { type: 'number', title: 'Price' }
        }
      }
    },
    responses: []
  };

  beforeEach(async () => {
    mockExecutor = {
      execute: vi.fn()
    };
    mockSession = {
      baseUrl: vi.fn(() => 'https://api.example.com')
    };
    mockRouter = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [EditRecordDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ApiExecutorService, useValue: mockExecutor },
        { provide: ApiSessionService, useValue: mockSession },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditRecordDialogComponent);
    component = fixture.componentInstance;
    component.operation = putOp;
    component.availableOperations = [putOp, patchOp];
    component.record = { id: 'prod-123', title: 'Existing Item', price: 49.9 };
    component.initialParams = { id: 'prod-123' };
    fixture.detectChanges();
  });

  it('should create and initialize with operation and record data', () => {
    expect(component).toBeTruthy();
    expect(component.activeOperation()).toBe(putOp);
    expect(component.userParamValues()).toEqual({ id: 'prod-123' });
    expect(component.formInitialValue()).toEqual({ id: 'prod-123', title: 'Existing Item', price: 49.9 });
  });

  it('should switch between PUT and PATCH operations when requested', () => {
    component.onSelectOperation(patchOp);
    expect(component.activeOperation()).toBe(patchOp);
    expect(component.activeOperation().method).toBe('PATCH');
  });

  it('should execute update via ApiExecutorService and emit updated and close events on success', () => {
    const successResult: ApiExecutionResult = {
      status: 200,
      statusText: 'OK',
      data: { id: 'prod-123', title: 'Updated Title', price: 59.9 },
      duration: 50,
      durationMs: 50,
      isSuccess: true
    };

    mockExecutor.execute.mockReturnValue(of(successResult));
    const updatedSpy = vi.spyOn(component.updated, 'emit');
    const closeSpy = vi.spyOn(component.close, 'emit');

    if (component.dynamicFormRef?.form) {
      component.dynamicFormRef.form.patchValue({ title: 'Updated Title', price: 59.9 });
    }
    component.onDynamicFormChange({ title: 'Updated Title', price: 59.9 });
    component.onSave();

    expect(mockExecutor.execute).toHaveBeenCalledWith(
      'https://api.example.com',
      putOp,
      expect.objectContaining({
        path: { id: 'prod-123' },
        body: expect.objectContaining({ title: 'Updated Title', price: 59.9 })
      })
    );
    expect(updatedSpy).toHaveBeenCalledWith(successResult);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should handle API execution errors gracefully and display error message', () => {
    const errorResult: ApiExecutionResult = {
      status: 400,
      statusText: 'Bad Request',
      data: { message: 'Invalid payload title length' },
      duration: 30,
      durationMs: 30,
      isSuccess: false,
      error: {
        message: 'Invalid payload title length',
        status: 400
      }
    };

    mockExecutor.execute.mockReturnValue(of(errorResult));
    const updatedSpy = vi.spyOn(component.updated, 'emit');
    const closeSpy = vi.spyOn(component.close, 'emit');

    component.onSave();

    expect(component.executionResult()).toBe(errorResult);
    expect(updatedSpy).not.toHaveBeenCalled();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('should validate missing path parameters before saving', () => {
    component.missingParams = [
      { name: 'tenantId', location: 'path', required: true, schema: { type: 'string' } }
    ];
    component.operation = {
      ...putOp,
      parameters: [
        { name: 'id', location: 'path', required: true, schema: { type: 'string' } },
        { name: 'tenantId', location: 'path', required: true, schema: { type: 'string' } }
      ]
    };
    component.ngOnInit();

    expect(component.areAllMissingParamsProvided()).toBe(false);

    component.onParamChange('tenantId', 'tenant-alpha');
    expect(component.areAllMissingParamsProvided()).toBe(true);
  });

  it('should navigate to full operation workbench when onOpenFullOperation is triggered', () => {
    const closeSpy = vi.spyOn(component.close, 'emit');
    component.onOpenFullOperation();

    expect(closeSpy).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/operation', 'updateProduct']);
  });
});
