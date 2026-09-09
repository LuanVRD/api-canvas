import { ApiOperation, ApiRequestBody, HttpMethod } from '../../core/models/api-operation.model';
import { ApiParameter, ParameterLocation } from '../../core/models/api-parameter.model';
import { ApiResponse } from '../../core/models/api-response.model';
import { ApiSecurityRequirement } from '../../core/models/api-definition.model';
import { SchemaResolverService } from '../services/schema-resolver.service';
import { OperationClassifierService } from '../services/operation-classifier.service';

export class OperationMapper {
  /**
   * Maps an OpenAPI 3.x / Swagger 2.0 path operation object into an internal ApiOperation model,
   * resolving all schemas, parameters, request body, responses, and security requirements.
   */
  static toInternal(
    rawPath: string,
    method: string,
    rawOperation: Record<string, unknown>,
    rootDocument: unknown,
    schemaResolver: SchemaResolverService,
    classifier: OperationClassifierService,
    pathLevelParameters: unknown[] = [],
    globalSecurity?: ApiSecurityRequirement[]
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
    const requestBody = this.extractRequestBody(rawOperation['requestBody'], rawParams, rootDocument, schemaResolver);
    const responses = this.extractResponses(rawOperation['responses'], rootDocument, schemaResolver);
    const type = classifier.classify(httpMethod, rawPath);

    // Security requirements resolution: operation-level security overrides root-level security
    let security: ApiSecurityRequirement[] | undefined;
    let requiresAuth = false;
    let applicableSecuritySchemes: string[] = [];

    if (rawOperation['security'] !== undefined) {
      if (Array.isArray(rawOperation['security'])) {
        security = rawOperation['security'] as ApiSecurityRequirement[];
        // An empty array [] explicitly indicates the operation does not require any security (public/anonymous)
        if (security.length > 0) {
          requiresAuth = true;
          const schemeSet = new Set<string>();
          for (const req of security) {
            if (req && typeof req === 'object') {
              for (const schemeKey of Object.keys(req)) {
                schemeSet.add(schemeKey);
              }
            }
          }
          applicableSecuritySchemes = Array.from(schemeSet);
        } else {
          requiresAuth = false;
          applicableSecuritySchemes = [];
        }
      }
    } else if (globalSecurity && Array.isArray(globalSecurity) && globalSecurity.length > 0) {
      security = globalSecurity;
      requiresAuth = true;
      const schemeSet = new Set<string>();
      for (const req of globalSecurity) {
        if (req && typeof req === 'object') {
          for (const schemeKey of Object.keys(req)) {
            schemeSet.add(schemeKey);
          }
        }
      }
      applicableSecuritySchemes = Array.from(schemeSet);
    }

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
      deprecated: !!rawOperation['deprecated'],
      security,
      requiresAuth,
      applicableSecuritySchemes
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

      const locationStr = typeof paramDict['in'] === 'string' ? paramDict['in'].toLowerCase() : 'query';
      // Swagger 2.0 body params are handled in extractRequestBody
      if (locationStr === 'body') continue;

      const name = paramDict['name'] as string;
      if (!name) continue;

      const validLocation: ParameterLocation =
        locationStr === 'path' || locationStr === 'header' || locationStr === 'cookie'
          ? (locationStr as ParameterLocation)
          : 'query';

      const rawSchema =
        paramDict['schema'] && typeof paramDict['schema'] === 'object'
          ? (paramDict['schema'] as Record<string, unknown>)
          : paramDict;

      const resolvedSchema = schemaResolver.resolveSchema(rawSchema, rootDocument);

      const parameter: ApiParameter = {
        name,
        location: validLocation,
        required: validLocation === 'path' ? true : !!paramDict['required'],
        schema: resolvedSchema,
        description: paramDict['description'] as string | undefined,
        deprecated: !!paramDict['deprecated'],
        default: paramDict['default'] ?? resolvedSchema.default,
        example: paramDict['example'] ?? resolvedSchema.example
      };

      // Key by location + name so operation parameters override path-level parameters
      paramsMap.set(`${validLocation}:${name}`, parameter);
    }

    return Array.from(paramsMap.values());
  }

  private static extractRequestBody(
    rawBody: unknown,
    rawParams: unknown[],
    rootDocument: unknown,
    schemaResolver: SchemaResolverService
  ): ApiRequestBody | undefined {
    // 1. OpenAPI 3.x requestBody object
    if (rawBody && typeof rawBody === 'object') {
      let bodyDict = rawBody as Record<string, unknown>;
      if (typeof bodyDict['$ref'] === 'string') {
        bodyDict = schemaResolver.resolveRawNode(bodyDict['$ref'], rootDocument);
      }

      const content = bodyDict['content'] as Record<string, unknown> | undefined;
      if (content && typeof content === 'object') {
        const mediaTypes = Object.keys(content);
        const selectedMediaType =
          mediaTypes.find((t) => t.includes('json')) ||
          mediaTypes.find((t) => t.includes('form') || t.includes('xml')) ||
          mediaTypes[0];

        if (selectedMediaType) {
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
      }
    }

    // 2. Swagger 2.0 parameter with in: 'body'
    for (const raw of rawParams) {
      if (!raw || typeof raw !== 'object') continue;
      let paramDict = raw as Record<string, unknown>;
      if (typeof paramDict['$ref'] === 'string') {
        paramDict = schemaResolver.resolveRawNode(paramDict['$ref'], rootDocument);
      }
      if (paramDict['in'] === 'body') {
        const rawSchema = paramDict['schema'] || {};
        const resolvedSchema = schemaResolver.resolveSchema(rawSchema, rootDocument);
        return {
          description: paramDict['description'] as string | undefined,
          required: !!paramDict['required'],
          contentType: 'application/json',
          schema: resolvedSchema
        };
      }
    }

    return undefined;
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

      // OpenAPI 3.x content dictionary
      const content = respDict['content'] as Record<string, unknown> | undefined;
      if (content && typeof content === 'object') {
        const mediaTypes = Object.keys(content);
        selectedContentType =
          mediaTypes.find((t) => t.includes('json')) ||
          mediaTypes.find((t) => t.includes('text') || t.includes('xml')) ||
          mediaTypes[0];
        if (selectedContentType) {
          const mediaObj = content[selectedContentType] as Record<string, unknown> | undefined;
          if (mediaObj?.['schema']) {
            resolvedSchema = schemaResolver.resolveSchema(mediaObj['schema'], rootDocument);
          }
        }
      }

      // Swagger 2.0 direct schema on response
      if (!resolvedSchema && respDict['schema']) {
        resolvedSchema = schemaResolver.resolveSchema(respDict['schema'], rootDocument);
        selectedContentType = selectedContentType || 'application/json';
      }

      // Response headers mapping
      const headersDict = respDict['headers'] as Record<string, unknown> | undefined;
      let mappedHeaders: Record<string, import('../../core/models/api-schema.model').ApiSchema> | undefined;
      if (headersDict && typeof headersDict === 'object') {
        mappedHeaders = {};
        for (const [hName, hDef] of Object.entries(headersDict)) {
          if (hDef && typeof hDef === 'object') {
            const headerObj = hDef as Record<string, unknown>;
            const hSchema = headerObj['schema'] || headerObj;
            mappedHeaders[hName] = schemaResolver.resolveSchema(hSchema, rootDocument);
          }
        }
      }

      result.push({
        statusCode,
        description: respDict['description'] as string | undefined,
        contentType: selectedContentType,
        schema: resolvedSchema,
        headers: mappedHeaders && Object.keys(mappedHeaders).length > 0 ? mappedHeaders : undefined
      });
    }

    return result;
  }
}
