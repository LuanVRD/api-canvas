import { SchemaMapper } from './schema.mapper';

describe('SchemaMapper', () => {
  describe('inferType', () => {
    it('should infer primitive types correctly from string type property', () => {
      expect(SchemaMapper.inferType({ type: 'string' })).toBe('string');
      expect(SchemaMapper.inferType({ type: 'STRING' })).toBe('string');
      expect(SchemaMapper.inferType({ type: 'number' })).toBe('number');
      expect(SchemaMapper.inferType({ type: 'integer' })).toBe('integer');
      expect(SchemaMapper.inferType({ type: 'boolean' })).toBe('boolean');
      expect(SchemaMapper.inferType({ type: 'object' })).toBe('object');
      expect(SchemaMapper.inferType({ type: 'array' })).toBe('array');
      expect(SchemaMapper.inferType({ type: 'null' })).toBe('null');
    });

    it('should infer OpenAPI 3.1 multi-type arrays (e.g. ["string", "null"])', () => {
      expect(SchemaMapper.inferType({ type: ['string', 'null'] })).toBe('string');
      expect(SchemaMapper.inferType({ type: ['null', 'integer'] })).toBe('integer');
      expect(SchemaMapper.inferType({ type: ['null', 'boolean'] })).toBe('boolean');
    });

    it('should infer object when type is omitted but properties or additionalProperties are present', () => {
      expect(SchemaMapper.inferType({ properties: { id: { type: 'string' } } })).toBe('object');
      expect(SchemaMapper.inferType({ additionalProperties: true })).toBe('object');
    });

    it('should infer array when type is omitted but items is present', () => {
      expect(SchemaMapper.inferType({ items: { type: 'string' } })).toBe('array');
    });

    it('should infer string when type is omitted but enum is present', () => {
      expect(SchemaMapper.inferType({ enum: ['ACTIVE', 'INACTIVE'] })).toBe('string');
    });

    it('should return unknown for unrecognized or empty schemas', () => {
      expect(SchemaMapper.inferType({})).toBe('unknown');
      expect(SchemaMapper.inferType({ foo: 'bar' })).toBe('unknown');
    });
  });

  describe('isNullable', () => {
    it('should detect OpenAPI 3.0 nullable: true', () => {
      expect(SchemaMapper.isNullable({ type: 'string', nullable: true })).toBe(true);
      expect(SchemaMapper.isNullable({ type: 'string', nullable: false })).toBe(false);
      expect(SchemaMapper.isNullable({ type: 'string' })).toBe(false);
    });

    it('should detect OpenAPI 3.1 type array containing null', () => {
      expect(SchemaMapper.isNullable({ type: ['string', 'null'] })).toBe(true);
      expect(SchemaMapper.isNullable({ type: ['integer'] })).toBe(false);
    });
  });

  describe('extractConstraints', () => {
    it('should extract all OpenAPI constraints and metadata accurately', () => {
      const raw = {
        title: 'User Title',
        description: 'User description',
        format: 'email',
        enum: ['A', 'B'],
        default: 'A',
        example: 'test@example.com',
        readOnly: true,
        writeOnly: false,
        minimum: 10,
        maximum: 100,
        minLength: 5,
        maxLength: 50,
        pattern: '^[a-z]+$'
      };

      const constraints = SchemaMapper.extractConstraints(raw);

      expect(constraints.title).toBe('User Title');
      expect(constraints.description).toBe('User description');
      expect(constraints.format).toBe('email');
      expect(constraints.enum).toEqual(['A', 'B']);
      expect(constraints.default).toBe('A');
      expect(constraints.example).toBe('test@example.com');
      expect(constraints.readOnly).toBe(true);
      expect(constraints.writeOnly).toBe(false);
      expect(constraints.minimum).toBe(10);
      expect(constraints.maximum).toBe(100);
      expect(constraints.minLength).toBe(5);
      expect(constraints.maxLength).toBe(50);
      expect(constraints.pattern).toBe('^[a-z]+$');
    });

    it('should ignore non-matching types or undefined fields', () => {
      const constraints = SchemaMapper.extractConstraints({
        title: 123 as unknown as string,
        minimum: 'invalid' as unknown as number
      });

      expect(constraints.title).toBeUndefined();
      expect(constraints.minimum).toBeUndefined();
    });
  });

  describe('toInternal', () => {
    it('should return unknown for undefined or non-object schemas', () => {
      expect(SchemaMapper.toInternal(undefined)).toEqual({ type: 'unknown' });
      expect(SchemaMapper.toInternal(null as unknown as Record<string, unknown>)).toEqual({ type: 'unknown' });
    });

    it('should map complete schema with required properties filtered to strings', () => {
      const raw = {
        type: 'object',
        title: 'Customer',
        required: ['id', 'name', 123],
        properties: {
          id: { type: 'string' }
        }
      };

      const result = SchemaMapper.toInternal(raw);
      expect(result.type).toBe('object');
      expect(result.title).toBe('Customer');
      expect(result.requiredProperties).toEqual(['id', 'name']);
      expect(result.nullable).toBe(false);
    });
  });
});
