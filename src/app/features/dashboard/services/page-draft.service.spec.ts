import { TestBed } from '@angular/core/testing';
import { PageDraftService } from './page-draft.service';
import { UiConfigurationValidatorService } from '../../../core/services/ui-configuration-validator.service';
import { ResourceOperationMatcherService } from '../../../core/services/resource-operation-matcher.service';
import { ApiDefinition } from '../../../core/models/api-definition.model';
import { UiConfiguration, UiPageConfiguration } from '../../../core/models/ui-configuration.model';

describe('PageDraftService', () => {
  let service: PageDraftService;

  const mockApiDefinition: ApiDefinition = {
    title: 'Store API',
    version: '1.0.0',
    baseUrl: 'https://api.store.com',
    resources: [
      {
        id: 'orders',
        name: 'orders',
        label: 'Pedidos',
        operations: [
          {
            id: 'listOrders',
            operationId: 'listOrders',
            method: 'GET',
            path: '/orders',
            summary: 'List orders',
            type: 'list',
            parameters: [],
            responses: [
              {
                statusCode: '200',
                description: 'Success',
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    customer: { type: 'string' },
                    amount: { type: 'number' },
                    status: { type: 'string', enum: ['pending', 'shipped', 'delivered'] },
                    createdAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            ]
          },
          {
            id: 'createOrder',
            operationId: 'createOrder',
            method: 'POST',
            path: '/orders',
            summary: 'Create order',
            type: 'create',
            parameters: [],
            responses: []
          },
          {
            id: 'getOrder',
            operationId: 'getOrder',
            method: 'GET',
            path: '/orders/{id}',
            summary: 'Get order',
            type: 'details',
            parameters: [],
            responses: []
          },
          {
            id: 'updateOrder',
            operationId: 'updateOrder',
            method: 'PUT',
            path: '/orders/{id}',
            summary: 'Update order',
            type: 'update',
            parameters: [],
            responses: []
          },
          {
            id: 'deleteOrder',
            operationId: 'deleteOrder',
            method: 'DELETE',
            path: '/orders/{id}',
            summary: 'Delete order',
            type: 'delete',
            parameters: [],
            responses: []
          }
        ]
      },
      {
        id: 'customers',
        name: 'customers',
        label: 'Clientes',
        operations: [
          {
            id: 'listCustomers',
            operationId: 'listCustomers',
            method: 'GET',
            path: '/customers',
            summary: 'List customers',
            type: 'list',
            parameters: [],
            responses: []
          }
        ]
      }
    ]
  };

  const initialPublishedConfig: UiConfiguration = {
    version: 1,
    title: 'Custom Store UI',
    pages: {
      'orders-page': {
        id: 'orders-page',
        resourceId: 'orders',
        slug: 'pedidos',
        title: 'Pedidos',
        order: 1,
        isDefault: true,
        hidden: false
      }
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PageDraftService,
        UiConfigurationValidatorService,
        ResourceOperationMatcherService
      ]
    });
    service = TestBed.inject(PageDraftService);
  });

  it('1. should initialize draft with cloned published configuration and maintain isolation', () => {
    service.initDraft(initialPublishedConfig, mockApiDefinition, 'manage');

    expect(service.isDirty()).toBe(false);
    expect(service.draftPages().length).toBe(1);
    expect(service.draftPages()[0].id).toBe('orders-page');
    expect(service.draftPages()[0].slug).toBe('pedidos');

    // Mutating draft should not mutate published reference
    service.updatePage('orders-page', { title: 'Pedidos Alterados' });
    expect(service.isDirty()).toBe(true);
    expect(service.draftPages()[0].title).toBe('Pedidos Alterados');
    expect(initialPublishedConfig.pages?.['orders-page']?.title).toBe('Pedidos');
  });

  it('2. should start creation of a new page with automatically inferred defaults from unmapped resource', () => {
    service.initDraft(initialPublishedConfig, mockApiDefinition, 'manage');

    const created = service.startCreatePage();
    expect(created).toBeDefined();
    expect(created.resourceId).toBe('customers'); // customers is the unmapped resource
    expect(created.title).toBe('Clientes');
    expect(created.slug).toBe('customers');
    expect(service.activeMode()).toBe('create');
    expect(service.isDirty()).toBe(true);
    expect(service.editingPageId()).toBe(created.id);
  });

  it('3. should infer columns, metrics, and operations from OpenAPI schemas when creating page', () => {
    service.initDraft(null, mockApiDefinition, 'manage');

    const created = service.startCreatePage('orders');
    expect(created.resourceId).toBe('orders');
    expect(created.title).toBe('Pedidos');
    expect(created.slug).toBe('orders');

    // Columns inferred from schema
    expect(created.table?.columns?.some((c) => c.field === 'id' && c.type === 'monospace')).toBe(true);
    expect(created.table?.columns?.some((c) => c.field === 'amount' && c.type === 'currency')).toBe(true);
    expect(created.table?.columns?.some((c) => c.field === 'status' && c.type === 'status_badge')).toBe(true);
    expect(created.table?.columns?.some((c) => c.field === 'createdAt' && c.type === 'datetime')).toBe(true);

    // Metrics inferred
    expect(created.metrics?.length).toBeGreaterThanOrEqual(1);
    expect(created.metrics?.[0].type).toBe('count_all');

    // Operations linked
    expect(created.operations?.list).toBe('listOrders');
    expect(created.operations?.create).toBe('createOrder');
    expect(created.operations?.details).toBe('getOrder');
    expect(created.operations?.update).toBe('updateOrder');
    expect(created.operations?.delete).toBe('deleteOrder');
  });

  it('4. should update an existing page and maintain dirty tracking', () => {
    service.initDraft(initialPublishedConfig, mockApiDefinition, 'manage');

    service.startEditPage('orders-page');
    expect(service.activeMode()).toBe('edit');
    expect(service.activeEditingPage()?.id).toBe('orders-page');

    service.updatePage('orders-page', {
      title: 'Meus Pedidos',
      slug: 'meus-pedidos',
      description: 'Gestão de pedidos'
    });

    const updated = service.activeEditingPage();
    expect(updated?.title).toBe('Meus Pedidos');
    expect(updated?.slug).toBe('meus-pedidos');
    expect(updated?.description).toBe('Gestão de pedidos');
    expect(service.isDirty()).toBe(true);
  });

  it('5. should duplicate an existing page with unique ID and slug', () => {
    service.initDraft(initialPublishedConfig, mockApiDefinition, 'manage');

    const duplicated = service.duplicatePage('orders-page');
    expect(duplicated).not.toBeNull();
    expect(duplicated?.id).toBe('orders-page-copy');
    expect(duplicated?.slug).toBe('pedidos-copy');
    expect(duplicated?.title).toContain('Pedidos (Cópia)');
    expect(duplicated?.isDefault).toBe(false);
    expect(service.draftPages().length).toBe(2);
    expect(service.isDirty()).toBe(true);

    // Duplicate again to test sequence counter
    const dup2 = service.duplicatePage('orders-page');
    expect(dup2?.slug).toBe('pedidos-copy-2');
  });

  it('6. should toggle page visibility (hidden)', () => {
    service.initDraft(initialPublishedConfig, mockApiDefinition, 'manage');

    expect(service.draftPages()[0].hidden).toBe(false);

    service.togglePageVisibility('orders-page');
    expect(service.draftPages()[0].hidden).toBe(true);
    expect(service.isDirty()).toBe(true);

    service.togglePageVisibility('orders-page');
    expect(service.draftPages()[0].hidden).toBe(false);
  });

  it('7. should move page order up and down', () => {
    const configWithMultiple: UiConfiguration = {
      version: 1,
      pages: {
        page1: { id: 'page1', title: 'A', order: 1 },
        page2: { id: 'page2', title: 'B', order: 2 },
        page3: { id: 'page3', title: 'C', order: 3 }
      }
    };
    service.initDraft(configWithMultiple, mockApiDefinition, 'manage');

    expect(service.draftPages().map((p) => p.id)).toEqual(['page1', 'page2', 'page3']);

    // Move page2 up
    service.movePageOrder('page2', 'up');
    expect(service.draftPages().map((p) => p.id)).toEqual(['page2', 'page1', 'page3']);
    expect(service.draftPages()[0].order).toBe(1);
    expect(service.draftPages()[1].order).toBe(2);

    // Move page2 down
    service.movePageOrder('page2', 'down');
    expect(service.draftPages().map((p) => p.id)).toEqual(['page1', 'page2', 'page3']);
  });

  it('8. should set page as default and clear previous default flag on other pages', () => {
    const configWithMultiple: UiConfiguration = {
      version: 1,
      pages: {
        page1: { id: 'page1', title: 'A', isDefault: true },
        page2: { id: 'page2', title: 'B', isDefault: false }
      }
    };
    service.initDraft(configWithMultiple, mockApiDefinition, 'manage');

    service.setPageAsDefault('page2');
    const pages = service.draftPages();
    const p1 = pages.find((p) => p.id === 'page1');
    const p2 = pages.find((p) => p.id === 'page2');

    expect(p2?.isDefault).toBe(true);
    expect(p1?.isDefault).toBe(false);
    expect(service.isDirty()).toBe(true);
  });

  it('9. should delete a page and clean up editing state if deleted page was active', () => {
    service.initDraft(initialPublishedConfig, mockApiDefinition, 'manage');
    service.startEditPage('orders-page');

    expect(service.editingPageId()).toBe('orders-page');

    const result = service.deletePage('orders-page');
    expect(result).toBe(true);
    expect(service.draftPages().length).toBe(0);
    expect(service.editingPageId()).toBeNull();
    expect(service.activeMode()).toBe('manage');
    expect(service.isDirty()).toBe(true);
  });

  it('10. should validate draft and identify blocking errors in real time', () => {
    service.initDraft(initialPublishedConfig, mockApiDefinition, 'manage');

    // Add invalid slug with uppercase and spaces
    service.updatePage('orders-page', { slug: 'INVALID SLUG!' });

    const val = service.validationResult();
    expect(val.hasErrors).toBe(true);
    expect(service.hasBlockingErrors()).toBe(true);
    expect(val.errors.some((e) => e.code === 'INVALID_SLUG_FORMAT')).toBe(true);
  });

  it('11. should commit draft and reset dirty state', () => {
    service.initDraft(initialPublishedConfig, mockApiDefinition, 'manage');

    service.updatePage('orders-page', { title: 'Pedidos Publicados' });
    expect(service.isDirty()).toBe(true);

    const committed = service.commitDraft();
    expect(committed.pages?.['orders-page']?.title).toBe('Pedidos Publicados');
    expect(service.isDirty()).toBe(false);
    expect(service.publishedConfig()?.pages?.['orders-page']?.title).toBe('Pedidos Publicados');
  });

  it('12. should reset draft back to baseline published configuration discarding changes', () => {
    service.initDraft(initialPublishedConfig, mockApiDefinition, 'manage');

    service.updatePage('orders-page', { title: 'Alteração Não Salva' });
    expect(service.isDirty()).toBe(true);

    service.resetDraft();
    expect(service.isDirty()).toBe(false);
    expect(service.draftPages()[0].title).toBe('Pedidos');
    expect(service.activeMode()).toBe('manage');
  });

  it('13. should infer semantic icons and context description based on resource entity name', () => {
    expect(service.inferIconFromResource('orders')).toBe('shopping_cart');
    expect(service.inferIconFromResource('pedidos')).toBe('shopping_cart');
    expect(service.inferIconFromResource('customers')).toBe('people');
    expect(service.inferIconFromResource('clientes')).toBe('people');
    expect(service.inferIconFromResource('products')).toBe('inventory_2');
    expect(service.inferIconFromResource('produtos')).toBe('inventory_2');
    expect(service.inferIconFromResource('invoices')).toBe('payments');
    expect(service.inferIconFromResource('pagamentos')).toBe('payments');
    expect(service.inferIconFromResource('reports')).toBe('assessment');
    expect(service.inferIconFromResource('relatorios')).toBe('assessment');
    expect(service.inferIconFromResource('deliveries')).toBe('local_shipping');
    expect(service.inferIconFromResource('desconhecido')).toBe('table_chart');

    const created = service.inferPageDefaultsFromResource({
      id: 'orders',
      name: 'orders',
      label: 'Pedidos',
      operations: []
    });
    expect(created.icon).toBe('shopping_cart');
    expect(created.title).toBe('Pedidos');
    expect(created.slug).toBe('orders');
    expect(created.description).toContain('pedidos');
  });

  it('14. should preserve stable internal page ID even when title and slug are modified', () => {
    service.initDraft(initialPublishedConfig, mockApiDefinition, 'manage');

    const originalId = service.draftPages()[0].id;
    expect(originalId).toBe('orders-page');

    // Update title and slug
    service.updatePage('orders-page', {
      title: 'Histórico Completo de Pedidos',
      slug: 'historico-pedidos'
    });

    const pages = service.draftPages();
    const updatedPage = pages.find((p) => p.slug === 'historico-pedidos');
    expect(updatedPage).toBeDefined();
    expect(updatedPage?.id).toBe('orders-page'); // ID is preserved!
    expect(updatedPage?.title).toBe('Histórico Completo de Pedidos');
  });

  it('15. should detect slug conflicts with other pages in real time', () => {
    const configWithPages: UiConfiguration = {
      version: 1,
      pages: {
        page1: { id: 'page1', title: 'Pedidos', slug: 'pedidos' },
        page2: { id: 'page2', title: 'Clientes', slug: 'clientes' },
        page3: { id: 'page3', title: 'Produtos', slug: 'produtos' }
      }
    };
    service.initDraft(configWithPages, mockApiDefinition, 'manage');

    // Conflicting with page2
    expect(service.isSlugConflict('clientes', 'page1')).toBe(true);
    expect(service.getConflictingPage('clientes', 'page1')?.title).toBe('Clientes');

    // Not conflicting with own slug
    expect(service.isSlugConflict('pedidos', 'page1')).toBe(false);

    // Not conflicting with unused slug
    expect(service.isSlugConflict('novo-slug', 'page1')).toBe(false);
    expect(service.getConflictingPage('novo-slug', 'page1')).toBeUndefined();
  });

  it('16. should set explicit position of a page in sidebar and reindex other pages cleanly', () => {
    const configWithPages: UiConfiguration = {
      version: 1,
      pages: {
        page1: { id: 'page1', title: 'A', order: 1 },
        page2: { id: 'page2', title: 'B', order: 2 },
        page3: { id: 'page3', title: 'C', order: 3 },
        page4: { id: 'page4', title: 'D', order: 4 }
      }
    };
    service.initDraft(configWithPages, mockApiDefinition, 'manage');

    // Move page4 (position 4) directly to position 1 (top)
    service.setPagePosition('page4', 1);

    const pages = service.draftPages();
    expect(pages.map((p) => p.id)).toEqual(['page4', 'page1', 'page2', 'page3']);
    expect(pages.map((p) => p.order)).toEqual([1, 2, 3, 4]);

    // Move page4 to position 3
    service.setPagePosition('page4', 3);
    const pages2 = service.draftPages();
    expect(pages2.map((p) => p.id)).toEqual(['page1', 'page2', 'page4', 'page3']);
    expect(pages2.map((p) => p.order)).toEqual([1, 2, 3, 4]);
  });
});
