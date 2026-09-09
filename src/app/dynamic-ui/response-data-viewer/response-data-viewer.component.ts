import { Component, computed, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DynamicTableComponent } from '../dynamic-table/dynamic-table.component';
import { ObjectDetailsComponent } from '../object-details/object-details.component';
import { TableSchemaService, TableColumnDescriptor } from '../dynamic-table/table-schema.service';
import { ApiExecutionResult } from '../../core/models/api-execution-result.model';
import { ApiSchema } from '../../core/models/api-schema.model';

export type ResponsePayloadType = 'empty' | 'array' | 'object' | 'primitive' | 'invalid';
export type ViewMode = 'visual' | 'raw';

@Component({
  selector: 'app-response-data-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    DynamicTableComponent,
    ObjectDetailsComponent
  ],
  template: `
    <div class="response-viewer-container">
      <!-- Toolbar: Mode Switcher & Meta Info -->
      <div class="viewer-toolbar">
        <div class="mode-tabs">
          <button
            type="button"
            class="mode-tab-btn"
            [class.active]="activeMode() === 'visual'"
            (click)="activeMode.set('visual')"
          >
            <mat-icon class="tab-icon">
              @switch (detectedType()) {
                @case ('array') { table_chart }
                @case ('object') { data_object }
                @case ('primitive') { text_fields }
                @case ('empty') { inbox }
                @default { terminal }
              }
            </mat-icon>
            <span>Visual ({{ detectedTypeLabel() }})</span>
          </button>

          <button
            type="button"
            class="mode-tab-btn"
            [class.active]="activeMode() === 'raw'"
            (click)="activeMode.set('raw')"
          >
            <mat-icon class="tab-icon">code</mat-icon>
            <span>Raw JSON</span>
          </button>
        </div>

        <div class="toolbar-actions">
          <button
            type="button"
            class="tool-btn"
            (click)="onCopyRawJson()"
            [title]="copied() ? 'Copied to clipboard!' : 'Copy raw payload'"
          >
            <mat-icon class="icon-sm">{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
            <span>{{ copied() ? 'Copied' : 'Copy' }}</span>
          </button>
        </div>
      </div>

      <!-- Main Body Content Area -->
      <div class="viewer-body">
        @if (activeMode() === 'visual') {
          <!-- 1. EMPTY STATE -->
          @if (detectedType() === 'empty') {
            <div class="empty-response-box">
              <mat-icon class="empty-icon">inbox</mat-icon>
              <h4 class="empty-title">{{ emptyStateTitle() }}</h4>
              <p class="empty-desc">{{ emptyStateDescription() }}</p>
            </div>
          }

          <!-- 2. ARRAY / COLLECTION (DYNAMIC TABLE) -->
          @else if (detectedType() === 'array') {
            <div class="table-view-wrapper">
              <app-dynamic-table
                [data]="$any(parsedData())"
                [columns]="inferredColumns()"
                [showActions]="false"
              />
            </div>
          }

          <!-- 3. STRUCTURED OBJECT (OBJECT DETAILS) -->
          @else if (detectedType() === 'object') {
            <div class="object-view-wrapper">
              <app-object-details [data]="$any(parsedData())" />
            </div>
          }

          <!-- 4. PRIMITIVE VALUE -->
          @else if (detectedType() === 'primitive') {
            <div class="primitive-view-card">
              <div class="primitive-header">
                <span class="primitive-type-badge font-mono">{{ primitiveType() }}</span>
              </div>
              <div class="primitive-value font-mono">
                {{ primitiveFormattedText() }}
              </div>
            </div>
          }

          <!-- 5. UNEXPECTED / INVALID FORMAT FALLBACK -->
          @else {
            <div class="invalid-format-card">
              <div class="invalid-header">
                <mat-icon class="warn-icon">warning_amber</mat-icon>
                <span>Unexpected or unparsed payload format</span>
              </div>
              <pre class="raw-pre font-mono">{{ rawFormattedText() }}</pre>
            </div>
          }
        } @else {
          <!-- RAW JSON VIEW -->
          <div class="raw-code-container">
            <pre class="raw-pre font-mono"><code>{{ rawFormattedText() }}</code></pre>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .response-viewer-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      background: var(--canvas-bg);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }
    .viewer-toolbar {
      height: 36px;
      min-height: 36px;
      padding: 0 12px;
      background: var(--canvas-surface);
      border-bottom: 1px solid var(--canvas-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .mode-tabs {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .mode-tab-btn {
      height: 26px;
      padding: 0 10px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--canvas-text-secondary);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.12s ease;
    }
    .mode-tab-btn:hover {
      color: var(--canvas-text-primary);
      background: var(--canvas-surface-elevated);
    }
    .mode-tab-btn.active {
      color: var(--canvas-text-primary);
      background: var(--canvas-surface-elevated);
      border-color: var(--canvas-border);
      font-weight: 600;
    }
    .tab-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tool-btn {
      height: 24px;
      padding: 0 8px;
      background: transparent;
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      color: var(--canvas-text-secondary);
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.12s ease;
    }
    .tool-btn:hover {
      color: var(--canvas-text-primary);
      border-color: var(--canvas-text-muted);
      background: rgba(255, 255, 255, 0.04);
    }
    .icon-sm {
      font-size: 13px;
      width: 13px;
      height: 13px;
    }
    .viewer-body {
      padding: 8px;
      overflow: auto;
      max-height: 580px;
    }
    .empty-response-box {
      padding: 40px 16px;
      text-align: center;
      color: var(--canvas-text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .empty-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      opacity: 0.5;
    }
    .empty-title {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--canvas-text-secondary);
    }
    .empty-desc {
      margin: 0;
      font-size: 11px;
      color: var(--canvas-text-muted);
      max-width: 360px;
    }
    .table-view-wrapper, .object-view-wrapper {
      width: 100%;
    }
    .primitive-view-card {
      padding: 16px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .primitive-header {
      display: flex;
      align-items: center;
    }
    .primitive-type-badge {
      font-size: 10px;
      color: var(--canvas-text-muted);
      background: var(--canvas-surface-elevated);
      padding: 2px 6px;
      border-radius: 2px;
      border: 1px solid var(--canvas-border-subtle);
    }
    .primitive-value {
      font-size: 14px;
      color: var(--canvas-text-primary);
      word-break: break-all;
    }
    .invalid-format-card {
      padding: 12px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .invalid-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #f59e0b;
    }
    .warn-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .raw-code-container {
      width: 100%;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      padding: 12px;
      overflow: auto;
      max-height: 520px;
    }
    .raw-pre {
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--canvas-text-primary);
      white-space: pre-wrap;
      word-break: break-all;
    }
  `]
})
export class ResponseDataViewerComponent {
  private readonly tableSchema = inject(TableSchemaService);

