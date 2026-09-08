import { Injectable } from '@angular/core';
import { ApiDefinition } from '../../core/models/api-definition.model';

@Injectable({
  providedIn: 'root'
})
export class OpenApiParserService {
  /**
   * Parser stub for normalizing OpenAPI documents into the internal ApiDefinition model.
   * Full parsing logic will be implemented in subsequent phases.
   */
  parse(document: unknown): ApiDefinition {
    if (!document || typeof document !== 'object') {
      throw new Error('Documento OpenAPI inválido.');
    }

    const doc = document as Record<string, unknown>;
    const info = (doc['info'] || {}) as Record<string, unknown>;
    
    return {
      title: (info['title'] as string) || 'API',
      version: (info['version'] as string) || '1.0.0',
      description: (info['description'] as string) || '',
      baseUrl: '',
      resources: []
    };
  }
}
