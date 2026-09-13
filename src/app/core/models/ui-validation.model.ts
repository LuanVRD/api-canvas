import { UiConfiguration } from './ui-configuration.model';

export type UiValidationSeverity = 'error' | 'warning' | 'info';

export type UiValidationTargetType =
  | 'root'
  | 'resource'
  | 'page'
  | 'metric'
  | 'table'
  | 'column'
  | 'field'
  | 'operation'
  | 'action';

export type UiValidationCode =
  | 'EMPTY_IDENTIFIER'
  | 'INVALID_IDENTIFIER'
  | 'DUPLICATE_IDENTIFIER'
  | 'EMPTY_SLUG'
  | 'INVALID_SLUG_FORMAT'
  | 'DUPLICATE_SLUG'
  | 'RESOURCE_NOT_FOUND'
  | 'OPERATION_NOT_FOUND'
  | 'METHOD_INCOMPATIBLE'
  | 'SCHEMA_FIELD_NOT_FOUND'
  | 'FIELD_TYPE_MISMATCH'
  | 'INVALID_METRIC_CONFIG'
  | 'UNSUPPORTED_DISPLAY_MODE'
  | 'INVALID_VERSION'
  | 'MALFORMED_STRUCTURE'
  | string;

export interface UiValidationIssue {
  severity: UiValidationSeverity;
  code: UiValidationCode;
  path: string;
  message: string;
  targetType: UiValidationTargetType;
  targetId?: string;
  fallbackApplied?: string;
}

export interface UiValidationResult {
  valid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  issues: UiValidationIssue[];
  errors: UiValidationIssue[];
  warnings: UiValidationIssue[];
  sanitizedConfig?: UiConfiguration | null;
}
