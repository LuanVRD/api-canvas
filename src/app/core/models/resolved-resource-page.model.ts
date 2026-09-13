import { ApiOperation } from './api-operation.model';
import { ApiResource } from './api-resource.model';
import { ApiDefinition } from './api-definition.model';
import {
  UiActionConfirmationConfig,
  UiActionInputMode,
  UiActionStyle,
  UiCustomActionDescriptor,
  UiPageConfiguration,
  UiResourceConfiguration
} from './ui-configuration.model';

export type ResolvedOperationRole =
  | 'list'
  | 'create'
  | 'details'
  | 'update'
  | 'delete'
  | 'custom'
  | string;

export type ResolvedOperationWarningCode =
  | 'AMBIGUOUS_MATCH'
  | 'MISSING_OPERATION'
  | 'OPERATION_NOT_FOUND'
  | 'INCOMPATIBLE_METHOD'
  | 'PARAM_RESOLUTION_INCOMPLETE'
  | string;

export interface ResolvedOperationWarning {
  code: ResolvedOperationWarningCode;
  message: string;
  role?: ResolvedOperationRole;
  operationId?: string;
  details?: unknown;
}

export interface ResolvedCustomAction {
  id: string;
  label: string;
  operation: ApiOperation;
  icon?: string;
  tooltip?: string;
  style?: UiActionStyle;
  danger?: boolean;
  confirmation?: boolean | UiActionConfirmationConfig;
  inputMode?: UiActionInputMode;
  initialValues?: Record<string, unknown>;
  descriptor?: UiCustomActionDescriptor;
  isExplicit: boolean;
}

export interface ResolvedResourcePage {
  resourceId: string;
  resource: ApiResource | null;
  pageConfig?: UiPageConfiguration | null;

  /**
   * Primary GET list/collection operation.
   */
  list: ApiOperation | null;

  /**
   * Primary POST creation operation.
   */
  create: ApiOperation | null;

  /**
   * Primary GET item details operation.
   */
  details: ApiOperation | null;

  /**
   * Primary PUT/PATCH record update operation.
   */
  update: ApiOperation | null;

  /**
   * Primary DELETE record removal operation.
   */
  delete: ApiOperation | null;

  /**
   * All compatible record update operations (e.g. multiple PUT and PATCH endpoints).
   */
  updateOperations: ApiOperation[];

  /**
   * Custom / RPC action operations (e.g. POST /orders/{id}/cancel, POST /orders/{id}/ship).
   */
  customActions: ResolvedCustomAction[];

  /**
   * Diagnostic warnings generated when resolution is ambiguous, incomplete, or references non-existent operations.
   */
  warnings: ResolvedOperationWarning[];

  /**
   * Flags indicating whether each operation was resolved via explicit user configuration or automated heuristic matching.
   */
  explicitOverrides: {
    list?: boolean;
    create?: boolean;
    details?: boolean;
    update?: boolean;
    delete?: boolean;
  };
}

export interface ResolveResourcePageOptions {
  resource: ApiResource;
  pageConfig?: UiPageConfiguration | null;
  resourceConfig?: UiResourceConfiguration | null;
  apiDefinition?: ApiDefinition | null;
  sourceOperation?: ApiOperation | null;
}
