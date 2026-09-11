import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardPage } from './dashboard.page';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiExecutorService } from '../../core/services/api-executor.service';
import { ApiDefinition } from '../../core/models/api-definition.model';
import { UiConfiguration } from '../../core/models/ui-configuration.model';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BehaviorSubject, of } from 'rxjs';
import { ResourcePageFacadeService } from './services/resource-page-facade.service';

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let sessionService: ApiSessionService;
  let apiExecutor: ApiExecutorService;
  let router: Router;
  let paramMapSubject: BehaviorSubject<any>;

  const mockApiDefinition: ApiDefinition = {
    title: 'OrderFlow API',
    version: '1.0.0',
    baseUrl: 'https://api.orders.example.com',
    resources: [
      {
        id: 'orders',
        name: 'Orders',
        label: 'Pedidos',
        operations: [
          {
            id: 'listOrders',
            operationId: 'listOrders',
            method: 'GET',
            path: '/orders',
            type: 'list',
            parameters: [],
            responses: []
          },
          {
            id: 'createOrder',
            operationId: 'createOrder',
            method: 'POST',
            path: '/orders',
            type: 'create',
            parameters: [],
            responses: []
          },
          {
            id: 'getOrder',
            operationId: 'getOrder',
            method: 'GET',
            path: '/orders/{orderId}',
            type: 'details',
            parameters: [
              {
                name: 'orderId',
                location: 'path',
                required: true,
                schema: { type: 'string' }
              }
            ],
            responses: []
          },
          {
            id: 'updateOrder',
            operationId: 'updateOrder',
            method: 'PUT',
            path: '/orders/{orderId}',
            type: 'update',
            parameters: [
              {
                name: 'orderId',
                location: 'path',
                required: true,
                schema: { type: 'string' }
              }
            ],
            responses: []
          },
          {
            id: 'deleteOrder',
            operationId: 'deleteOrder',
            method: 'DELETE',
            path: '/orders/{orderId}',
            type: 'delete',
            parameters: [
              {
                name: 'orderId',
                location: 'path',
                required: true,
                schema: { type: 'string' }
              }
            ],
            responses: []
          }
        ]
      },
      {
        id: 'customers',
        name: 'Customers',
        label: 'Clientes',
        operations: [
          {
            id: 'listCustomers',
            operationId: 'listCustomers',
            method: 'GET',
            path: '/customers',
            type: 'list',
            parameters: [],
            responses: []
          }
        ]
      }
    ]
  };

  const mockUiConfig: UiConfiguration = {
    pages: {
      'orders-page': {
        id: 'orders-page',
        resourceId: 'orders',
        title: 'Pedidos CRUD',
        icon: 'receipt_long',
        slug: 'pedidos',
        order: 1,
        description: 'Painel operacional de pedidos'
      },
      'customers-page': {
        id: 'customers-page',
        resourceId: 'customers',
        title: 'Clientes',
        icon: 'people',
        slug: 'clientes',
        order: 2
      }
    }
  };

  const mockUiConfigWithDefault: UiConfiguration = {
    pages: {
      'orders-page': {
        id: 'orders-page',
        resourceId: 'orders',
        title: 'Pedidos CRUD',
        icon: 'receipt_long',
        slug: 'pedidos',
        order: 1,
        description: 'Painel operacional de pedidos'
      },
      'customers-page': {
        id: 'customers-page',
        resourceId: 'customers',
        title: 'Clientes',
        icon: 'people',
        slug: 'clientes',
        isDefault: true,
        order: 2
      }
    }
  };

  const mockUiConfigWithCustomLabels: UiConfiguration = {
    pages: {
      'orders-page': {
        id: 'orders-page',
        resourceId: 'orders',
        title: 'Pedidos CRUD',
        icon: 'receipt_long',
        slug: 'pedidos',
        order: 1,
        actions: {
          rowActions: {
            viewDetailsLabel: 'Inspecionar',
            viewDetailsTooltip: 'Inspecionar detalhes do pedido',
            editLabel: 'Modificar',
            editTooltip: 'Modificar pedido selecionado',
            deleteLabel: 'Remover',
            deleteTooltip: 'Remover pedido da base'
          }
        }
      }
    }
  };

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideAnimationsAsync(),
        ApiSessionService,
        {
          provide: ApiExecutorService,
          useValue: {
            execute: vi.fn().mockReturnValue(
              of({
                status: 200,
                statusText: 'OK',
                data: [{ id: 'ORD-1', orderId: 'ORD-1' }, { id: 'ORD-2', orderId: 'ORD-2' }],
                duration: 15,
                durationMs: 15,
                isSuccess: true,
                timestamp: Date.now()
              })
            )
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn()
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMapSubject.asObservable()
          }
        }
      ]
    }).compileComponents();

    sessionService = TestBed.inject(ApiSessionService);
    apiExecutor = TestBed.inject(ApiExecutorService);
    router = TestBed.inject(Router);
    sessionService.setSession(mockApiDefinition);

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
  });

  it('should create the component and instantiate scoped feature facade', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.facade).toBeInstanceOf(ResourcePageFacadeService);
  });

  it('should render API context bar with connected API title and version', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.api-title')?.textContent?.trim()).toBe('OrderFlow API');
    expect(el.querySelector('.api-version')?.textContent?.trim()).toBe('v1.0.0');
  });

  describe('Ausência de páginas (Unconfigured State)', () => {
    it('should display unconfigured empty state when no pages are configured without redirecting', () => {
      sessionService.setUiConfiguration(null);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const unconfigured = el.querySelector('.unconfigured-state');
      expect(unconfigured).toBeTruthy();
      expect(unconfigured?.textContent).toContain('Nenhuma página configurada');
      expect(el.querySelector('.btn-primary-action')).toBeTruthy();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to /workspace when clicking on Explorar Recursos in unconfigured state', () => {
      sessionService.setUiConfiguration(null);
      fixture.detectChanges();

      component.onOpenExplorer();
      expect(router.navigate).toHaveBeenCalledWith(['/workspace']);
    });

    it('should generate pages from connected resources and navigate when clicking Criar primeira página', () => {
      sessionService.setUiConfiguration(null);
      fixture.detectChanges();

      component.onCreatePage();
      expect(component.pages().length).toBeGreaterThan(0);
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard', 'orders']);
    });
  });

  describe('Redirecionamento de rota padrão (/dashboard)', () => {
    it('should redirect /dashboard to the page marked as isDefault', () => {
      sessionService.setUiConfiguration(mockUiConfigWithDefault);
      fixture.detectChanges();

      expect(router.navigate).toHaveBeenCalledWith(['/dashboard', 'clientes'], { replaceUrl: true });
    });

    it('should redirect /dashboard to the first visible page when no page is marked as default', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      fixture.detectChanges();

      expect(router.navigate).toHaveBeenCalledWith(['/dashboard', 'pedidos'], { replaceUrl: true });
    });
  });

  describe('Resolução de slug válido e Facade Integration', () => {
    it('should resolve pageSlug from route params and delegate loading to facade', async () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      expect(component.requestedSlug()).toBe('pedidos');
      expect(component.selectedPage()?.title).toBe('Pedidos CRUD');
      expect(component.isInvalidSlug()).toBe(false);

      const el: HTMLElement = fixture.nativeElement;
      const headerTitle = el.querySelector('.page-title');
      expect(headerTitle?.textContent?.trim()).toBe('Pedidos CRUD');

      // Wait for facade async loading
      await new Promise((resolve) => setTimeout(resolve, 20));
      fixture.detectChanges();

      expect(component.facade.status()).toBe('success');
      expect(component.facade.totalCount()).toBe(2);
      expect(el.querySelector('app-resource-page-content')).toBeTruthy();
      expect(el.querySelector('.table-meta-footer')?.textContent).toContain('Total carregado: 2 de 2');
    });

    it('should delegate refresh button click to facade.refresh()', async () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      const refreshSpy = vi.spyOn(component.facade, 'refresh');
      component.onRefresh();

      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should delegate retry button click to facade.retry()', async () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      const retrySpy = vi.spyOn(component.facade, 'retry');
      component.onRetry();

      expect(retrySpy).toHaveBeenCalled();
    });
  });

  describe('Tratamento de slug inválido/inexistente', () => {
    it('should display not found empty state when requested slug does not exist in configuration', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'rota-inexistente' }));
      fixture.detectChanges();

      expect(component.isInvalidSlug()).toBe(true);
      expect(component.selectedPage()).toBeNull();

      const el: HTMLElement = fixture.nativeElement;
      const notFoundSection = el.querySelector('.not-found-state');
      expect(notFoundSection).toBeTruthy();
      expect(notFoundSection?.textContent).toContain('Página não encontrada');
      expect(notFoundSection?.textContent).toContain('rota-inexistente');
    });

    it('should provide recovery action to navigate to default page from invalid slug state', () => {
      sessionService.setUiConfiguration(mockUiConfigWithDefault);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'slug-invalido' }));
      fixture.detectChanges();

      component.onGoToDefaultPage();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard', 'clientes']);
    });
  });

  describe('Navegação e Sidebar', () => {
    it('should navigate to /dashboard/:pageSlug when selecting a page from sidebar', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      fixture.detectChanges();

      const pageToSelect = component.pages()[1];
      component.onSelectPage(pageToSelect);

      expect(router.navigate).toHaveBeenCalledWith(['/dashboard', 'clientes']);
      expect(component.requestedSlug()).toBe('clientes');
    });

    it('should navigate to /connect when Change API is triggered', () => {
      component.onReconnect();
      expect(router.navigate).toHaveBeenCalledWith(['/connect']);
    });
  });

  describe('Criação de Registros (Create Record Dialog)', () => {
    it('should open create dialog when onCreateItem is called and resolved page has create operation', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      expect(component.isCreateDialogOpen()).toBe(false);
      component.onCreateItem();
      expect(component.isCreateDialogOpen()).toBe(true);

      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('app-create-record-dialog')).toBeTruthy();
    });

    it('should close create dialog and trigger facade refresh on create success', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      component.isCreateDialogOpen.set(true);
      const refreshSpy = vi.spyOn(component.facade, 'refresh');
      const mutationSpy = vi.spyOn(sessionService, 'notifyResourceMutation');

      component.onCreateSuccess({
        status: 201,
        statusText: 'Created',
        data: { id: 1, customer: 'Test' },
        duration: 10,
        durationMs: 10,
        isSuccess: true
      });

      expect(component.isCreateDialogOpen()).toBe(false);
      expect(mutationSpy).toHaveBeenCalledWith('orders', 'createOrder', expect.anything());
      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  describe('Ações por Linha e Dialogs CRUD', () => {
    it('should compute available row actions (view, edit, delete) with default labels and tooltips', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      const actions = component.pageRowActions();
      expect(actions.length).toBe(3);

      const viewAction = actions.find((a) => a.id === 'view');
      expect(viewAction).toBeTruthy();
      expect(viewAction?.label).toBe('Ver detalhes');
      expect(viewAction?.tooltip).toBe('Ver detalhes');
      expect(viewAction?.icon).toBe('visibility');

      const editAction = actions.find((a) => a.id === 'edit');
      expect(editAction).toBeTruthy();
      expect(editAction?.label).toBe('Editar');
      expect(editAction?.tooltip).toBe('Editar registro');
      expect(editAction?.icon).toBe('edit');

      const deleteAction = actions.find((a) => a.id === 'delete');
      expect(deleteAction).toBeTruthy();
      expect(deleteAction?.label).toBe('Excluir');
      expect(deleteAction?.tooltip).toBe('Excluir registro');
      expect(deleteAction?.icon).toBe('delete');
      expect(deleteAction?.danger).toBe(true);
    });

    it('should apply custom labels and tooltips from page configuration to row actions', () => {
      sessionService.setUiConfiguration(mockUiConfigWithCustomLabels);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      const actions = component.pageRowActions();
      expect(actions.find((a) => a.id === 'view')?.label).toBe('Inspecionar');
      expect(actions.find((a) => a.id === 'view')?.tooltip).toBe('Inspecionar detalhes do pedido');
      expect(actions.find((a) => a.id === 'edit')?.label).toBe('Modificar');
      expect(actions.find((a) => a.id === 'edit')?.tooltip).toBe('Modificar pedido selecionado');
      expect(actions.find((a) => a.id === 'delete')?.label).toBe('Remover');
      expect(actions.find((a) => a.id === 'delete')?.tooltip).toBe('Remover pedido da base');
    });

    it('should omit actions when operations are unavailable or disabled via configuration', () => {
      // 1. Clientes only has list operation, no details/update/delete
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'clientes' }));
      fixture.detectChanges();

      expect(component.pageRowActions()).toEqual([]);

      // 2. Explicitly disabling actions in configuration
      const disabledConfig: UiConfiguration = {
        pages: {
          'orders-page': {
            id: 'orders-page',
            resourceId: 'orders',
            title: 'Pedidos',
            slug: 'pedidos',
            actions: {
              rowActions: {
                viewDetails: false,
                edit: false,
                delete: false
              }
            }
          }
        }
      };

      sessionService.setUiConfiguration(disabledConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      expect(component.pageRowActions()).toEqual([]);
    });

    it('should open RecordDetailsDrawerComponent on row view and resolve path parameters without assuming id name', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      expect(component.activeDetailsInspection()).toBeNull();

      // Test with record having order_id and orderId variations
      const record = { order_id: 'ORD-789', status: 'Processando', total: 350 };
      component.onRowView(record);

      const active = component.activeDetailsInspection();
      expect(active).toBeTruthy();
      expect(active?.detailsOp.id).toBe('getOrder');
      expect(active?.params).toEqual({ orderId: 'ORD-789' });
      expect(active?.missingParams).toEqual([]);

      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('app-record-details-drawer')).toBeTruthy();

      // Close details inspection
      component.onCloseDetailsInspection();
      expect(component.activeDetailsInspection()).toBeNull();
      fixture.detectChanges();
      expect(el.querySelector('app-record-details-drawer')).toBeNull();
    });

    it('should open EditRecordDialogComponent on row edit and pass available operations', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      expect(component.activeEditRecord()).toBeNull();

      const record = { orderId: 'ORD-999', customer: 'Alice', status: 'Pendente' };
      component.onRowEdit(record);

      const active = component.activeEditRecord();
      expect(active).toBeTruthy();
      expect(active?.updateOp.id).toBe('updateOrder');
      expect(active?.availableOps?.length).toBeGreaterThan(0);
      expect(active?.record).toEqual(record);
      expect(active?.params).toEqual({ orderId: 'ORD-999' });
      expect(active?.detailsOp?.id).toBe('getOrder');

      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('app-edit-record-dialog')).toBeTruthy();

      // Close edit record dialog
      component.onCloseEditRecord();
      expect(component.activeEditRecord()).toBeNull();
      fixture.detectChanges();
      expect(el.querySelector('app-edit-record-dialog')).toBeNull();
    });

    it('should open DeleteConfirmDialogComponent on row delete', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      expect(component.activeDeleteConfirmation()).toBeNull();

      const record = { id: 'ORD-456', total: 100 };
      component.onRowDelete(record);

      const active = component.activeDeleteConfirmation();
      expect(active).toBeTruthy();
      expect(active?.deleteOp.id).toBe('deleteOrder');
      expect(active?.params).toEqual({ orderId: 'ORD-456' });

      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('app-delete-confirm-dialog')).toBeTruthy();

      // Close delete confirmation
      component.onCloseDeleteConfirmation();
      expect(component.activeDeleteConfirmation()).toBeNull();
      fixture.detectChanges();
      expect(el.querySelector('app-delete-confirm-dialog')).toBeNull();
    });

    it('should handle transition from details drawer to edit dialog (edit from drawer)', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      component.onRowView({ orderId: 'ORD-123' });
      expect(component.activeDetailsInspection()).toBeTruthy();

      const resolved = component.facade.resolvedPage();
      component.onEditRecord({
        record: { orderId: 'ORD-123', client: 'Bob' },
        updateOp: resolved!.update!,
        params: { orderId: 'ORD-123' },
        detailsOp: resolved!.details!
      });

      // Details drawer should be closed and edit dialog opened
      expect(component.activeDetailsInspection()).toBeNull();
      expect(component.activeEditRecord()).toBeTruthy();
      expect(component.activeEditRecord()?.params).toEqual({ orderId: 'ORD-123' });
    });

    it('should notify resource mutation and refresh list when record is updated', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      component.onRowEdit({ orderId: 'ORD-123' });
      const mutationSpy = vi.spyOn(sessionService, 'notifyResourceMutation');
      const refreshSpy = vi.spyOn(component.facade, 'refresh');

      const mockResult = {
        status: 200,
        statusText: 'OK',
        data: { orderId: 'ORD-123', updated: true },
        duration: 10,
        durationMs: 10,
        isSuccess: true
      };

      component.onRecordUpdated(mockResult);

      expect(mutationSpy).toHaveBeenCalledWith('orders', 'updateOrder', mockResult);
      expect(refreshSpy).toHaveBeenCalled();
      expect(component.activeEditRecord()).toBeNull();
    });

    it('should notify resource mutation and refresh list when record is deleted', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      component.onRowDelete({ orderId: 'ORD-123' });
      const mutationSpy = vi.spyOn(sessionService, 'notifyResourceMutation');
      const refreshSpy = vi.spyOn(component.facade, 'refresh');

      const mockResult = {
        status: 204,
        statusText: 'No Content',
        data: null,
        duration: 12,
        durationMs: 12,
        isSuccess: true
      };

      component.onRecordDeleted(mockResult);

      expect(mutationSpy).toHaveBeenCalledWith('orders', 'deleteOrder', mockResult);
      expect(refreshSpy).toHaveBeenCalled();
      expect(component.activeDeleteConfirmation()).toBeNull();
    });

    it('should preserve missing parameters in missingParams when parameter cannot be inferred', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      // Record with unrelated fields
      component.onRowView({ status: 'Pendente', notes: 'Sem identificador' });

      const active = component.activeDetailsInspection();
      expect(active).toBeTruthy();
      expect(active?.missingParams?.length).toBe(1);
      expect(active?.missingParams?.[0].name).toBe('orderId');
    });

    it('should include custom actions in pageRowActions and open CustomActionDialogComponent on trigger', () => {
      const customApiDef: ApiDefinition = {
        ...mockApiDefinition,
        resources: [
          {
            ...mockApiDefinition.resources[0],
            operations: [
              ...mockApiDefinition.resources[0].operations,
              {
                id: 'cancelOrder',
                operationId: 'cancelOrder',
                method: 'POST',
                path: '/orders/{orderId}/cancel',
                summary: 'Cancelar Pedido',
                type: 'action',
                parameters: [
                  {
                    name: 'orderId',
                    location: 'path',
                    required: true,
                    schema: { type: 'string' }
                  }
                ],
                responses: []
              },
              {
                id: 'patchStatus',
                operationId: 'patchStatus',
                method: 'PATCH',
                path: '/orders/{orderId}/status',
                summary: 'Editar Status',
                type: 'action',
                parameters: [
                  {
                    name: 'orderId',
                    location: 'path',
                    required: true,
                    schema: { type: 'string' }
                  }
                ],
                requestBody: {
                  schema: {
                    type: 'object',
                    properties: { status: { type: 'string' } }
                  }
                },
                responses: []
              }
            ]
          },
          mockApiDefinition.resources[1]
        ]
      };

      const customActionsConfig: UiConfiguration = {
        pages: {
          'orders-page': {
            id: 'orders-page',
            resourceId: 'orders',
            title: 'Pedidos',
            slug: 'pedidos',
            actions: {
              rowActions: {
                customActions: [
                  {
                    id: 'cancel_act',
                    operationId: 'cancelOrder',
                    label: 'Cancelar Pedido',
                    icon: 'cancel',
                    danger: true
                  },
                  {
                    id: 'edit_status_act',
                    operationId: 'patchStatus',
                    label: 'Alterar Status',
                    icon: 'edit_note'
                  }
                ]
              }
            }
          }
        }
      };

      sessionService.setSession(customApiDef);
      sessionService.setUiConfiguration(customActionsConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      const actions = component.pageRowActions();
      const cancelAct = actions.find((a) => a.id === 'cancel_act');
      expect(cancelAct).toBeDefined();
      expect(cancelAct?.label).toBe('Cancelar Pedido');
      expect(cancelAct?.danger).toBe(true);

      const statusAct = actions.find((a) => a.id === 'edit_status_act');
      expect(statusAct).toBeDefined();
      expect(statusAct?.label).toBe('Alterar Status');

      // Trigger custom action
      component.onRowAction({
        action: 'cancel_act',
        row: { orderId: 'ORD-555' },
        event: new MouseEvent('click')
      });

      const activeCustom = component.activeCustomAction();
      expect(activeCustom).toBeTruthy();
      expect(activeCustom?.action.id).toBe('cancel_act');
      expect(activeCustom?.params).toEqual({ orderId: 'ORD-555' });
    });

    it('should notify mutation and refresh when custom action executes successfully', () => {
      const customApiDef: ApiDefinition = {
        ...mockApiDefinition,
        resources: [
          {
            ...mockApiDefinition.resources[0],
            operations: [
              ...mockApiDefinition.resources[0].operations,
              {
                id: 'cancelOrder',
                operationId: 'cancelOrder',
                method: 'POST',
                path: '/orders/{orderId}/cancel',
                summary: 'Cancelar Pedido',
                type: 'action',
                parameters: [
                  {
                    name: 'orderId',
                    location: 'path',
                    required: true,
                    schema: { type: 'string' }
                  }
                ],
                responses: []
              }
            ]
          },
          mockApiDefinition.resources[1]
        ]
      };

      const customActionsConfig: UiConfiguration = {
        pages: {
          'orders-page': {
            id: 'orders-page',
            resourceId: 'orders',
            title: 'Pedidos',
            slug: 'pedidos',
            actions: {
              rowActions: {
                customActions: [
                  {
                    id: 'cancel_act',
                    operationId: 'cancelOrder',
                    label: 'Cancelar Pedido'
                  }
                ]
              }
            }
          }
        }
      };

      sessionService.setSession(customApiDef);
      sessionService.setUiConfiguration(customActionsConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      const mutationSpy = vi.spyOn(sessionService, 'notifyResourceMutation');
      const refreshSpy = vi.spyOn(component.facade, 'refresh');

      const customAct = component.facade.resolvedPage()?.customActions.find((a) => a.id === 'cancel_act')!;
      expect(customAct).toBeDefined();

      const mockResult = {
        status: 200,
        statusText: 'OK',
        data: { success: true },
        duration: 25,
        durationMs: 25,
        isSuccess: true
      };

      component.onCustomActionExecuted(customAct, mockResult);

      expect(mutationSpy).toHaveBeenCalledWith('orders', 'cancelOrder', mockResult);
      expect(refreshSpy).toHaveBeenCalled();
      expect(component.activeCustomAction()).toBeNull();
    });
  });
});
