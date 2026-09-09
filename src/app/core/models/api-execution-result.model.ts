export type ApiErrorCategory =
  | 'CORS_OR_NETWORK'
  | 'HTTP_ERROR'
  | 'VALIDATION_ERROR'
  | 'OPENAPI_LOAD'
  | 'OPENAPI_PARSE'
  | 'UNKNOWN';

export interface ApiExecutionError {
  message: string;
  category?: ApiErrorCategory;
  status?: number;
  statusText?: string;
  details?: unknown;
  hint?: string;
}

export interface ApiExecutionResult {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: unknown;
  durationMs?: number;
  duration?: number;
  isSuccess: boolean;
  error?: ApiExecutionError;
  timestamp?: number;
}

