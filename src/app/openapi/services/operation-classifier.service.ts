import { Injectable } from '@angular/core';
import { ApiOperationType, HttpMethod } from '../../core/models/api-operation.model';

@Injectable({
  providedIn: 'root'
})
export class OperationClassifierService {
  private readonly ACTION_VERB_REGEX =
    /^(approve|reject|cancel|close|reopen|complete|finish|start|stop|pause|resume|activate|deactivate|enable|disable|lock|unlock|block|unblock|suspend|publish|unpublish|archive|unarchive|restore|draft|deploy|send|resend|notify|trigger|dispatch|broadcast|ping|verify|validate|confirm|check|inspect|calculate|compute|simulate|preview|estimate|quote|search|filter|query|find|lookup|export|import|download|upload|sync|flush|purge|clear|reset|refresh|rotate|login|logout|authenticate|authorize|token|revoke|sign|checkout|pay|refund|charge|capture|void|transfer|deposit|withdraw|retry|run|execute|process|toggle)([-_].*)?$/i;

  private readonly SINGULAR_S_EXCEPTIONS = new Set([
    'status',
    'access',
    'process',
    'address',
    'business',
    'pass',
    'bypass',
    'canvas',
    'class'
  ]);

  /**
   * Classifies an HTTP operation based on method, path structure, and parameters.
   * Returns a specialized interface classification ('list', 'details', 'create', 'update', 'delete', 'action')
   * or falls back to 'unknown' when confidence is low.
   */
  classify(method: HttpMethod, path: string): ApiOperationType {
    if (!path || !method) {
      return 'unknown';
    }

    const cleanPath = path.split('?')[0].trim().replace(/\/+$/, '');
    const segments = cleanPath.split('/').filter((s) => s.length > 0);

    if (segments.length === 0) {
      return 'unknown';
    }

    const lastSegment = segments[segments.length - 1];
    const prevSegment = segments.length >= 2 ? segments[segments.length - 2] : undefined;
    const lastIsParam = this.isPathParam(lastSegment);
    const prevIsParam = prevSegment ? this.isPathParam(prevSegment) : false;

    switch (method.toUpperCase()) {
      case 'GET': {
        if (lastIsParam) {
          return 'details';
        }

        if (this.isActionWord(lastSegment)) {
          return 'action';
        }

        // Sub-resource list (e.g. /users/{userId}/posts) or root collection (e.g. /products)
        return 'list';
      }

      case 'POST': {
        // Direct POST to an identified item (e.g. POST /products/{id}) -> action
        if (lastIsParam) {
          return 'action';
        }

        // Explicit action verb endpoint (e.g. POST /auth/login, POST /orders/{id}/approve)
        if (this.isActionWord(lastSegment)) {
          return 'action';
        }

        // After a path parameter (e.g. POST /orders/{id}/approve vs POST /users/{userId}/posts)
        if (prevIsParam) {
          if (this.isLikelyCollection(lastSegment)) {
            return 'create';
          }
          return 'action';
        }

        // Standard collection resource creation (e.g. POST /products)
        return 'create';
      }

      case 'PUT':
      case 'PATCH': {
        if (lastIsParam) {
          return 'update';
        }

        if (prevIsParam) {
          if (this.isActionWord(lastSegment)) {
            return 'action';
          }
          // Sub-property update (e.g. PUT /users/{id}/profile)
          return 'update';
        }

        if (this.isActionWord(lastSegment)) {
          return 'action';
        }

        // Non-conventional update on entire collection or ambiguous path -> unknown
        return 'unknown';
      }

      case 'DELETE': {
        if (lastIsParam) {
          return 'delete';
        }

        // Deleting a specific sub-resource or property (e.g. DELETE /users/{id}/avatar)
        if (prevIsParam) {
          return 'delete';
        }

        if (this.isActionWord(lastSegment)) {
          return 'action';
        }

        // DELETE without target ID parameter -> ambiguous/unknown
        return 'unknown';
      }

      default:
        return 'unknown';
    }
  }

  private isPathParam(segment: string): boolean {
    if (!segment) return false;
    return (
      (segment.startsWith('{') && segment.endsWith('}')) ||
      segment.startsWith(':') ||
      /\{[^}]+\}/.test(segment)
    );
  }

  private isActionWord(segment: string): boolean {
    if (!segment) return false;
    const normalized = segment.toLowerCase();
    return (
      this.ACTION_VERB_REGEX.test(normalized) ||
      normalized.startsWith('bulk-') ||
      normalized.startsWith('batch-') ||
      normalized.startsWith('do-') ||
      normalized.startsWith('run-')
    );
  }

  private isLikelyCollection(segment: string): boolean {
    if (!segment || this.isActionWord(segment)) {
      return false;
    }
    const normalized = segment.toLowerCase();
    if (this.SINGULAR_S_EXCEPTIONS.has(normalized)) {
      return false;
    }
    return normalized.endsWith('s');
  }
}

