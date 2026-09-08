import { Injectable } from '@angular/core';
import { ApiSchema } from '../../core/models/api-schema.model';
import { JsonPointerUtil } from '../utils/openapi-schema-pointer.util';
import { SchemaMapper } from '../mappers/schema.mapper';

@Injectable({
  providedIn: 'root'
})
export class SchemaResolverService {
  /**
   * Resolves a raw schema definition (with possible $ref, allOf, nested properties, items)
   * into an isolated and complete ApiSchema model.
   *
   * @param rawSchema The raw schema object or reference.
   * @param rootDocument The root OpenAPI 3.x document.
   * @param visitedRefs Set of visited $ref paths to prevent circular reference infinite loops.
   */
  resolveSchema(
    rawSchema: unknown,
    rootDocument: unknown,
    visitedRefs: Set<string> = new Set()
  ): ApiSchema {
    if (!rawSchema || typeof rawSchema !== 'object') {
      return { type: 'unknown' };
    }

    const rawDict = rawSchema as Record<string, unknown>;

    // Case 1: Direct $ref resolution
    if (typeof rawDict['$ref'] === 'string') {
      const ref = rawDict['$ref'];
      const resolvedFromRef = this.resolveRef(ref, rootDocument, new Set(visitedRefs));

      // Allow local properties in the reference node to override (e.g. description/title)
      const overrides = SchemaMapper.extractConstraints(rawDict);
      const isExplicitNullable = SchemaMapper.isNullable(rawDict);

      return {
        ...resolvedFromRef,
        ...overrides,
        nullable: isExplicitNullable || resolvedFromRef.nullable
      };
    }

    // Case 2: allOf composition
    if (Array.isArray(rawDict['allOf'])) {
      return this.resolveAllOf(rawDict, rootDocument, visitedRefs);
    }

    // Standard schema mapping
    const baseSchema = SchemaMapper.toInternal(rawDict);

    // Resolve nested object properties
    if (rawDict['properties'] && typeof rawDict['properties'] === 'object') {
      const rawProperties = rawDict['properties'] as Record<string, unknown>;
      const resolvedProps: Record<string, ApiSchema> = {};

      for (const [propName, propDefinition] of Object.entries(rawProperties)) {
        const resolvedChild = this.resolveSchema(propDefinition, rootDocument, new Set(visitedRefs));
        if (baseSchema.requiredProperties?.includes(propName)) {
          resolvedChild.required = true;
        }
        resolvedProps[propName] = resolvedChild;
      }

      baseSchema.properties = resolvedProps;
    }

    // Resolve array items
    if (rawDict['items']) {
      baseSchema.items = this.resolveSchema(rawDict['items'], rootDocument, new Set(visitedRefs));
    }

    return baseSchema;
  }

  /**
   * Resolves a $ref pointer to an ApiSchema while tracking circular references.
   *
   * @param ref JSON pointer string (e.g. "#/components/schemas/User")
   * @param rootDocument The root OpenAPI document.
   * @param visitedRefs Set of visited references in current call chain.
   */
  resolveRef(
    ref: string,
    rootDocument: unknown,
    visitedRefs: Set<string> = new Set()
  ): ApiSchema {
    if (!ref || typeof ref !== 'string') {
      throw new Error('Referência $ref inválida: a referência deve ser uma string não vazia.');
    }

    // Circular reference detection
    if (visitedRefs.has(ref)) {
      const refName = ref.split('/').pop() || 'CircularReference';
      return {
        type: 'object',
        title: refName,
        description: `[Auto-referência / Referência circular para ${ref}]`
      };
    }

    visitedRefs.add(ref);

    const targetNode = JsonPointerUtil.get(ref, rootDocument);
    if (!targetNode || typeof targetNode !== 'object') {
      throw new Error(`Referência '${ref}' aponta para um nó inválido ou vazio.`);
    }

    const schema = this.resolveSchema(targetNode, rootDocument, visitedRefs);

    // Infer title from ref name if not explicitly set in the target schema
    if (!schema.title) {
      schema.title = ref.split('/').pop();
    }

    return schema;
  }

  /**
   * Resolves raw node by JSON pointer without mapping.
   */
  resolveRawNode(ref: string, rootDocument: unknown): Record<string, unknown> {
    const node = JsonPointerUtil.get(ref, rootDocument);
    if (!node || typeof node !== 'object') {
      throw new Error(`Referência '${ref}' aponta para um nó inválido.`);
    }
    return node as Record<string, unknown>;
  }

  /**
   * Handles allOf schema composition by recursively resolving and merging schemas.
   */
  private resolveAllOf(
    rawSchema: Record<string, unknown>,
    rootDocument: unknown,
    visitedRefs: Set<string>
  ): ApiSchema {
    const subSchemas = rawSchema['allOf'] as unknown[];
    const mergedProperties: Record<string, ApiSchema> = {};
    const mergedRequiredProps: string[] = [];
    let mergedType = SchemaMapper.inferType(rawSchema);

    for (const sub of subSchemas) {
      const resolvedSub = this.resolveSchema(sub, rootDocument, new Set(visitedRefs));

      if (resolvedSub.type !== 'unknown' && mergedType === 'unknown') {
        mergedType = resolvedSub.type;
      }

      if (resolvedSub.properties) {
        Object.assign(mergedProperties, resolvedSub.properties);
      }

      if (resolvedSub.requiredProperties) {
        mergedRequiredProps.push(...resolvedSub.requiredProperties);
      }
    }

    // Also resolve direct properties on the container if any
    if (rawSchema['properties'] && typeof rawSchema['properties'] === 'object') {
      const directProps = rawSchema['properties'] as Record<string, unknown>;
      for (const [propName, propDef] of Object.entries(directProps)) {
        mergedProperties[propName] = this.resolveSchema(propDef, rootDocument, new Set(visitedRefs));
      }
    }

    if (Array.isArray(rawSchema['required'])) {
      for (const req of rawSchema['required']) {
        if (typeof req === 'string' && !mergedRequiredProps.includes(req)) {
          mergedRequiredProps.push(req);
        }
      }
    }

    const baseConstraints = SchemaMapper.extractConstraints(rawSchema);
    const uniqueRequired = Array.from(new Set(mergedRequiredProps));

    // Mark required flags on merged properties
    for (const req of uniqueRequired) {
      if (mergedProperties[req]) {
        mergedProperties[req].required = true;
      }
    }

    return {
      type: mergedType === 'unknown' ? 'object' : mergedType,
      ...baseConstraints,
      properties: Object.keys(mergedProperties).length > 0 ? mergedProperties : undefined,
      requiredProperties: uniqueRequired.length > 0 ? uniqueRequired : undefined,
      nullable: SchemaMapper.isNullable(rawSchema)
    };
  }
}
