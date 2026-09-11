import { TestBed } from '@angular/core/testing';
import { UiConfigurationValidatorService } from './ui-configuration-validator.service';
import { UiConfiguration } from '../models/ui-configuration.model';
import { ApiDefinition } from '../models/api-definition.model';

describe('UiConfigurationValidatorService', () => {
  let validator: UiConfigurationValidatorService;

  const mockApiDefinition: ApiDefinition = {
    title: 'E-Commerce Store API',
    version: '1.0.0',
    baseUrl: 'https://api.example.com/v1',
    resources: [
      {
        id: 'products',
        name: 'products',
        label: 'Products',
        operations: [
          {
            id: 'listProducts',
            operationId: 'listProducts',
            method: 'GET',
            path: '/products',
            type: 'list',
            parameters: [],
            responses: [
              {
                statusCode: '200',
                description: 'Success',
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      price: { type: 'number' },
                      category: { type: 'string' },
                      inStock: { type: 'boolean' },
                      createdAt: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            ]
          },
          {
            id: 'getProductById',
            operationId: 'getProductById',
            method: 'GET',
            path: '/products/{id}',
            type: 'details',
            parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }],
            responses: []
          },
          {
            id: 'createProduct',
            operationId: 'createProduct',
            method: 'POST',
            path: '/products',
            type: 'create',
            parameters: [],
            responses: []
          },
          {
            id: 'deleteProduct',
            operationId: 'deleteProduct',
            method: 'DELETE',
            path: '/products/{id}',
            type: 'delete',
            parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }],
            responses: []
          },
          {
            id: 'updateProduct',
            operationId: 'updateProduct',
            method: 'PUT',
            path: '/products/{id}',
            type: 'update',
            parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }],
            responses: []
          }
        ]
      },
      {
        id: 'orders',
        name: 'orders',
        label: 'Orders',
        operations: [
          {
            id: 'listOrders',
            operationId: 'listOrders',
            method: 'GET',
            path: '/orders',
            type: 'list',
            parameters: [],
            responses: [
              {
                statusCode: '200',
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          orderId: { type: 'string' },
                          totalAmount: { type: 'number' },
                          status: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UiConfigurationValidatorService]
    });
    validator = TestBed.inject(UiConfigurationValidatorService);
  });

  describe('Null, Undefined and Empty Configurations', () => {
    it('should validate null or undefined config as valid with no issues', () => {
      const resultNull = validator.validate(null);
      expect(resultNull.valid).toBe(true);
      expect(resultNull.hasErrors).toBe(false);
      expect(resultNull.hasWarnings).toBe(false);
      expect(resultNull.issues.length).toBe(0);

      const resultUndefined = validator.validate(undefined);
      expect(resultUndefined.valid).toBe(true);
    });

    it('should validate empty configuration object as valid', () => {
      const result = validator.validate({});
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Valid Full Dashboard Configurations', () => {
    it('should pass validation with zero errors and warnings for a fully compliant config', () => {
      const validConfig: UiConfiguration = {
        version: 1,
        title: 'Loja Virtual Canvas',
        pages: {
          'products-page': {
            id: 'products-page',
            resourceId: 'products',
            title: 'Catálogo de Produtos',
            slug: 'produtos',
            displayMode: 'dashboard',
            operations: {
              list: 'listProducts',
              details: 'getProductById',
              create: 'createProduct',
              update: 'updateProduct',
              delete: 'deleteProduct'
            },
            table: {
              columns: [
                { field: 'id', label: 'ID', type: 'text' },
                { field: 'name', label: 'Nome', type: 'text' },
                { field: 'price', label: 'Preço', type: 'currency' }
              ]
            },
            metrics: [
              {
                id: 'total_revenue',
                label: 'Faturamento Total',
                type: 'sum_field',
                field: 'price'
              },
              {
                id: 'in_stock_count',
                label: 'Em Estoque',
                type: 'count_matching',
                field: 'inStock',
                matchingValue: true
              }
            ],
            filters: {
              searchFields: ['name'],
              statusField: 'category'
            },
            actions: {
              primaryCreateActionId: 'createProduct',
              primaryCreateLabel: '+ Novo Produto'
            }
          }
        }
      };

      const result = validator.validate(validConfig, mockApiDefinition);
      expect(result.valid).toBe(true);
      expect(result.hasErrors).toBe(false);
      expect(result.hasWarnings).toBe(false);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('Slug and Identifier Validation', () => {
    it('should detect invalid slug format with spaces, uppercase or special symbols', () => {
      const config: UiConfiguration = {
        pages: {
          'bad-page': {
            id: 'bad-page',
            slug: 'Produtos Em Estoque!'
          }
        }
      };

      const result = validator.validate(config, mockApiDefinition);
      expect(result.valid).toBe(false);
      expect(result.hasErrors).toBe(true);

      const issue = result.issues.find((i) => i.code === 'INVALID_SLUG_FORMAT');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('error');
      expect(issue?.path).toBe('pages.bad-page.slug');
    });

    it('should detect duplicate slugs across pages and resources', () => {
      const config: UiConfiguration = {
        resources: {
          products: {
            slug: 'catalogo'
          }
        },
        pages: {
          'custom-catalog': {
            id: 'custom-catalog',
            slug: 'catalogo'
          }
        }
      };

      const result = validator.validate(config, mockApiDefinition);
      expect(result.valid).toBe(false);

      const dupIssue = result.issues.find((i) => i.code === 'DUPLICATE_SLUG');
      expect(dupIssue).toBeDefined();
      expect(dupIssue?.severity).toBe('error');
    });

    it('should detect duplicate page identifiers', () => {
      const config: UiConfiguration = {
        pages: {
          'page-one': { id: 'dup-id', title: 'Page 1' },
          'page-two': { id: 'dup-id', title: 'Page 2' }
        }
      };

      const result = validator.validate(config, mockApiDefinition);
      expect(result.valid).toBe(false);

      const dupIdIssue = result.issues.find((i) => i.code === 'DUPLICATE_IDENTIFIER');
      expect(dupIdIssue).toBeDefined();
      expect(dupIdIssue?.path).toBe('pages.page-two.id');
    });

    it('should validate helper methods isValidSlug and isValidIdentifier', () => {
      expect(validator.isValidSlug('produtos')).toBe(true);
      expect(validator.isValidSlug('pedidos-recentes')).toBe(true);
      expect(validator.isValidSlug('user_123')).toBe(false);
      expect(validator.isValidSlug('Produtos')).toBe(false);
      expect(validator.isValidSlug('com espaco')).toBe(false);

      expect(validator.isValidIdentifier('valid_id_123')).toBe(true);
      expect(validator.isValidIdentifier('valid-id')).toBe(true);
      expect(validator.isValidIdentifier('')).toBe(false);
      expect(validator.isValidIdentifier('id com espaco')).toBe(false);
    });
  });

  describe('Resource and Operation Existence Validation', () => {
    it('should flag error when a page references a non-existent resource in ApiDefinition', () => {
      const config: UiConfiguration = {
        pages: {
          'invoices-page': {
            id: 'invoices-page',
            resourceId: 'non_existent_invoices'
          }
        }
      };

      const result = validator.validate(config, mockApiDefinition);
      expect(result.valid).toBe(false);

      const issue = result.issues.find((i) => i.code === 'RESOURCE_NOT_FOUND');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('error');
      expect(issue?.targetType).toBe('page');
    });

    it('should flag error when configured operations do not exist in ApiDefinition', () => {
      const config: UiConfiguration = {
        pages: {
          'products-page': {
            id: 'products-page',
            resourceId: 'products',
            operations: {
              list: 'nonExistentListOp',
              delete: 'nonExistentDeleteOp'
            }
          }
        }
      };

      const result = validator.validate(config, mockApiDefinition);
      expect(result.valid).toBe(false);

      const listMissing = result.issues.find(
        (i) => i.path === 'pages.products-page.operations.list' && i.code === 'OPERATION_NOT_FOUND'
      );
      expect(listMissing).toBeDefined();
      expect(listMissing?.severity).toBe('error');
    });

    it('should flag error when primaryCreateActionId does not exist', () => {
      const config: UiConfiguration = {
        pages: {
          'products-page': {
            id: 'products-page',
            resourceId: 'products',
            actions: {
              primaryCreateActionId: 'unknownCreateOperation'
            }
          }
        }
      };

      const result = validator.validate(config, mockApiDefinition);
      expect(result.valid).toBe(false);

      const issue = result.issues.find(
        (i) => i.code === 'OPERATION_NOT_FOUND' && i.path === 'pages.products-page.actions.primaryCreateActionId'
      );
      expect(issue).toBeDefined();
      expect(issue?.fallbackApplied).toBeDefined();
    });
  });

  describe('Function vs HTTP Method Compatibility', () => {
    it('should error when a DELETE operation is configured as a list operation', () => {
      const config: UiConfiguration = {
        pages: {
          'products-page': {
            id: 'products-page',
            resourceId: 'products',
            operations: {
              list: 'deleteProduct' // deleteProduct is method DELETE
            }
          }
        }
      };

      const result = validator.validate(config, mockApiDefinition);
      expect(result.valid).toBe(false);

      const issue = result.issues.find((i) => i.code === 'METHOD_INCOMPATIBLE');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('error');
    });

    it('should warn when a GET operation is configured as a delete operation', () => {
      const config: UiConfiguration = {
        pages: {
          'products-page': {
            id: 'products-page',
            resourceId: 'products',
            operations: {
              delete: 'getProductById' // getProductById is method GET
            }
          }
        }
      };

      const result = validator.validate(config, mockApiDefinition);
      const issue = result.issues.find(
        (i) => i.path === 'pages.products-page.operations.delete' && i.code === 'METHOD_INCOMPATIBLE'
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('warning');
    });

    it('should evaluate checkMethodCompatibility properly for different verb roles', () => {
      expect(validator.checkMethodCompatibility('list', 'GET').compatible).toBe(true);
      expect(validator.checkMethodCompatibility('list', 'POST').severity).toBe('warning');
      expect(validator.checkMethodCompatibility('list', 'DELETE').compatible).toBe(false);

      expect(validator.checkMethodCompatibility('create', 'POST').compatible).toBe(true);
      expect(validator.checkMethodCompatibility('create', 'PUT').compatible).toBe(true);
      expect(validator.checkMethodCompatibility('create', 'GET').compatible).toBe(false);

      expect(validator.checkMethodCompatibility('delete', 'DELETE').compatible).toBe(true);
      expect(validator.checkMethodCompatibility('delete', 'GET').compatible).toBe(false);
    });
  });

  describe('Schema, Fields, Columns and Metrics Validation', () => {
    it('should emit a warning when a table column is not found in the response schema properties', () => {
      const config: UiConfiguration = {
        pages: {
          'products-page': {
            id: 'products-page',
            resourceId: 'products',
            table: {
              columns: [
                { field: 'name', label: 'Nome' },
                { field: 'unknownColumnKey', label: 'Coluna Fantasma' }
              ]
            }
          }
        }
      };

      const result = validator.validate(config, mockApiDefinition);
      expect(result.valid).toBe(true); // Warning does not block validity
      expect(result.hasWarnings).toBe(true);

      const colWarning = result.warnings.find(
        (w) => w.code === 'SCHEMA_FIELD_NOT_FOUND' && w.path === 'pages.products-page.table.columns[1].field'
      );
      expect(colWarning).toBeDefined();
      expect(colWarning?.severity).toBe('warning');
    });

    it('should error when a sum_field metric is missing the field property', () => {
      const config: UiConfiguration = {
        pages: {
          'products-page': {
            id: 'products-page',
            resourceId: 'products',
            metrics: [
              {
                id: 'bad_metric',
                label: 'Soma Inválida',
                type: 'sum_field'
                // missing field
              }
            ]
          }
        }
      };

      const result = validator.validate(config, mockApiDefinition);
      expect(result.valid).toBe(false);

      const metricIssue = result.errors.find((e) => e.code === 'INVALID_METRIC_CONFIG');
      expect(metricIssue).toBeDefined();
    });

    it('should warn when a sum_field metric points to a non-numeric schema field', () => {
      const config: UiConfiguration = {
        pages: {
          'products-page': {
            id: 'products-page',
            resourceId: 'products',
            metrics: [
              {
                id: 'sum_name',
                label: 'Soma dos Nomes',
                type: 'sum_field',
                field: 'name' // 'name' is string
              }
            ]
          }
        }
      };

      const result = validator.validate(config, mockApiDefinition);
      expect(result.valid).toBe(true);
      expect(result.hasWarnings).toBe(true);

      const typeWarning = result.warnings.find((w) => w.code === 'FIELD_TYPE_MISMATCH');
      expect(typeWarning).toBeDefined();
    });

    it('should warn when filters reference fields not in response schema', () => {
      const config: UiConfiguration = {
        pages: {
          'products-page': {
            id: 'products-page',
            resourceId: 'products',
            filters: {
              searchFields: ['nonExistentSearch'],
              statusField: 'nonExistentStatus',
              dateField: 'nonExistentDate'
            }
          }
        }
      };

      const result = validator.validate(config, mockApiDefinition);
      const warnings = result.warnings.filter((w) => w.code === 'SCHEMA_FIELD_NOT_FOUND');
      expect(warnings.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Sanitization and Safe Fallback Generation', () => {
    it('should strip missing operations and sanitize invalid slugs into a crash-proof configuration', () => {
      const corruptConfig: UiConfiguration = {
        version: 1,
        title: 'Corrupt Workspace',
        pages: {
          'orders-page': {
            id: 'orders-page',
            resourceId: 'orders',
            slug: 'Pedidos Antigos & Vencidos!',
            displayMode: 'invalid_mode_unknown',
            operations: {
              list: 'listOrders',
              delete: 'ghostDeleteOperation' // missing
            },
            actions: {
              primaryCreateActionId: 'ghostCreateOperation',
              rowActions: {
                customActionOperations: ['validCustom', 'ghostCustom']
              }
            },
            metrics: [
              { label: 'Métrica Válida', type: 'count_all' },
              { label: '', type: 'count_all' } // empty label to be filtered
            ]
          }
        }
      };

      const sanitized = validator.sanitizeConfiguration(corruptConfig, mockApiDefinition);
      expect(sanitized).toBeDefined();

      const page = sanitized?.pages?.['orders-page'];
      expect(page).toBeDefined();
      expect(page?.slug).toBe('pedidos-antigos-vencidos');
      expect(page?.displayMode).toBe('dashboard');
      expect(page?.operations?.list).toBe('listOrders');
      expect(page?.operations?.delete).toBeUndefined(); // stripped
      expect(page?.actions?.primaryCreateActionId).toBeUndefined(); // stripped
      expect(page?.metrics?.length).toBe(1);
    });

    it('should return null when sanitizing null or undefined', () => {
      expect(validator.sanitizeConfiguration(null)).toBeNull();
      expect(validator.sanitizeConfiguration(undefined)).toBeNull();
    });
  });

  describe('Legacy, Partial and Ambiguous Configurations', () => {
    it('should handle legacy config without explicit version, pages or operations', () => {
      const legacyConfig: UiConfiguration = {
        title: 'Legacy API',
        resources: {
          products: {
            label: 'Catálogo de Produtos',
            list: { columns: ['name', 'price'] }
          }
        }
      };

      const result = validator.validate(legacyConfig, mockApiDefinition);
      expect(result.valid).toBe(true);
      expect(result.hasErrors).toBe(false);

      const sanitized = validator.sanitizeConfiguration(legacyConfig, mockApiDefinition);
      expect(sanitized?.version).toBe(1);
      expect(sanitized?.resources?.['products']?.label).toBe('Catálogo de Produtos');
    });

    it('should warn when configuration specifies a future schema version', () => {
      const futureConfig: UiConfiguration = {
        version: 99,
        title: 'Future Workspace'
      };

      const result = validator.validate(futureConfig, mockApiDefinition);
      const futureWarn = result.warnings.find((w) => w.code === 'FUTURE_VERSION');
      expect(futureWarn).toBeDefined();
    });
  });
});
