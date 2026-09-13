import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CustomActionDialogComponent } from './custom-action-dialog.component';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiExecutorService } from '../../core/services/api-executor.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ApiOperation } from '../../core/models/api-operation.model';
import { ResolvedCustomAction } from '../../core/models/resolved-resource-page.model';
import { ApiExecutionResult } from '../../core/models/api-execution-result.model';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('CustomActionDialogComponent', () => {
  let component: CustomActionDialogComponent;
  let fixture: ComponentFixture<CustomActionDialogComponent>;
  let mockExecutor: { execute: ReturnType<typeof vi.fn> };
  let mockSession: {
    baseUrl: ReturnType<typeof signal>;
    uiConfiguration: ReturnType<typeof signal>;
  };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  const sampleOperationWithBody: ApiOperation = {
    id: 'update_order_status',
    operationId: 'updateOrderStatus',
    method: 'PATCH',
    path: '/orders/{id}/status',
    type: 'action',
    summary: 'Editar Status do Pedido',
    description: 'Atualiza o status de um pedido existente',
    tags: ['Orders'],
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
          status: {
            type: 'string',
            title: 'Novo Status',
            enum: ['pending', 'processing', 'completed', 'cancelled']
          },
          reason: {
            type: 'string',
            title: 'Motivo da alteração'
          }
        },
        requiredProperties: ['status']
      }
    },
    responses: []
  };

  const sampleOperationNoBody: ApiOperation = {
    id: 'cancel_order',
    operationId: 'cancelOrder',
    method: 'POST',
    path: '/orders/{id}/cancel',
    type: 'action',
    summary: 'Cancelar Pedido',
    description: 'Cancela um pedido em andamento',
    tags: ['Orders'],
    parameters: [
      {
        name: 'id',
        location: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ],
    responses: []
  };

  const sampleDestructiveAction: ResolvedCustomAction = {
    id: 'cancel_order',
    label: 'Cancelar Pedido',
    operation: sampleOperationNoBody,
    danger: true,
    style: 'danger',
    confirmation: {
      title: 'Deseja realmente cancelar este pedido?',
      message: 'Esta ação não poderá ser desfeita.',
      confirmText: 'Sim, Cancelar',
      cancelText: 'Voltar'
    },
    isExplicit: true
  };

  const sampleStatusAction: ResolvedCustomAction = {
    id: 'update_order_status',
    label: 'Editar Status',
    operation: sampleOperationWithBody,
    inputMode: 'dialog',
    isExplicit: true
  };

  beforeEach(async () => {
    mockExecutor = { execute: vi.fn() };
    mockSession = {
      baseUrl: signal('https://api.example.com'),
      uiConfiguration: signal({ fields: {} })
    };
    mockRouter = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CustomActionDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ApiSessionService, useValue: mockSession },
        { provide: ApiExecutorService, useValue: mockExecutor },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();
  });

  function createComponentWithAction(
    action: ResolvedCustomAction,
    record: unknown = { id: 'ORD-101', status: 'pending', customer: 'Alice' },
    initialParams: Record<string, string> = { id: 'ORD-101' },
    missingParams: any[] = []
  ) {
    fixture = TestBed.createComponent(CustomActionDialogComponent);
    component = fixture.componentInstance;
    component.action = action;
    component.record = record;
    component.initialParams = initialParams;
    component.missingParams = missingParams;
    fixture.detectChanges();
  }

  it('deve criar o componente e inicializar com os parâmetros corretos', () => {
    createComponentWithAction(sampleStatusAction);
    expect(component).toBeTruthy();
    expect(component.operation().path).toBe('/orders/{id}/status');
    expect(component.hasRequestBody()).toBe(true);
    expect(component.userParamValues()['id']).toBe('ORD-101');
  });

  it('1. deve suportar alteração de status com DynamicFormComponent e enviar body na execução', () => {
    const successResult: ApiExecutionResult = {
      status: 200,
      statusText: 'OK',
      duration: 120,
      durationMs: 120,
      isSuccess: true,
      data: { id: 'ORD-101', status: 'completed' }
    };
    mockExecutor.execute.mockReturnValue(of(successResult));

    createComponentWithAction(sampleStatusAction);

    // DynamicFormComponent renders
    expect(component.dynamicFormRef).toBeDefined();

    // Fill form value
    if (component.dynamicFormRef?.form) {
      component.dynamicFormRef.form.patchValue({ status: 'completed', reason: 'Entrega finalizada' });
    }
    component.onDynamicFormChange({ status: 'completed', reason: 'Entrega finalizada' });

    const executedSpy = vi.spyOn(component.executed, 'emit');
    const closeSpy = vi.spyOn(component.close, 'emit');

    component.executeAction();

    expect(mockExecutor.execute).toHaveBeenCalledWith(
      'https://api.example.com',
      sampleOperationWithBody,
      expect.objectContaining({
        path: { id: 'ORD-101' },
        body: expect.objectContaining({ status: 'completed' })
      })
    );
    expect(executedSpy).toHaveBeenCalledWith(successResult);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('2. deve exibir diálogo de confirmação para ação sem body', () => {
    const successResult: ApiExecutionResult = {
      status: 204,
      statusText: 'No Content',
      duration: 90,
      durationMs: 90,
      isSuccess: true,
      data: null
    };
    mockExecutor.execute.mockReturnValue(of(successResult));

    const nonDestructiveNoBody: ResolvedCustomAction = {
      id: 'ship_order',
      label: 'Enviar Pedido',
      operation: sampleOperationNoBody,
      danger: false,
      isExplicit: true
    };

    createComponentWithAction(nonDestructiveNoBody);

    expect(component.hasRequestBody()).toBe(false);
    const nativeEl: HTMLElement = fixture.nativeElement;
    expect(nativeEl.querySelector('.confirmation-section')).toBeTruthy();

    component.executeAction();

    expect(mockExecutor.execute).toHaveBeenCalledWith(
      'https://api.example.com',
      sampleOperationNoBody,
      { path: { id: 'ORD-101' } }
    );
  });

  it('3. deve exibir avisos visuais explícitos para ações destrutivas (sem depender apenas de cor)', () => {
    createComponentWithAction(sampleDestructiveAction);

    expect(component.isDestructive()).toBe(true);
    const nativeEl: HTMLElement = fixture.nativeElement;

    // Destructive warning card with warning icon and explicit alert
    const warningCard = nativeEl.querySelector('.destructive-warning-card');
    expect(warningCard).toBeTruthy();
    expect(warningCard?.textContent).toContain('Atenção: Ação com impacto irreversível ou destrutivo');

    // Confirm button has danger class and custom confirmation text
    const submitBtn = nativeEl.querySelector('.btn-submit');
    expect(submitBtn?.classList).toContain('btn-danger');
    expect(submitBtn?.textContent).toContain('Sim, Cancelar');
  });

  it('4. deve renderizar campos de input quando houver parâmetros de rota ausentes e bloquear envio até preenchimento', () => {
    const missing = [
      {
        name: 'id',
        location: 'path' as const,
        required: true,
        schema: { type: 'string' as const },
        description: 'ID do Pedido'
      }
    ];

    createComponentWithAction(sampleDestructiveAction, null, {}, missing);

    expect(component.areAllRequiredParamsProvided()).toBe(false);
    const nativeEl: HTMLElement = fixture.nativeElement;
    const missingSection = nativeEl.querySelector('.missing-params-section');
    expect(missingSection).toBeTruthy();

    // Provide missing parameter value
    component.onParamChange('id', 'ORD-999');
    expect(component.areAllRequiredParamsProvided()).toBe(true);
  });

  it('5. deve exibir banner de erro detalhado em caso de falha HTTP', () => {
    const failResult: ApiExecutionResult = {
      status: 409,
      statusText: 'Conflict',
      duration: 150,
      durationMs: 150,
      isSuccess: false,
      error: {
        message: 'O pedido não pode ser cancelado no status atual.',
        status: 409,
        details: { code: 'ORDER_LOCKED', currentStatus: 'in_transit' }
      }
    };
    mockExecutor.execute.mockReturnValue(of(failResult));

    createComponentWithAction(sampleDestructiveAction);
    component.executeAction();
    fixture.detectChanges();

    expect(component.executionResult()?.isSuccess).toBe(false);
    const nativeEl: HTMLElement = fixture.nativeElement;
    const errorBanner = nativeEl.querySelector('.error-banner');
    expect(errorBanner).toBeTruthy();
    expect(errorBanner?.textContent).toContain('409');
    expect(errorBanner?.textContent).toContain('O pedido não pode ser cancelado');
  });

  it('6. deve permitir navegação para a operação completa no API Explorer (Workbench)', () => {
    createComponentWithAction(sampleStatusAction);

    const closeSpy = vi.spyOn(component.close, 'emit');
    component.onOpenFullOperation();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/operation', 'updateOrderStatus']);
    expect(closeSpy).toHaveBeenCalled();
  });
});
