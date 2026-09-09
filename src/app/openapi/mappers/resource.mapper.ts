import { ApiOperation } from '../../core/models/api-operation.model';
import { ApiResource } from '../../core/models/api-resource.model';

export interface TagMetadata {
  name: string;
  description?: string;
}

export class ResourceMapper {
  /**
   * List of generic/technical prefixes commonly found in REST and microservice endpoints
   * that should not be used as the primary resource name when analyzing URL paths.
   */
  private static readonly TECHNICAL_PREFIXES = new Set([
    'api',
    'rest',
    'v1',
    'v2',
    'v3',
    'v4',
    'v5',
    'v6',
    'v7',
    'v8',
    'v9',
    'v1.0',
    'v2.0',
    'v3.0',
    'ws',
    'service',
    'services',
    'app',
    'public',
    'private',
    'internal',
    'external'
  ]);

  /**
   * Version prefix regex pattern (e.g. v1, v2, v1.0, v2.1, v1beta, v2alpha1, api-v1, rest-v2).
   */
  private static readonly VERSION_PREFIX_REGEX = /^(api-?)?v\d+(\.\d+)*([a-z0-9_-]+)?$/i;

  /**
   * Groups a list of parsed operations into ApiResource objects.
   *
   * 1. If an operation has tags, uses the primary tag (first non-empty tag).
   * 2. If no tags exist, uses path-based heuristic extraction to identify the domain resource.
   * 3. Retains all operations (including sub-resources and special actions like /orders/{id}/approve)
   *    within their parent resource.
   * 4. Ensures no operation is lost or duplicated.
   * 5. Maps any root-level tag descriptions to the discovered ApiResource.
   */
  static groupOperationsByResource(
    operations: ApiOperation[],
    tagsMetadata?: TagMetadata[]
  ): ApiResource[] {
    const resourceMap = new Map<string, { name: string; operations: ApiOperation[] }>();
    const tagDescMap = new Map<string, string>();

    if (tagsMetadata) {
      for (const tag of tagsMetadata) {
        if (tag && typeof tag.name === 'string' && tag.name.trim()) {
          const key = tag.name.trim().toLowerCase();
          if (tag.description && typeof tag.description === 'string') {
            tagDescMap.set(key, tag.description);
          }
        }
      }
    }

    for (const op of operations) {
      const primaryTag = this.extractPrimaryTag(op);
      const resourceName = primaryTag || this.extractResourceFromPath(op.path);
      const normalizedKey = resourceName.toLowerCase().trim();

      const existing = resourceMap.get(normalizedKey);
      if (existing) {
        existing.operations.push(op);
      } else {
        resourceMap.set(normalizedKey, {
          name: resourceName,
          operations: [op]
        });
      }
    }

    return Array.from(resourceMap.entries()).map(([key, group]) => {
      const id = this.slugify(group.name);
      const description = tagDescMap.get(key);

      return {
        id,
        name: group.name,
        label: this.formatLabel(group.name),
        description,
        operations: group.operations
      };
    });
  }

  /**
   * Extracts the primary tag if available and non-empty.
   */
  private static extractPrimaryTag(op: ApiOperation): string | null {
    if (op.tags && Array.isArray(op.tags)) {
      for (const tag of op.tags) {
        if (typeof tag === 'string' && tag.trim().length > 0) {
          return tag.trim();
        }
      }
    }
    return null;
  }

  /**
   * Discovers the domain resource name from a URL path using heuristics:
   * 1. Strips query parameters or hash if any.
   * 2. Filters out technical prefixes (api, rest, service, version numbers like v1, v2.0).
   * 3. Skips path parameter segments (e.g. {tenantId}, {orgId}) before the resource name.
   * 4. Identifies the root domain resource segment (e.g. /orders/{id}/approve -> 'orders').
   * 5. Falls back to 'general' if no distinct resource name can be resolved.
   */
  static extractResourceFromPath(path: string): string {
    if (!path || typeof path !== 'string') {
      return 'general';
    }

    // Remove query params or anchors if present
    const cleanPath = path.split('?')[0].split('#')[0].trim();

    // Split by slash and filter empty segments
    const rawSegments = cleanPath.split('/').map((s) => s.trim()).filter((s) => s.length > 0);

    if (rawSegments.length === 0) {
      return 'general';
    }

    // Filter out version/technical prefixes and parameter segments
    const meaningfulSegments: string[] = [];

    for (const segment of rawSegments) {
      const isParam = segment.startsWith('{') && segment.endsWith('}');
      const isVersion = this.VERSION_PREFIX_REGEX.test(segment);
      const isTechnical = this.TECHNICAL_PREFIXES.has(segment.toLowerCase());

      if (isParam || isVersion || isTechnical) {
        continue;
      }

      meaningfulSegments.push(segment);
    }

    if (meaningfulSegments.length > 0) {
      return meaningfulSegments[0];
    }

    // If all non-param segments were technical prefixes (e.g. /api or /v1), use the last one
    const nonParamSegments = rawSegments.filter((s) => !(s.startsWith('{') && s.endsWith('}')));
    if (nonParamSegments.length > 0) {
      return nonParamSegments[nonParamSegments.length - 1];
    }

    // If all segments were parameters (e.g. /{id} or /{tenantId}/{userId}), fallback to 'general'
    return 'general';
  }

  /**
   * Formats a technical name into a human-friendly readable label.
   * Examples:
   * - 'order-items' -> 'Order Items'
   * - 'user_profiles' -> 'User Profiles'
   * - 'bookStore' -> 'Book Store'
   * - 'BookStore' -> 'Book Store'
   * - 'api_v2_orders' -> 'Api V2 Orders'
   * - 'customers' -> 'Customers'
   */
  static formatLabel(name: string): string {
    if (!name || name.trim().length === 0) {
      return 'General';
    }

    const trimmed = name.trim();

    // 1. Separate camelCase / PascalCase boundaries: e.g. "bookStore" -> "book Store", "OrderItems" -> "Order Items"
    let formatted = trimmed.replace(/([a-z\d])([A-Z])/g, '$1 $2');

    // 2. Separate acronyms followed by normal words: e.g. "XMLParser" -> "XML Parser"
    formatted = formatted.replace(/([A-Z]+)([A-Z][a-z\d]+)/g, '$1 $2');

    // 3. Replace delimiters (-, _, ., /) with spaces
    formatted = formatted.replace(/[-_./]+/g, ' ');

    // 4. Capitalize first letter of each word and lowercase remaining letters if all caps was not intentional
    formatted = formatted
      .split(' ')
      .filter((w) => w.length > 0)
      .map((word) => {
        if (word.length === 1) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');

    return formatted || 'General';
  }

  /**
   * Generates a URL-safe, clean kebab-case slug identifier.
   */
  static slugify(name: string): string {
    if (!name || name.trim().length === 0) {
      return 'general';
    }

    return (
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'general'
    );
  }
}
