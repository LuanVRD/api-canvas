import { TestBed } from '@angular/core/testing';
import { UiConfigurationService } from './ui-configuration.service';
import { UiConfiguration } from '../models/ui-configuration.model';
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
            list: { columns: ['price', 'title'] }
          },
          orders: {
            label: 'Purchases'
          }
        }
      };

      const merged = service.mergeConfigurations(base, overrides)!;
      expect(merged.fields?.['title']?.label).toBe('Base Title');
      expect(merged.fields?.['desc']?.label).toBe('Overridden Desc');
      expect(merged.fields?.['desc']?.control).toBe('textarea');

      expect(merged.resources?.['products']?.label).toBe('Store Catalog');
      expect(merged.resources?.['products']?.fields?.['price']?.label).toBe('Cost');
      expect(merged.resources?.['products']?.list?.columns).toEqual(['price', 'title']);
      expect(merged.resources?.['orders']?.label).toBe('Purchases');
    });
  });
});
