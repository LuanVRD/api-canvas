import { ApiParameter } from './api-parameter.model';
import { ApiResponse } from './api-response.model';
import { ApiSchema } from './api-schema.model';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type ApiOperationType =
  | 'list'
  | 'details'
  | 'create'
  | 'update'
  | 'delete'
  | 'action'
  | 'unknown';

export interface ApiRequestBody {
  description?: string;
  required?: boolean;
  contentType?: string;
  schema: ApiSchema;
}

export interface ApiOperation {
  id: string;
  operationId?: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  type: ApiOperationType;
  parameters: ApiParameter[];
  requestBody?: ApiRequestBody | ApiSchema;
  responses: ApiResponse[];
  tags?: string[];
  deprecated?: boolean;
}
