export type SchemaPrimitiveType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'unknown';

export interface ApiSchema {
  type: SchemaPrimitiveType;
  format?: string;
  title?: string;
  description?: string;
  required?: boolean;
  enum?: unknown[];
  properties?: Record<string, ApiSchema>;
  items?: ApiSchema;
  default?: unknown;
  nullable?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}
