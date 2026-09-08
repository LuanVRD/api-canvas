import { ApiResource } from './api-resource.model';

export interface ApiServer {
  url: string;
  description?: string;
}

export interface ApiDefinition {
  title: string;
  version?: string;
  description?: string;
  baseUrl: string;
  servers?: ApiServer[];
  resources: ApiResource[];
}
