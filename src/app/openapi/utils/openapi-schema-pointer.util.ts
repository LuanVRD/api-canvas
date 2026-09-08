/**
 * Utility for resolving JSON Pointers (RFC 6901) within an OpenAPI document object.
 */
export class JsonPointerUtil {
  /**
   * Resolves a JSON pointer like "#/components/schemas/Product" within a root document.
   *
   * @param ref JSON Pointer reference string.
   * @param rootDocument The root OpenAPI document object.
   * @returns The resolved node value.
   * @throws Error if the reference is malformed or the target path does not exist.
   */
  static get(ref: string, rootDocument: unknown): unknown {
    if (!ref || typeof ref !== 'string') {
      throw new Error('Referência $ref inválida: a referência deve ser uma string não vazia.');
    }

    if (!rootDocument || typeof rootDocument !== 'object') {
      throw new Error(`Não foi possível resolver '${ref}': documento raiz inválido ou inexistente.`);
    }

    // References within the same document should start with '#'
    const path = ref.startsWith('#/') ? ref.substring(2) : ref.startsWith('#') ? ref.substring(1) : ref;

    if (!path) {
      return rootDocument;
    }

    const segments = path.split('/').map((segment) =>
      segment.replace(/~1/g, '/').replace(/~0/g, '~')
    );

    let current: unknown = rootDocument;

    for (const segment of segments) {
      if (current === null || current === undefined || typeof current !== 'object') {
        throw new Error(
          `Referência OpenAPI não encontrada: '${ref}' falhou no segmento '${segment}'.`
        );
      }

      const dict = current as Record<string, unknown>;
      if (!(segment in dict)) {
        throw new Error(
          `Referência OpenAPI não encontrada: o caminho '${ref}' não existe no documento (segmento ausente: '${segment}').`
        );
      }

      current = dict[segment];
    }

    return current;
  }
}
