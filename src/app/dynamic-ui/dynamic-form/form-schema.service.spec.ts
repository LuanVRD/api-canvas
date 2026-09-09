import { TestBed } from '@angular/core/testing';
import { FormArray, FormGroup } from '@angular/forms';
import { ApiSchema } from '../../core/models/api-schema.model';
import { FormSchemaService, MAX_SCHEMA_DEPTH } from './form-schema.service';

describe('FormSchemaService', () => {
  let service: FormSchemaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormSchemaService]
    });
    service = TestBed.inject(FormSchemaService);
  });

  describe('extractFields', () => {
    it('should return empty array when schema is null or undefined or has no properties', () => {
      expect(service.extractFields(null)).toEqual([]);
      expect(service.extractFields(undefined)).toEqual([]);
      expect(service.extractFields({ type: 'object' })).toEqual([]);
      expect(service.extractFields({ type: 'object', properties: {} })).toEqual([]);
    });

    it('should map string properties to text field descriptors', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            title: 'User Name',
            description: 'Enter your unique username',
            default: 'john_doe'
          }
        }
      };

      const fields = service.extractFields(schema);
      expect(fields.length).toBe(1);
      expect(fields[0]).toEqual(
        expect.objectContaining({
          key: 'username',
          label: 'User Name',
          type: 'text',
          controlType: 'text',
          required: false,
          defaultValue: 'john_doe',
          description: 'Enter your unique username'
        })
      );
    });

    it('should map number and integer properties to number field descriptors', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          age: {
            type: 'integer',
            minimum: 18,
            maximum: 120
          },
          price: {
            type: 'number',
            minimum: 0.01,
            default: 9.99
          }
        }
      };

      const fields = service.extractFields(schema);
      expect(fields.length).toBe(2);

      const ageField = fields.find((f) => f.key === 'age');
      expect(ageField?.type).toBe('number');
      expect(ageField?.constraints?.minimum).toBe(18);
      expect(ageField?.constraints?.maximum).toBe(120);

      const priceField = fields.find((f) => f.key === 'price');
      expect(priceField?.type).toBe('number');
      expect(priceField?.defaultValue).toBe(9.99);
      expect(priceField?.constraints?.minimum).toBe(0.01);
    });

    it('should map boolean properties to boolean field descriptors with default false when not provided', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          isActive: {
            type: 'boolean',
            title: 'Active Status'
          },
          isPremium: {
            type: 'boolean',
            default: true
          }
        }
      };

      const fields = service.extractFields(schema);
      const activeField = fields.find((f) => f.key === 'isActive');
      const premiumField = fields.find((f) => f.key === 'isPremium');

      expect(activeField?.type).toBe('boolean');
      expect(activeField?.defaultValue).toBe(false);

      expect(premiumField?.type).toBe('boolean');
      expect(premiumField?.defaultValue).toBe(true);
    });

    it('should map enum properties to select field descriptors with options', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            enum: ['admin', 'user', 'guest'],
            default: 'user'
          }
        }
      };

      const fields = service.extractFields(schema);
      expect(fields.length).toBe(1);
      expect(fields[0].type).toBe('select');
      expect(fields[0].options).toEqual([
        { label: 'admin', value: 'admin' },
        { label: 'user', value: 'user' },
        { label: 'guest', value: 'guest' }
      ]);
      expect(fields[0].defaultValue).toBe('user');
    });

    it('should map format: date to date field descriptor', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          birthDate: {
            type: 'string',
            format: 'date',
            title: 'Birth Date'
          }
        }
      };

      const fields = service.extractFields(schema);
      expect(fields.length).toBe(1);
      expect(fields[0].type).toBe('date');
      expect(fields[0].format).toBe('date');
    });

    it('should map format: date-time to datetime field descriptor', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          createdAt: {
            type: 'string',
            format: 'date-time',
            title: 'Created At'
          }
        }
      };

      const fields = service.extractFields(schema);
      expect(fields.length).toBe(1);
      expect(fields[0].type).toBe('datetime');
      expect(fields[0].format).toBe('date-time');
    });

    it('should map unstructured object and array without items to json field descriptors', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          metadata: {
            type: 'object'
          },
          rawTags: {
            type: 'array'
          }
        }
      };

      const fields = service.extractFields(schema);
      expect(fields.find((f) => f.key === 'metadata')?.type).toBe('json');
      expect(fields.find((f) => f.key === 'rawTags')?.type).toBe('json');
    });

    it('should map nested structured object into object descriptor with children', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            title: 'Mailing Address',
            requiredProperties: ['street'],
            properties: {
              street: { type: 'string', title: 'Street Line' },
              city: { type: 'string' },
              zipCode: { type: 'string', minLength: 5 }
            }
          }
        }
      };

      const fields = service.extractFields(schema);
      expect(fields.length).toBe(1);
      const addressField = fields[0];

      expect(addressField.key).toBe('address');
      expect(addressField.type).toBe('object');
      expect(addressField.label).toBe('Mailing Address');
      expect(addressField.children?.length).toBe(3);

      const streetChild = addressField.children?.find((c) => c.key === 'street');
      const zipChild = addressField.children?.find((c) => c.key === 'zipCode');

      expect(streetChild?.required).toBe(true);
      expect(streetChild?.label).toBe('Street Line');
      expect(zipChild?.constraints?.minLength).toBe(5);
    });

    it('should map array of primitives with itemDescriptor', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            title: 'Tag List',
            items: {
              type: 'string',
              minLength: 2
            }
          },
          scores: {
            type: 'array',
            items: {
              type: 'number',
              minimum: 0
            }
          }
        }
      };

      const fields = service.extractFields(schema);
      expect(fields.length).toBe(2);

      const tagsField = fields.find((f) => f.key === 'tags');
      expect(tagsField?.type).toBe('array');
      expect(tagsField?.itemDescriptor?.type).toBe('text');
      expect(tagsField?.itemDescriptor?.constraints?.minLength).toBe(2);

      const scoresField = fields.find((f) => f.key === 'scores');
      expect(scoresField?.type).toBe('array');
      expect(scoresField?.itemDescriptor?.type).toBe('number');
      expect(scoresField?.itemDescriptor?.constraints?.minimum).toBe(0);
    });

    it('should map array of structured objects with nested itemDescriptor', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          lineItems: {
            type: 'array',
            title: 'Order Line Items',
            items: {
              type: 'object',
              requiredProperties: ['sku', 'quantity'],
              properties: {
                sku: { type: 'string' },
                quantity: { type: 'integer', minimum: 1 },
                unitPrice: { type: 'number', minimum: 0 }
              }
            }
          }
        }
      };

      const fields = service.extractFields(schema);
      const lineItemsField = fields[0];

      expect(lineItemsField.type).toBe('array');
      expect(lineItemsField.itemDescriptor?.type).toBe('object');
      expect(lineItemsField.itemDescriptor?.children?.length).toBe(3);

      const skuChild = lineItemsField.itemDescriptor?.children?.find((c) => c.key === 'sku');
      expect(skuChild?.required).toBe(true);
    });

    it('should prevent infinite recursion on cyclic schemas and cap max depth', () => {
      // Cyclic schema reference
      const cyclicChildSchema: ApiSchema = {
        type: 'object',
        properties: {}
      };
      const cyclicParentSchema: ApiSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          next: cyclicChildSchema
        }
      };
      // Create cycle
      cyclicChildSchema.properties = {
        parent: cyclicParentSchema
      };

      // Must not throw call stack overflow
      expect(() => {
        const fields = service.extractFields(cyclicParentSchema);
        expect(fields.length).toBe(2);
        const nextField = fields.find((f) => f.key === 'next');
        expect(nextField?.type).toBe('object');
      }).not.toThrow();
    });

    it('should cap max depth at MAX_SCHEMA_DEPTH with fallback descriptor', () => {
      // Build 6 levels deep schema
      let currentSchema: ApiSchema = {
        type: 'object',
        properties: { leaf: { type: 'string' } }
      };

      for (let i = 0; i < 6; i++) {
        currentSchema = {
          type: 'object',
          properties: {
            nested: currentSchema
          }
        };
      }

      const fields = service.extractFields(currentSchema);
      expect(fields.length).toBe(1);

      // Dig down to max depth
      let currentField = fields[0];
      let reachedDepth = 0;
      while (currentField && currentField.children && currentField.children.length > 0) {
        reachedDepth++;
        currentField = currentField.children[0];
      }

      expect(reachedDepth).toBeLessThanOrEqual(MAX_SCHEMA_DEPTH);
      expect(currentField.isFallback).toBe(true);
      expect(currentField.fallbackReason).toContain('Max recursion depth');
    });

    it('should map required constraint from property level and requiredProperties list', () => {
      const schema: ApiSchema = {
        type: 'object',
        requiredProperties: ['email'],
        properties: {
          email: {
            type: 'string'
          },
          fullName: {
            type: 'string',
            required: true
          },
          bio: {
            type: 'string'
          }
        }
      };

      const fields = service.extractFields(schema);
      const emailField = fields.find((f) => f.key === 'email');
      const nameField = fields.find((f) => f.key === 'fullName');
      const bioField = fields.find((f) => f.key === 'bio');

      expect(emailField?.required).toBe(true);
      expect(emailField?.constraints?.required).toBe(true);

      expect(nameField?.required).toBe(true);
      expect(nameField?.constraints?.required).toBe(true);

      expect(bioField?.required).toBe(false);
      expect(bioField?.constraints?.required).toBeUndefined();
    });

    it('should format label using key when title is not provided', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          user_id: { type: 'string' },
          createdAt: { type: 'string' },
          skuCode: { type: 'string' }
        }
      };

      const fields = service.extractFields(schema);
      expect(fields.find((f) => f.key === 'user_id')?.label).toBe('User ID');
      expect(fields.find((f) => f.key === 'createdAt')?.label).toBe('Created At');
      expect(fields.find((f) => f.key === 'skuCode')?.label).toBe('SKU Code');
    });
  });

  describe('buildFormGroup', () => {
    it('should build an empty FormGroup if no fields exist', () => {
      const { form, fields } = service.buildFormGroup(null);
      expect(Object.keys(form.controls).length).toBe(0);
      expect(fields.length).toBe(0);
    });

    it('should build a reactive FormGroup with nested FormGroup for object fields', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', required: true },
          contact: {
            type: 'object',
            requiredProperties: ['email'],
            properties: {
              email: { type: 'string', pattern: '^.+@.+$' },
              phone: { type: 'string', minLength: 8 }
            }
          }
        }
      };

      const { form, fields } = service.buildFormGroup(schema);
      expect(fields.length).toBe(2);
      expect(form.contains('name')).toBe(true);
      expect(form.contains('contact')).toBe(true);

      const contactGroup = form.get('contact') as FormGroup;
      expect(contactGroup instanceof FormGroup).toBe(true);
      expect(contactGroup.contains('email')).toBe(true);
      expect(contactGroup.contains('phone')).toBe(true);

      const emailCtrl = contactGroup.get('email');
      expect(emailCtrl?.valid).toBe(false);
      emailCtrl?.setValue('invalid');
      expect(emailCtrl?.hasError('pattern')).toBe(true);
      emailCtrl?.setValue('test@example.com');
      expect(emailCtrl?.valid).toBe(true);
    });

    it('should build a reactive FormGroup with FormArray for array fields and populate initial items', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' }
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              requiredProperties: ['id'],
              properties: {
                id: { type: 'string' },
                qty: { type: 'number', default: 1 }
              }
            }
          }
        }
      };

      const initialValue = {
        tags: ['frontend', 'angular'],
        items: [{ id: 'prod-1', qty: 3 }, { id: 'prod-2' }]
      };

      const { form } = service.buildFormGroup(schema, initialValue);

      const tagsArray = form.get('tags') as FormArray;
      expect(tagsArray instanceof FormArray).toBe(true);
      expect(tagsArray.length).toBe(2);
      expect(tagsArray.at(0).value).toBe('frontend');
      expect(tagsArray.at(1).value).toBe('angular');

      const itemsArray = form.get('items') as FormArray;
      expect(itemsArray instanceof FormArray).toBe(true);
      expect(itemsArray.length).toBe(2);

      const item0 = itemsArray.at(0) as FormGroup;
      expect(item0.get('id')?.value).toBe('prod-1');
      expect(item0.get('qty')?.value).toBe(3);

      const item1 = itemsArray.at(1) as FormGroup;
      expect(item1.get('id')?.value).toBe('prod-2');
      expect(item1.get('qty')?.value).toBe(1); // default
    });

    it('should support createArrayItemControl and populateFormValues dynamically', () => {
      const itemDescriptor = {
        key: 'item',
        label: 'Item',
        type: 'object' as const,
        required: true,
        children: [
          { key: 'code', label: 'Code', type: 'text' as const, required: true },
          { key: 'amount', label: 'Amount', type: 'number' as const, required: false, defaultValue: 10 }
        ]
      };

      const itemCtrl = service.createArrayItemControl(itemDescriptor, { code: 'ABC' }) as FormGroup;
      expect(itemCtrl.get('code')?.value).toBe('ABC');
      expect(itemCtrl.get('amount')?.value).toBe(10);

      const parentForm = new FormGroup({
        items: new FormArray([])
      });
      const itemsArr = parentForm.get('items') as FormArray;

      service.populateFormValues(
        parentForm,
        { items: [{ code: 'X1', amount: 5 }, { code: 'X2', amount: 15 }] },
        [{ key: 'items', label: 'Items', type: 'array', required: false, itemDescriptor }]
      );

      expect(itemsArr.length).toBe(2);
      expect((itemsArr.at(0) as FormGroup).get('code')?.value).toBe('X1');
      expect((itemsArr.at(1) as FormGroup).get('amount')?.value).toBe(15);
    });
  });

  describe('toRequestBody', () => {
    it('should recursively convert nested objects and handle optional/nullable fields', () => {
      const descriptors = [
        { key: 'title', label: 'Title', type: 'text' as const, required: true },
        {
          key: 'shipping',
          label: 'Shipping',
          type: 'object' as const,
          required: false,
          children: [
            { key: 'carrier', label: 'Carrier', type: 'text' as const, required: true },
            { key: 'trackingNumber', label: 'Tracking', type: 'text' as const, required: false, nullable: true },
            { key: 'cost', label: 'Cost', type: 'number' as const, required: false }
          ]
        },
        {
          key: 'optionalNotes',
          label: 'Notes',
          type: 'object' as const,
          required: false,
          nullable: true,
          children: [
            { key: 'author', label: 'Author', type: 'text' as const, required: false },
            { key: 'content', label: 'Content', type: 'text' as const, required: false }
          ]
        }
      ];

      const rawValues = {
        title: 'Order #100',
        shipping: {
          carrier: 'FedEx',
          trackingNumber: '',
          cost: '14.50'
        },
        optionalNotes: {
          author: '',
          content: ''
        }
      };

      const result = service.toRequestBody(rawValues, descriptors);

      expect(result).toEqual({
        title: 'Order #100',
        shipping: {
          carrier: 'FedEx',
          trackingNumber: null,
          cost: 14.5
        },
        optionalNotes: null
      });
    });

    it('should recursively serialize arrays of primitives and arrays of objects', () => {
      const descriptors = [
        {
          key: 'tags',
          label: 'Tags',
          type: 'array' as const,
          required: false,
          itemDescriptor: { key: 'tags_item', label: 'Tag', type: 'text' as const, required: true }
        },
        {
          key: 'scores',
          label: 'Scores',
          type: 'array' as const,
          required: false,
          itemDescriptor: { key: 'scores_item', label: 'Score', type: 'number' as const, required: true }
        },
        {
          key: 'products',
          label: 'Products',
          type: 'array' as const,
          required: false,
          itemDescriptor: {
            key: 'products_item',
            label: 'Product',
            type: 'object' as const,
            required: true,
            children: [
              { key: 'id', label: 'ID', type: 'text' as const, required: true },
              { key: 'quantity', label: 'Quantity', type: 'number' as const, required: true }
            ]
          }
        }
      ];

      const rawValues = {
        tags: ['v1', 'release'],
        scores: ['10', '20.5', 30],
        products: [
          { id: 'item-1', quantity: '2' },
          { id: 'item-2', quantity: 5 }
        ]
      };

      const result = service.toRequestBody(rawValues, descriptors);

      expect(result).toEqual({
        tags: ['v1', 'release'],
        scores: [10, 20.5, 30],
        products: [
          { id: 'item-1', quantity: 2 },
          { id: 'item-2', quantity: 5 }
        ]
      });
    });
  });

  describe('formatLabel', () => {
    it('should format snake_case, kebab-case, camelCase and handle acronyms', () => {
      expect(service.formatLabel('user_name')).toBe('User Name');
      expect(service.formatLabel('first-name')).toBe('First Name');
      expect(service.formatLabel('lastName')).toBe('Last Name');
      expect(service.formatLabel('api_url')).toBe('API URL');
      expect(service.formatLabel('guid')).toBe('GUID');
      expect(service.formatLabel('')).toBe('');
    });
  });
});

