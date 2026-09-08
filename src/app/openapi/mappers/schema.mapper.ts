import { ApiSchema, SchemaPrimitiveType } from '../../core/models/api-schema.model';

export class SchemaMapper {
  static toInternal(rawSchema?: Record<string, unknown>): ApiSchema {
    if (!rawSchema) {
      return { type: 'unknown' };
    }

    const type = (rawSchema['type'] as SchemaPrimitiveType) || 'unknown';
    return {
      type,
      title: rawSchema['title'] as string | undefined,
      description: rawSchema['description'] as string | undefined,
      format: rawSchema['format'] as string | undefined,
      nullable: !!rawSchema['nullable']
    };
  }
}
