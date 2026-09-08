import { ApiOperation, ApiRequestBody, HttpMethod } from '../../core/models/api-operation.model';
import { ApiParameter, ParameterLocation } from '../../core/models/api-parameter.model';
import { ApiResponse } from '../../core/models/api-response.model';
import { SchemaResolverService } from '../services/schema-resolver.service';
import { OperationClassifierService } from '../services/operation-classifier.service';

export class OperationMapper {
  /**
   * Maps an OpenAPI 3.x path operation object into an internal ApiOperation model,
   * resolving all schemas, parameters, request body, and responses.
   */
  static toInternal(
    rawPath: string,
    method: string,
    rawOperation: Record<string, unknown>,
    rootDocument: unknown,
    schemaResolver: SchemaResolverService,
    classifier: OperationClassifierService,
    pathLevelParameters: unknown[] = []
  ): ApiOperation {
    const httpMethod = method.toUpperCase() as HttpMethod;
    const operationId = rawOperation['operationId'] as string | undefined;
    const id = operationId || `${httpMethod}_${rawPath.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Combine path-level parameters with operation parameters
    const rawParams = [
      ...pathLevelParameters,
      ...(Array.isArray(rawOperation['parameters']) ? rawOperation['parameters'] : [])
    ];

    const parameters = this.extractParameters(rawParams, rootDocument, schemaResolver);
    const requestBody = this.extractRequestBody(rawOperation['requestBody'], rootDocument, schemaResolver);
    const responses = this.extractResponses(rawOperation['responses'], rootDocument, schemaResolver);
    const type = classifier.classify(httpMethod, rawPath);

    return {
      id,
      operationId,
      method: httpMethod,
      path: rawPath,
      summary: rawOperation['summary'] as string | undefined,
      description: rawOperation['description'] as string | undefined,
      type,
      parameters,
      requestBody,
      responses,
      tags: Array.isArray(rawOperation['tags']) ? (rawOperation['tags'] as string[]) : [],
      deprecated: !!rawOperation['deprecated']
    };
  }

  private static extractParameters(
    rawParams: unknown[],
    rootDocument: unknown,
    schemaResolver: SchemaResolverService
  ): ApiParameter[] {
    const paramsMap = new Map<string, ApiParameter>();

    for (const raw of rawParams) {
      if (!raw || typeof raw !== 'object') continue;

      let paramDict = raw as Record<string, unknown>;
      if (typeof paramDict['$ref'] === 'string') {
        paramDict = schemaResolver.resolveRawNode(paramDict['$ref'], rootDocument);
      }

      const name = paramDict['name'] as string;
      const location = (paramDict['in'] as ParameterLocation) || 'query';
      if (!name) continue;

      const rawSchema = paramDict['schema'] || {};
      const resolvedSchema = schemaResolver.resolveSchema(rawSchema, rootDocument);

      const parameter: ApiParameter = {
        name,
        location,
        required: location === 'path' ? true : !!paramDict['required'],
        schema: resolvedSchema,
        description: paramDict['description'] as string | undefined,
        deprecated: !!paramDict['deprecated'],
        default: paramDict['default'],
        example: paramDict['example']
      };

      // Key by name + location to prevent duplicate path/operation parameters (operation overrides path)
      paramsMap.set(`${location}:${name}`, parameter);
    }

    return Array.from(paramsMap.values());
  }

  private static extractRequestBody(
    rawBody: unknown,
    rootDocument: unknown,
    schemaResolver: SchemaResolverService
  ): ApiRequestBody | undefined {
    if (!rawBody || typeof rawBody !== 'object') return undefined;

    let bodyDict = rawBody as Record<string, unknown>;
    if (typeof bodyDict['$ref'] === 'string') {
      bodyDict = schemaResolver.resolveRawNode(bodyDict['$ref'], rootDocument);
    }

    const content = bodyDict['content'] as Record<string, unknown> | undefined;
    if (!content || typeof content !== 'object') {
      return undefined;
    }

    // Prioritize application/json, or use the first defined media type
    const mediaTypes = Object.keys(content);
    const selectedMediaType =
      mediaTypes.find((t) => t.includes('json')) || mediaTypes[0];

    if (!selectedMediaType) return undefined;

    const mediaObject = content[selectedMediaType] as Record<string, unknown> | undefined;
    const rawSchema = mediaObject?.['schema'] || {};
    const resolvedSchema = schemaResolver.resolveSchema(rawSchema, rootDocument);

    return {
      description: bodyDict['description'] as string | undefined,
      required: !!bodyDict['required'],
      contentType: selectedMediaType,
      schema: resolvedSchema
    };
  }

  private static extractResponses(
    rawResponses: unknown,
    rootDocument: unknown,
    schemaResolver: SchemaResolverService
  ): ApiResponse[] {
    if (!rawResponses || typeof rawResponses !== 'object') return [];

    const responsesDict = rawResponses as Record<string, unknown>;
    const result: ApiResponse[] = [];

    for (const [statusCode, responseDef] of Object.entries(responsesDict)) {
      if (!responseDef || typeof responseDef !== 'object') continue;

      let respDict = responseDef as Record<string, unknown>;
      if (typeof respDict['$ref'] === 'string') {
        respDict = schemaResolver.resolveRawNode(respDict['$ref'], rootDocument);
      }

      let selectedContentType: string | undefined;
      let resolvedSchema = undefined;

      const content = respDict['content'] as Record<string, unknown> | undefined;
      if (content && typeof content === 'object') {
        const mediaTypes = Object.keys(content);
        selectedContentType = mediaTypes.find((t) => t.includes('json')) || mediaTypes[0];
        if (selectedContentType) {
          const mediaObj = content[selectedContentType] as Record<string, unknown> | undefined;
          if (mediaObj?.['schema']) {
            resolvedSchema = schemaResolver.resolveSchema(mediaObj['schema'], rootDocument);
          }
        }
      }

      result.push({
        statusCode,
        description: respDict['description'] as string | undefined,
        contentType: selectedContentType,
        schema: resolvedSchema
      });
    }

    return result;
  }
}
