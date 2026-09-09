import { Injectable } from '@angular/core';
import { ApiOperation } from '../models/api-operation.model';
import { ApiParameter } from '../models/api-parameter.model';
import { ApiResource } from '../models/api-resource.model';

export interface ParamResolutionResult {
  canAutoResolve: boolean;
  resolvedParams: Record<string, string>;
  missingParams: ApiParameter[];
}

@Injectable({
  providedIn: 'root'
})
export class ResourceOperationMatcherService {
  /**
   * Common primary key field names used across REST APIs.
   */
  private readonly COMMON_ID_KEYS = [
    'id',
    '_id',
    'uuid',
    'guid',
    'code',
    'slug',
    'key',
    'pk',
    'identifier'
  ];

  /**
   * Finds the best matching 'details' operation for a given resource and optional source operation (e.g. list GET).
   */
  findCompatibleDetailsOperation(
    resource: ApiResource,
    sourceOperation?: ApiOperation | null
  ): ApiOperation | null {
    if (!resource || !resource.operations || resource.operations.length === 0) {
      return null;
    }

    const candidateDetails = resource.operations.filter(
      (op) => op.method === 'GET' && op.type === 'details'
    );

    // If source operation is provided, score candidate details by path affinity
    if (sourceOperation && candidateDetails.length > 0) {
      const sourceBasePath = sourceOperation.path.split('?')[0].trim().replace(/\/+$/, '');
      
      // Best: details operation that extends the source list path with exactly one path parameter
      const exactChild = candidateDetails.find((op) => {
        const candidateBasePath = op.path.split('?')[0].trim().replace(/\/+$/, '');
        const sourceSegments = sourceBasePath.split('/').filter(Boolean);
        const candidateSegments = candidateBasePath.split('/').filter(Boolean);

        if (candidateSegments.length === sourceSegments.length + 1) {
          const prefixMatches = sourceSegments.every(
            (seg, idx) => seg.toLowerCase() === candidateSegments[idx].toLowerCase()
          );
          return prefixMatches && this.isPathParam(candidateSegments[candidateSegments.length - 1]);
        }
        return false;
      });

      if (exactChild) {
        return exactChild;
      }

      // Next best: details operation that shares the longest common path prefix with the source
      let bestMatch: ApiOperation | null = null;
      let maxPrefixLength = -1;

      for (const op of candidateDetails) {
        const prefixLen = this.calculateCommonPathLength(sourceBasePath, op.path);
        if (prefixLen > maxPrefixLength) {
          maxPrefixLength = prefixLen;
          bestMatch = op;
        }
      }

      if (bestMatch) {
        return bestMatch;
      }
    }

    // If no source operation or no scored match, return the first details operation
    if (candidateDetails.length > 0) {
      return candidateDetails[0];
    }

    // Fallback: search for any GET operation with path parameters in this resource
    const fallbackGetWithParams = resource.operations.find(
      (op) => op.method === 'GET' && op.parameters.some((p) => p.location === 'path')
    );

    return fallbackGetWithParams ?? null;
  }

  /**
   * Finds the best matching 'delete' operation for a given resource and optional source operation (e.g. list GET).
   */
  findCompatibleDeleteOperation(
    resource: ApiResource,
    sourceOperation?: ApiOperation | null
  ): ApiOperation | null {
    if (!resource || !resource.operations || resource.operations.length === 0) {
      return null;
    }

    const candidateDeletes = resource.operations.filter(
      (op) => op.method === 'DELETE'
    );

    if (candidateDeletes.length === 0) {
      return null;
    }

    // If source operation is provided, score candidate deletes by path affinity
    if (sourceOperation) {
      const sourceBasePath = sourceOperation.path.split('?')[0].trim().replace(/\/+$/, '');

      // Best: delete operation that extends the source list path with exactly one path parameter (e.g. /products -> /products/{id})
      const exactChild = candidateDeletes.find((op) => {
        const candidateBasePath = op.path.split('?')[0].trim().replace(/\/+$/, '');
        const sourceSegments = sourceBasePath.split('/').filter(Boolean);
        const candidateSegments = candidateBasePath.split('/').filter(Boolean);

        if (candidateSegments.length === sourceSegments.length + 1) {
          const prefixMatches = sourceSegments.every(
            (seg, idx) => seg.toLowerCase() === candidateSegments[idx].toLowerCase()
          );
          return prefixMatches && this.isPathParam(candidateSegments[candidateSegments.length - 1]);
        }
        return false;
      });

      if (exactChild) {
        return exactChild;
      }

      // Next best: delete operation that shares the longest common path prefix with the source
      let bestMatch: ApiOperation | null = null;
      let maxPrefixLength = -1;

      for (const op of candidateDeletes) {
        const prefixLen = this.calculateCommonPathLength(sourceBasePath, op.path);
        if (prefixLen > maxPrefixLength) {
          maxPrefixLength = prefixLen;
          bestMatch = op;
        }
      }

      if (bestMatch && maxPrefixLength > 0) {
        return bestMatch;
      }
    }

    // Prefer candidate with classified type 'delete' or that contains path parameters
    const preferredDelete = candidateDeletes.find(
      (op) => op.type === 'delete' || op.parameters.some((p) => p.location === 'path')
    );

    return preferredDelete ?? candidateDeletes[0] ?? null;
  }

