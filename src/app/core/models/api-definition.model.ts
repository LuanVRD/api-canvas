import { ApiResource } from './api-resource.model';

export interface ApiDefinition {
  title: string;
  version?: string;
  description?: string;
  baseUrl: string;
  resources: ApiResource[];
}
