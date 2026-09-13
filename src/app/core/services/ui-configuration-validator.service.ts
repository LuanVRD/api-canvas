import { Injectable } from '@angular/core';
import {
  CURRENT_UI_CONFIGURATION_VERSION,
  UiColumnConfiguration,
  UiConfiguration,
  UiMetricConfiguration,
  UiOperationReferences,
  UiPageConfiguration,
  UiResourceConfiguration
} from '../models/ui-configuration.model';
import { ApiDefinition } from '../models/api-definition.model';
import { ApiOperation, HttpMethod } from '../models/api-operation.model';
import { ApiResource } from '../models/api-resource.model';
import { ApiSchema } from '../models/api-schema.model';
import {
  UiValidationCode,
  UiValidationIssue,
  UiValidationResult,
  UiValidationSeverity,
  UiValidationTargetType
} from '../models/ui-validation.model';

@Injectable({
  providedIn: 'root'
})
export class UiConfigurationValidatorService {
  private readonly validSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  private readonly validIdentifierRegex = /^[a-zA-Z0-9_-]+$/;
  private readonly supportedDisplayModes = new Set(['dashboard', 'crud', 'table', 'custom']);

  /**
   * Validates a full UiConfiguration against an optional ApiDefinition.
   * Produces structured issues (errors and warnings) and generates a sanitized safe fallback.
   */
  validate(
    config?: UiConfiguration | null,
    apiDefinition?: ApiDefinition | null
  ): UiValidationResult {
    const issues: UiValidationIssue[] = [];

    if (!config) {
      return {
        valid: true,
        hasErrors: false,
        hasWarnings: false,
        issues: [],
        errors: [],
        warnings: [],
        sanitizedConfig: null
      };
    }

    // 1. Root structure & version validation
    if (config.version !== undefined && config.version !== null) {
      if (
        typeof config.version !== 'number' &&
        typeof config.version !== 'string'
      ) {
        issues.push({
          severity: 'error',
          code: 'INVALID_VERSION',
          path: 'version',
          message: 'A versão da configuração deve ser um número ou string.',
          targetType: 'root'
        });
      } else if (
        typeof config.version === 'number' &&
        config.version > CURRENT_UI_CONFIGURATION_VERSION
      ) {
        issues.push({
          severity: 'warning',
          code: 'FUTURE_VERSION',
          path: 'version',
          message: `A versão informada (${config.version}) é superior à versão suportada atual (${CURRENT_UI_CONFIGURATION_VERSION}).`,
          targetType: 'root',
          fallbackApplied: 'Campos desconhecidos serão ignorados mantendo compatibilidade.'
        });
      }
    }

    // Context tracking for duplicates
    const slugMap = new Map<string, { path: string; targetType: UiValidationTargetType }>();
    const pageIdMap = new Map<string, string>();

    // 2. Resource configurations validation
    if (config.resources) {
      for (const [resKey, resConfig] of Object.entries(config.resources)) {
        const resPath = `resources.${resKey}`;
        this.validateResourceKey(resKey, resPath, issues);

        // Check if resource exists in ApiDefinition
        let matchingApiResource: ApiResource | undefined;
        if (apiDefinition && apiDefinition.resources) {
          matchingApiResource = this.findMatchingApiResource(apiDefinition, resKey);
          if (!matchingApiResource) {
            issues.push({
              severity: 'warning',
              code: 'RESOURCE_NOT_FOUND',
              path: resPath,
              message: `O recurso '${resKey}' configurado não foi encontrado na definição da API.`,
              targetType: 'resource',
              targetId: resKey,
              fallbackApplied: 'Configurações de campos e visualização para este recurso serão inócuas.'
            });
          }
        }

        // Validate resource slug
        if (resConfig.slug) {
          this.validateSlug(resConfig.slug, `${resPath}.slug`, 'resource', resKey, slugMap, issues);
        }

        // Validate resource operations
        if (resConfig.operations) {
          this.validateOperationReferences(
            resConfig.operations,
            `${resPath}.operations`,
            matchingApiResource,
            apiDefinition,
            issues
          );
        }

        // Validate embedded page if present
        if (resConfig.page) {
          this.validatePageConfiguration(
            resConfig.page,
            `${resPath}.page`,
            resKey,
            matchingApiResource,
            apiDefinition,
            slugMap,
            pageIdMap,
            issues
          );
        }

        // Validate resource fields against schema if available
        if (resConfig.fields) {
          this.validateFieldConfigurations(
            resConfig.fields,
            `${resPath}.fields`,
            matchingApiResource,
            issues
          );
        }
      }
    }

    // 3. Top-level pages validation
    if (config.pages) {
      for (const [pageKey, pageConfig] of Object.entries(config.pages)) {
        const pagePath = `pages.${pageKey}`;
        this.validateIdentifier(pageKey, pagePath, 'page', issues);

        // Check page ID duplicate
        const pageId = pageConfig.id || pageKey;
        if (pageIdMap.has(pageId) && pageIdMap.get(pageId) !== pagePath) {
          issues.push({
            severity: 'error',
            code: 'DUPLICATE_IDENTIFIER',
            path: `${pagePath}.id`,
            message: `O identificador de página '${pageId}' está duplicado (conflita com ${pageIdMap.get(pageId)}).`,
            targetType: 'page',
            targetId: pageId
          });
        } else {
          pageIdMap.set(pageId, pagePath);
        }

        let matchingApiResource: ApiResource | undefined;
        if (pageConfig.resourceId && apiDefinition && apiDefinition.resources) {
          matchingApiResource = this.findMatchingApiResource(apiDefinition, pageConfig.resourceId);
          if (!matchingApiResource) {
            issues.push({
              severity: 'error',
              code: 'RESOURCE_NOT_FOUND',
              path: `${pagePath}.resourceId`,
              message: `A página '${pageKey}' referencia o recurso inexistente '${pageConfig.resourceId}'.`,
              targetType: 'page',
              targetId: pageConfig.resourceId,
              fallbackApplied: 'A página será tratada em modo autônomo sem vinculação de recurso.'
            });
          }
        }

        this.validatePageConfiguration(
          pageConfig,
          pagePath,
          pageConfig.resourceId || pageKey,
          matchingApiResource,
          apiDefinition,
          slugMap,
          pageIdMap,
          issues
        );
      }
    }

    // 4. Global fields validation
    if (config.fields) {
      this.validateFieldConfigurations(config.fields, 'fields', undefined, issues);
    }

    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');

    const sanitizedConfig = this.sanitizeConfiguration(config, apiDefinition);

    return {
      valid: errors.length === 0,
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0,
      issues,
      errors,
      warnings,
      sanitizedConfig
    };
  }

