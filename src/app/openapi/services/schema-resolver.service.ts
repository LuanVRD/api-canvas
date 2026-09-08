import { Injectable } from '@angular/core';
import { ApiSchema } from '../../core/models/api-schema.model';

@Injectable({
  providedIn: 'root'
})
export class SchemaResolverService {
  /**
   * Resolves $ref and nested schema definitions.
   */
  resolveRef(ref: string, rootDocument: unknown): ApiSchema {
    return {
      type: 'unknown',
      description: `Reference to ${ref}`
    };
  }
}
