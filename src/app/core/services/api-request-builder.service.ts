import { Injectable } from '@angular/core';
import { ApiOperation, ApiRequestBody } from '../models/api-operation.model';
import { ApiSecurityScheme } from '../models/api-definition.model';
import { ApiRequestInput } from '../models/api-request-input.model';
import {
  BuiltApiRequest,
  BuildRequestOptions,
  RequestValidationError,
  RequestValidationErrorItem,
  RequestValidationResult
} from '../models/built-api-request.model';

@Injectable({
  providedIn: 'root'
})
export class ApiRequestBuilderService {
  /**
   * Valida se os parâmetros obrigatórios (path, query, header, body) foram informados no input.
   */
  validate(operation: ApiOperation, input: ApiRequestInput = {}): RequestValidationResult {
    const errors: RequestValidationErrorItem[] = [];
    const checkedPathParams = new Set<string>();

    // 1. Validar parâmetros explícitos da operação
    if (operation.parameters && Array.isArray(operation.parameters)) {
      for (const param of operation.parameters) {
        if (param.location === 'path') {
          checkedPathParams.add(param.name);
          const val = input.path ? input.path[param.name] : undefined;
          if (this.isEmptyValue(val)) {
            errors.push({
              name: param.name,
              location: 'path',
              message: `Missing required path parameter "${param.name}".`
            });
          }
        } else if (param.location === 'query' && param.required) {
          const val = input.query ? input.query[param.name] : undefined;
          if (this.isEmptyValue(val)) {
            errors.push({
              name: param.name,
              location: 'query',
              message: `Missing required query parameter "${param.name}".`
            });
          }
        } else if (param.location === 'header' && param.required) {
          const val = input.headers ? input.headers[param.name] : undefined;
          if (this.isEmptyValue(val)) {
            errors.push({
              name: param.name,
              location: 'header',
              message: `Missing required header parameter "${param.name}".`
            });
          }
        }
      }
    }

    // 2. Validar placeholders no path template {paramName} que não foram checados
    const pathPlaceholders = this.extractPathPlaceholders(operation.path);
    for (const placeholder of pathPlaceholders) {
      if (!checkedPathParams.has(placeholder)) {
        const val = input.path ? input.path[placeholder] : undefined;
        if (this.isEmptyValue(val)) {
          errors.push({
            name: placeholder,
            location: 'path',
            message: `Missing required path parameter "${placeholder}".`
          });
        }
      }
    }

    // 3. Validar request body obrigatório
    if (operation.requestBody) {
      const isRequired =
        'required' in operation.requestBody &&
        Boolean((operation.requestBody as ApiRequestBody).required);

      if (isRequired) {
        const hasBody = input.body !== undefined && input.body !== null;
        if (!hasBody) {
          errors.push({
            name: 'body',
            location: 'body',
            message: 'Request body is required.'
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Constrói a requisição HTTP completa e normalizada a partir da operação, URL base e inputs fornecidos.
   */
  build(
    baseUrl: string,
    operation: ApiOperation,
    input: ApiRequestInput = {},
    options: BuildRequestOptions = {}
  ): BuiltApiRequest {
    if (!options.skipValidation) {
      const validation = this.validate(operation, input);
      if (!validation.isValid) {
        const errorMessages = validation.errors.map((e) => e.message).join(' ');
        throw new RequestValidationError(
          `Validation failed for operation "${operation.id || operation.operationId || operation.path}": ${errorMessages}`,
          validation.errors
        );
      }
    }

    // 1. Resolução do Path e URL Base
    const resolvedPath = this.resolvePath(operation.path, input.path);
    const cleanBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
    const cleanPath = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;
    const url = `${cleanBase}${cleanPath}`;

    // 2. Preparação de Query Parameters
    const queryParams: Record<string, string | string[]> = {};
    const queryStringParts: string[] = [];

    if (input.query) {
      for (const [key, rawValue] of Object.entries(input.query)) {
        if (this.isUndefinedOrNull(rawValue)) {
          continue;
        }

        if (Array.isArray(rawValue)) {
          const filteredItems = rawValue
            .filter((item) => !this.isUndefinedOrNull(item) && item !== '')
            .map((item) => String(item));

          if (filteredItems.length > 0) {
            queryParams[key] = filteredItems;
            for (const item of filteredItems) {
              queryStringParts.push(
                `${encodeURIComponent(key)}=${encodeURIComponent(item)}`
              );
            }
          }
        } else {
          const strVal = String(rawValue);
          // Se for string vazia não obrigatória, podemos ignorar para manter URL limpa
          if (strVal === '' && typeof rawValue === 'string') {
            continue;
          }
          queryParams[key] = strVal;
          queryStringParts.push(
            `${encodeURIComponent(key)}=${encodeURIComponent(strVal)}`
          );
        }
      }
    }

    // Injeção de API Key via Query Parameter se a operação exigir autenticação
    if (operation.requiresAuth && options.apiKeys) {
      const applicableSchemes = this.resolveApplicableSchemes(operation, options.securitySchemes);
      for (const scheme of applicableSchemes) {
        if (scheme.in === 'query' && scheme.name) {
          const keyVal = options.apiKeys[scheme.id] ?? options.apiKeys[scheme.name];
          if (keyVal && keyVal.trim().length > 0 && queryParams[scheme.name] === undefined) {
            const cleanKeyVal = keyVal.trim();
            queryParams[scheme.name] = cleanKeyVal;
            queryStringParts.push(
              `${encodeURIComponent(scheme.name)}=${encodeURIComponent(cleanKeyVal)}`
            );
          }
        }
      }
    }

    const queryString =
      queryStringParts.length > 0 ? `?${queryStringParts.join('&')}` : '';
    const fullUrl = `${url}${queryString}`;

    // 3. Preparação de Headers
    const headers: Record<string, string> = {};

    // Injeção de Bearer Token se a operação exigir autenticação
    if (operation.requiresAuth && options.bearerToken && options.bearerToken.trim().length > 0) {
      const rawToken = options.bearerToken.trim();
      const tokenValue = rawToken.toLowerCase().startsWith('bearer ')
        ? rawToken
        : `Bearer ${rawToken}`;
      headers['Authorization'] = tokenValue;
    }

    // Injeção de API Key via Header se a operação exigir autenticação
    if (operation.requiresAuth && options.apiKeys) {
      const applicableSchemes = this.resolveApplicableSchemes(operation, options.securitySchemes);
      for (const scheme of applicableSchemes) {
        if ((scheme.in === 'header' || !scheme.in) && scheme.name) {
          const keyVal = options.apiKeys[scheme.id] ?? options.apiKeys[scheme.name];
          if (keyVal && keyVal.trim().length > 0 && !headers[scheme.name]) {
            headers[scheme.name] = keyVal.trim();
          }
        }
      }
    }

    // Headers informados explicitamente no input (têm precedência)
    if (input.headers) {
      for (const [key, val] of Object.entries(input.headers)) {
        if (!this.isUndefinedOrNull(val)) {
          headers[key] = String(val);
        }
      }
    }


    // Resolução de Content-Type se houver body
    if (input.body !== undefined && input.body !== null) {
      const explicitContentType =
        input.contentType ||
        (operation.requestBody && 'contentType' in operation.requestBody
          ? (operation.requestBody as ApiRequestBody).contentType
          : undefined);

      const hasContentTypeHeader = Object.keys(headers).some(
        (h) => h.toLowerCase() === 'content-type'
      );

      if (!hasContentTypeHeader) {
        if (explicitContentType) {
          headers['Content-Type'] = explicitContentType;
        } else if (
          typeof input.body === 'object' ||
          Array.isArray(input.body)
        ) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    return {
      url,
      fullUrl,
      method: operation.method,
      headers,
      queryParams,
      queryString,
      body: input.body
    };
  }

  /**
   * Substitui placeholders {paramName} no caminho pelo valor correspondente devidamente URL-encoded.
   */
  private resolvePath(
    pathTemplate: string,
    pathParams?: Record<string, unknown>
  ): string {
    if (!pathTemplate) {
      return '';
    }

    return pathTemplate.replace(/\{([a-zA-Z0-9_\-.]+)\}/g, (match, paramName) => {
      if (pathParams && pathParams[paramName] !== undefined && pathParams[paramName] !== null) {
        return encodeURIComponent(String(pathParams[paramName]));
      }
      return match;
    });
  }

  /**
   * Extrai todos os nomes de placeholders presentes em um template de rota.
   */
  private extractPathPlaceholders(pathTemplate: string): string[] {
    if (!pathTemplate) {
      return [];
    }
    const matches = pathTemplate.matchAll(/\{([a-zA-Z0-9_\-.]+)\}/g);
    const placeholders: string[] = [];
    for (const match of matches) {
      placeholders.push(match[1]);
    }
    return placeholders;
  }

  /**
   * Verifica se o valor é nulo, indefinido ou string vazia (com trim).
   */
  private isEmptyValue(val: unknown): boolean {
    if (val === undefined || val === null) {
      return true;
    }
    if (typeof val === 'string' && val.trim() === '') {
      return true;
    }
    return false;
  }

  /**
   * Resolve os esquemas de segurança aplicáveis para a operação.
   */
  private resolveApplicableSchemes(
    operation: ApiOperation,
    availableSchemes?: ApiSecurityScheme[]
  ): ApiSecurityScheme[] {
    const applicableIds = operation.applicableSecuritySchemes ?? [];
    if (applicableIds.length === 0 && (!operation.security || operation.security.length === 0)) {
      return availableSchemes ?? [];
    }

    if (!availableSchemes || availableSchemes.length === 0) {
      // Fallback: se nenhum scheme detalhado foi fornecido, monta esquemas sintéticos
      return applicableIds.map((id) => ({
        id,
        type: 'apiKey',
        name: id,
        in: 'header',
        isBearer: false,
        isApiKey: true
      }));
    }

    const matched: ApiSecurityScheme[] = [];
    for (const id of applicableIds) {
      const found = availableSchemes.find((s) => s.id === id);
      if (found) {
        matched.push(found);
      }
    }

    return matched.length > 0 ? matched : availableSchemes;
  }

  /**
   * Verifica se o valor é apenas undefined ou null.
   */
  private isUndefinedOrNull(val: unknown): boolean {
    return val === undefined || val === null;
  }
}
