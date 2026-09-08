export type SchemaPrimitiveType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null'
  | 'unknown';

export interface ApiSchema {
  type: SchemaPrimitiveType;
  format?: string;
  title?: string;
  description?: string;
  required?: boolean;
  // Lista explícita de chaves obrigatórias quando o schema representa um objeto
  requiredProperties?: string[];
  enum?: unknown[];
  properties?: Record<string, ApiSchema>;
  items?: ApiSchema;
  default?: unknown;
  example?: unknown;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}
