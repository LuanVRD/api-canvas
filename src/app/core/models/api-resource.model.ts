import { ApiOperation } from './api-operation.model';

export interface ApiResource {
  id: string;
  name: string;
  label: string;
  description?: string;
  operations: ApiOperation[];
}