  /**
   * Sanitizes a configuration, stripping missing operations, fixing slug anomalies,
   * and providing safe fallbacks so that runtime components will not crash.
   */
  sanitizeConfiguration(
    config?: UiConfiguration | null,
    apiDefinition?: ApiDefinition | null
  ): UiConfiguration | null {
    if (!config) return null;

    const sanitized: UiConfiguration = {
      version: config.version ?? CURRENT_UI_CONFIGURATION_VERSION,
      title: config.title
    };

    if (config.fields) {
      sanitized.fields = { ...config.fields };
    }

    if (config.resources) {
      sanitized.resources = {};
      for (const [key, resConfig] of Object.entries(config.resources)) {
        const matchingRes = apiDefinition ? this.findMatchingApiResource(apiDefinition, key) : undefined;
        sanitized.resources[key] = this.sanitizeResourceConfig(resConfig, matchingRes, apiDefinition);
      }
    }

    if (config.pages) {
      sanitized.pages = {};
      for (const [key, pageConfig] of Object.entries(config.pages)) {
        const matchingRes = pageConfig.resourceId && apiDefinition
          ? this.findMatchingApiResource(apiDefinition, pageConfig.resourceId)
          : undefined;
        sanitized.pages[key] = this.sanitizePageConfig(pageConfig, matchingRes, apiDefinition);
      }
    }

    return sanitized;
  }

  /**
   * Checks if a slug is well-formatted (lowercase alphanumeric and hyphens).
   */
  isValidSlug(slug?: string): boolean {
    if (!slug || typeof slug !== 'string') return false;
    return this.validSlugRegex.test(slug.trim());
  }

  /**
   * Checks if an identifier is valid (alphanumeric, underscores, hyphens).
   */
  isValidIdentifier(id?: string): boolean {
    if (!id || typeof id !== 'string') return false;
    return this.validIdentifierRegex.test(id.trim());
  }

