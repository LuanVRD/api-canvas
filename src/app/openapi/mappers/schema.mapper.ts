import { ApiSchema, SchemaPrimitiveType } from '../../core/models/api-schema.model';

export class SchemaMapper {
  /**
   * Infers primitive schema type from raw OpenAPI schema definition.
   */
  static inferType(rawSchema: Record<string, unknown>): SchemaPrimitiveType {
    const rawType = rawSchema['type'];

    if (typeof rawType === 'string') {
      const lowerType = rawType.toLowerCase();
      if (
        lowerType === 'string' ||
        lowerType === 'number' ||
        lowerType === 'integer' ||
        lowerType === 'boolean' ||
        lowerType === 'object' ||
        lowerType === 'array' ||
        lowerType === 'null'
      ) {
        return lowerType as SchemaPrimitiveType;
      }
    } else if (Array.isArray(rawType)) {
      // OpenAPI 3.1 multi-type e.g. ["string", "null"]
      const nonNullType = rawType.find((t) => t !== 'null' && typeof t === 'string');
      if (nonNullType) {
        return this.inferType({ ...rawSchema, type: nonNullType });
      }
    }

    // Heuristics when 'type' keyword is omitted
    if (rawSchema['properties'] || rawSchema['additionalProperties']) {
      return 'object';
    }
    if (rawSchema['items']) {
      return 'array';
    }
    if (rawSchema['enum']) {
      return 'string';
    }

    return 'unknown';
  }

  /**
   * Extracts nullable status handling OpenAPI 3.0 (nullable: true) and OpenAPI 3.1 (type: ["string", "null"]).
   */
  static isNullable(rawSchema: Record<string, unknown>): boolean {
    if (rawSchema['nullable'] === true) {
      return true;
    }
    if (Array.isArray(rawSchema['type']) && rawSchema['type'].includes('null')) {
      return true;
    }
    return false;
  }

  /**
   * Maps basic constraints and metadata fields from a raw schema dictionary.
   */
  static extractConstraints(rawSchema: Record<string, unknown>): Partial<ApiSchema> {
    const constraints: Partial<ApiSchema> = {};

    if (typeof rawSchema['title'] === 'string') {
      constraints.title = rawSchema['title'];
    }
    if (typeof rawSchema['description'] === 'string') {
      constraints.description = rawSchema['description'];
    }
    if (typeof rawSchema['format'] === 'string') {
      constraints.format = rawSchema['format'];
    }
    if (Array.isArray(rawSchema['enum'])) {
      constraints.enum = [...rawSchema['enum']];
    }
    if (rawSchema['default'] !== undefined) {
      constraints.default = rawSchema['default'];
    }
    if (rawSchema['example'] !== undefined) {
      constraints.example = rawSchema['example'];
    }
    if (typeof rawSchema['readOnly'] === 'boolean') {
      constraints.readOnly = rawSchema['readOnly'];
    }
    if (typeof rawSchema['writeOnly'] === 'boolean') {
      constraints.writeOnly = rawSchema['writeOnly'];
    }
    if (typeof rawSchema['minimum'] === 'number') {
      constraints.minimum = rawSchema['minimum'];
    }
    if (typeof rawSchema['maximum'] === 'number') {
      constraints.maximum = rawSchema['maximum'];
    }
    if (typeof rawSchema['minLength'] === 'number') {
      constraints.minLength = rawSchema['minLength'];
    }
    if (typeof rawSchema['maxLength'] === 'number') {
      constraints.maxLength = rawSchema['maxLength'];
    }
    if (typeof rawSchema['pattern'] === 'string') {
      constraints.pattern = rawSchema['pattern'];
    }

    return constraints;
  }

  /**
   * Maps a raw schema object into an internal ApiSchema.
   */
  static toInternal(rawSchema?: Record<string, unknown>): ApiSchema {
    if (!rawSchema || typeof rawSchema !== 'object') {
      return { type: 'unknown' };
    }

    const type = this.inferType(rawSchema);
    const nullable = this.isNullable(rawSchema);
    const constraints = this.extractConstraints(rawSchema);

    const schema: ApiSchema = {
      type,
      ...constraints,
      nullable
    };

    if (Array.isArray(rawSchema['required'])) {
      schema.requiredProperties = rawSchema['required'].filter(
        (prop): prop is string => typeof prop === 'string'
      );
    }

    return schema;
  }
}
