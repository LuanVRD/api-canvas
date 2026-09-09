import { inject, Injectable } from '@angular/core';
import {
  ApiDefinition,
  ApiSecurityRequirement,
  ApiSecurityScheme,
  ApiServer
} from '../../core/models/api-definition.model';
import { ApiOperation } from '../../core/models/api-operation.model';

import { SchemaResolverService } from './schema-resolver.service';
import { OperationClassifierService } from './operation-classifier.service';
import { OperationMapper } from '../mappers/operation.mapper';
import { ResourceMapper } from '../mappers/resource.mapper';

@Injectable({
  providedIn: 'root'
})
export class OpenApiParserService {
  private readonly schemaResolver = inject(SchemaResolverService);
  private readonly classifier = inject(OperationClassifierService);

  private readonly HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  /**
   * Normalizes a raw OpenAPI 3.x document into the internal ApiDefinition model.
   * Resolves schemas, parameters, request body, and responses without exposing
   * any external parser library types.
   *
   * @param document The loaded OpenAPI document.
   * @throws Error with a user-friendly message when document is invalid or unsupported.
   */
  parse(document: unknown): ApiDefinition {
    if (!document || typeof document !== 'object') {
      throw new Error('Documento OpenAPI inválido: formato de dados não reconhecido.');
    }

    const doc = document as Record<string, unknown>;

    // Validate OpenAPI version (accepts OpenAPI 3.0.x, 3.1.x and Swagger 2.0 specs)
    const openApiVersion = (doc['openapi'] as string) || (doc['swagger'] as string);
    if (!openApiVersion || typeof openApiVersion !== 'string') {
      throw new Error(
        'Documento inválido: a propriedade "openapi" ou "swagger" não foi encontrada na raiz da especificação.'
      );
    }

    const info = (doc['info'] || {}) as Record<string, unknown>;
    const title = (info['title'] as string) || 'API Sem Título';
    const version = (info['version'] as string) || '1.0.0';
    const description = (info['description'] as string) || '';

    // Extract servers and compute baseUrl
    const servers: ApiServer[] = [];
    if (Array.isArray(doc['servers'])) {
      for (const s of doc['servers']) {
        if (s && typeof s === 'object' && typeof s['url'] === 'string') {
          servers.push({
            url: s['url'],
            description: s['description'] as string | undefined
          });
        }
      }
    }

    let baseUrl = servers[0]?.url || '';
    if (!baseUrl && typeof doc['host'] === 'string') {
      const schemes = Array.isArray(doc['schemes']) && doc['schemes'].length > 0 ? doc['schemes'][0] : 'https';
      const basePath = typeof doc['basePath'] === 'string' ? doc['basePath'] : '';
      baseUrl = `${schemes}://${doc['host']}${basePath}`;
    }

    // Parse security schemes (OpenAPI 3.x components.securitySchemes & Swagger 2.0 securityDefinitions)
    const securitySchemes = this.parseSecuritySchemes(doc);

    // Global security requirements (doc.security)
    const globalSecurity: ApiSecurityRequirement[] | undefined = Array.isArray(doc['security'])
      ? (doc['security'] as ApiSecurityRequirement[])
      : undefined;

    // Parse paths and operations
    const operations: ApiOperation[] = [];
    const paths = (doc['paths'] || {}) as Record<string, unknown>;

    for (const [pathKey, pathItem] of Object.entries(paths)) {
      if (!pathItem || typeof pathItem !== 'object') continue;

      const pathDict = pathItem as Record<string, unknown>;
      const pathLevelParams = Array.isArray(pathDict['parameters']) ? pathDict['parameters'] : [];

      for (const method of this.HTTP_METHODS) {
        if (pathDict[method] && typeof pathDict[method] === 'object') {
          const operationDict = pathDict[method] as Record<string, unknown>;
          const operation = OperationMapper.toInternal(
            pathKey,
            method,
            operationDict,
            doc,
            this.schemaResolver,
            this.classifier,
            pathLevelParams,
            globalSecurity
          );
          operations.push(operation);
        }
      }
    }

    // Group operations into resources
    const rootTags = Array.isArray(doc['tags'])
      ? (doc['tags'] as Array<Record<string, unknown>>)
          .filter((t) => t && typeof t === 'object' && typeof t['name'] === 'string')
          .map((t) => ({
            name: t['name'] as string,
            description: typeof t['description'] === 'string' ? (t['description'] as string) : undefined
          }))
      : undefined;

    const resources = ResourceMapper.groupOperationsByResource(operations, rootTags);

    return {
      title,
      version,
      description,
      baseUrl,
      servers: servers.length > 0 ? servers : undefined,
      resources,
      securitySchemes: securitySchemes.length > 0 ? securitySchemes : undefined,
      security: globalSecurity && globalSecurity.length > 0 ? globalSecurity : undefined
    };
  }

  private parseSecuritySchemes(doc: Record<string, unknown>): ApiSecurityScheme[] {
    const schemes: ApiSecurityScheme[] = [];
    const components = doc['components'] as Record<string, unknown> | undefined;
    const rawSchemes = (components?.['securitySchemes'] || doc['securityDefinitions'] || {}) as Record<string, unknown>;


    for (const [id, def] of Object.entries(rawSchemes)) {
      if (!def || typeof def !== 'object') continue;
      const s = def as Record<string, unknown>;
      const rawType = (s['type'] as string) || 'http';
      const scheme = typeof s['scheme'] === 'string' ? s['scheme'] : undefined;
      const bearerFormat = typeof s['bearerFormat'] === 'string' ? s['bearerFormat'] : undefined;
      const name = typeof s['name'] === 'string' ? s['name'] : undefined;
      const inLocation =
        typeof s['in'] === 'string' ? (s['in'].toLowerCase() as 'header' | 'query' | 'cookie') : undefined;
      const description = typeof s['description'] === 'string' ? s['description'] : undefined;

      const typeLower = rawType.toLowerCase();
      let normalizedType: import('../../core/models/api-definition.model').ApiSecuritySchemeType = 'http';
      if (typeLower === 'apikey') {
        normalizedType = 'apiKey';
      } else if (typeLower === 'oauth2') {
        normalizedType = 'oauth2';
      } else if (typeLower === 'openidconnect') {
        normalizedType = 'openIdConnect';
      } else if (typeLower === 'mutualtls') {
        normalizedType = 'mutualTLS';
      } else {
        normalizedType = 'http';
      }

      const isHttpBearer = typeLower === 'http' && scheme?.toLowerCase() === 'bearer';
      const isApiKeyAuthHeader =
        typeLower === 'apikey' &&
        inLocation === 'header' &&
        (name?.toLowerCase() === 'authorization' ||
          id.toLowerCase().includes('bearer') ||
          id.toLowerCase().includes('jwt'));
      const isOAuth = typeLower === 'oauth2' || typeLower === 'openidconnect';
      const isBearer =
        isHttpBearer ||
        isApiKeyAuthHeader ||
        isOAuth ||
        (Boolean(bearerFormat) && typeLower === 'http');

      const isApiKey = typeLower === 'apikey';

      schemes.push({
        id,
        type: normalizedType,
        scheme,
        bearerFormat,
        name,
        in: inLocation,
        description,
        isBearer,
        isApiKey
      });
    }

    return schemes;
  }
}

