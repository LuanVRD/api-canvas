import { ApiParameter } from './api-parameter.model';
import { ApiResponse } from './api-response.model';
import { ApiSchema } from './api-schema.model';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiOperationType =
  | 'list'
  | 'details'
  | 'create'
  | 'update'
  | 'delete'
  | 'action'
  | 'unknown';

export interface ApiOperation {
  id: string;
  operationId?: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  parameters: ApiParameter[];
  requestBody?: ApiSchema;
  responses: ApiResponse[];
  type: ApiOperationType;
  tags?: string[];
}
