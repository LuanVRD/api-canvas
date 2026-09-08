export interface ApiRequestInput {
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface ApiExecutionResult {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: unknown;
  duration?: number;
}
