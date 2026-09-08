import { ApiOperation } from '../../core/models/api-operation.model';
import { ApiResource } from '../../core/models/api-resource.model';

export class ResourceMapper {
  static groupOperationsByResource(operations: ApiOperation[]): ApiResource[] {
    const map = new Map<string, ApiOperation[]>();

    operations.forEach(op => {
      const resourceName = op.tags && op.tags.length > 0
        ? op.tags[0]
        : this.extractResourceFromPath(op.path);

      const existing = map.get(resourceName) || [];
      existing.push(op);
      map.set(resourceName, existing);
    });

    return Array.from(map.entries()).map(([name, ops]) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name,
      label: this.formatLabel(name),
      operations: ops
    }));
  }

  private static extractResourceFromPath(path: string): string {
    const segments = path.split('/').filter(s => s && !s.startsWith('{'));
    return segments.length > 0 ? segments[0] : 'default';
  }

  private static formatLabel(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
}
