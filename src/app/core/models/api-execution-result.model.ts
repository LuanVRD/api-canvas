export interface ApiExecutionError {
  message: string;
  status?: number;
  details?: unknown;
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
}