  /**
   * Checks basic compatibility between a configuration role (e.g. list, details, delete) and an HTTP method.
   */
  checkMethodCompatibility(
    role: 'list' | 'details' | 'create' | 'update' | 'delete' | 'custom' | string,
    method: HttpMethod
  ): { compatible: boolean; severity: UiValidationSeverity; message?: string } {
    const normMethod = method ? (method.toUpperCase() as HttpMethod) : 'GET';

    switch (role) {
      case 'list':
        if (normMethod === 'GET') {
          return { compatible: true, severity: 'info' };
        }
        if (normMethod === 'POST') {
          return {
            compatible: true,
            severity: 'warning',
            message: 'A operação de listagem utiliza método POST (comum em buscas avançadas/RPC).'
          };
        }
        if (normMethod === 'DELETE') {
          return {
            compatible: false,
            severity: 'error',
            message: 'Método DELETE é incompatível com operação de listagem de dados.'
          };
        }
        return {
          compatible: true,
          severity: 'warning',
          message: `Método ${normMethod} incomum para operação de listagem.`
        };

      case 'details':
        if (normMethod === 'GET') {
          return { compatible: true, severity: 'info' };
        }
        if (normMethod === 'DELETE') {
          return {
            compatible: false,
            severity: 'error',
            message: 'Método DELETE é incompatível com visualização de detalhes.'
          };
        }
        return {
          compatible: true,
          severity: 'warning',
          message: `Método ${normMethod} incomum para visualização de detalhes (esperado GET).`
        };

      case 'create':
        if (normMethod === 'POST' || normMethod === 'PUT') {
          return { compatible: true, severity: 'info' };
        }
        if (normMethod === 'GET' || normMethod === 'DELETE') {
          return {
            compatible: false,
            severity: 'warning',
            message: `Método ${normMethod} não é seguro nem padrão para criação de recursos (esperado POST ou PUT).`
          };
        }
        return { compatible: true, severity: 'info' };

      case 'update':
        if (normMethod === 'PUT' || normMethod === 'PATCH' || normMethod === 'POST') {
          return { compatible: true, severity: 'info' };
        }
        if (normMethod === 'GET' || normMethod === 'DELETE') {
          return {
            compatible: false,
            severity: 'warning',
            message: `Método ${normMethod} não é recomendado para atualização (esperado PUT, PATCH ou POST).`
          };
        }
        return { compatible: true, severity: 'info' };

      case 'delete':
        if (normMethod === 'DELETE' || normMethod === 'POST') {
          return { compatible: true, severity: 'info' };
        }
        if (normMethod === 'GET') {
          return {
            compatible: false,
            severity: 'warning',
            message: 'Método GET para operação de exclusão viola segurança idempotente HTTP.'
          };
        }
        return { compatible: true, severity: 'info' };

      default:
        return { compatible: true, severity: 'info' };
    }
  }

  // --- Internal Validation Helpers ---

  private validateResourceKey(key: string, path: string, issues: UiValidationIssue[]): void {
    if (!key || key.trim() === '') {
      issues.push({
        severity: 'error',
        code: 'EMPTY_IDENTIFIER',
        path,
        message: 'A chave do recurso não pode ser vazia.',
        targetType: 'resource'
      });
      return;
    }

    if (!this.isValidIdentifier(key)) {
      issues.push({
        severity: 'warning',
        code: 'INVALID_IDENTIFIER',
        path,
        message: `A chave do recurso '${key}' contém caracteres especiais não recomendados.`,
        targetType: 'resource',
        targetId: key
      });
    }
  }

  private validateIdentifier(
    id: string,
    path: string,
    targetType: UiValidationTargetType,
    issues: UiValidationIssue[]
  ): void {
    if (!id || id.trim() === '') {
      issues.push({
        severity: 'error',
        code: 'EMPTY_IDENTIFIER',
        path,
        message: `O identificador (${targetType}) não pode ser vazio.`,
        targetType
      });
      return;
    }

    if (!this.isValidIdentifier(id)) {
      issues.push({
        severity: 'warning',
        code: 'INVALID_IDENTIFIER',
        path,
        message: `O identificador '${id}' contém caracteres especiais não recomendados.`,
        targetType,
        targetId: id
      });
    }
  }

