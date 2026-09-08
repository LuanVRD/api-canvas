import { Injectable } from '@angular/core';
import { ApiOperationType, HttpMethod } from '../../core/models/api-operation.model';

@Injectable({
  providedIn: 'root'
})
export class OperationClassifierService {
  /**
   * Classifies an HTTP operation based on method, path structure, and parameters.
   */
  classify(method: HttpMethod, path: string): ApiOperationType {
    const isParamEnd = path.endsWith('}') || path.match(/\/\{[^/]+\}$/);

    switch (method) {
      case 'GET':
        return isParamEnd ? 'details' : 'list';
      case 'POST':
        return 'create';
      case 'PUT':
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'unknown';
    }
  }
}
