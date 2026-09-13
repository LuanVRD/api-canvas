import { TestBed } from '@angular/core/testing';
import { UiConfigurationService } from './ui-configuration.service';
import {
  CURRENT_UI_CONFIGURATION_VERSION,
  UiConfiguration,
  UiPageConfiguration,
  UiResourceConfiguration
} from '../models/ui-configuration.model';
import { ApiResource } from '../models/api-resource.model';
import { FormFieldDescriptor } from '../../dynamic-ui/dynamic-form/form-field.model';
import { TableColumnDescriptor } from '../../dynamic-ui/dynamic-table/table-schema.service';

describe('UiConfigurationService', () => {
  let service: UiConfigurationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UiConfigurationService]
    });
    service = TestBed.inject(UiConfigurationService);
  });

  describe('normalizeConfiguration and Versioning', () => {
    it('should return null when config is missing', () => {
      expect(service.normalizeConfiguration(undefined)).toBeNull();
      expect(service.normalizeConfiguration(null)).toBeNull();
    });

    it('should assign current version when version is omitted (backward compatibility)', () => {
      const legacyConfig: UiConfiguration = {
        title: 'Legacy API Workspace',
        resources: {
          products: { label: 'Store Products' }
        }
      };

      const normalized = service.normalizeConfiguration(legacyConfig);
      expect(normalized).toBeDefined();
      expect(normalized?.version).toBe(CURRENT_UI_CONFIGURATION_VERSION);
      expect(normalized?.title).toBe('Legacy API Workspace');
      expect(normalized?.resources?.['products']?.label).toBe('Store Products');
    });

    it('should preserve explicit schema version when provided', () => {
      const customConfig: UiConfiguration = {
        version: 2,
        title: 'Custom API Workspace'
      };

      const normalized = service.normalizeConfiguration(customConfig);
      expect(normalized?.version).toBe(2);
    });
  });

  describe('getResourceConfig', () => {
    const sampleConfig: UiConfiguration = {
      resources: {
        products: { label: 'Store Catalog' },
        order_items: { label: 'Order Line Items' }
      }
    };

    it('should return null when config or resourceName is missing', () => {
      expect(service.getResourceConfig(undefined, 'products')).toBeNull();
      expect(service.getResourceConfig(sampleConfig, '')).toBeNull();
    });

    it('should find resource config by exact key match', () => {
      const res = service.getResourceConfig(sampleConfig, 'products');
      expect(res).toBeDefined();
      expect(res?.label).toBe('Store Catalog');
    });

    it('should find resource config case-insensitively', () => {
      const res = service.getResourceConfig(sampleConfig, 'Products');
      expect(res).toBeDefined();
      expect(res?.label).toBe('Store Catalog');
    });

    it('should find resource config by singular/plural match', () => {
      const res = service.getResourceConfig(sampleConfig, 'product');
      expect(res).toBeDefined();
      expect(res?.label).toBe('Store Catalog');
    });

    it('should return null for non-existent resource', () => {
      expect(service.getResourceConfig(sampleConfig, 'users')).toBeNull();
    });
  });

  describe('getPageConfig and getResourcePageConfig', () => {
    const configWithPages: UiConfiguration = {
      pages: {
        'orders-page': {
          id: 'orders-page',
          resourceId: 'orders',
          slug: 'pedidos',
          title: 'Pedidos',
          icon: 'receipt_long',
          displayMode: 'dashboard'
        }
      },
      resources: {
        customers: {
          label: 'Clientes',
          slug: 'clientes',
          page: {
            id: 'customers-page',
            title: 'Gestão de Clientes',
            slug: 'clientes',
            displayMode: 'crud'
          }
        }
      }
    };

    it('should return null if config or search term is missing', () => {
      expect(service.getPageConfig(undefined, 'orders-page')).toBeNull();
      expect(service.getPageConfig(configWithPages, '')).toBeNull();
      expect(service.getResourcePageConfig(undefined, 'orders')).toBeNull();
      expect(service.getResourcePageConfig(configWithPages, '')).toBeNull();
    });

    it('should find page in top-level pages by key, id, or slug (case-insensitive)', () => {
      expect(service.getPageConfig(configWithPages, 'orders-page')?.title).toBe('Pedidos');
      expect(service.getPageConfig(configWithPages, 'ORDERS-PAGE')?.title).toBe('Pedidos');
      expect(service.getPageConfig(configWithPages, 'pedidos')?.title).toBe('Pedidos');
    });

    it('should find page from resource embedded page by resource key or slug', () => {
      expect(service.getPageConfig(configWithPages, 'customers')?.title).toBe('Gestão de Clientes');
      expect(service.getPageConfig(configWithPages, 'customers-page')?.title).toBe('Gestão de Clientes');
      expect(service.getPageConfig(configWithPages, 'clientes')?.title).toBe('Gestão de Clientes');
    });

    it('should find resource page using getResourcePageConfig', () => {
      // From embedded page
      expect(service.getResourcePageConfig(configWithPages, 'customers')?.title).toBe('Gestão de Clientes');
      // From top-level pages referencing resourceId
      expect(service.getResourcePageConfig(configWithPages, 'orders')?.title).toBe('Pedidos');
    });
  });

  describe('resolvePageConfiguration', () => {
    it('should combine page config with resource-level fallbacks', () => {
      const resourceConfig: UiResourceConfiguration = {
        label: 'Orders Resource',
        icon: 'shopping_bag',
        slug: 'orders',
        order: 1,
        operations: {
          list: 'getOrders',
          create: 'createOrder',
          details: 'getOrderById'
        },
        list: {
          columns: ['id', 'clientName', 'total']
        }
      };

      const pageConfig: UiPageConfiguration = {
        id: 'orders-dashboard',
        title: 'Painel de Pedidos',
        operations: {
          update: 'updateOrder'
        },
        metrics: [
          {
            id: 'total',
            label: 'Total de Pedidos',
            type: 'count_all',
            colorScheme: 'default'
          }
        ]
      };

      const resolved = service.resolvePageConfiguration(pageConfig, resourceConfig);
      expect(resolved.id).toBe('orders-dashboard');
      expect(resolved.title).toBe('Painel de Pedidos');
      expect(resolved.icon).toBe('shopping_bag');
      expect(resolved.slug).toBe('orders');
      expect(resolved.order).toBe(1);
      expect(resolved.operations?.list).toBe('getOrders');
      expect(resolved.operations?.update).toBe('updateOrder');
      expect(resolved.metrics?.length).toBe(1);
      expect(resolved.table?.columns?.length).toBe(3);
      expect(resolved.table?.columns?.[0].field).toBe('id');
      expect(resolved.table?.columns?.[0].label).toBe('ID');
    });
  });

  describe('mergeResources', () => {
    const rawResources: ApiResource[] = [
      {
        id: 'products',
        name: 'products',
        label: 'Products',
        description: 'Manage products',
        operations: []
      },
      {
        id: 'internal_logs',
        name: 'internal_logs',
        label: 'Logs',
        description: 'System logs',
        operations: []
      },
      {
        id: 'orders',
        name: 'orders',
        label: 'Orders',
        description: 'Customer orders',
        operations: []
      }
    ];

    it('should return original resources if no config or resource overrides provided', () => {
      expect(service.mergeResources(rawResources, undefined)).toEqual(rawResources);
      expect(service.mergeResources(rawResources, {})).toEqual(rawResources);
    });

    it('should override labels and filter hidden resources', () => {
      const config: UiConfiguration = {
        resources: {
          products: { label: 'Product Catalog' },
          internal_logs: { hidden: true }
        }
      };

      const result = service.mergeResources(rawResources, config);
      expect(result.length).toBe(2);
      expect(result.find((r) => r.id === 'products')?.label).toBe('Product Catalog');
      expect(result.find((r) => r.id === 'orders')?.label).toBe('Orders');
      expect(result.find((r) => r.id === 'internal_logs')).toBeUndefined();
    });
  });

  describe('getFieldConfig', () => {
    it('should prioritize resource-level field config over global field config', () => {
      const resourceConfig = {
        fields: {
          description: { label: 'Product Details', control: 'textarea' as const }
        }
      };
      const globalFields = {
        description: { label: 'General Description' },
        created_at: { label: 'Created On' }
      };

      const descField = service.getFieldConfig('description', resourceConfig, globalFields);
      expect(descField?.label).toBe('Product Details');
      expect(descField?.control).toBe('textarea');

      const createdField = service.getFieldConfig('created_at', resourceConfig, globalFields);
      expect(createdField?.label).toBe('Created On');
    });

    it('should return null if field is not configured anywhere', () => {
      expect(service.getFieldConfig('unknown_prop', undefined, undefined)).toBeNull();
    });
  });

  describe('applyFieldOverrides', () => {
    const sampleFields: FormFieldDescriptor[] = [
      {
        key: 'title',
        label: 'Title',
        type: 'text',
        required: true
      },
      {
        key: 'body',
        label: 'Body',
        type: 'text',
        required: false
      },
      {
        key: 'secret_token',
        label: 'Secret Token',
        type: 'text',
        required: false
      }
    ];

    it('should return same fields when no config is provided', () => {
      expect(service.applyFieldOverrides(sampleFields)).toEqual(sampleFields);
    });

    it('should override label, change control type, and hide configured fields', () => {
      const resourceConfig = {
        fields: {
          body: { label: 'Article Content', control: 'textarea' as const },
          secret_token: { hidden: true }
        }
      };
      const globalFields = {
        title: { label: 'Article Headline' }
      };

      const result = service.applyFieldOverrides(sampleFields, resourceConfig, globalFields);
      expect(result.length).toBe(2);

      const titleField = result.find((f) => f.key === 'title');
      expect(titleField?.label).toBe('Article Headline');
      expect(titleField?.type).toBe('text');

      const bodyField = result.find((f) => f.key === 'body');
      expect(bodyField?.label).toBe('Article Content');
      expect(bodyField?.type).toBe('textarea');

      expect(result.find((f) => f.key === 'secret_token')).toBeUndefined();
    });
  });

  describe('applyTableColumnOverrides', () => {
    const sampleColumns: TableColumnDescriptor[] = [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'title', label: 'Title', type: 'string' },
      { key: 'description', label: 'Description', type: 'string' },
      { key: 'price', label: 'Price', type: 'number' },
      { key: 'internal_hash', label: 'Internal Hash', type: 'string' }
    ];

    it('should return unchanged columns if no config is given', () => {
      expect(service.applyTableColumnOverrides(sampleColumns)).toEqual(sampleColumns);
    });

    it('should reorder and filter columns according to list.columns', () => {
      const resourceConfig = {
        list: {
          columns: ['title', 'price', 'id']
        },
        fields: {
          title: { label: 'Item Name' }
        }
      };

      const result = service.applyTableColumnOverrides(sampleColumns, resourceConfig);
      expect(result.map((c) => c.key)).toEqual(['title', 'price', 'id']);
      expect(result[0].label).toBe('Item Name');
      expect(result[1].label).toBe('Price');
    });

    it('should create fallback columns for list.columns entries not in sample', () => {
      const resourceConfig = {
        list: {
          columns: ['title', 'custom_col']
        }
      };

      const result = service.applyTableColumnOverrides(sampleColumns, resourceConfig);
      expect(result.length).toBe(2);
      expect(result[1].key).toBe('custom_col');
      expect(result[1].label).toBe('Custom Col');
    });

    it('should exclude columns marked hidden: true even without list.columns', () => {
      const resourceConfig = {
        fields: {
          internal_hash: { hidden: true },
          title: { label: 'Product Name' }
        }
      };

      const result = service.applyTableColumnOverrides(sampleColumns, resourceConfig);
      expect(result.find((c) => c.key === 'internal_hash')).toBeUndefined();
      expect(result.find((c) => c.key === 'title')?.label).toBe('Product Name');
    });
  });

  describe('mergeConfigurations', () => {
    it('should handle undefined inputs', () => {
      expect(service.mergeConfigurations(undefined, undefined)).toBeNull();
      const base: UiConfiguration = { resources: { users: { label: 'Accounts' } } };
      expect(service.mergeConfigurations(base, undefined)).toEqual(base);
    });

    it('should merge global fields and resource configs deeply', () => {
      const base: UiConfiguration = {
        version: 1,
        fields: {
          title: { label: 'Base Title' },
          desc: { label: 'Base Desc' }
        },
        resources: {
          products: {
            label: 'Catalog',
            fields: {
              price: { label: 'Cost' }
            }
          }
        }
      };

      const overrides: UiConfiguration = {
        fields: {
          desc: { label: 'Overridden Desc', control: 'textarea' }
        },
        resources: {
          products: {
            label: 'Store Catalog',
            list: { columns: ['price', 'title'] },
            operations: { list: 'listProducts' }
          },
          orders: {
            label: 'Purchases'
          }
        }
      };

      const merged = service.mergeConfigurations(base, overrides)!;
      expect(merged.version).toBe(1);
      expect(merged.fields?.['title']?.label).toBe('Base Title');
      expect(merged.fields?.['desc']?.label).toBe('Overridden Desc');
      expect(merged.fields?.['desc']?.control).toBe('textarea');

      expect(merged.resources?.['products']?.label).toBe('Store Catalog');
      expect(merged.resources?.['products']?.fields?.['price']?.label).toBe('Cost');
      expect(merged.resources?.['products']?.list?.columns).toEqual(['price', 'title']);
      expect(merged.resources?.['products']?.operations?.list).toBe('listProducts');
      expect(merged.resources?.['orders']?.label).toBe('Purchases');
    });

    it('should deeply merge page configurations, metrics, filters, and actions', () => {
      const base: UiConfiguration = {
        pages: {
          'orders-page': {
            id: 'orders-page',
            title: 'Base Orders',
            filters: {
              searchFields: ['id', 'clientName']
            },
            table: {
              pageSize: 10,
              columns: [
                { field: 'id', label: 'ID', type: 'monospace' }
              ]
            },
            actions: {
              rowActions: {
                viewDetails: true,
                edit: false
              }
            }
          }
        }
      };

      const overrides: UiConfiguration = {
        pages: {
          'orders-page': {
            title: 'Custom Orders Dashboard',
            filters: {
              statusField: 'status'
            },
            table: {
              pageSize: 25,
              columns: [
                { field: 'id', label: 'ID', type: 'monospace' },
                { field: 'status', label: 'Status', type: 'status_badge' }
              ]
            },
            actions: {
              primaryCreateLabel: '+ Novo Pedido',
              rowActions: {
                edit: true,
                delete: true
              }
            },
            metrics: [
              {
                id: 'total',
                label: 'Total',
                type: 'count_all',
                colorScheme: 'default'
              }
            ]
          }
        }
      };

      const merged = service.mergeConfigurations(base, overrides)!;
      const mergedPage = merged.pages?.['orders-page'];

      expect(mergedPage).toBeDefined();
      expect(mergedPage?.title).toBe('Custom Orders Dashboard');
      expect(mergedPage?.filters?.searchFields).toEqual(['id', 'clientName']);
      expect(mergedPage?.filters?.statusField).toBe('status');
      expect(mergedPage?.table?.pageSize).toBe(25);
      expect(mergedPage?.table?.columns?.length).toBe(2);
      expect(mergedPage?.actions?.primaryCreateLabel).toBe('+ Novo Pedido');
      expect(mergedPage?.actions?.rowActions?.viewDetails).toBe(true);
      expect(mergedPage?.actions?.rowActions?.edit).toBe(true);
      expect(mergedPage?.actions?.rowActions?.delete).toBe(true);
      expect(mergedPage?.metrics?.length).toBe(1);
    });
  });

  describe('Dashboard Model Representation (Generic & Agnostic)', () => {
    it('should fully represent a rich dashboard page without API-specific hardcoding', () => {
      const fullDashboardConfig: UiConfiguration = {
        version: 1,
        title: 'Enterprise Management Canvas',
        pages: {
          'orders-page': {
            id: 'orders-page',
            resourceId: 'orders',
            slug: 'pedidos',
            title: 'Pedidos',
            description: 'Painel de acompanhamento e gestão de pedidos',
            icon: 'receipt_long',
            order: 1,
            displayMode: 'dashboard',
            operations: {
              list: 'getOrders',
              create: 'createOrder',
              details: 'getOrderById',
              update: 'updateOrder',
              delete: 'deleteOrder',
              custom: ['cancelOrder', 'approveOrder']
            },
            metrics: [
              {
                id: 'total',
                label: 'Total',
                icon: 'receipt_long',
                type: 'count_all',
                colorScheme: 'default'
              },
              {
                id: 'pending',
                label: 'Pendentes',
                icon: 'hourglass_empty',
                type: 'count_matching',
                field: 'status',
                matchingValue: 'pending',
                colorScheme: 'warning'
              },
              {
                id: 'processing',
                label: 'Em processamento',
                icon: 'sync',
                type: 'count_matching',
                field: 'status',
                matchingValue: 'processing',
                colorScheme: 'info'
              },
              {
                id: 'completed',
                label: 'Concluídos hoje',
                icon: 'check_circle',
                type: 'count_matching',
                field: 'status',
                matchingValue: 'completed',
                colorScheme: 'success'
              }
            ],
            filters: {
              searchFields: ['id', 'clientName', 'email'],
              searchPlaceholder: 'Buscar por ID, cliente ou email...',
              statusField: 'status',
              dateField: 'createdAt'
            },
            table: {
              pageSize: 10,
              pageSizeOptions: [10, 25, 50, 100],
              defaultSortField: 'createdAt',
              defaultSortOrder: 'desc',
              columns: [
                { field: 'id', label: 'ID', type: 'monospace', sortable: true },
                { field: 'clientName', label: 'Cliente', type: 'text', sortable: true },
                { field: 'totalAmount', label: 'Valor Total', type: 'currency', sortable: true },
                {
                  field: 'status',
                  label: 'Status',
                  type: 'status_badge',
                  sortable: true,
                  statusBadgeMap: {
                    pending: { label: 'Pendente', color: 'warning', icon: 'hourglass_empty' },
                    processing: { label: 'Em processamento', color: 'info', icon: 'sync' },
                    completed: { label: 'Concluído', color: 'success', icon: 'check_circle' },
                    cancelled: { label: 'Cancelado', color: 'danger', icon: 'cancel' }
                  }
                },
                { field: 'createdAt', label: 'Criado em', type: 'date', sortable: true }
              ]
            },
            actions: {
              primaryCreateActionId: 'createOrder',
              primaryCreateLabel: '+ Adicionar pedido',
              rowActions: {
                viewDetails: true,
                edit: true,
                delete: true,
                customActionOperations: ['cancelOrder']
              }
            }
          }
        }
      };

      const normalized = service.normalizeConfiguration(fullDashboardConfig);
      expect(normalized).toBeDefined();
      expect(normalized?.version).toBe(1);

      const page = service.getPageConfig(normalized, 'pedidos');
      expect(page).toBeDefined();
      expect(page?.id).toBe('orders-page');
      expect(page?.metrics?.length).toBe(4);
      expect(page?.table?.columns?.length).toBe(5);
      expect(page?.table?.columns?.[3].statusBadgeMap?.['completed'].label).toBe('Concluído');
      expect(page?.actions?.primaryCreateLabel).toBe('+ Adicionar pedido');
      expect(page?.actions?.rowActions?.delete).toBe(true);
    });
  });

  describe('Integrated Validation and Safe Resolution', () => {
    it('should validate and sanitize configurations through UiConfigurationService delegation', () => {
      const corruptConfig: UiConfiguration = {
        pages: {
          'bad-page': {
            id: 'bad-page',
            slug: 'invalid slug with spaces!',
            operations: {
              list: 'ghostOp'
            }
          }
        }
      };

      const valResult = service.validateConfiguration(corruptConfig, null);
      expect(valResult.valid).toBe(false);
      expect(valResult.hasErrors).toBe(true);

      const sanitized = service.sanitizeConfiguration(corruptConfig, null);
      expect(sanitized?.pages?.['bad-page']?.slug).toBe('invalid-slug-with-spaces');
    });

    it('should resolve safe page configuration without runtime crashes even with empty/broken input', () => {
      const resolved = service.getSafeResolvedPageConfig(null, null, null);
      expect(resolved).toBeDefined();
      expect(resolved.displayMode).toBe('dashboard');
      expect(resolved.hidden).toBe(false);
    });
  });

  describe('getCustomPages', () => {
    it('should return empty array when configuration is null or undefined', () => {
      expect(service.getCustomPages(null)).toEqual([]);
      expect(service.getCustomPages(undefined)).toEqual([]);
    });

    it('should extract and sort custom pages from top-level pages and resource pages', () => {
      const config: UiConfiguration = {
        resources: {
          products: {
            label: 'Produtos',
            order: 3,
            page: {
              id: 'products-page',
              title: 'Catálogo de Produtos',
              order: 3
            }
          },
          archived: {
            hidden: true,
            page: {
              id: 'archived-page',
              title: 'Arquivo'
            }
          }
        },
        pages: {
          'orders-page': {
            id: 'orders-page',
            title: 'Pedidos CRUD',
            order: 1,
            slug: 'pedidos'
          },
          'customers-page': {
            id: 'customers-page',
            title: 'Clientes',
            order: 2,
            slug: 'clientes'
          },
          'hidden-page': {
            id: 'hidden-page',
            title: 'Oculta',
            hidden: true
          }
        }
      };

      const pages = service.getCustomPages(config);
      expect(pages.length).toBe(3);

      expect(pages[0].id).toBe('orders-page');
      expect(pages[0].title).toBe('Pedidos CRUD');

      expect(pages[1].id).toBe('customers-page');
      expect(pages[1].title).toBe('Clientes');

      expect(pages[2].id).toBe('products-page');
      expect(pages[2].title).toBe('Catálogo de Produtos');
    });
  });

  describe('Exhaustive Configuration States: Missing, Partial, Complete, Legacy and Invalid', () => {
    const sampleResourceConfig: UiResourceConfiguration = {
      label: 'Pedidos'
    };

    it('1. State: MISSING / NULL / UNDEFINED configuration', () => {
      // Normalization
      expect(service.normalizeConfiguration(null)).toBeNull();
      expect(service.normalizeConfiguration(undefined)).toBeNull();

      // Page resolution
      const safeConfig = service.getSafeResolvedPageConfig(null, sampleResourceConfig, null);
      expect(safeConfig).toBeDefined();
      expect(safeConfig.title).toBe('Pedidos');
      expect(safeConfig.displayMode).toBe('dashboard');

      // Custom pages list
      expect(service.getCustomPages(null)).toEqual([]);
      expect(service.getCustomPages(undefined)).toEqual([]);

      // Resource config query
      expect(service.getResourceConfig(null, 'orders')).toBeNull();
      expect(service.getPageConfig(null, 'orders')).toBeNull();
    });

    it('2. State: PARTIAL configuration (missing operations, table columns or metrics)', () => {
      const partialConfig: UiConfiguration = {
        pages: {
          'minimal-orders': {
            id: 'minimal-orders',
            resourceId: 'orders',
            title: 'Pedidos Parcial'
            // Omitted: operations, table, metrics, actions, slug
          }
        }
      };

      const normalized = service.normalizeConfiguration(partialConfig);
      expect(normalized).toBeDefined();
      expect(normalized?.version).toBe(CURRENT_UI_CONFIGURATION_VERSION);

      const page = service.getPageConfig(normalized, 'minimal-orders');
      expect(page).toBeDefined();
      expect(page?.title).toBe('Pedidos Parcial');

      // Safe resolution merges smart defaults
      const resolved = service.getSafeResolvedPageConfig(page, sampleResourceConfig, null);
      expect(resolved.id).toBe('minimal-orders');
      expect(resolved.displayMode).toBe('dashboard');
      expect(resolved.hidden).toBe(false);
    });

    it('3. State: COMPLETE configuration (multi-page, custom actions, filtered metrics, column maps)', () => {
      const completeConfig: UiConfiguration = {
        version: 1,
        title: 'Enterprise ERP Suite',
        pages: {
          'orders-page': {
            id: 'orders-page',
            resourceId: 'orders',
            slug: 'pedidos-gerais',
            title: 'Gestão de Pedidos',
            icon: 'receipt_long',
            displayMode: 'dashboard',
            order: 1,
            operations: {
              list: 'listOrders',
              create: 'createOrder',
              details: 'getOrderById',
              update: 'updateOrder',
              delete: 'deleteOrder'
            },
            metrics: [
              { id: 'm1', label: 'Total Pedidos', type: 'count_all', colorScheme: 'primary', icon: 'shopping_bag' },
              { id: 'm2', label: 'Faturamento', type: 'sum_field', field: 'totalAmount', format: 'currency', colorScheme: 'success' },
              { id: 'm3', label: 'Pendentes', type: 'count_matching', field: 'status', matchingValue: 'PENDING', colorScheme: 'warning' },
              { id: 'm4', label: 'Ticket Médio', type: 'sum_field', field: 'totalAmount', format: 'currency', colorScheme: 'info' }
            ],
            table: {
              columns: [
                { field: 'orderId', label: 'Código', type: 'monospace', sortable: true },
                { field: 'customerName', label: 'Cliente', type: 'text', sortable: true },
                { field: 'totalAmount', label: 'Valor', type: 'currency', sortable: true },
                {
                  field: 'status',
                  label: 'Situação',
                  type: 'status_badge',
                  statusBadgeMap: {
                    PAID: { label: 'Pago', color: 'success' },
                    PENDING: { label: 'Pendente', color: 'warning' },
                    CANCELLED: { label: 'Cancelado', color: 'danger' }
                  }
                }
              ],
              pageSize: 25,
              pageSizeOptions: [10, 25, 50, 100],
              defaultSortField: 'totalAmount',
              defaultSortOrder: 'desc'
            },
            actions: {
              primaryCreateLabel: '+ Novo Pedido',
              rowActions: {
                viewDetails: true,
                edit: true,
                delete: true,
                customActions: [
                  {
                    id: 'act-cancel',
                    operationId: 'cancelOrder',
                    label: 'Cancelar',
                    style: 'danger',
                    danger: true,
                    confirmation: true,
                    icon: 'cancel'
                  },
                  {
                    id: 'act-dispatch',
                    operationId: 'dispatchOrder',
                    label: 'Despachar',
                    style: 'default',
                    icon: 'local_shipping'
                  }
                ]
              }
            }
          }
        }
      };

      const normalized = service.normalizeConfiguration(completeConfig);
      expect(normalized?.version).toBe(1);
      expect(normalized?.title).toBe('Enterprise ERP Suite');

      const page = service.getPageConfig(normalized, 'pedidos-gerais');
      expect(page?.id).toBe('orders-page');
      expect(page?.metrics?.length).toBe(4);
      expect(page?.table?.columns?.length).toBe(4);
      expect(page?.actions?.rowActions?.customActions?.length).toBe(2);

      const customPages = service.getCustomPages(normalized);
      expect(customPages.length).toBe(1);
      expect(customPages[0].title).toBe('Gestão de Pedidos');
    });

    it('4. State: LEGACY / OLD configuration (unversioned, embedded page, deprecated structures)', () => {
      const legacyConfig: UiConfiguration = {
        title: 'Legacy System v0',
        // version intentionally missing
        resources: {
          orders: {
            label: 'Pedidos Legados',
            order: 2,
            page: {
              id: 'resource-orders',
              title: 'Pedidos Legados'
            },
            list: {
              columns: ['orderId', 'customerName', 'totalAmount']
            }
          }
        }
      };

      const normalized = service.normalizeConfiguration(legacyConfig);
      expect(normalized?.version).toBe(CURRENT_UI_CONFIGURATION_VERSION);
      expect(normalized?.title).toBe('Legacy System v0');

      const resConfig = service.getResourceConfig(normalized, 'orders');
      expect(resConfig?.label).toBe('Pedidos Legados');

      const customPages = service.getCustomPages(normalized);
      expect(customPages.length).toBe(1);
      expect(customPages[0].id).toBe('resource-orders');
      expect(customPages[0].title).toBe('Pedidos Legados');
    });

    it('5. State: INVALID / CORRUPTED configuration', () => {
      const corruptedConfig: UiConfiguration = {
        title: 'Corrupted Config',
        pages: {
          'broken-page': {
            id: 'broken-page',
            slug: '///invalid slug///',
            operations: {
              list: 'non_existent_op_999'
            },
            metrics: [
              { label: 'Broken Metric', type: 'invalid_type' as unknown as 'count_all' }
            ]
          }
        }
      };

      const validation = service.validateConfiguration(corruptedConfig, null);
      expect(validation.valid).toBe(false);
      expect(validation.hasErrors).toBe(true);
      expect(validation.errors.length).toBeGreaterThan(0);

      // Sanitization repairs what it can and ensures safe fallback
      const sanitized = service.sanitizeConfiguration(corruptedConfig, null);
      expect(sanitized).toBeDefined();
      expect(sanitized?.pages?.['broken-page']?.slug).toBe('invalid-slug');
    });
  });
});


