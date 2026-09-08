import { ApiSchema } from './api-schema.model';

export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie';

export interface ApiParameter {
  name: string;
  location: ParameterLocation;
  required: boolean;
  schema: ApiSchema;
  description?: string;
  deprecated?: boolean;
  default?: unknown;
  example?: unknown;
}
