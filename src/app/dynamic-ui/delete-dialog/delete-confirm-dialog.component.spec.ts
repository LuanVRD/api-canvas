import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeleteConfirmDialogComponent } from './delete-confirm-dialog.component';
import { ApiOperation } from '../../core/models/api-operation.model';
import { ApiExecutorService } from '../../core/services/api-executor.service';
import { ApiSessionService } from '../../core/services/api-session.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiExecutionResult } from '../../core/models/api-execution-result.model';

describe('DeleteConfirmDialogComponent', () => {
  let component: DeleteConfirmDialogComponent;
  let fixture: ComponentFixture<DeleteConfirmDialogComponent>;
  let mockExecutor: { execute: any };
  let mockRouter: { navigate: any };

  const sampleDeleteOp: ApiOperation = {
    id: 'delete_product_by_id',
    operationId: 'deleteProduct',
    method: 'DELETE',
    path: '/api/v1/products/{id}',
    type: 'delete',
    summary: 'Delete Product by ID',
    parameters: [
      {
        name: 'id',
        location: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: [
      {
        statusCode: '204',
        description: 'Product deleted'
      }
    ]
  };

  beforeEach(async () => {
    mockExecutor = {
      execute: vi.fn()
    };
    mockRouter = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [DeleteConfirmDialogComponent],
      providers: [
        { provide: ApiExecutorService, useValue: mockExecutor },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteConfirmDialogComponent);
    component = fixture.componentInstance;
    component.operation = sampleDeleteOp;
    component.record = { id: 'p-123', name: 'Vintage Camera', price: 150 };
    component.initialParams = { id: 'p-123' };
    component.missingParams = [];
  });

  it('should create the component and render operation path and target record details', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(component).toBeTruthy();
    expect(el.textContent).toContain('/api/v1/products/{id}');
    expect(el.textContent).toContain('CONFIRM DELETE');
    expect(el.textContent).toContain('p-123');
    expect(el.textContent).toContain('Vintage Camera');
  });

  it('should execute DELETE via ApiExecutorService and emit deleted event on 204 No Content success', () => {
    const successResult: ApiExecutionResult = {
      status: 204,
      statusText: 'No Content',
      isSuccess: true,
      data: null,
      durationMs: 45
    };
    mockExecutor.execute.mockReturnValue(of(successResult));

    const deletedSpy = vi.spyOn(component.deleted, 'emit');
    const closeSpy = vi.spyOn(component.close, 'emit');

    fixture.detectChanges();
    component.executeDelete();

    expect(mockExecutor.execute).toHaveBeenCalledWith(
      '',
      sampleDeleteOp,
      { path: { id: 'p-123' } }
    );
    expect(deletedSpy).toHaveBeenCalledWith(successResult);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should accept other 2xx status codes (200, 202) as successful deletion', () => {
    const success200Result: ApiExecutionResult = {
      status: 200,
      statusText: 'OK',
      isSuccess: true,
      data: { message: 'Deleted successfully' },
      durationMs: 30
    };
    mockExecutor.execute.mockReturnValue(of(success200Result));

    const deletedSpy = vi.spyOn(component.deleted, 'emit');
    fixture.detectChanges();
    component.executeDelete();

    expect(deletedSpy).toHaveBeenCalledWith(success200Result);
  });

  it('should display error message and not close modal when DELETE execution fails', () => {
    const failResult: ApiExecutionResult = {
      status: 404,
      statusText: 'Not Found',
      isSuccess: false,
      data: { error: 'Record not found' },
      durationMs: 25,
      error: {
        message: 'Product with ID p-123 does not exist',
        status: 404
      }
    };
    mockExecutor.execute.mockReturnValue(of(failResult));

    const deletedSpy = vi.spyOn(component.deleted, 'emit');
    const closeSpy = vi.spyOn(component.close, 'emit');

    fixture.detectChanges();
    component.executeDelete();
    fixture.detectChanges();

    expect(deletedSpy).not.toHaveBeenCalled();
    expect(closeSpy).not.toHaveBeenCalled();
    expect(component.executionResult()?.isSuccess).toBe(false);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('HTTP 404');
    expect(el.textContent).toContain('Product with ID p-123 does not exist');
  });

  it('should render input fields for missingParams and allow user to specify them before deleting', () => {
    component.missingParams = [
      {
        name: 'tenantId',
        location: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ];
    component.operation = {
      ...sampleDeleteOp,
      parameters: [
        ...sampleDeleteOp.parameters,
        {
          name: 'tenantId',
          location: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ]
    };
    fixture.detectChanges();

    expect(component.hasMissingParams()).toBe(true);
    expect(component.areAllRequiredParamsProvided()).toBe(false);

    component.onParamChange('tenantId', 'acme-corp');
    fixture.detectChanges();

    expect(component.areAllRequiredParamsProvided()).toBe(true);
    expect(component.userParamValues()['tenantId']).toBe('acme-corp');
  });

  it('should navigate to full operation workbench when onOpenFullOperation is called', () => {
    fixture.detectChanges();
    component.onOpenFullOperation();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/operation', 'deleteProduct']);
  });
});
