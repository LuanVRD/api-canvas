import { inject, Injectable } from '@angular/core';
import { ApiDefinition, ApiServer } from '../../core/models/api-definition.model';
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
            pathLevelParams
          );
          operations.push(operation);
        }
      }
    }

    // Group operations into resources
    const resources = ResourceMapper.groupOperationsByResource(operations);

    return {
      title,
      version,
      description,
      baseUrl,
      servers: servers.length > 0 ? servers : undefined,
      resources
    };
  }
}
