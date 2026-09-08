import { Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiSchema } from '../../../core/models/api-schema.model';

export interface PropertyEntry {
  name: string;
  schema: ApiSchema;
  isRequired: boolean;
}

@Component({
  selector: 'app-schema-viewer',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (schema(); as s) {
      <div class="schema-viewer-container" [class.nested-container]="level() > 0">
        <!-- Schema Header with View Mode Toggle -->
        @if (level() === 0) {
          <div class="schema-header">
            <div class="schema-meta">
              @if (s.title) {
                <span class="schema-title font-mono">{{ s.title }}</span>
              }
              <span class="schema-type-pill font-mono">{{ displayType(s) }}</span>
              @if (s.nullable) {
                <span class="schema-flag-pill">nullable</span>
              }
              @if (s.readOnly) {
                <span class="schema-flag-pill">readOnly</span>
              }
              @if (s.writeOnly) {
                <span class="schema-flag-pill">writeOnly</span>
              }
            </div>

            <div class="view-toggle">
              <button
                type="button"
                class="toggle-btn"
                [class.active]="viewMode() === 'structure'"
                (click)="viewMode.set('structure')"
                title="Structured technical schema view"
              >
                Structure
              </button>
              <button
                type="button"
                class="toggle-btn"
                [class.active]="viewMode() === 'example'"
                (click)="viewMode.set('example')"
                title="Generated JSON example preview"
              >
                Example JSON
              </button>
            </div>
          </div>

          @if (s.description) {
            <p class="schema-description">{{ s.description }}</p>
          }
        }

        <!-- Structure View Mode -->
        @if (viewMode() === 'structure' || level() > 0) {
          <!-- Object Type with Properties -->
          @if (s.type === 'object' && propertyEntries().length > 0) {
            <div class="properties-table" role="table" aria-label="Schema properties">
              <div class="table-header" role="row">
                <span class="col-name" role="columnheader">Field</span>
                <span class="col-type" role="columnheader">Type</span>
                <span class="col-desc" role="columnheader">Description / Constraints</span>
              </div>

              @for (prop of propertyEntries(); track prop.name) {
                <div class="property-row" role="row">
                  <div class="col-name" role="cell">
                    <span class="prop-name font-mono">{{ prop.name }}</span>
                    @if (prop.isRequired) {
                      <span class="badge-required" title="Required field">required</span>
                    } @else {
                      <span class="badge-optional" title="Optional field">optional</span>
                    }
                  </div>

                  <div class="col-type font-mono" role="cell">
                    <span class="type-name">{{ displayType(prop.schema) }}</span>
                    @if (prop.schema.format) {
                      <span class="type-format">&lt;{{ prop.schema.format }}&gt;</span>
                    }
                    @if (prop.schema.nullable) {
                      <span class="flag-text">nullable</span>
                    }
                  </div>

                  <div class="col-desc" role="cell">
                    @if (prop.schema.description) {
                      <div class="prop-description">{{ prop.schema.description }}</div>
                    }

                    <!-- Constraints, Enums, Defaults, Examples -->
                    <div class="constraints-wrap">
                      @if (prop.schema.enum && prop.schema.enum.length > 0) {
                        <div class="constraint-item">
                          <span class="c-label">Enum:</span>
                          <span class="c-value font-mono">[{{ formatEnum(prop.schema.enum) }}]</span>
                        </div>
                      }
                      @if (prop.schema.default !== undefined) {
                        <div class="constraint-item">
                          <span class="c-label">Default:</span>
                          <span class="c-value font-mono">{{ prop.schema.default | json }}</span>
                        </div>
                      }
                      @if (prop.schema.example !== undefined) {
                        <div class="constraint-item">
                          <span class="c-label">Example:</span>
                          <span class="c-value font-mono">{{ prop.schema.example | json }}</span>
                        </div>
                      }
                      @if (prop.schema.minimum !== undefined || prop.schema.maximum !== undefined) {
                        <div class="constraint-item">
                          <span class="c-label">Range:</span>
                          <span class="c-value font-mono">
                            {{ prop.schema.minimum !== undefined ? prop.schema.minimum : '-∞' }} ..
                            {{ prop.schema.maximum !== undefined ? prop.schema.maximum : '+∞' }}
                          </span>
                        </div>
                      }
                      @if (prop.schema.minLength !== undefined || prop.schema.maxLength !== undefined) {
                        <div class="constraint-item">
                          <span class="c-label">Length:</span>
                          <span class="c-value font-mono">
                            [{{ prop.schema.minLength ?? 0 }} .. {{ prop.schema.maxLength ?? '∞' }}]
                          </span>
                        </div>
                      }
                      @if (prop.schema.pattern) {
                        <div class="constraint-item">
                          <span class="c-label">Pattern:</span>
                          <span class="c-value font-mono">/{{ prop.schema.pattern }}/</span>
                        </div>
                      }
                    </div>

                    <!-- Nested Object Child Properties -->
                    @if (prop.schema.type === 'object' && prop.schema.properties && hasProperties(prop.schema)) {
                      <div class="nested-wrapper">
                        <app-schema-viewer [schema]="prop.schema" [level]="level() + 1" />
                      </div>
                    }

                    <!-- Nested Array of Objects -->
                    @if (
                      prop.schema.type === 'array' &&
                      prop.schema.items &&
                      prop.schema.items.type === 'object' &&
                      hasProperties(prop.schema.items)
                    ) {
                      <div class="nested-wrapper">
                        <div class="nested-label font-mono">Array items (object):</div>
                        <app-schema-viewer [schema]="prop.schema.items" [level]="level() + 1" />
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          } @else if (s.type === 'array') {
            <!-- Array Root Schema -->
            <div class="array-container">
              <div class="array-header font-mono">
                Array of <span class="type-name">{{ s.items ? displayType(s.items) : 'unknown' }}</span>
              </div>
              @if (s.items) {
                <div class="array-items-viewer">
                  <app-schema-viewer [schema]="s.items" [level]="level() + 1" />
                </div>
              }
            </div>
          } @else {
            <!-- Primitive or empty schema -->
            <div class="primitive-container">
              <div class="primitive-meta font-mono">
                <span class="type-name">{{ displayType(s) }}</span>
                @if (s.format) {
                  <span class="type-format">&lt;{{ s.format }}&gt;</span>
                }
              </div>

              @if (s.enum && s.enum.length > 0) {
                <div class="constraint-item">
                  <span class="c-label">Enum:</span>
                  <span class="c-value font-mono">[{{ formatEnum(s.enum) }}]</span>
                </div>
              }

              @if (s.default !== undefined) {
                <div class="constraint-item">
                  <span class="c-label">Default:</span>
                  <span class="c-value font-mono">{{ s.default | json }}</span>
                </div>
              }

              @if (s.example !== undefined) {
                <div class="constraint-item">
                  <span class="c-label">Example:</span>
                  <span class="c-value font-mono">{{ s.example | json }}</span>
                </div>
              }
            </div>
          }
        } @else {
          <!-- JSON Example View Mode -->
          <div class="example-json-container">
            <pre class="json-code font-mono"><code>{{ sampleJson() }}</code></pre>
          </div>
        }
      </div>
    } @else {
      <div class="empty-schema-message">
        <span>No schema definition available.</span>
      </div>
    }
  `,
  styles: [`
    .schema-viewer-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 13px;

      &.nested-container {
        margin-top: 8px;
        padding-left: 12px;
        border-left: 2px solid var(--canvas-border);
      }
    }

    .schema-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--canvas-border-subtle);

      .schema-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;

        .schema-title {
          font-weight: 600;
          color: var(--canvas-text-primary);
          font-size: 13px;
        }

        .schema-type-pill {
          font-size: 11px;
          color: var(--canvas-text-link);
          background: rgba(88, 166, 255, 0.1);
          border: 1px solid rgba(88, 166, 255, 0.25);
          padding: 1px 6px;
          border-radius: var(--radius-sm);
        }

        .schema-flag-pill {
          font-size: 10px;
          text-transform: uppercase;
          font-family: var(--font-mono);
          color: var(--canvas-text-muted);
          background: var(--canvas-surface-elevated);
          padding: 1px 5px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--canvas-border-subtle);
        }
      }

      .view-toggle {
        display: flex;
        background: var(--canvas-surface-elevated);
        border: 1px solid var(--canvas-border);
        border-radius: var(--radius-sm);
        padding: 2px;
        gap: 2px;

        .toggle-btn {
          border: none;
          background: transparent;
          color: var(--canvas-text-secondary);
          font-size: 11px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.12s ease;

          &:hover {
            color: var(--canvas-text-primary);
          }

          &.active {
            background: var(--canvas-border);
            color: var(--canvas-text-primary);
            font-weight: 600;
          }
        }
      }
    }

    .schema-description {
      margin: 0;
      font-size: 12px;
      color: var(--canvas-text-secondary);
      line-height: 1.5;
    }

    .properties-table {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      background: var(--canvas-surface);
      overflow: hidden;

      .table-header {
        display: grid;
        grid-template-columns: 200px 140px 1fr;
        padding: 6px 12px;
        background: var(--canvas-surface-elevated);
        border-bottom: 1px solid var(--canvas-border);
        font-size: 11px;
        font-weight: 700;
        color: var(--canvas-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .property-row {
        display: grid;
        grid-template-columns: 200px 140px 1fr;
        padding: 8px 12px;
        border-bottom: 1px solid var(--canvas-border-subtle);
        gap: 12px;
        align-items: flex-start;

        &:last-child {
          border-bottom: none;
        }

        &:hover {
          background: rgba(255, 255, 255, 0.015);
        }
      }
    }

    .col-name {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;

      .prop-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--canvas-text-primary);
        word-break: break-all;
      }

      .badge-required {
        font-size: 9px;
        font-family: var(--font-mono);
        text-transform: uppercase;
        font-weight: 700;
        color: var(--color-danger);
        background: rgba(218, 54, 51, 0.12);
        border: 1px solid rgba(218, 54, 51, 0.3);
        padding: 1px 4px;
        border-radius: var(--radius-sm);
      }

      .badge-optional {
        font-size: 9px;
        font-family: var(--font-mono);
        text-transform: uppercase;
        color: var(--canvas-text-muted);
      }
    }

    .col-type {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;

      .type-name {
        color: var(--canvas-text-link);
      }

      .type-format {
        font-size: 11px;
        color: var(--canvas-text-muted);
      }

      .flag-text {
        font-size: 10px;
        color: var(--canvas-text-muted);
      }
    }

    .col-desc {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;

      .prop-description {
        font-size: 12px;
        color: var(--canvas-text-secondary);
        line-height: 1.4;
      }
    }

    .constraints-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 14px;
    }

    .constraint-item {
      display: inline-flex;
      align-items: baseline;
      gap: 4px;
      font-size: 11px;

      .c-label {
        color: var(--canvas-text-muted);
        font-weight: 600;
      }

      .c-value {
        color: var(--canvas-text-secondary);
        background: var(--canvas-bg);
        padding: 1px 4px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--canvas-border-subtle);
        word-break: break-all;
      }
    }

    .nested-wrapper {
      margin-top: 6px;
      width: 100%;

      .nested-label {
        font-size: 11px;
        color: var(--canvas-text-muted);
        margin-bottom: 4px;
      }
    }

    .array-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      padding: 10px 14px;

      .array-header {
        font-size: 12px;
        color: var(--canvas-text-secondary);

        .type-name {
          color: var(--canvas-text-link);
          font-weight: 600;
        }
      }
    }

    .primitive-container {
      padding: 10px 14px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 6px;

      .primitive-meta {
        font-size: 13px;
        display: flex;
        gap: 6px;

        .type-name {
          color: var(--canvas-text-link);
          font-weight: 600;
        }

        .type-format {
          color: var(--canvas-text-muted);
        }
      }
    }

    .example-json-container {
      background: #090d13;
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      overflow-x: auto;
      max-height: 400px;

      .json-code {
        margin: 0;
        font-size: 12px;
        line-height: 1.5;
        color: #7ee787;
        white-space: pre;
      }
    }

    .empty-schema-message {
      padding: 12px;
      color: var(--canvas-text-muted);
      font-size: 12px;
      font-style: italic;
    }

    @media (max-width: 768px) {
      .properties-table {
        .table-header {
          display: none;
        }
        .property-row {
          grid-template-columns: 1fr;
          gap: 6px;
        }
      }
    }
  `]
})
export class SchemaViewerComponent {
  readonly schema = input<ApiSchema | undefined>(undefined);
  readonly level = input<number>(0);

  readonly viewMode = signal<'structure' | 'example'>('structure');

  readonly propertyEntries = computed<PropertyEntry[]>(() => {
    const s = this.schema();
    if (!s || !s.properties) return [];

    const entries: PropertyEntry[] = [];
    const requiredList = s.requiredProperties || [];

    for (const [name, propSchema] of Object.entries(s.properties)) {
      const isRequired = propSchema.required === true || requiredList.includes(name);
      entries.push({
        name,
        schema: propSchema,
        isRequired
      });
    }

    return entries;
  });

  readonly sampleJson = computed<string>(() => {
    const s = this.schema();
    if (!s) return '{}';
    const sample = this.generateSample(s, new Set());
    return JSON.stringify(sample, null, 2);
  });

  displayType(schema: ApiSchema): string {
    if (!schema) return 'unknown';
    if (schema.type === 'array') {
      const itemType = schema.items ? this.displayType(schema.items) : 'unknown';
      return `Array<${itemType}>`;
    }
    return schema.type;
  }

  formatEnum(values: unknown[]): string {
    return values.map((v) => JSON.stringify(v)).join(', ');
  }

  hasProperties(schema: ApiSchema): boolean {
    return !!(schema.properties && Object.keys(schema.properties).length > 0);
  }

  private generateSample(schema: ApiSchema, visited: Set<ApiSchema>): unknown {
    if (!schema) return null;
    if (visited.has(schema)) return '[Circular]';

    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum && schema.enum.length > 0) return schema.enum[0];

    switch (schema.type) {
      case 'string':
        if (schema.format === 'date-time') return '2026-09-08T17:00:00Z';
        if (schema.format === 'date') return '2026-09-08';
        if (schema.format === 'uuid') return '3fa85f64-5717-4562-b3fc-2c963f66afa6';
        if (schema.format === 'email') return 'developer@example.com';
        if (schema.format === 'uri') return 'https://example.com';
        return 'string';

      case 'number':
        return 0.0;

      case 'integer':
        return 0;

      case 'boolean':
        return true;

      case 'null':
        return null;

      case 'array':
        if (schema.items) {
          visited.add(schema);
          const sampleItem = this.generateSample(schema.items, visited);
          visited.delete(schema);
          return [sampleItem];
        }
        return [];

      case 'object':
        if (schema.properties) {
          visited.add(schema);
          const obj: Record<string, unknown> = {};
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            obj[key] = this.generateSample(propSchema, visited);
          }
          visited.delete(schema);
          return obj;
        }
        return {};

      default:
        return 'unknown';
    }
  }
}
