import { ApiOperation, HttpMethod } from '../../core/models/api-operation.model';

export class OperationMapper {
  static toInternal(rawPath: string, method: string, rawOperation: Record<string, unknown>): ApiOperation {
    const httpMethod = method.toUpperCase() as HttpMethod;
    return {
      id: (rawOperation['operationId'] as string) || `${httpMethod}_${rawPath.replace(/[^a-zA-Z0-9]/g, '_')}`,
      operationId: rawOperation['operationId'] as string | undefined,
      method: httpMethod,
      path: rawPath,
      summary: rawOperation['summary'] as string | undefined,
      description: rawOperation['description'] as string | undefined,
      parameters: [],
      responses: [],
      type: 'unknown',
      tags: (rawOperation['tags'] as string[]) || []
    };
  }
}
