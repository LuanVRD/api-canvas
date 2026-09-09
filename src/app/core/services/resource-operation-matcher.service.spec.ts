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
});
