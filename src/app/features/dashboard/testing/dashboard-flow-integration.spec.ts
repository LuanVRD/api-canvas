import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OpenApiParserService } from '../../../openapi/services/openapi-parser.service';
import { ApiSessionService } from '../../../core/services/api-session.service';
import { UiConfigurationService } from '../../../core/services/ui-configuration.service';
import { ResourceOperationMatcherService } from '../../../core/services/resource-operation-matcher.service';
import { ResourcePageFacadeService } from '../services/resource-page-facade.service';
import { ApiExecutorService } from '../../../core/services/api-executor.service';
import { ApiRequestBuilderService } from '../../../core/services/api-request-builder.service';
import { FormSchemaService } from '../../../dynamic-ui/dynamic-form/form-schema.service';
import { TableSchemaService } from '../../../dynamic-ui/dynamic-table/table-schema.service';
import {
  ORDER_MANAGEMENT_SPEC,
  ARTICLES_SLUG_SPEC,
  FIXTURE_RESPONSES
} from '../../../openapi/testing/openapi-fixtures';
import { UiPageConfiguration } from '../../../core/models/ui-configuration.model';

describe('Dashboard End-to-End Integration Flow', () => {
  let parser: OpenApiParserService;
  let sessionService: ApiSessionService;
  let uiConfigService: UiConfigurationService;
  let matcher: ResourceOperationMatcherService;
  let facade: ResourcePageFacadeService;
  let requestBuilder: ApiRequestBuilderService;
  let formSchemaService: FormSchemaService;
  let tableSchemaService: TableSchemaService;
  let apiExecutor: ApiExecutorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OpenApiParserService,
        ApiSessionService,
        UiConfigurationService,
        ResourceOperationMatcherService,
        ResourcePageFacadeService,
        ApiRequestBuilderService,
        FormSchemaService,
        TableSchemaService,
        {
          provide: ApiExecutorService,
          useValue: {
            execute: vi.fn()
          }
        }
      ]
    });

    parser = TestBed.inject(OpenApiParserService);
    sessionService = TestBed.inject(ApiSessionService);
    uiConfigService = TestBed.inject(UiConfigurationService);
    matcher = TestBed.inject(ResourceOperationMatcherService);
    facade = TestBed.inject(ResourcePageFacadeService);
    requestBuilder = TestBed.inject(ApiRequestBuilderService);
    formSchemaService = TestBed.inject(FormSchemaService);
    tableSchemaService = TestBed.inject(TableSchemaService);
    apiExecutor = TestBed.inject(ApiExecutorService);
  });

  it('Flow: Connect API -> Resolve Pages -> List Enveloped Records -> Create -> Status PATCH -> Custom Action POST -> Delete', async () => {
    // =========================================================================
    // 1. CONNECT STEP: Parse OpenAPI spec and initialize active session
    // =========================================================================
    const apiDefinition = parser.parse(ORDER_MANAGEMENT_SPEC);
    expect(apiDefinition.title).toBe('Order Management API');
    expect(apiDefinition.resources.length).toBe(1);

    const ordersResource = apiDefinition.resources[0];
    expect(ordersResource.id).toBe('orders');
    expect(ordersResource.operations.length).toBe(8);

    sessionService.setSession(apiDefinition);
    expect(sessionService.hasActiveApi()).toBe(true);
    expect(sessionService.baseUrl()).toBe('https://api.orders.example.com/v2');

    // =========================================================================
    // 2. DASHBOARD PAGE RESOLUTION: Match operations without assuming 'id'
    // =========================================================================
    const pageConfig: UiPageConfiguration = {
      id: 'orders-dashboard',
      resourceId: 'orders',
      title: 'Painel de Pedidos',
      slug: 'pedidos',
      icon: 'receipt_long',
      displayMode: 'dashboard',
      operations: {
        list: 'listOrders',
        create: 'createOrder',
        details: 'getOrderById',
        update: 'updateOrder',
        delete: 'deleteOrder'
      },
      table: {
        columns: [
          { field: 'orderId', label: 'Código', type: 'monospace', sortable: true },
          { field: 'customerName', label: 'Cliente', type: 'text', sortable: true },
          { field: 'totalAmount', label: 'Valor', type: 'currency', sortable: true },
          { field: 'status', label: 'Status', type: 'status_badge' }
        ]
      },
      actions: {
        primaryCreateLabel: '+ Novo Pedido',
        rowActions: {
          viewDetails: true,
          edit: true,
          delete: true,
          customActions: [
            {
              id: 'status-action',
              operationId: 'updateOrderStatus',
              label: 'Alterar Status',
              icon: 'edit_note'
            },
            {
              id: 'cancel-action',
              operationId: 'cancelOrder',
              label: 'Cancelar Pedido',
              danger: true,
              style: 'danger',
              icon: 'cancel'
            }
          ]
        }
      }
    };

    const resolvedPage = matcher.resolveResourcePage({
      resource: ordersResource,
      pageConfig,
      apiDefinition
    });

    expect(resolvedPage.list?.id).toBe('listOrders');
    expect(resolvedPage.create?.id).toBe('createOrder');
    expect(resolvedPage.details?.id).toBe('getOrderById');
    expect(resolvedPage.delete?.id).toBe('deleteOrder');
    expect(resolvedPage.customActions.length).toBeGreaterThanOrEqual(2);

    const statusAction = resolvedPage.customActions.find((a) => a.operation.id === 'updateOrderStatus');
    expect(statusAction).toBeDefined();
    expect(statusAction?.operation.method).toBe('PATCH');

    const cancelAction = resolvedPage.customActions.find((a) => a.operation.id === 'cancelOrder');
    expect(cancelAction).toBeDefined();
    expect(cancelAction?.operation.method).toBe('POST');
    expect(cancelAction?.danger).toBe(true);

    // =========================================================================
    // 3. LIST STEP: Fetch enveloped records and bind to Facade signals
    // =========================================================================
    vi.spyOn(apiExecutor, 'execute').mockReturnValue(
      of({
        status: 200,
        statusText: 'OK',
        data: FIXTURE_RESPONSES.envelopedStandard,
        duration: 18,
        isSuccess: true,
        timestamp: Date.now()
      })
    );

    facade.loadPage(pageConfig);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(facade.isLoading()).toBe(false);
    expect(facade.items().length).toBe(2);
    expect(facade.totalCount()).toBe(42);
    expect((facade.visibleItems()[0] as any).orderId).toBe('ORD-201');

    // =========================================================================
    // 4. CREATE STEP: Build form schema, validate payload, and POST
    // =========================================================================
    const createRequestBody = resolvedPage.create!.requestBody as import('../../../core/models/api-operation.model').ApiRequestBody;
    const { form, fields } = formSchemaService.buildFormGroup(createRequestBody.schema);

    expect(form.valid).toBe(false);
    form.patchValue({
      customerName: 'Mariana Duarte',
      customerEmail: 'mariana@example.com',
      totalAmount: 289.5,
      priority: 'HIGH',
      notes: 'Urgente'
    });
    expect(form.valid).toBe(true);

    const createPayload = formSchemaService.toRequestBody(form.value, fields);
    expect(createPayload).toEqual({
      customerName: 'Mariana Duarte',
      customerEmail: 'mariana@example.com',
      totalAmount: 289.5,
      priority: 'HIGH',
      notes: 'Urgente'
    });

    const createRequest = requestBuilder.build(sessionService.baseUrl(), resolvedPage.create!, {
      body: createPayload
    });
    expect(createRequest.method).toBe('POST');
    expect(createRequest.url).toBe('https://api.orders.example.com/v2/orders');

    // Simulate mutation trigger
    sessionService.notifyResourceMutation('orders', 'create');
    await new Promise((resolve) => setTimeout(resolve, 20));

    // =========================================================================
    // 5. STATUS UPDATE STEP (PATCH): Resolve param orderId and execute PATCH
    // =========================================================================
    const selectedRecord = facade.visibleItems()[0] as Record<string, unknown>;
    expect(selectedRecord['orderId']).toBe('ORD-201');

    const patchParamResolution = matcher.resolveParameters(statusAction!.operation, selectedRecord);
    expect(patchParamResolution.canAutoResolve).toBe(true);
    expect(patchParamResolution.resolvedParams['orderId']).toBe('ORD-201');

    const statusPayload = { status: 'SHIPPED', reason: 'Despachado via transportadora expressa' };
    const patchRequest = requestBuilder.build(sessionService.baseUrl(), statusAction!.operation, {
      path: patchParamResolution.resolvedParams,
      body: statusPayload
    });

    expect(patchRequest.method).toBe('PATCH');
    expect(patchRequest.url).toBe('https://api.orders.example.com/v2/orders/ORD-201/status');
    expect(patchRequest.body).toEqual(statusPayload);

    // =========================================================================
    // 6. CUSTOM ACTION STEP (POST): Execute RPC cancellation
    // =========================================================================
    const cancelParamResolution = matcher.resolveParameters(cancelAction!.operation, selectedRecord);
    expect(cancelParamResolution.canAutoResolve).toBe(true);
    expect(cancelParamResolution.resolvedParams['orderId']).toBe('ORD-201');

    const cancelPayload = { cancellationReason: 'Cliente desistiu da compra' };
    const cancelRequest = requestBuilder.build(sessionService.baseUrl(), cancelAction!.operation, {
      path: cancelParamResolution.resolvedParams,
      body: cancelPayload
    });

    expect(cancelRequest.method).toBe('POST');
    expect(cancelRequest.url).toBe('https://api.orders.example.com/v2/orders/ORD-201/cancel');
    expect(cancelRequest.body).toEqual(cancelPayload);

    // =========================================================================
    // 7. DELETE STEP: Resolve param orderId and execute DELETE
    // =========================================================================
    const deleteParamResolution = matcher.resolveParameters(resolvedPage.delete!, selectedRecord);
    expect(deleteParamResolution.canAutoResolve).toBe(true);
    expect(deleteParamResolution.resolvedParams['orderId']).toBe('ORD-201');

    const deleteRequest = requestBuilder.build(sessionService.baseUrl(), resolvedPage.delete!, {
      path: deleteParamResolution.resolvedParams
    });

    expect(deleteRequest.method).toBe('DELETE');
    expect(deleteRequest.url).toBe('https://api.orders.example.com/v2/orders/ORD-201');

    // Notify delete mutation -> triggers reload
    sessionService.notifyResourceMutation('orders', 'delete');
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  it('Flow with non-standard Slug Identifier (/articles/{slug})', async () => {
    const apiDef = parser.parse(ARTICLES_SLUG_SPEC);
    expect(apiDef.resources[0].operations.length).toBe(5);

    const articleResource = apiDef.resources[0];
    const resolved = matcher.resolveResourcePage({
      resource: articleResource,
      apiDefinition: apiDef
    });

    expect(resolved.list?.path).toBe('/articles');
    expect(resolved.details?.path).toBe('/articles/{slug}');
    expect(resolved.delete?.path).toBe('/articles/{slug}');

    const articleRecord = { slug: 'como-testar-dashboard-sem-fragilidade', title: 'Testes Resilientes' };
    const paramRes = matcher.resolveParameters(resolved.details!, articleRecord);
    expect(paramRes.canAutoResolve).toBe(true);
    expect(paramRes.resolvedParams['slug']).toBe('como-testar-dashboard-sem-fragilidade');
  });
});
