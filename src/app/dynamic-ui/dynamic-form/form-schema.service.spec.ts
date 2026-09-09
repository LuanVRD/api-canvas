import { TestBed } from '@angular/core/testing';
import { ApiSchema } from '../../core/models/api-schema.model';
import { FormSchemaService } from './form-schema.service';

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

    it('should map object and array properties to json field descriptors', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          metadata: {
            type: 'object'
          },
          tags: {
            type: 'array'
          }
        }
      };

      const fields = service.extractFields(schema);
      expect(fields.find((f) => f.key === 'metadata')?.type).toBe('json');
      expect(fields.find((f) => f.key === 'tags')?.type).toBe('json');
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

    it('should map validation constraints minLength, maxLength, minimum, maximum, and pattern', () => {
      const schema: ApiSchema = {
        type: 'object',
        properties: {
          zipCode: {
            type: 'string',
            minLength: 5,
            maxLength: 10,
            pattern: '^[0-9-]+$'
          },
          score: {
            type: 'number',
            minimum: 0,
            maximum: 100
          }
        }
      };

      const fields = service.extractFields(schema);
      const zipField = fields.find((f) => f.key === 'zipCode');
      const scoreField = fields.find((f) => f.key === 'score');

      expect(zipField?.constraints?.minLength).toBe(5);
      expect(zipField?.constraints?.maxLength).toBe(10);
      expect(zipField?.constraints?.pattern).toBe('^[0-9-]+$');

      expect(scoreField?.constraints?.minimum).toBe(0);
      expect(scoreField?.constraints?.maximum).toBe(100);
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

    it('should build a reactive FormGroup with proper validators and validation behavior', () => {
      const schema: ApiSchema = {
        type: 'object',
        requiredProperties: ['email', 'age'],
        properties: {
          email: {
            type: 'string',
            pattern: '^.+@.+$'
          },
          age: {
            type: 'integer',
            minimum: 18,
            maximum: 65
          },
          nickname: {
            type: 'string',
            minLength: 3,
            maxLength: 8
          },
          payload: {
            type: 'object'
          },
          readOnlyField: {
            type: 'string',
            readOnly: true,
            default: 'STATIC'
          }
        }
      };

      const { form, fields } = service.buildFormGroup(schema);
      expect(fields.length).toBe(5);
      expect(form.contains('email')).toBe(true);
      expect(form.contains('age')).toBe(true);
      expect(form.contains('nickname')).toBe(true);
      expect(form.contains('payload')).toBe(true);
      expect(form.get('readOnlyField')).toBeTruthy();

      // Email validation (required + pattern)
      const emailCtrl = form.get('email');
      expect(emailCtrl?.valid).toBe(false);
      emailCtrl?.setValue('invalid');
      expect(emailCtrl?.hasError('pattern')).toBe(true);
      emailCtrl?.setValue('test@example.com');
      expect(emailCtrl?.valid).toBe(true);

      // Age validation (required + min + max)
      const ageCtrl = form.get('age');
      expect(ageCtrl?.valid).toBe(false);
      ageCtrl?.setValue(10);
      expect(ageCtrl?.hasError('min')).toBe(true);
      ageCtrl?.setValue(70);
      expect(ageCtrl?.hasError('max')).toBe(true);
      ageCtrl?.setValue(25);
      expect(ageCtrl?.valid).toBe(true);

      // Nickname validation (minLength + maxLength)
      const nicknameCtrl = form.get('nickname');
      nicknameCtrl?.setValue('ab');
      expect(nicknameCtrl?.hasError('minlength')).toBe(true);
      nicknameCtrl?.setValue('toolongnickname');
      expect(nicknameCtrl?.hasError('maxlength')).toBe(true);
      nicknameCtrl?.setValue('valid');
      expect(nicknameCtrl?.valid).toBe(true);

      // Payload validation (JSON validator)
      const payloadCtrl = form.get('payload');
      payloadCtrl?.setValue('{ bad json');
      expect(payloadCtrl?.hasError('invalidJson')).toBe(true);
      payloadCtrl?.setValue('{"key": "value"}');
      expect(payloadCtrl?.hasError('invalidJson')).toBe(false);

      // Disabled state for readOnly
      const readOnlyCtrl = form.get('readOnlyField');
      expect(readOnlyCtrl?.disabled).toBe(true);
      expect(readOnlyCtrl?.value).toBe('STATIC');
    });

    it('should allow building FormGroup directly from FormFieldDescriptor array', () => {
      const descriptors = [
        {
          key: 'category',
          label: 'Category',
          type: 'text' as const,
          required: true,
          defaultValue: 'tech',
          constraints: { required: true }
        }
      ];

      const { form, fields } = service.buildFormGroup(descriptors);
      expect(fields).toBe(descriptors);
      expect(form.get('category')?.value).toBe('tech');
      expect(form.valid).toBe(true);
    });
  });

  describe('toRequestBody', () => {
    it('should convert form values into request body compatible json object', () => {
      const descriptors = [
        { key: 'name', label: 'Name', type: 'text' as const, required: true },
        { key: 'count', label: 'Count', type: 'number' as const, required: false },
        { key: 'active', label: 'Active', type: 'boolean' as const, required: false },
        { key: 'config', label: 'Config', type: 'json' as const, required: false },
        { key: 'optionalBio', label: 'Bio', type: 'text' as const, required: false, nullable: true },
        { key: 'ignoredEmpty', label: 'Empty', type: 'text' as const, required: false }
      ];

      const rawValues = {
        name: 'Product 1',
        count: '42',
        active: true,
        config: '{"enabled": true}',
        optionalBio: '',
        ignoredEmpty: ''
      };

      const result = service.toRequestBody(rawValues, descriptors);

      expect(result).toEqual({
        name: 'Product 1',
        count: 42,
        active: true,
        config: { enabled: true },
        optionalBio: null
      });
      expect('ignoredEmpty' in result).toBe(false);
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
