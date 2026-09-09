import { HttpMethod } from './api-operation.model';
import { ParameterLocation } from './api-parameter.model';

export type RequestValidationLocation = ParameterLocation | 'body';

export interface RequestValidationErrorItem {
  name: string;
  location: RequestValidationLocation;
  message: string;
}

export interface RequestValidationResult {
  isValid: boolean;
  errors: RequestValidationErrorItem[];
}

export class RequestValidationError extends Error {
  readonly errors: RequestValidationErrorItem[];

  constructor(message: string, errors: RequestValidationErrorItem[] = []) {
    super(message);
    this.name = 'RequestValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }
}

export interface BuiltApiRequest {
  url: string;
  fullUrl: string;
  method: HttpMethod;
  headers: Record<string, string>;
  queryParams: Record<string, string | string[]>;
  queryString: string;
  body?: unknown;
}

export interface BuildRequestOptions {
  skipValidation?: boolean;
  bearerToken?: string | null;
}