  /**
   * Resolves required and optional parameters for a target operation based on a record row object
   * and any active parent path parameters already known in the source execution context.
   */
  resolveParameters(
    targetOperation: ApiOperation,
    record: unknown,
    activeContextParams: Record<string, string> = {}
  ): ParamResolutionResult {
    const resolvedParams: Record<string, string> = {};
    const missingParams: ApiParameter[] = [];

    const recordObj =
      record && typeof record === 'object' && !Array.isArray(record)
        ? (record as Record<string, unknown>)
        : {};

    const pathParams = targetOperation.parameters.filter((p) => p.location === 'path');

    for (const param of pathParams) {
      const resolvedValue = this.inferParamValue(param, recordObj, activeContextParams, targetOperation);

      if (resolvedValue !== null && resolvedValue !== undefined && String(resolvedValue).trim() !== '') {
        resolvedParams[param.name] = String(resolvedValue);
      } else {
        missingParams.push(param);
      }
    }

    return {
      canAutoResolve: missingParams.length === 0,
      resolvedParams,
      missingParams
    };
  }

  /**
   * Intelligently infers the value for a specific parameter using multiple heuristic strategies.
   */
  private inferParamValue(
    param: ApiParameter,
    record: Record<string, unknown>,
    contextParams: Record<string, string>,
    operation: ApiOperation
  ): unknown {
    const paramName = param.name;

    // 1. Inherit from active context if parameter already resolved in parent path (e.g. /users/{userId}/posts/{postId})
    if (contextParams[paramName] !== undefined && contextParams[paramName] !== '') {
      return contextParams[paramName];
    }

    const normalizedParamName = this.normalizeKey(paramName);

    // 2. Direct exact or normalized match in record keys
    for (const [key, val] of Object.entries(record)) {
      if (val === null || val === undefined || val === '') continue;

      if (key === paramName || this.normalizeKey(key) === normalizedParamName) {
        return val;
      }
    }

    // 3. Match variations based on parameter name
    const allPathParams = operation.parameters.filter((p) => p.location === 'path');
    const isTargetItemParam =
      allPathParams.length > 0 && allPathParams[allPathParams.length - 1].name === paramName;

    const candidateKeysToTry: string[] = [
      paramName,
      `${paramName}_id`,
      `${paramName}Id`
    ];

    if (isTargetItemParam || paramName.toLowerCase() === 'id') {
      const resourceNameFromPath = this.extractTargetSegmentName(operation.path);
      candidateKeysToTry.push('id', '_id');
      if (resourceNameFromPath) {
        candidateKeysToTry.push(
          `${resourceNameFromPath}Id`,
          `${resourceNameFromPath}_id`,
          `${resourceNameFromPath}_uuid`,
          `${resourceNameFromPath}Uuid`
        );
      }
    }

    for (const candidate of candidateKeysToTry) {
      const normalizedCandidate = this.normalizeKey(candidate);
      for (const [key, val] of Object.entries(record)) {
        if (val === null || val === undefined || val === '') continue;
        if (this.normalizeKey(key) === normalizedCandidate) {
          return val;
        }
      }
    }

    // 4. Primary key fallback: only if this is the target item parameter or only 1 path param
    if (isTargetItemParam && allPathParams.length === 1) {
      for (const commonKey of this.COMMON_ID_KEYS) {
        const normalizedCommonKey = this.normalizeKey(commonKey);
        for (const [key, val] of Object.entries(record)) {
          if (val === null || val === undefined || val === '') continue;
          if (this.normalizeKey(key) === normalizedCommonKey) {
            return val;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Normalizes a property or parameter name for flexible casing comparison.
   * Strips delimiters, hyphens, underscores and transforms to lowercase.
   */
  private normalizeKey(key: string): string {
    return key.replace(/[-_.\s]/g, '').toLowerCase();
  }

  private isPathParam(segment: string): boolean {
    if (!segment) return false;
    return segment.startsWith('{') && segment.endsWith('}');
  }

  private extractTargetSegmentName(path: string): string {
    const segments = path.split('?')[0].split('/').filter(Boolean);
    if (segments.length >= 2) {
      const secondLast = segments[segments.length - 2];
      if (!this.isPathParam(secondLast)) {
        // Singularize simple trailing 's' (e.g. "users" -> "user", "pets" -> "pet")
        return secondLast.endsWith('s') && secondLast.length > 3
          ? secondLast.slice(0, -1)
          : secondLast;
      }
    }
    return '';
  }

  private calculateCommonPathLength(pathA: string, pathB: string): number {
    const segsA = pathA.split('/').filter(Boolean);
    const segsB = pathB.split('/').filter(Boolean);
    let common = 0;
    const minLen = Math.min(segsA.length, segsB.length);
    for (let i = 0; i < minLen; i++) {
      if (segsA[i].toLowerCase() === segsB[i].toLowerCase()) {
        common++;
      } else {
        break;
      }
    }
    return common;
  }
}
