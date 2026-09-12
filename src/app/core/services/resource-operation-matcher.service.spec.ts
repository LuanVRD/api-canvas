import { TestBed } from '@angular/core/testing';
import { ResourceOperationMatcherService } from './resource-operation-matcher.service';
import { ApiResource } from '../models/api-resource.model';
import { ApiOperation } from '../models/api-operation.model';

describe('ResourceOperationMatcherService', () => {
  let service: ResourceOperationMatcherService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResourceOperationMatcherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('findCompatibleDetailsOperation', () => {
    it('should find the exact child details operation matching a list path', () => {
      const listOp: ApiOperation = {
        id: 'get_users',
        method: 'GET',
        path: '/api/v1/users',
        type: 'list',
        parameters: [],
        responses: []
      };

      const detailsOp: ApiOperation = {
        id: 'get_user_by_id',
        method: 'GET',
        path: '/api/v1/users/{id}',
        type: 'details',
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

      const otherDetailsOp: ApiOperation = {
        id: 'get_order_by_id',
        method: 'GET',
        path: '/api/v1/orders/{orderId}',
        type: 'details',
        parameters: [],
        responses: []
      };

      const resource: ApiResource = {
        id: 'users',
        name: 'users',
        label: 'Users',
        operations: [listOp, otherDetailsOp, detailsOp]
      };

      const result = service.findCompatibleDetailsOperation(resource, listOp);
      expect(result).toBe(detailsOp);
    });

    it('should fallback to first details operation if source operation is not provided', () => {
      const detailsOp: ApiOperation = {
        id: 'get_pet_by_id',
        method: 'GET',
        path: '/pets/{petId}',
        type: 'details',
        parameters: [],
        responses: []
      };

      const resource: ApiResource = {
        id: 'pets',
        name: 'pets',
        label: 'Pets',
        operations: [detailsOp]
      };

      const result = service.findCompatibleDetailsOperation(resource);
      expect(result).toBe(detailsOp);
    });

    it('should return null when resource has no operations', () => {
      const resource: ApiResource = {
        id: 'empty',
        name: 'empty',
        label: 'Empty',
        operations: []
      };
      expect(service.findCompatibleDetailsOperation(resource)).toBeNull();
    });
  });

  describe('findCompatibleDeleteOperation', () => {
    it('should find the exact child delete operation matching a list path', () => {
      const listOp: ApiOperation = {
        id: 'get_products',
        method: 'GET',
        path: '/api/v1/products',
        type: 'list',
        parameters: [],
        responses: []
      };

      const deleteOp: ApiOperation = {
        id: 'delete_product_by_id',
        method: 'DELETE',
        path: '/api/v1/products/{id}',
        type: 'delete',
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

      const otherDeleteOp: ApiOperation = {
        id: 'delete_category_by_id',
        method: 'DELETE',
        path: '/api/v1/categories/{categoryId}',
        type: 'delete',
        parameters: [],
        responses: []
      };

      const resource: ApiResource = {
        id: 'products',
        name: 'products',
        label: 'Products',
        operations: [listOp, otherDeleteOp, deleteOp]
      };

      const result = service.findCompatibleDeleteOperation(resource, listOp);
      expect(result).toBe(deleteOp);
    });

    it('should fallback to first delete operation if source operation is not provided', () => {
      const deleteOp: ApiOperation = {
        id: 'delete_pet_by_id',
        method: 'DELETE',
        path: '/pets/{petId}',
        type: 'delete',
        parameters: [],
        responses: []
      };

      const resource: ApiResource = {
        id: 'pets',
        name: 'pets',
        label: 'Pets',
        operations: [deleteOp]
      };

      const result = service.findCompatibleDeleteOperation(resource);
      expect(result).toBe(deleteOp);
    });

    it('should return null when resource has no DELETE operations', () => {
      const listOp: ApiOperation = {
        id: 'get_items',
        method: 'GET',
        path: '/items',
        type: 'list',
        parameters: [],
        responses: []
      };

      const resource: ApiResource = {
        id: 'items',
        name: 'items',
        label: 'Items',
        operations: [listOp]
      };

      expect(service.findCompatibleDeleteOperation(resource)).toBeNull();
    });
  });

  describe('findCompatibleUpdateOperations and findCompatibleUpdateOperation', () => {
    const listOp: ApiOperation = {
      id: 'get_products',
      method: 'GET',
      path: '/api/v1/products',
      type: 'list',
      parameters: [],
      responses: []
    };

    const detailsOp: ApiOperation = {
      id: 'get_product_by_id',
      method: 'GET',
      path: '/api/v1/products/{id}',
      type: 'details',
      parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }],
      responses: []
    };

    const putOp: ApiOperation = {
      id: 'update_product_put',
      method: 'PUT',
      path: '/api/v1/products/{id}',
      type: 'update',
      parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }],
      responses: []
    };

    const patchOp: ApiOperation = {
      id: 'patch_product',
      method: 'PATCH',
      path: '/api/v1/products/{id}',
      type: 'update',
      parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }],
      responses: []
    };

    const otherPutOp: ApiOperation = {
      id: 'update_category',
      method: 'PUT',
      path: '/api/v1/categories/{catId}',
      type: 'update',
      parameters: [],
      responses: []
    };

    const resource: ApiResource = {
      id: 'products',
      name: 'products',
      label: 'Products',
      operations: [listOp, detailsOp, otherPutOp, putOp, patchOp]
    };

    it('should find all matching update operations for list source operation', () => {
      const results = service.findCompatibleUpdateOperations(resource, listOp);
      expect(results).toContain(putOp);
      expect(results).toContain(patchOp);
      expect(results).not.toContain(otherPutOp);
    });

    it('should find all matching update operations for details source operation', () => {
      const results = service.findCompatibleUpdateOperations(resource, detailsOp);
      expect(results).toContain(putOp);
      expect(results).toContain(patchOp);
      expect(results).not.toContain(otherPutOp);
    });

    it('should find best matching update operation with PUT as default priority', () => {
      const result = service.findCompatibleUpdateOperation(resource, listOp);
      expect(result).toBe(putOp);
    });

    it('should respect preferMethod when PATCH is requested', () => {
      const result = service.findCompatibleUpdateOperation(resource, listOp, 'PATCH');
      expect(result).toBe(patchOp);
    });

    it('should return null when resource has no update operations', () => {
      const noUpdateRes: ApiResource = {
        id: 'read_only',
        name: 'read_only',
        label: 'Read Only',
        operations: [listOp]
      };
      expect(service.findCompatibleUpdateOperation(noUpdateRes)).toBeNull();
      expect(service.findCompatibleUpdateOperations(noUpdateRes)).toEqual([]);
    });
  });

  describe('resolveParameters', () => {
    const detailsOpWithPetId: ApiOperation = {
      id: 'get_pet_by_id',
      method: 'GET',
      path: '/pets/{petId}',
      type: 'details',
      parameters: [
        {
          name: 'petId',
          location: 'path',
          required: true,
          schema: { type: 'integer' }
        }
      ],
      responses: []
    };

    it('should resolve parameter when field name exactly matches parameter name', () => {
      const record = { petId: 101, name: 'Doggie', status: 'available' };
      const result = service.resolveParameters(detailsOpWithPetId, record);

      expect(result.canAutoResolve).toBe(true);
      expect(result.resolvedParams).toEqual({ petId: '101' });
      expect(result.missingParams.length).toBe(0);
    });

    it('should resolve parameter when field uses snake_case variation (e.g. pet_id for petId)', () => {
      const record = { pet_id: 202, name: 'Kitty' };
      const result = service.resolveParameters(detailsOpWithPetId, record);

      expect(result.canAutoResolve).toBe(true);
      expect(result.resolvedParams).toEqual({ petId: '202' });
      expect(result.missingParams.length).toBe(0);
    });

    it('should resolve parameter when field is named "id" or "_id" without assuming it must be id', () => {
      const record = { id: 'guid-999', title: 'Article' };
      const detailsOpWithSlug: ApiOperation = {
        id: 'get_article',
        method: 'GET',
        path: '/articles/{slug}',
        type: 'details',
        parameters: [
          {
            name: 'slug',
            location: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: []
      };

      // Since slug is not in record, it falls back to primary key id if single param
      const result = service.resolveParameters(detailsOpWithSlug, record);
      expect(result.canAutoResolve).toBe(true);
      expect(result.resolvedParams).toEqual({ slug: 'guid-999' });
    });

    it('should inherit parent path parameters from active context', () => {
      const subResourceDetailsOp: ApiOperation = {
        id: 'get_user_post',
        method: 'GET',
        path: '/users/{userId}/posts/{postId}',
        type: 'details',
        parameters: [
          {
            name: 'userId',
            location: 'path',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'postId',
            location: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: []
      };

      const record = { postId: 42, title: 'My Post' };
      const activeContext = { userId: 'usr-123' };

      const result = service.resolveParameters(subResourceDetailsOp, record, activeContext);
      expect(result.canAutoResolve).toBe(true);
      expect(result.resolvedParams).toEqual({
        userId: 'usr-123',
        postId: '42'
      });
      expect(result.missingParams.length).toBe(0);
    });

    it('should return missingParams when required path parameters cannot be found in record or context', () => {
      const complexOp: ApiOperation = {
        id: 'get_complex_item',
        method: 'GET',
        path: '/orgs/{orgId}/departments/{deptCode}/members/{memberId}',
        type: 'details',
        parameters: [
          { name: 'orgId', location: 'path', required: true, schema: { type: 'string' } },
          { name: 'deptCode', location: 'path', required: true, schema: { type: 'string' } },
          { name: 'memberId', location: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const record = { memberId: 'm-55' };
      const activeContext = { orgId: 'org-1' };

      const result = service.resolveParameters(complexOp, record, activeContext);
      expect(result.canAutoResolve).toBe(false);
      expect(result.resolvedParams).toEqual({
        orgId: 'org-1',
        memberId: 'm-55'
      });
      expect(result.missingParams.length).toBe(1);
      expect(result.missingParams[0].name).toBe('deptCode');
    });
  });

  describe('findCompatibleListOperation', () => {
    it('should find operation classified with type "list"', () => {
      const op1: ApiOperation = { id: 'get_all', method: 'GET', path: '/items', type: 'list', parameters: [], responses: [] };
      const op2: ApiOperation = { id: 'get_extra', method: 'GET', path: '/items/summary', type: 'details', parameters: [], responses: [] };
      const resource: ApiResource = { id: 'items', name: 'items', label: 'Items', operations: [op2, op1] };

      expect(service.findCompatibleListOperation(resource)).toBe(op1);
    });

    it('should prefer shortest GET collection path without path parameters', () => {
      const summaryOp: ApiOperation = { id: 'get_summary', method: 'GET', path: '/items/summary', type: 'details', parameters: [], responses: [] };
      const listOp: ApiOperation = { id: 'get_items', method: 'GET', path: '/items', type: 'list', parameters: [], responses: [] };
      const resource: ApiResource = { id: 'items', name: 'items', label: 'Items', operations: [summaryOp, listOp] };

      expect(service.findCompatibleListOperation(resource)).toBe(listOp);
    });

    it('should respect explicit operation ID', () => {
      const summaryOp: ApiOperation = { id: 'get_summary', method: 'GET', path: '/items/summary', type: 'details', parameters: [], responses: [] };
      const listOp: ApiOperation = { id: 'get_items', method: 'GET', path: '/items', type: 'list', parameters: [], responses: [] };
      const resource: ApiResource = { id: 'items', name: 'items', label: 'Items', operations: [summaryOp, listOp] };

      expect(service.findCompatibleListOperation(resource, 'get_summary')).toBe(summaryOp);
    });

    it('should return null if resource is empty', () => {
      const resource: ApiResource = { id: 'empty', name: 'empty', label: 'Empty', operations: [] };
      expect(service.findCompatibleListOperation(resource)).toBeNull();
    });
  });

  describe('findCompatibleCreateOperation', () => {
    it('should match POST operation whose path equals the source list base path', () => {
      const listOp: ApiOperation = { id: 'get_orders', method: 'GET', path: '/api/v1/orders', type: 'list', parameters: [], responses: [] };
      const postOp: ApiOperation = { id: 'create_order', method: 'POST', path: '/api/v1/orders', type: 'create', parameters: [], responses: [] };
      const cancelOp: ApiOperation = { id: 'cancel_order', method: 'POST', path: '/api/v1/orders/{id}/cancel', type: 'action', parameters: [], responses: [] };
      const resource: ApiResource = { id: 'orders', name: 'orders', label: 'Orders', operations: [listOp, cancelOp, postOp] };

      expect(service.findCompatibleCreateOperation(resource, listOp)).toBe(postOp);
    });

    it('should prefer classified "create" or POST with no path parameters', () => {
      const postWithParams: ApiOperation = { id: 'post_action', method: 'POST', path: '/tasks/{id}/actions', type: 'action', parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }], responses: [] };
      const createOp: ApiOperation = { id: 'create_task', method: 'POST', path: '/tasks', type: 'create', parameters: [], responses: [] };
      const resource: ApiResource = { id: 'tasks', name: 'tasks', label: 'Tasks', operations: [postWithParams, createOp] };

      expect(service.findCompatibleCreateOperation(resource)).toBe(createOp);
    });

    it('should return null when no POST operations exist', () => {
      const listOp: ApiOperation = { id: 'get_items', method: 'GET', path: '/items', type: 'list', parameters: [], responses: [] };
      const resource: ApiResource = { id: 'items', name: 'items', label: 'Items', operations: [listOp] };

      expect(service.findCompatibleCreateOperation(resource)).toBeNull();
    });
  });

  describe('findOperationInResourceOrApi', () => {
    const op1: ApiOperation = { id: 'get_users', operationId: 'getUsersList', method: 'GET', path: '/users', type: 'list', parameters: [], responses: [] };
    const op2: ApiOperation = { id: 'post_user', method: 'POST', path: '/users', type: 'create', parameters: [], responses: [] };
    const resource: ApiResource = { id: 'users', name: 'users', label: 'Users', operations: [op1, op2] };

    it('should find operation by exact id or operationId', () => {
      expect(service.findOperationInResourceOrApi('get_users', resource)).toBe(op1);
      expect(service.findOperationInResourceOrApi('getUsersList', resource)).toBe(op1);
    });

    it('should find operation case-insensitively', () => {
      expect(service.findOperationInResourceOrApi('GETUSERSLIST', resource)).toBe(op1);
    });

    it('should find operation by method and path format', () => {
      expect(service.findOperationInResourceOrApi('POST /users', resource)).toBe(op2);
    });

    it('should search across apiDefinition if resource does not match', () => {
      const otherOp: ApiOperation = { id: 'get_other', method: 'GET', path: '/other', type: 'list', parameters: [], responses: [] };
      const otherRes: ApiResource = { id: 'other', name: 'other', label: 'Other', operations: [otherOp] };
      const apiDef = { title: 'API', version: '1.0', baseUrl: '', resources: [resource, otherRes] };

      expect(service.findOperationInResourceOrApi('get_other', resource, apiDef)).toBe(otherOp);
    });
  });

  describe('resolveResourcePage', () => {
    it('should resolve standard conventional CRUD routes without warnings', () => {
      const listOp: ApiOperation = { id: 'get_users', method: 'GET', path: '/api/v1/users', type: 'list', parameters: [], responses: [] };
      const createOp: ApiOperation = { id: 'create_user', method: 'POST', path: '/api/v1/users', type: 'create', parameters: [], responses: [] };
      const detailsOp: ApiOperation = { id: 'get_user_by_id', method: 'GET', path: '/api/v1/users/{id}', type: 'details', parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }], responses: [] };
      const updateOp: ApiOperation = { id: 'update_user', method: 'PUT', path: '/api/v1/users/{id}', type: 'update', parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }], responses: [] };
      const deleteOp: ApiOperation = { id: 'delete_user', method: 'DELETE', path: '/api/v1/users/{id}', type: 'delete', parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }], responses: [] };

      const resource: ApiResource = {
        id: 'users',
        name: 'users',
        label: 'Users',
        operations: [listOp, createOp, detailsOp, updateOp, deleteOp]
      };

      const resolved = service.resolveResourcePage({ resource });

      expect(resolved.resourceId).toBe('users');
      expect(resolved.list).toBe(listOp);
      expect(resolved.create).toBe(createOp);
      expect(resolved.details).toBe(detailsOp);
      expect(resolved.update).toBe(updateOp);
      expect(resolved.delete).toBe(deleteOp);
      expect(resolved.updateOperations).toEqual([updateOp]);
      expect(resolved.warnings.length).toBe(0);
      expect(resolved.explicitOverrides.list).toBeFalsy();
    });

    it('should resolve multiple update operations (PUT + PATCH) and preserve both', () => {
      const listOp: ApiOperation = { id: 'get_orders', method: 'GET', path: '/orders', type: 'list', parameters: [], responses: [] };
      const putOp: ApiOperation = { id: 'put_order', method: 'PUT', path: '/orders/{id}', type: 'update', parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }], responses: [] };
      const patchOp: ApiOperation = { id: 'patch_order_status', method: 'PATCH', path: '/orders/{id}', type: 'update', parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }], responses: [] };

      const resource: ApiResource = {
        id: 'orders',
        name: 'orders',
        label: 'Orders',
        operations: [listOp, putOp, patchOp]
      };

      const resolved = service.resolveResourcePage({ resource });

      expect(resolved.update).toBe(putOp);
      expect(resolved.updateOperations.length).toBe(2);
      expect(resolved.updateOperations).toContain(putOp);
      expect(resolved.updateOperations).toContain(patchOp);
    });

    it('should discover and resolve custom POST/RPC actions', () => {
      const listOp: ApiOperation = { id: 'get_orders', method: 'GET', path: '/orders', type: 'list', parameters: [], responses: [] };
      const cancelOp: ApiOperation = { id: 'cancel_order', method: 'POST', path: '/orders/{id}/cancel', summary: 'Cancel Order', type: 'action', parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }], responses: [] };
      const shipOp: ApiOperation = { id: 'ship_order', method: 'POST', path: '/orders/{id}/ship', summary: 'Ship Order', type: 'action', parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }], responses: [] };

      const resource: ApiResource = {
        id: 'orders',
        name: 'orders',
        label: 'Orders',
        operations: [listOp, cancelOp, shipOp]
      };

      const resolved = service.resolveResourcePage({ resource });

      expect(resolved.customActions.length).toBe(2);
      expect(resolved.customActions.map((a) => a.id)).toEqual(['cancel_order', 'ship_order']);
      expect(resolved.customActions[0].label).toBe('Cancel Order');
      expect(resolved.customActions[0].isExplicit).toBe(false);
    });

    it('should resolve explicitly configured custom action descriptors with style, confirmation and inputMode', () => {
      const listOp: ApiOperation = { id: 'get_orders', method: 'GET', path: '/orders', type: 'list', parameters: [], responses: [] };
      const statusOp: ApiOperation = {
        id: 'patch_status',
        method: 'PATCH',
        path: '/orders/{id}/status',
        type: 'action',
        summary: 'Patch Status',
        parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { schema: { type: 'object' } },
        responses: []
      };
      const duplicateOp: ApiOperation = {
        id: 'post_duplicate',
        method: 'POST',
        path: '/orders/{id}/duplicate',
        type: 'action',
        summary: 'Duplicate Order',
        parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }],
        responses: []
      };

      const resource: ApiResource = {
        id: 'orders',
        name: 'orders',
        label: 'Orders',
        operations: [listOp, statusOp, duplicateOp]
      };

      const pageConfig = {
        actions: {
          rowActions: {
            customActions: [
              {
                id: 'custom_status',
                operationId: 'patch_status',
                label: 'Alterar Status',
                icon: 'edit_note',
                style: 'primary',
                inputMode: 'dialog'
              },
              {
                id: 'custom_dup',
                operationId: 'post_duplicate',
                label: 'Duplicar Imediatamente',
                icon: 'content_copy',
                style: 'default',
                inputMode: 'direct',
                confirmation: false
              }
            ]
          }
        }
      };

      const resolved = service.resolveResourcePage({ resource, pageConfig });

      expect(resolved.customActions.length).toBe(2);
      const action1 = resolved.customActions.find((a) => a.id === 'custom_status')!;
      expect(action1).toBeDefined();
      expect(action1.label).toBe('Alterar Status');
      expect(action1.icon).toBe('edit_note');
      expect(action1.style).toBe('primary');
      expect(action1.inputMode).toBe('dialog');
      expect(action1.isExplicit).toBe(true);

      const action2 = resolved.customActions.find((a) => a.id === 'custom_dup')!;
      expect(action2).toBeDefined();
      expect(action2.label).toBe('Duplicar Imediatamente');
      expect(action2.inputMode).toBe('direct');
      expect(action2.confirmation).toBe(false);
    });

    it('should resolve operations cleanly when operationId is completely absent', () => {
      // Operations without operationId, identified solely by path and method
      const listOp: ApiOperation = { id: 'get_/categories', method: 'GET', path: '/categories', type: 'list', parameters: [], responses: [] };
      const createOp: ApiOperation = { id: 'post_/categories', method: 'POST', path: '/categories', type: 'create', parameters: [], responses: [] };
      const detailsOp: ApiOperation = { id: 'get_/categories/{id}', method: 'GET', path: '/categories/{id}', type: 'details', parameters: [{ name: 'id', location: 'path', required: true, schema: { type: 'string' } }], responses: [] };

      const resource: ApiResource = {
        id: 'categories',
        name: 'categories',
        label: 'Categories',
        operations: [listOp, createOp, detailsOp]
      };

      const resolved = service.resolveResourcePage({ resource });

      expect(resolved.list).toBe(listOp);
      expect(resolved.create).toBe(createOp);
      expect(resolved.details).toBe(detailsOp);
    });

    it('should prioritize explicitly configured operations over heuristics', () => {
      const defaultListOp: ApiOperation = { id: 'get_all', method: 'GET', path: '/products', type: 'list', parameters: [], responses: [] };
      const customListOp: ApiOperation = { id: 'get_featured', method: 'GET', path: '/products/featured', type: 'list', parameters: [], responses: [] };
      const explicitCreateOp: ApiOperation = { id: 'special_create', method: 'POST', path: '/products/special', type: 'create', parameters: [], responses: [] };

      const resource: ApiResource = {
        id: 'products',
        name: 'products',
        label: 'Products',
        operations: [defaultListOp, customListOp, explicitCreateOp]
      };

      const pageConfig = {
        operations: {
          list: 'get_featured'
        },
        actions: {
          primaryCreateActionId: 'special_create'
        }
      };

      const resolved = service.resolveResourcePage({ resource, pageConfig });

      expect(resolved.list).toBe(customListOp);
      expect(resolved.create).toBe(explicitCreateOp);
      expect(resolved.explicitOverrides.list).toBe(true);
      expect(resolved.explicitOverrides.create).toBe(true);
    });

    it('should warn with OPERATION_NOT_FOUND when explicit configured operation does not exist, and fallback gracefully', () => {
      const defaultListOp: ApiOperation = { id: 'get_all', method: 'GET', path: '/products', type: 'list', parameters: [], responses: [] };
      const resource: ApiResource = {
        id: 'products',
        name: 'products',
        label: 'Products',
        operations: [defaultListOp]
      };

      const pageConfig = {
        operations: {
          list: 'non_existent_list_op'
        }
      };

      const resolved = service.resolveResourcePage({ resource, pageConfig });

      expect(resolved.list).toBe(defaultListOp);
      expect(resolved.warnings.some((w) => w.code === 'OPERATION_NOT_FOUND' && w.role === 'list')).toBe(true);
    });

    it('should warn with INCOMPATIBLE_METHOD when explicit operation has unexpected HTTP method', () => {
      const deleteOp: ApiOperation = { id: 'delete_user', method: 'DELETE', path: '/users/{id}', type: 'delete', parameters: [], responses: [] };
      const resource: ApiResource = {
        id: 'users',
        name: 'users',
        label: 'Users',
        operations: [deleteOp]
      };

      const pageConfig = {
        operations: {
          list: 'delete_user'
        }
      };

      const resolved = service.resolveResourcePage({ resource, pageConfig });

      expect(resolved.warnings.some((w) => w.code === 'INCOMPATIBLE_METHOD' && w.role === 'list')).toBe(true);
    });

    it('should warn with MISSING_OPERATION when CRUD operations are absent', () => {
      const listOnlyOp: ApiOperation = { id: 'get_logs', method: 'GET', path: '/logs', type: 'list', parameters: [], responses: [] };
      const resource: ApiResource = {
        id: 'logs',
        name: 'logs',
        label: 'Logs',
        operations: [listOnlyOp]
      };

      const resolved = service.resolveResourcePage({ resource });

      expect(resolved.list).toBe(listOnlyOp);
      expect(resolved.delete).toBeNull();
      expect(resolved.create).toBeNull();
      expect(resolved.warnings.some((w) => w.code === 'MISSING_OPERATION' && w.role === 'delete')).toBe(true);
    });

    it('should warn with AMBIGUOUS_MATCH when multiple collection GET endpoints exist without explicit list type', () => {
      const getA: ApiOperation = { id: 'get_a', method: 'GET', path: '/reports/a', type: 'unknown', parameters: [], responses: [] };
      const getB: ApiOperation = { id: 'get_b', method: 'GET', path: '/reports/b', type: 'unknown', parameters: [], responses: [] };
      const resource: ApiResource = {
        id: 'reports',
        name: 'reports',
        label: 'Reports',
        operations: [getA, getB]
      };

      const resolved = service.resolveResourcePage({ resource });

      expect(resolved.warnings.some((w) => w.code === 'AMBIGUOUS_MATCH' && w.role === 'list')).toBe(true);
    });

    it('should handle composite route parameters and resolve parameter values accurately', () => {
      const compositeOp: ApiOperation = {
        id: 'update_task',
        method: 'PUT',
        path: '/organizations/{orgId}/projects/{projectId}/tasks/{taskCode}',
        type: 'update',
        parameters: [
          { name: 'orgId', location: 'path', required: true, schema: { type: 'string' } },
          { name: 'projectId', location: 'path', required: true, schema: { type: 'string' } },
          { name: 'taskCode', location: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const record = { taskCode: 'TSK-100', name: 'Implement layer' };
      const context = { orgId: 'org-42', projectId: 'prj-7' };

      const resolution = service.resolveParameters(compositeOp, record, context);

      expect(resolution.canAutoResolve).toBe(true);
      expect(resolution.resolvedParams).toEqual({
        orgId: 'org-42',
        projectId: 'prj-7',
        taskCode: 'TSK-100'
      });
      expect(resolution.missingParams.length).toBe(0);
    });
  });

  describe('Guided Role Compatibility, Suggestions and Parameter Inference', () => {
    const listOp: ApiOperation = {
      id: 'get_orders',
      operationId: 'listOrders',
      method: 'GET',
      path: '/api/v1/orders',
      type: 'list',
      parameters: [],
      responses: []
    };

    const detailsOp: ApiOperation = {
      id: 'get_order_by_id',
      operationId: 'getOrderById',
      method: 'GET',
      path: '/api/v1/orders/{orderId}',
      type: 'details',
      parameters: [{ name: 'orderId', location: 'path', required: true, schema: { type: 'string' } }],
      responses: []
    };

    const postCreateOp: ApiOperation = {
      id: 'post_order',
      operationId: 'createOrder',
      method: 'POST',
      path: '/api/v1/orders',
      type: 'create',
      parameters: [],
      responses: []
    };

    const putUpdateOp: ApiOperation = {
      id: 'put_order',
      operationId: 'replaceOrder',
      method: 'PUT',
      path: '/api/v1/orders/{orderId}',
      type: 'update',
      parameters: [{ name: 'orderId', location: 'path', required: true, schema: { type: 'string' } }],
      responses: []
    };

    const patchUpdateOp: ApiOperation = {
      id: 'patch_order',
      operationId: 'updateOrderStatus',
      method: 'PATCH',
      path: '/api/v1/orders/{orderId}',
      type: 'update',
      parameters: [{ name: 'orderId', location: 'path', required: true, schema: { type: 'string' } }],
      responses: []
    };

    const deleteOp: ApiOperation = {
      id: 'delete_order',
      operationId: 'deleteOrder',
      method: 'DELETE',
      path: '/api/v1/orders/{orderId}',
      type: 'delete',
      parameters: [{ name: 'orderId', location: 'path', required: true, schema: { type: 'string' } }],
      responses: []
    };

    const cancelRpcOp: ApiOperation = {
      id: 'post_cancel_order',
      operationId: 'cancelOrder',
      method: 'POST',
      path: '/api/v1/orders/{orderId}/cancel',
      type: 'action',
      summary: 'Cancela um pedido existente',
      parameters: [
        { name: 'orderId', location: 'path', required: true, schema: { type: 'string' } },
        { name: 'reasonId', location: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: []
    };

    const resource: ApiResource = {
      id: 'orders',
      name: 'orders',
      label: 'Orders',
      operations: [listOp, detailsOp, postCreateOp, putUpdateOp, patchUpdateOp, deleteOp, cancelRpcOp]
    };

    it('should list only compatible operations for each role', () => {
      const listOps = service.getCompatibleOperationsForRole(resource, 'list');
      expect(listOps.every((op) => op.method === 'GET')).toBe(true);
      expect(listOps.length).toBe(2); // listOp and detailsOp

      const createOps = service.getCompatibleOperationsForRole(resource, 'create');
      expect(createOps.every((op) => op.method === 'POST' || op.method === 'PUT')).toBe(true);
      expect(createOps).toContain(postCreateOp);

      const updateOps = service.getCompatibleOperationsForRole(resource, 'update');
      expect(updateOps.every((op) => op.method === 'PUT' || op.method === 'PATCH')).toBe(true);
      expect(updateOps).toContain(putUpdateOp);
      expect(updateOps).toContain(patchUpdateOp);

      const deleteOps = service.getCompatibleOperationsForRole(resource, 'delete');
      expect(deleteOps.every((op) => op.method === 'DELETE')).toBe(true);
      expect(deleteOps).toEqual([deleteOp]);

      const customOps = service.getCompatibleOperationsForRole(resource, 'custom');
      expect(customOps).toContain(cancelRpcOp);
      expect(customOps).toContain(patchUpdateOp);
    });

    it('should return automatic suggestions for CRUD roles', () => {
      expect(service.getSuggestedOperationForRole(resource, 'list')).toBe(listOp);
      expect(service.getSuggestedOperationForRole(resource, 'create')).toBe(postCreateOp);
      expect(service.getSuggestedOperationForRole(resource, 'details')).toBe(detailsOp);
      expect(service.getSuggestedOperationForRole(resource, 'update')).toBe(putUpdateOp);
      expect(service.getSuggestedOperationForRole(resource, 'delete')).toBe(deleteOp);
    });

    it('should identify whether an operation is the auto-suggested one', () => {
      expect(service.isRoleOperationSuggested(undefined, 'list', 'listOrders', resource)).toBe(true);
      expect(service.isRoleOperationSuggested(undefined, 'list', 'get_orders', resource)).toBe(true);
      expect(service.isRoleOperationSuggested(undefined, 'list', 'getOrderById', resource)).toBe(false);

      expect(service.isRoleOperationSuggested(undefined, 'update', 'replaceOrder', resource)).toBe(true);
      expect(service.isRoleOperationSuggested(undefined, 'update', 'updateOrderStatus', resource)).toBe(false);
    });

    it('should check parameter inference from row field names and report missing parameters', () => {
      // 1. Single orderId matched by orderId or id column
      const checkDetailsWithId = service.checkParamInferenceForOperation(detailsOp, ['orderId', 'status', 'total']);
      expect(checkDetailsWithId.canInfer).toBe(true);
      expect(checkDetailsWithId.missingParams.length).toBe(0);

      // 2. Cancel operation requires orderId AND reasonId
      const checkCancelMissing = service.checkParamInferenceForOperation(cancelRpcOp, ['id', 'status', 'total']);
      expect(checkCancelMissing.canInfer).toBe(false);
      expect(checkCancelMissing.missingParams.map((p) => p.name)).toContain('reasonId');

      // 3. When reasonId is present in available field names
      const checkCancelComplete = service.checkParamInferenceForOperation(cancelRpcOp, ['orderId', 'reasonId', 'status']);
      expect(checkCancelComplete.canInfer).toBe(true);
      expect(checkCancelComplete.missingParams.length).toBe(0);
    });
  });

  describe('Non-ID and Arbitrary Parameter Resolution Strategies', () => {
    it('should resolve parameter by exact match when parameter name is slug ({slug})', () => {
      const articleOp: ApiOperation = {
        id: 'getArticleBySlug',
        method: 'GET',
        path: '/articles/{slug}',
        type: 'details',
        parameters: [
          { name: 'slug', location: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const record = { slug: 'como-configurar-api-canvas', title: 'Tutorial', status: 'PUBLISHED' };
      const res = service.resolveParameters(articleOp, record);

      expect(res.canAutoResolve).toBe(true);
      expect(res.resolvedParams['slug']).toBe('como-configurar-api-canvas');
      expect(res.missingParams.length).toBe(0);
    });

    it('should resolve parameter by uuid ({uuid}) when record has uuid or id property', () => {
      const uuidOp: ApiOperation = {
        id: 'getRecordByUuid',
        method: 'GET',
        path: '/tenants/{uuid}/config',
        type: 'details',
        parameters: [
          { name: 'uuid', location: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const recordWithUuid = { uuid: 'c9bf9e57-1685-4c89-bafb-ff5af830be8a', name: 'Tenant A' };
      const res1 = service.resolveParameters(uuidOp, recordWithUuid);
      expect(res1.canAutoResolve).toBe(true);
      expect(res1.resolvedParams['uuid']).toBe('c9bf9e57-1685-4c89-bafb-ff5af830be8a');

      // Fallback to id if uuid is omitted but single path param
      const recordWithId = { id: 'c9bf9e57-1685-4c89-bafb-ff5af830be8a', name: 'Tenant B' };
      const res2 = service.resolveParameters(uuidOp, recordWithId);
      expect(res2.canAutoResolve).toBe(true);
      expect(res2.resolvedParams['uuid']).toBe('c9bf9e57-1685-4c89-bafb-ff5af830be8a');
    });

    it('should resolve multi-segment nested path parameters combining context and record', () => {
      const nestedOp: ApiOperation = {
        id: 'getStoreOrderItem',
        method: 'GET',
        path: '/stores/{storeId}/orders/{orderId}/items/{itemId}',
        type: 'details',
        parameters: [
          { name: 'storeId', location: 'path', required: true, schema: { type: 'string' } },
          { name: 'orderId', location: 'path', required: true, schema: { type: 'string' } },
          { name: 'itemId', location: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const activeContext = { storeId: 'store-sp-01', orderId: 'ord-888' };
      const rowRecord = { itemId: 'item-99', name: 'Teclado Mecânico', price: 299.9 };

      const res = service.resolveParameters(nestedOp, rowRecord, activeContext);
      expect(res.canAutoResolve).toBe(true);
      expect(res.resolvedParams['storeId']).toBe('store-sp-01');
      expect(res.resolvedParams['orderId']).toBe('ord-888');
      expect(res.resolvedParams['itemId']).toBe('item-99');
      expect(res.missingParams.length).toBe(0);
    });

    it('should resolve status PATCH and action POST parameters accurately without hardcoding id', () => {
      const statusPatchOp: ApiOperation = {
        id: 'updateOrderStatus',
        method: 'PATCH',
        path: '/orders/{orderId}/status',
        type: 'action',
        parameters: [
          { name: 'orderId', location: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const cancelPostOp: ApiOperation = {
        id: 'cancelOrder',
        method: 'POST',
        path: '/orders/{orderId}/cancel',
        type: 'action',
        parameters: [
          { name: 'orderId', location: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const orderRecord = { orderId: 'ORD-777', customerName: 'Carlos', status: 'PENDING' };

      const patchRes = service.resolveParameters(statusPatchOp, orderRecord);
      expect(patchRes.canAutoResolve).toBe(true);
      expect(patchRes.resolvedParams['orderId']).toBe('ORD-777');

      const cancelRes = service.resolveParameters(cancelPostOp, orderRecord);
      expect(cancelRes.canAutoResolve).toBe(true);
      expect(cancelRes.resolvedParams['orderId']).toBe('ORD-777');
    });

    it('should identify missing parameters when record does not contain candidate matching values', () => {
      const complexOp: ApiOperation = {
        id: 'dispatchBatch',
        method: 'POST',
        path: '/warehouses/{warehouseCode}/shipments/{trackingNumber}',
        type: 'action',
        parameters: [
          { name: 'warehouseCode', location: 'path', required: true, schema: { type: 'string' } },
          { name: 'trackingNumber', location: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const incompleteRecord = { description: 'Pacote sem tracking' };
      const res = service.resolveParameters(complexOp, incompleteRecord);

      expect(res.canAutoResolve).toBe(false);
      expect(res.missingParams.length).toBe(2);
      expect(res.missingParams.map((p) => p.name)).toContain('warehouseCode');
      expect(res.missingParams.map((p) => p.name)).toContain('trackingNumber');
    });
  });
});

