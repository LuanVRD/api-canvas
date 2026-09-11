import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PageWizardFormComponent } from './page-wizard-form.component';
import { PageDraftService } from '../../services/page-draft.service';
import { UiConfigurationValidatorService } from '../../../../core/services/ui-configuration-validator.service';
import { ResourceOperationMatcherService } from '../../../../core/services/resource-operation-matcher.service';
import { ApiDefinition } from '../../../../core/models/api-definition.model';
import { UiConfiguration } from '../../../../core/models/ui-configuration.model';

describe('PageWizardFormComponent', () => {
  let component: PageWizardFormComponent;
  let fixture: ComponentFixture<PageWizardFormComponent>;
  let draftService: PageDraftService;
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
        ResourceOperationMatcherService
      ]
    }).compileComponents();

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
});
