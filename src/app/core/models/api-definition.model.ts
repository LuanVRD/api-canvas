import { ApiResource } from './api-resource.model';

export interface ApiServer {
  url: string;
  description?: string;
}

export type ApiSecuritySchemeType =
  | 'http'
  | 'apiKey'
  | 'oauth2'
  | 'openIdConnect'
  | 'mutualTLS';

export interface ApiSecurityScheme {
  id: string;
  type: ApiSecuritySchemeType;
  scheme?: string;
  bearerFormat?: string;
  name?: string;
  in?: 'header' | 'query' | 'cookie';
  description?: string;
  isBearer: boolean;
}

export type ApiSecurityRequirement = Record<string, string[]>;

export interface ApiDefinition {
  title: string;
  version?: string;
  description?: string;
  baseUrl: string;
  servers?: ApiServer[];
  resources: ApiResource[];
  securitySchemes?: ApiSecurityScheme[];
  security?: ApiSecurityRequirement[];
}

