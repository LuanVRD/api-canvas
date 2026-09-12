import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PageWizardFormComponent } from './page-wizard-form.component';
import { PageDraftService } from '../../services/page-draft.service';
import { UiConfigurationValidatorService } from '../../../../core/services/ui-configuration-validator.service';
import { ResourceOperationMatcherService } from '../../../../core/services/resource-operation-matcher.service';
import { TableSchemaService } from '../../../../dynamic-ui/dynamic-table/table-schema.service';
import { of, throwError } from 'rxjs';
import { ApiDefinition } from '../../../../core/models/api-definition.model';
import { UiConfiguration } from '../../../../core/models/ui-configuration.model';
import { ApiSessionService } from '../../../../core/services/api-session.service';
import { ApiExecutorService } from '../../../../core/services/api-executor.service';
import { ApiExecutionResult } from '../../../../core/models/api-execution-result.model';


describe('PageWizardFormComponent', () => {
  let component: PageWizardFormComponent;
  let fixture: ComponentFixture<PageWizardFormComponent>;
  let draftService: PageDraftService;
  let sessionService: ApiSessionService;
  let router: Router;

  const mockApiDefinition: ApiDefinition = {
    title: 'Loja API',
    version: '1.0.0',
    baseUrl: 'https://api.exemplo.com',
    resources: [
      {
        id: 'orders',
        name: 'orders',
        label: 'Pedidos',
        description: 'Operações com pedidos de venda',
        operations: [
          {
            id: 'listOrders',
            operationId: 'listOrders',
            method: 'GET',
            path: '/orders',
            summary: 'Listar pedidos',
            type: 'list',
            parameters: [{ name: 'status', location: 'query', required: false, schema: { type: 'string' } }],
            responses: [
              {
                statusCode: '200',
                description: 'Lista de pedidos',
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    status: { type: 'string', enum: ['pending', 'completed'] },
                    total: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            ]
          },
          {
            id: 'getOrderById',
            operationId: 'getOrderById',
            method: 'GET',
            path: '/orders/{id}',
            summary: 'Buscar pedido por ID',
            type: 'details',
            parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }],
            responses: []
          },
          {
            id: 'createOrder',
            operationId: 'createOrder',
            method: 'POST',
            path: '/orders',
            summary: 'Criar novo pedido',
            type: 'create',
            parameters: [],
            responses: []
          },
          {
            id: 'replaceOrder',
            operationId: 'replaceOrder',
            method: 'PUT',
            path: '/orders/{id}',
            summary: 'Substituir pedido',
            type: 'update',
            parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }],
            responses: []
          },
          {
            id: 'patchOrderStatus',
            operationId: 'patchOrderStatus',
            method: 'PATCH',
            path: '/orders/{id}',
            summary: 'Atualizar status do pedido',
            type: 'update',
            parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }],
            responses: []
          },
          {
            id: 'deleteOrder',
            operationId: 'deleteOrder',
            method: 'DELETE',
            path: '/orders/{id}',
            summary: 'Excluir pedido',
            type: 'delete',
            parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }],
            responses: []
          },
          {
            id: 'cancelOrderRpc',
            operationId: 'cancelOrderRpc',
            method: 'POST',
            path: '/orders/{id}/cancel',
            summary: 'Cancelar pedido existente',
            type: 'action',
            parameters: [
              { name: 'id', location: 'path', required: true, schema: { type: 'string' } },
              { name: 'reasonId', location: 'path', required: true, schema: { type: 'string' } }
            ],
            responses: []
          }
        ]
      },
      {
        id: 'customers',
        name: 'customers',
        label: 'Clientes',
        description: 'Gestão de base de clientes',
        operations: [
          {
            id: 'listCustomers',
            operationId: 'listCustomers',
            method: 'GET',
            path: '/customers',
            summary: 'Listar clientes',
            type: 'list',
            parameters: [],
            responses: [
              {
                statusCode: '200',
                description: 'Lista de clientes',
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' }
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  };

  const initialPublishedConfig: UiConfiguration = {
    version: 1,
    pages: {
      'orders-page': {
        id: 'orders-page',
        resourceId: 'orders',
        title: 'Pedidos',
        slug: 'pedidos',
        icon: 'shopping_cart',
        order: 1,
        isDefault: true,
        hidden: false,
        operations: {
          list: 'listOrders',
          create: 'createOrder',
          details: 'getOrderById',
          update: 'replaceOrder',
          delete: 'deleteOrder'
        }
      },
      'customers-page': {
        id: 'customers-page',
        resourceId: 'customers',
        title: 'Clientes',
        slug: 'clientes',
        icon: 'people',
        order: 2,
        isDefault: false,
        hidden: false
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageWizardFormComponent],
      providers: [
        PageDraftService,
        UiConfigurationValidatorService,
        ResourceOperationMatcherService,
        TableSchemaService
      ]
    }).compileComponents();

    sessionService = TestBed.inject(ApiSessionService);
    sessionService.setSession(mockApiDefinition);

    draftService = TestBed.inject(PageDraftService);
    draftService.initDraft(initialPublishedConfig, mockApiDefinition, 'edit', 'orders-page');

    fixture = TestBed.createComponent(PageWizardFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });


  it('1. should create and populate form from active editing page', () => {
    expect(component).toBeTruthy();
    expect(component.form.get('title')?.value).toBe('Pedidos');
    expect(component.form.get('slug')?.value).toBe('pedidos');
    expect(component.form.get('icon')?.value).toBe('shopping_cart');
    expect(component.form.get('order')?.value).toBe(1);
    expect(component.form.get('isDefault')?.value).toBe(true);
    expect(component.form.get('hidden')?.value).toBe(false);
    expect(component.form.get('operationList')?.value).toBe('listOrders');
    expect(component.form.get('operationCreate')?.value).toBe('createOrder');
    expect(component.form.get('operationDetails')?.value).toBe('getOrderById');
    expect(component.form.get('operationUpdate')?.value).toBe('replaceOrder');
    expect(component.form.get('operationDelete')?.value).toBe('deleteOrder');
  });

  it('2. should suggest defaults when selecting a new resource', () => {
    // Switch to create mode
    draftService.startCreatePage('customers');
    fixture.detectChanges();

    component.form.get('resourceId')?.setValue('customers');
    component.onResourceChanged();
    fixture.detectChanges();

    expect(component.form.get('title')?.value).toBe('Clientes');
    expect(component.form.get('slug')?.value).toBe('clientes');
    expect(component.form.get('icon')?.value).toBe('people');
    expect(component.form.get('description')?.value).toContain('clientes');
    expect(component.form.get('operationList')?.value).toBe('listCustomers');
  });

  it('3. should validate slug pattern and required errors', () => {
    const slugControl = component.form.get('slug');

    slugControl?.setValue('');
    expect(slugControl?.errors?.['required']).toBe(true);

    slugControl?.setValue('SLUG INVALIDO COM ESPACO!');
    expect(slugControl?.errors?.['pattern']).toBe(true);

    slugControl?.setValue('slug-valido-123');
    expect(slugControl?.errors).toBeNull();
  });

  it('4. should detect slug conflict in real time when editing page with duplicate slug', () => {
    const slugControl = component.form.get('slug');

    // orders-page editing, typing 'clientes' which belongs to customers-page
    slugControl?.setValue('clientes');
    component.onSlugInput();
    fixture.detectChanges();

    expect(slugControl?.errors?.['slugConflict']).toBeDefined();
    expect(slugControl?.errors?.['slugConflict']?.conflictingTitle).toBe('Clientes');

    // Typing own slug should not conflict
    slugControl?.setValue('pedidos');
    component.onSlugInput();
    fixture.detectChanges();
    expect(slugControl?.errors).toBeNull();
  });

  it('5. should update sidebar position and reorder pages through draft service', () => {
    expect(component.availablePositions()).toEqual([1, 2]);

    component.form.get('order')?.setValue(2);
    component.onOrderChanged();
    fixture.detectChanges();

    const pages = draftService.draftPages();
    expect(pages[0].id).toBe('customers-page');
    expect(pages[1].id).toBe('orders-page');
  });

  it('6. should render navigation item preview with title, route, icon, and badges', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const previewTitle = el.querySelector('.preview-page-title')?.textContent;
    expect(previewTitle).toContain('Pedidos');

    const previewRoute = el.querySelector('.preview-route-path')?.textContent;
    expect(previewRoute).toContain('/dashboard/pedidos');

    const defaultBadge = el.querySelector('.badge-default');
    expect(defaultBadge).toBeTruthy();

    // Toggle hidden and verify badge in preview
    component.form.get('hidden')?.setValue(true);
    fixture.detectChanges();

    const hiddenBadge = el.querySelector('.badge-hidden');
    expect(hiddenBadge).toBeTruthy();
    expect(el.querySelector('.nav-preview-row')?.classList.contains('is-hidden-item')).toBe(true);
  });

  it('7. should display compatible operations and visually mark auto-suggestions in Step 2', () => {
    component.goToStep(2);
    fixture.detectChanges();

    expect(component.compatibleListOperations().map((o) => o.operationId)).toContain('listOrders');
    expect(component.compatibleCreateOperations().map((o) => o.operationId)).toContain('createOrder');
    expect(component.compatibleDetailsOperations().map((o) => o.operationId)).toContain('getOrderById');
    expect(component.compatibleUpdateOperations().map((o) => o.operationId)).toContain('replaceOrder');
    expect(component.compatibleUpdateOperations().map((o) => o.operationId)).toContain('patchOrderStatus');
    expect(component.compatibleDeleteOperations().map((o) => o.operationId)).toContain('deleteOrder');

    // Auto-suggestion detection
    expect(component.isSuggested('list', 'listOrders')).toBe(true);
    expect(component.isSuggested('create', 'createOrder')).toBe(true);
    expect(component.isSuggested('update', 'replaceOrder')).toBe(true);
    expect(component.isSuggested('update', 'patchOrderStatus')).toBe(false);

    const el = fixture.nativeElement as HTMLElement;
    const suggestedBadges = el.querySelectorAll('.badge-suggested');
    expect(suggestedBadges.length).toBeGreaterThan(0);
  });

  it('8. should allow switching between multiple PUT and PATCH operations in Step 2', () => {
    component.goToStep(2);
    fixture.detectChanges();

    // Switch update operation to PATCH
    component.form.get('operationUpdate')?.setValue('patchOrderStatus');
    component.onOperationChanged('update');
    fixture.detectChanges();

    const page = draftService.draftPages().find((p) => p.id === 'orders-page');
    expect(page?.operations?.update).toBe('patchOrderStatus');
    expect(component.isSuggested('update', 'patchOrderStatus')).toBe(false);
  });

  it('9. should display operation metadata (path, summary, parameters) and inspect in Explorer shortcut', () => {
    component.goToStep(2);
    fixture.detectChanges();

    const opDetails = component.getOperationDetails('listOrders');
    expect(opDetails).toBeDefined();
    expect(opDetails?.path).toBe('/orders');
    expect(opDetails?.summary).toBe('Listar pedidos');
    expect(opDetails?.parameters.length).toBe(1);

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true as any);
    component.openInExplorer('listOrders');
    expect(navigateSpy).toHaveBeenCalledWith(['/operation', 'listOrders']);
  });

  it('10. should allow adding, configuring, reordering and deleting custom actions in Step 5', () => {
    component.goToStep(5);
    fixture.detectChanges();

    expect(component.customActionsArray.length).toBe(0);

    // 1. Add custom action
    component.addCustomAction();
    fixture.detectChanges();

    expect(component.customActionsArray.length).toBe(1);
    const actionGroup = component.customActionsArray.at(0);
    actionGroup.get('operationId')?.setValue('cancelOrderRpc');
    component.onCustomActionOpSelected(0);
    fixture.detectChanges();

    expect(actionGroup.get('label')?.value).toContain('Cancelar');
    expect(actionGroup.get('icon')?.value).toBe('cancel');
    expect(actionGroup.get('style')?.value).toBe('danger');
    expect(actionGroup.get('danger')?.value).toBe(true);

    // 2. Add second custom action
    component.addCustomAction();
    fixture.detectChanges();
    expect(component.customActionsArray.length).toBe(2);

    // 3. Move action up/down
    component.moveCustomAction(1, 'up');
    fixture.detectChanges();

    // 4. Remove action
    component.removeCustomAction(0);
    fixture.detectChanges();
    expect(component.customActionsArray.length).toBe(1);
  });

  it('11. should display technical warning when custom action has unresolvable path parameters', () => {
    component.goToStep(5);
    component.addCustomAction();
    fixture.detectChanges();

    const actionGroup = component.customActionsArray.at(0);
    actionGroup.get('operationId')?.setValue('cancelOrderRpc');
    fixture.detectChanges();

    const op = component.getOperationDetails('cancelOrderRpc');
    expect(op).toBeDefined();

    // Columns are ['id', 'status', 'total', 'createdAt'] -> 'reasonId' is missing
    const check = component.checkParamInference(op!);
    expect(check.canInfer).toBe(false);
    expect(check.missingParams.map((p) => p.name)).toContain('reasonId');
    expect(component.formatMissingParams(check.missingParams)).toBe('reasonId');
  });

  it('12. should allow adding, toggling visibility, reordering and removing columns in Step 4', () => {
    component.goToStep(4);
    component.restoreSchemaColumns();
    fixture.detectChanges();

    // Initial columns inferred from OpenAPI schema via TableSchemaService
    const initialCount = component.columnsArray.length;
    expect(initialCount).toBeGreaterThan(0);

    // 1. Add new custom column
    component.addColumn();
    fixture.detectChanges();
    expect(component.columnsArray.length).toBe(initialCount + 1);


    const newColIndex = component.columnsArray.length - 1;
    const newCol = component.columnsArray.at(newColIndex);
    newCol.get('field')?.setValue('customer_note');
    newCol.get('label')?.setValue('Observações do Cliente');
    expect(newCol.get('hidden')?.value).toBe(false);

    // 2. Toggle column visibility (hidden)
    component.toggleColumnHidden(newColIndex);
    fixture.detectChanges();
    expect(newCol.get('hidden')?.value).toBe(true);

    component.toggleColumnHidden(newColIndex);
    fixture.detectChanges();
    expect(newCol.get('hidden')?.value).toBe(false);

    // 3. Move column up
    component.moveColumn(newColIndex, 'up');
    fixture.detectChanges();
    expect(component.columnsArray.at(newColIndex - 1).get('field')?.value).toBe('customer_note');

    // 4. Remove column
    component.removeColumn(newColIndex - 1);
    fixture.detectChanges();
    expect(component.columnsArray.length).toBe(initialCount);
  });

  it('13. should allow adding, reordering and removing metric cards in Step 3', () => {
    component.goToStep(3);
    fixture.detectChanges();

    const initialMetrics = component.metricsArray.length;

    // 1. Add metric
    component.addMetric();
    fixture.detectChanges();
    expect(component.metricsArray.length).toBe(initialMetrics + 1);

    const addedMetric = component.metricsArray.at(component.metricsArray.length - 1);
    addedMetric.get('label')?.setValue('Faturamento Total');
    addedMetric.get('type')?.setValue('sum_field');
    addedMetric.get('field')?.setValue('total');
    addedMetric.get('format')?.setValue('currency');
    addedMetric.get('colorScheme')?.setValue('success');

    // 2. Add second metric and reorder
    component.addMetric();
    fixture.detectChanges();
    const lastIndex = component.metricsArray.length - 1;
    component.metricsArray.at(lastIndex).get('label')?.setValue('Pedidos Concluídos');

    component.moveMetric(lastIndex, 'up');
    fixture.detectChanges();
    expect(component.metricsArray.at(lastIndex - 1).get('label')?.value).toBe('Pedidos Concluídos');

    // 3. Remove metric
    component.removeMetric(lastIndex - 1);
    fixture.detectChanges();
    expect(component.metricsArray.length).toBe(initialMetrics + 1);
  });

  it('14. should configure enveloped response paths (dataPath, totalPath) and query parameters in Step 4 and 5', () => {
    component.goToStep(4);
    fixture.detectChanges();

    // Configure dataPath and totalPath
    component.form.get('dataPath')?.setValue('data.items');
    component.form.get('totalPath')?.setValue('meta.totalCount');
    component.form.get('pageParam')?.setValue('_page');
    component.form.get('pageSizeParam')?.setValue('_limit');
    component.form.get('sortParam')?.setValue('_sort');
    component.form.get('orderParam')?.setValue('_order');
    component.form.get('sortFormat')?.setValue('separate');
    component.markDirty();
    fixture.detectChanges();

    const page = draftService.draftPages().find((p) => p.id === 'orders-page');
    expect(page?.dataPath).toBe('data.items');
    expect(page?.totalPath).toBe('meta.totalCount');
    expect(page?.table?.dataPath).toBe('data.items');
    expect(page?.table?.totalPath).toBe('meta.totalCount');
    expect(page?.table?.sortParam).toBe('_sort');
    expect(page?.table?.orderParam).toBe('_order');
    expect(page?.table?.pagination?.pageParam).toBe('_page');
    expect(page?.table?.pagination?.pageSizeParam).toBe('_limit');

    // Step 5 Query parameters
    component.goToStep(5);
    fixture.detectChanges();

    component.form.get('searchParam')?.setValue('q');
    component.form.get('statusParam')?.setValue('status');
    component.markDirty();
    fixture.detectChanges();

    const updatedPage = draftService.draftPages().find((p) => p.id === 'orders-page');
    expect(updatedPage?.filters?.searchParam).toBe('q');
    expect(updatedPage?.filters?.statusParam).toBe('status');
  });

  it('15. should toggle search fields inclusion and reflect in draft', () => {
    component.goToStep(5);
    fixture.detectChanges();

    expect(component.isSearchFieldSelected('id')).toBe(false);

    component.toggleSearchField('id');
    fixture.detectChanges();
    expect(component.isSearchFieldSelected('id')).toBe(true);

    component.toggleSearchField('id');
    fixture.detectChanges();
    expect(component.isSearchFieldSelected('id')).toBe(false);
  });

  it('16. should navigate to Step 6 Preview, render ResourcePageContentComponent and remain idle in safe mode', () => {
    component.goToStep(6);
    fixture.detectChanges();

    expect(component.currentStep()).toBe(6);
    expect(component.previewFacade.isIdle()).toBe(true);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.preview-step-section')).toBeTruthy();
    expect(el.querySelector('app-resource-page-content')).toBeTruthy();
    expect(el.querySelector('.preview-safe-idle-notice')).toBeTruthy();
    expect(el.textContent).toContain('Modo Seguro: Chamada à API sob demanda');
  });

  it('17. should execute real API request and render live items when onExecutePreviewList is clicked', async () => {
    const apiExecutor = TestBed.inject(ApiExecutorService);
    const mockResult: ApiExecutionResult = {
      isSuccess: true,
      status: 200,
      statusText: 'OK',
      durationMs: 42,
      data: [
        { id: 'ord-101', status: 'completed', total: 250, createdAt: '2026-09-12T10:00:00Z' },
        { id: 'ord-102', status: 'pending', total: 120, createdAt: '2026-09-12T10:30:00Z' }
      ]
    };
    vi.spyOn(apiExecutor, 'execute').mockReturnValue(of(mockResult));

    component.goToStep(6);
    fixture.detectChanges();

    component.onExecutePreviewList();
    await new Promise((r) => setTimeout(r, 10));
    fixture.detectChanges();

    expect(component.previewFacade.isSuccess()).toBe(true);
    expect(component.previewFacade.items().length).toBe(2);
    expect(component.previewFacade.totalCount()).toBe(2);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('ord-101');
    expect(el.textContent).toContain('ord-102');
  });

  it('18. should handle request error in preview gracefully without crashing', async () => {
    const apiExecutor = TestBed.inject(ApiExecutorService);
    const mockErrorResult: ApiExecutionResult = {
      isSuccess: false,
      status: 500,
      statusText: 'Internal Server Error',
      durationMs: 95,
      error: {
        message: 'Falha ao conectar com o backend',
        category: 'HTTP_ERROR',
        status: 500
      }
    };
    vi.spyOn(apiExecutor, 'execute').mockReturnValue(of(mockErrorResult));

    component.goToStep(6);
    fixture.detectChanges();

    component.onExecutePreviewList();
    await new Promise((r) => setTimeout(r, 10));
    fixture.detectChanges();

    expect(component.previewFacade.isError()).toBe(true);
    expect(component.previewFacade.error()?.message).toContain('Falha ao conectar com o backend');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.preview-live-text')?.textContent).toContain('Falha na Consulta');
  });

  it('19. should toggle auto-load in preview and trigger live fetch', async () => {
    const apiExecutor = TestBed.inject(ApiExecutorService);
    const mockResult: ApiExecutionResult = {
      isSuccess: true,
      status: 200,
      statusText: 'OK',
      durationMs: 15,
      data: [{ id: 'ord-999', status: 'pending', total: 50 }]
    };
    const execSpy = vi.spyOn(apiExecutor, 'execute').mockReturnValue(of(mockResult));

    component.goToStep(6);
    fixture.detectChanges();
    expect(component.previewAutoLoad()).toBe(false);

    // Toggle auto-load on
    const mockEvent = { target: { checked: true } } as unknown as Event;
    component.togglePreviewAutoLoad(mockEvent);
    await new Promise((r) => setTimeout(r, 10));
    fixture.detectChanges();

    expect(component.previewAutoLoad()).toBe(true);
    expect(execSpy).toHaveBeenCalled();
    expect(component.previewFacade.isSuccess()).toBe(true);
  });

  it('20. should display validation ready card in Step 6 when configuration is valid', () => {
    component.goToStep(6);
    fixture.detectChanges();

    expect(component.draftService.hasBlockingErrors()).toBe(false);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.preview-validation-card.is-ready')).toBeTruthy();
    expect(el.textContent).toContain('Página pronta para publicação');
  });

  it('21. should display blocking validation errors in Step 6 if slug is invalid', () => {
    component.form.get('slug')?.setValue('SLUG COM ESPACO');
    component.markDirty();
    component.goToStep(6);
    fixture.detectChanges();

    expect(component.draftService.hasBlockingErrors()).toBe(true);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.preview-validation-card.has-blocking')).toBeTruthy();
    expect(el.textContent).toContain('Existem erros impeditivos para publicação');
  });
});