  private _result = signal<ApiExecutionResult | null>(null);
  private _data = signal<unknown>(null);
  private _schema = signal<ApiSchema | null>(null);

  @Input()
  set result(val: ApiExecutionResult | null) {
    this._result.set(val);
  }
  get result(): ApiExecutionResult | null {
    return this._result();
  }

  @Input()
  set data(val: unknown) {
    this._data.set(val);
  }
  get data(): unknown {
    return this._data();
  }

  @Input()
  set schema(val: ApiSchema | null | undefined) {
    this._schema.set(val ?? null);
  }
  get schema(): ApiSchema | null {
    return this._schema();
  }

  activeMode = signal<ViewMode>('visual');
  copied = signal<boolean>(false);

  private effectiveData = computed<unknown>(() => {
    const directData = this._data();
    if (directData !== null && directData !== undefined) {
      return directData;
    }
    const res = this._result();
    if (res) {
      return res.data;
    }
    return null;
  });

  parsedData = computed<unknown>(() => {
    const raw = this.effectiveData();
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return raw;
  });

  detectedType = computed<ResponsePayloadType>(() => {
    const status = this._result()?.status;
    if (status === 204 || status === 304) {
      return 'empty';
    }

    const val = this.parsedData();

    if (val === null || val === undefined) {
      return 'empty';
    }

    if (typeof val === 'string' && val.trim() === '') {
      return 'empty';
    }

    if (Array.isArray(val)) {
      return val.length === 0 ? 'empty' : 'array';
    }

    if (typeof val === 'object') {
      const keys = Object.keys(val as object);
      return keys.length === 0 ? 'empty' : 'object';
    }

    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      return 'primitive';
    }

    return 'invalid';
  });

  detectedTypeLabel = computed<string>(() => {
    switch (this.detectedType()) {
      case 'array':
        return 'Table';
      case 'object':
        return 'Details';
      case 'primitive':
        return 'Value';
      case 'empty':
        return 'Empty';
      default:
        return 'Raw';
    }
  });

  inferredColumns = computed<TableColumnDescriptor[]>(() => {
    const val = this.parsedData();
    const schema = this._schema();
    if (Array.isArray(val)) {
      return this.tableSchema.inferColumns(val, schema);
    }
    return [];
  });

  rawFormattedText = computed<string>(() => {
    const val = this.parsedData();
    if (val === null || val === undefined) {
      return '';
    }
    if (typeof val === 'string') {
      return val;
    }
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  });

  emptyStateTitle = computed<string>(() => {
    const status = this._result()?.status;
    if (status === 204) {
      return '204 No Content';
    }
    if (status === 304) {
      return '304 Not Modified';
    }
    const val = this.parsedData();
    if (Array.isArray(val)) {
      return 'Empty Collection';
    }
    if (typeof val === 'object' && val !== null) {
      return 'Empty Object';
    }
    return 'Empty Response';
  });

  emptyStateDescription = computed<string>(() => {
    const status = this._result()?.status;
    if (status === 204) {
      return 'The server processed the request successfully and returned no response body.';
    }
    if (status === 304) {
      return 'The resource has not been modified since the last request.';
    }
    const val = this.parsedData();
    if (Array.isArray(val)) {
      return 'The operation returned an empty array (0 items).';
    }
    if (typeof val === 'object' && val !== null) {
      return 'The operation returned an empty object with no properties.';
    }
    return 'The operation completed with an empty body.';
  });

  primitiveType = computed<string>(() => {
    const val = this.parsedData();
    if (val === null) return 'null';
    if (typeof val === 'boolean') return 'boolean';
    if (typeof val === 'number') return 'number';
    if (typeof val === 'string') return 'string';
    return typeof val;
  });

  primitiveFormattedText = computed<string>(() => {
    const val = this.parsedData();
    if (val === null || val === undefined) return '';
    return String(val);
  });

  onCopyRawJson(): void {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(this.rawFormattedText()).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }
}