  private validateSlug(
    slug: string,
    path: string,
    targetType: UiValidationTargetType,
    targetId: string,
    slugMap: Map<string, { path: string; targetType: UiValidationTargetType }>,
    issues: UiValidationIssue[]
  ): void {
    if (!slug || slug.trim() === '') {
      issues.push({
        severity: 'error',
        code: 'EMPTY_SLUG',
        path,
        message: `O slug configurado não pode ser vazio.`,
        targetType,
        targetId
      });
      return;
    }

    const trimmed = slug.trim();
    if (!this.isValidSlug(trimmed)) {
      issues.push({
        severity: 'error',
        code: 'INVALID_SLUG_FORMAT',
        path,
        message: `O slug '${slug}' é inválido. Use apenas letras minúsculas, números e hífens (ex.: 'meus-pedidos').`,
        targetType,
        targetId,
        fallbackApplied: 'O slug será normalizado para formato válido em tempo de execução.'
      });
    }

    const lowerSlug = trimmed.toLowerCase();
    if (slugMap.has(lowerSlug)) {
      const existing = slugMap.get(lowerSlug)!;
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_SLUG',
        path,
        message: `O slug '${slug}' está duplicado (já utilizado em ${existing.path}).`,
        targetType,
        targetId
      });
    } else {
      slugMap.set(lowerSlug, { path, targetType });
    }
  }

  private validatePageConfiguration(
    page: UiPageConfiguration,
    path: string,
    pageIdOrKey: string,
    resource: ApiResource | undefined,
    apiDefinition: ApiDefinition | null | undefined,
    slugMap: Map<string, { path: string; targetType: UiValidationTargetType }>,
    pageIdMap: Map<string, string>,
    issues: UiValidationIssue[]
  ): void {
    // 1. Slug validation
    if (page.slug) {
      this.validateSlug(page.slug, `${path}.slug`, 'page', pageIdOrKey, slugMap, issues);
    }

    // 2. Display mode
    if (page.displayMode && !this.supportedDisplayModes.has(page.displayMode)) {
      issues.push({
        severity: 'warning',
        code: 'UNSUPPORTED_DISPLAY_MODE',
        path: `${path}.displayMode`,
        message: `O modo de exibição '${page.displayMode}' não é reconhecido.`,
        targetType: 'page',
        targetId: pageIdOrKey,
        fallbackApplied: "Modo 'dashboard' será utilizado como padrão."
      });
    }

    // 3. Operations validation
    if (page.operations) {
      this.validateOperationReferences(
        page.operations,
        `${path}.operations`,
        resource,
        apiDefinition,
        issues
      );
    }

    // 4. Primary and row actions operations
    if (page.actions) {
      if (page.actions.primaryCreateActionId) {
        const createOpId = page.actions.primaryCreateActionId;
        const op = this.findOperationInScope(createOpId, resource, apiDefinition);
        if (!op && apiDefinition) {
          issues.push({
            severity: 'error',
            code: 'OPERATION_NOT_FOUND',
            path: `${path}.actions.primaryCreateActionId`,
            message: `A ação primária referencia a operação inexistente '${createOpId}'.`,
            targetType: 'action',
            targetId: createOpId,
            fallbackApplied: 'O botão de criação rápida será desabilitado.'
          });
        }
      }

      if (page.actions.rowActions?.customActionOperations) {
        page.actions.rowActions.customActionOperations.forEach((opId, idx) => {
          const op = this.findOperationInScope(opId, resource, apiDefinition);
          if (!op && apiDefinition) {
            issues.push({
              severity: 'warning',
              code: 'OPERATION_NOT_FOUND',
              path: `${path}.actions.rowActions.customActionOperations[${idx}]`,
              message: `A ação de linha customizada referencia a operação inexistente '${opId}'.`,
              targetType: 'action',
              targetId: opId,
              fallbackApplied: 'A ação individual será omitida da tabela.'
            });
          }
        });
      }

      const explicitCustomDescriptors = [
        ...(page.actions.rowActions?.customActions || []),
        ...(page.actions.rowActions?.actions || [])
      ];

      explicitCustomDescriptors.forEach((desc, idx) => {
        const opId = desc.operationId || desc.id;
        if (opId) {
          const op = this.findOperationInScope(opId, resource, apiDefinition);
          if (!op && apiDefinition) {
            issues.push({
              severity: 'warning',
              code: 'OPERATION_NOT_FOUND',
              path: `${path}.actions.rowActions.customActions[${idx}]`,
              message: `A ação de linha customizada '${desc.label || opId}' referencia a operação inexistente '${opId}'.`,
              targetType: 'action',
              targetId: opId,
              fallbackApplied: 'A ação individual será omitida da tabela.'
            });
          }
        }
      });
    }

    // 5. Schema-dependent validations: Table columns, Filters & Metrics
    const responseSchema = this.inferItemSchemaFromResourceOrOperations(resource, page, apiDefinition);

    if (page.table?.columns) {
      this.validateTableColumns(page.table.columns, `${path}.table.columns`, responseSchema, issues);
    }

    if (page.filters) {
      this.validateFilters(page.filters, `${path}.filters`, responseSchema, issues);
    }

    if (page.metrics) {
      this.validateMetrics(page.metrics, `${path}.metrics`, responseSchema, issues);
    }
  }

  private validateOperationReferences(
    operations: UiOperationReferences,
    basePath: string,
    resource: ApiResource | undefined,
    apiDefinition: ApiDefinition | null | undefined,
    issues: UiValidationIssue[]
  ): void {
    const roles: Array<'list' | 'create' | 'details' | 'update' | 'delete'> = [
      'list',
      'create',
      'details',
      'update',
      'delete'
    ];

    for (const role of roles) {
      const opId = operations[role];
      if (typeof opId === 'string' && opId.trim() !== '') {
        const opPath = `${basePath}.${role}`;
        const op = this.findOperationInScope(opId, resource, apiDefinition);

        if (!op && apiDefinition) {
          issues.push({
            severity: 'error',
            code: 'OPERATION_NOT_FOUND',
            path: opPath,
            message: `A operação '${opId}' configurada para '${role}' não existe na API.`,
            targetType: 'operation',
            targetId: opId,
            fallbackApplied: `A funcionalidade de '${role}' utilizará inferência automática ou será desativada.`
          });
        } else if (op) {
          const check = this.checkMethodCompatibility(role, op.method);
          if (!check.compatible || check.severity === 'warning') {
            issues.push({
              severity: check.severity,
              code: 'METHOD_INCOMPATIBLE',
              path: opPath,
              message: check.message || `Método ${op.method} incompatível para função '${role}'.`,
              targetType: 'operation',
              targetId: opId
            });
          }
        }
      }
    }

    if (Array.isArray(operations['custom'])) {
      (operations['custom'] as string[]).forEach((customOpId, idx) => {
        if (typeof customOpId === 'string' && customOpId.trim() !== '') {
          const opPath = `${basePath}.custom[${idx}]`;
          const op = this.findOperationInScope(customOpId, resource, apiDefinition);
          if (!op && apiDefinition) {
            issues.push({
              severity: 'warning',
              code: 'OPERATION_NOT_FOUND',
              path: opPath,
              message: `A operação customizada '${customOpId}' não foi encontrada na API.`,
              targetType: 'operation',
              targetId: customOpId,
              fallbackApplied: 'A operação customizada será ignorada no menu de ações.'
            });
          }
        }
      });
    }
  }

  private validateTableColumns(
    columns: UiColumnConfiguration[],
    basePath: string,
    schema: ApiSchema | undefined,
    issues: UiValidationIssue[]
  ): void {
    const knownProperties = schema?.properties ? Object.keys(schema.properties) : null;

    columns.forEach((col, idx) => {
      const colPath = `${basePath}[${idx}]`;
      if (!col.field || col.field.trim() === '') {
        issues.push({
          severity: 'error',
          code: 'EMPTY_IDENTIFIER',
          path: `${colPath}.field`,
          message: 'O campo da coluna não pode ser vazio.',
          targetType: 'column'
        });
        return;
      }

      if (knownProperties && !knownProperties.includes(col.field)) {
        issues.push({
          severity: 'warning',
          code: 'SCHEMA_FIELD_NOT_FOUND',
          path: `${colPath}.field`,
          message: `O campo '${col.field}' não foi encontrado nas propriedades conhecidas do schema.`,
          targetType: 'column',
          targetId: col.field,
          fallbackApplied: 'A coluna será renderizada com valor vazio se não existir no payload.'
        });
      }
    });
  }

  private validateFilters(
    filters: UiPageConfiguration['filters'],
    basePath: string,
    schema: ApiSchema | undefined,
    issues: UiValidationIssue[]
  ): void {
    if (!filters || !schema?.properties) return;
    const props = Object.keys(schema.properties);

    if (filters.searchFields) {
      filters.searchFields.forEach((field, idx) => {
        if (!props.includes(field)) {
          issues.push({
            severity: 'warning',
            code: 'SCHEMA_FIELD_NOT_FOUND',
            path: `${basePath}.searchFields[${idx}]`,
            message: `O campo de busca '${field}' não consta no schema de resposta.`,
            targetType: 'field',
            targetId: field
          });
        }
      });
    }

    if (filters.statusField && !props.includes(filters.statusField)) {
      issues.push({
        severity: 'warning',
        code: 'SCHEMA_FIELD_NOT_FOUND',
        path: `${basePath}.statusField`,
        message: `O campo de status '${filters.statusField}' não consta no schema de resposta.`,
        targetType: 'field',
        targetId: filters.statusField
      });
    }

    if (filters.dateField && !props.includes(filters.dateField)) {
      issues.push({
        severity: 'warning',
        code: 'SCHEMA_FIELD_NOT_FOUND',
        path: `${basePath}.dateField`,
        message: `O campo de data '${filters.dateField}' não consta no schema de resposta.`,
        targetType: 'field',
        targetId: filters.dateField
      });
    }
  }

  private validateMetrics(
    metrics: UiMetricConfiguration[],
    basePath: string,
    schema: ApiSchema | undefined,
    issues: UiValidationIssue[]
  ): void {
    metrics.forEach((metric, idx) => {
      const metricPath = `${basePath}[${idx}]`;

      if (!metric.label || metric.label.trim() === '') {
        issues.push({
          severity: 'warning',
          code: 'EMPTY_IDENTIFIER',
          path: `${metricPath}.label`,
          message: 'A métrica deve possuir um rótulo (label).',
          targetType: 'metric'
        });
      }

      if (metric.type === 'sum_field') {
        if (!metric.field) {
          issues.push({
            severity: 'error',
            code: 'INVALID_METRIC_CONFIG',
            path: `${metricPath}.field`,
            message: "Métricas do tipo 'sum_field' exigem a especificação da propriedade 'field'.",
            targetType: 'metric',
            targetId: metric.id
          });
        } else if (schema?.properties) {
          const fieldSchema = schema.properties[metric.field];
          if (!fieldSchema) {
            issues.push({
              severity: 'warning',
              code: 'SCHEMA_FIELD_NOT_FOUND',
              path: `${metricPath}.field`,
              message: `O campo '${metric.field}' da métrica de soma não existe no schema.`,
              targetType: 'metric',
              targetId: metric.field
            });
          } else if (
            fieldSchema.type !== 'number' &&
            fieldSchema.type !== 'integer' &&
            fieldSchema.type !== 'unknown'
          ) {
            issues.push({
              severity: 'warning',
              code: 'FIELD_TYPE_MISMATCH',
              path: `${metricPath}.field`,
              message: `O campo '${metric.field}' possui tipo '${fieldSchema.type}' e não é numérico para soma.`,
              targetType: 'metric',
              targetId: metric.field,
              fallbackApplied: 'A métrica exibirá 0 se os valores não puderem ser somados.'
            });
          }
        }
      }

      if (metric.type === 'count_matching') {
        if (!metric.field) {
          issues.push({
            severity: 'error',
            code: 'INVALID_METRIC_CONFIG',
            path: `${metricPath}.field`,
            message: "Métricas do tipo 'count_matching' exigem a especificação de 'field'.",
            targetType: 'metric',
            targetId: metric.id
          });
        }
      }
    });
  }

  private validateFieldConfigurations(
    fields: Record<string, unknown>,
    basePath: string,
    resource: ApiResource | undefined,
    issues: UiValidationIssue[]
  ): void {
    for (const [key, fieldVal] of Object.entries(fields)) {
      if (!key || key.trim() === '') {
        issues.push({
          severity: 'error',
          code: 'EMPTY_IDENTIFIER',
          path: `${basePath}['']`,
          message: 'O nome do campo não pode ser vazio.',
          targetType: 'field'
        });
      }
    }
  }

  // --- Search & Inspection Utilities ---

  private findMatchingApiResource(
    apiDefinition: ApiDefinition,
    resourceKey: string
  ): ApiResource | undefined {
    if (!apiDefinition.resources || !resourceKey) return undefined;
    const target = resourceKey.toLowerCase().trim();

    return apiDefinition.resources.find(
      (r) =>
        r.id.toLowerCase() === target ||
        r.name.toLowerCase() === target ||
        r.label.toLowerCase() === target
    );
  }

  private findOperationInScope(
    operationId: string,
    resource: ApiResource | undefined,
    apiDefinition: ApiDefinition | null | undefined
  ): ApiOperation | undefined {
    if (!operationId) return undefined;
    const target = operationId.trim();

    // 1. Search in resource
    if (resource && resource.operations) {
      const match = resource.operations.find(
        (op) => op.id === target || op.operationId === target
      );
      if (match) return match;
    }

    // 2. Search globally in ApiDefinition
    if (apiDefinition && apiDefinition.resources) {
      for (const res of apiDefinition.resources) {
        const match = res.operations.find(
          (op) => op.id === target || op.operationId === target
        );
        if (match) return match;
      }
    }

    return undefined;
  }

  private inferItemSchemaFromResourceOrOperations(
    resource: ApiResource | undefined,
    page: UiPageConfiguration,
    apiDefinition: ApiDefinition | null | undefined
  ): ApiSchema | undefined {
    // 1. Find the list operation
    let listOp: ApiOperation | undefined;
    if (page.operations?.list) {
      listOp = this.findOperationInScope(page.operations.list, resource, apiDefinition);
    }

    if (!listOp && resource?.operations) {
      listOp = resource.operations.find((op) => op.type === 'list' || op.method === 'GET');
    }

    if (!listOp?.responses) return undefined;

    // Find successful 200 or 201 response schema
    const successRes = listOp.responses.find(
      (r) => r.statusCode === '200' || r.statusCode === '201' || r.statusCode === 'default'
    );
    const schema = successRes?.schema;
    if (!schema) return undefined;

    // Unpack array items
    if (schema.type === 'array' && schema.items) {
      return schema.items;
    }

    // Unpack collection properties (e.g. data: [], items: [], results: [])
    if (schema.properties) {
      for (const key of ['data', 'items', 'results', 'content', 'records']) {
        const prop = schema.properties[key];
        if (prop && prop.type === 'array' && prop.items) {
          return prop.items;
        }
      }
      return schema;
    }

    return schema;
  }

  // --- Sanitization Helpers ---

  private sanitizeResourceConfig(
    resConfig: UiResourceConfiguration,
    resource: ApiResource | undefined,
    apiDefinition: ApiDefinition | null | undefined
  ): UiResourceConfiguration {
    const copy: UiResourceConfiguration = {
      label: resConfig.label,
      icon: resConfig.icon,
      hidden: resConfig.hidden,
      order: resConfig.order,
      slug: this.sanitizeSlug(resConfig.slug),
      list: resConfig.list ? { ...resConfig.list } : undefined,
      fields: resConfig.fields ? { ...resConfig.fields } : undefined
    };

    if (resConfig.operations) {
      copy.operations = this.sanitizeOperations(resConfig.operations, resource, apiDefinition);
    }

    if (resConfig.page) {
      copy.page = this.sanitizePageConfig(resConfig.page, resource, apiDefinition);
    }

    return copy;
  }

  private sanitizePageConfig(
    pageConfig: UiPageConfiguration,
    resource: ApiResource | undefined,
    apiDefinition: ApiDefinition | null | undefined
  ): UiPageConfiguration {
    const copy: UiPageConfiguration = {
      id: pageConfig.id,
      resourceId: pageConfig.resourceId,
      title: this.stripHtml(pageConfig.title),
      slug: this.sanitizeSlug(pageConfig.slug),
      icon: pageConfig.icon,
      description: this.stripHtml(pageConfig.description),
      order: pageConfig.order,
      hidden: pageConfig.hidden,
      displayMode: this.supportedDisplayModes.has(pageConfig.displayMode || '')
        ? pageConfig.displayMode
        : 'dashboard',
      dataPath: this.stripHtml(pageConfig.dataPath),
      totalPath: this.stripHtml(pageConfig.totalPath),
      metrics: pageConfig.metrics
        ? pageConfig.metrics
            .filter((m) => Boolean(m.label))
            .map((m) => ({
              ...m,
              label: this.stripHtml(m.label) || m.label,
              description: this.stripHtml(m.description)
            }))
        : undefined,
      filters: pageConfig.filters
        ? {
            ...pageConfig.filters,
            searchPlaceholder: this.stripHtml(pageConfig.filters.searchPlaceholder),
            filterBindings: pageConfig.filters.filterBindings?.map((b) => ({
              ...b,
              label: this.stripHtml(b.label),
              placeholder: this.stripHtml(b.placeholder)
            }))
          }
        : undefined,
      table: pageConfig.table
        ? {
            ...pageConfig.table,
            dataPath: this.stripHtml(pageConfig.table.dataPath),
            totalPath: this.stripHtml(pageConfig.table.totalPath),
            columns: pageConfig.table.columns?.map((c) => ({
              ...c,
              label: this.stripHtml(c.label)
            }))
          }
        : undefined,
      pagination: pageConfig.pagination ? { ...pageConfig.pagination } : undefined
    };

    if (pageConfig.operations) {
      copy.operations = this.sanitizeOperations(pageConfig.operations, resource, apiDefinition);
    }

    if (pageConfig.actions) {
      copy.actions = {
        ...pageConfig.actions,
        primaryCreateLabel: this.stripHtml(pageConfig.actions.primaryCreateLabel)
      };
      if (
        pageConfig.actions.primaryCreateActionId &&
        apiDefinition &&
        !this.findOperationInScope(pageConfig.actions.primaryCreateActionId, resource, apiDefinition)
      ) {
        // Strip invalid action ID to prevent broken button execution
        delete copy.actions.primaryCreateActionId;
      }

      if (pageConfig.actions.rowActions?.customActionOperations && apiDefinition) {
        copy.actions.rowActions = {
          ...copy.actions.rowActions,
          customActionOperations: pageConfig.actions.rowActions.customActionOperations.filter((opId) =>
            Boolean(this.findOperationInScope(opId, resource, apiDefinition))
          )
        };
      }

      if (pageConfig.actions.rowActions?.customActions) {
        copy.actions.rowActions = {
          ...copy.actions.rowActions,
          customActions: pageConfig.actions.rowActions.customActions
            .filter((desc) =>
              !apiDefinition || Boolean(this.findOperationInScope(desc.operationId || desc.id || '', resource, apiDefinition))
            )
            .map((desc) => ({
              ...desc,
              label: this.stripHtml(desc.label) || desc.label,
              tooltip: this.stripHtml(desc.tooltip)
            }))
        };
      }

      if (pageConfig.actions.rowActions?.actions) {
        copy.actions.rowActions = {
          ...copy.actions.rowActions,
          actions: pageConfig.actions.rowActions.actions
            .filter((desc) =>
              !apiDefinition || Boolean(this.findOperationInScope(desc.operationId || desc.id || '', resource, apiDefinition))
            )
            .map((desc) => ({
              ...desc,
              label: this.stripHtml(desc.label) || desc.label,
              tooltip: this.stripHtml(desc.tooltip)
            }))
        };
      }
    }

    return copy;
  }

  private sanitizeOperations(
    operations: UiPageConfiguration['operations'],
    resource: ApiResource | undefined,
    apiDefinition: ApiDefinition | null | undefined
  ): UiPageConfiguration['operations'] {
    if (!operations) return undefined;
    const sanitized: Record<string, unknown> = {};

    const roles = ['list', 'create', 'details', 'update', 'delete'] as const;
    for (const role of roles) {
      const opId = operations[role];
      if (typeof opId === 'string' && opId.trim() !== '') {
        if (!apiDefinition || this.findOperationInScope(opId, resource, apiDefinition)) {
          sanitized[role] = opId.trim();
        }
      }
    }

    if (Array.isArray(operations.custom)) {
      sanitized['custom'] = operations.custom.filter((id) =>
        !apiDefinition || Boolean(this.findOperationInScope(id, resource, apiDefinition))
      );
    }

    return sanitized as UiPageConfiguration['operations'];
  }

  private sanitizeSlug(slug?: string): string | undefined {
    if (!slug) return undefined;
    return slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Strips HTML markup, scripts, and unsafe tags from arbitrary text configurations.
   */
  stripHtml(text?: string | null): string | undefined {
    if (!text || typeof text !== 'string') return undefined;
    const cleaned = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<\/?[a-z][a-z0-9]*\b[^>]*>/gi, '')
      .trim();
    return cleaned;
  }
}

