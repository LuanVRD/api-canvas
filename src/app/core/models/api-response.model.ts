import { ApiSchema } from './api-schema.model';

export interface ApiResponse {
  statusCode: string;
  description?: string;
  schema?: ApiSchema;
  contentType?: string;
}
