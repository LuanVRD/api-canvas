import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiOperation } from '../../core/models/api-operation.model';
import { ApiParameter } from '../../core/models/api-parameter.model';
import { ApiExecutionResult } from '../../core/models/api-execution-result.model';
import { ApiRequestInput } from '../../core/models/api-request-input.model';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiExecutorService } from '../../core/services/api-executor.service';
import { HttpBadgeComponent } from '../../shared/components/http-badge/http-badge.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { JsonViewerComponent } from '../../shared/components/json-viewer/json-viewer.component';

export interface KeyValueSummary {
  key: string;
  value: string;
}

@Component({
  selector: 'app-delete-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    HttpBadgeComponent,
    LoadingIndicatorComponent,
    JsonViewerComponent
  ],
  template: `
    <div class="dialog-backdrop" (click)="onBackdropClick($event)">
      <div class="dialog-panel font-sans" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
        <!-- Dialog Header -->
        <header class="dialog-header">
          <div class="header-left">
            <span class="dialog-badge font-mono">CONFIRM DELETE</span>
            <app-http-badge method="DELETE" />
            <span class="endpoint-path font-mono" [title]="operation.path">{{ operation.path }}</span>
          </div>

          <div class="header-actions">
            <button
              type="button"
              class="icon-action-btn"
              (click)="onOpenFullOperation()"
              title="Open full operation workbench in generic interface"
            >
              <mat-icon class="icon-sm">open_in_new</mat-icon>
              <span>Workbench</span>
            </button>

            <button
              type="button"
              class="icon-action-btn close-btn"
              (click)="close.emit()"
              title="Cancel and close (Esc)"
            >
              <mat-icon class="icon-sm">close</mat-icon>
            </button>
          </div>
        </header>

        <!-- Dialog Content -->
        <div class="dialog-body">
          <div class="confirmation-prompt">
            <div class="prompt-icon-wrapper">
              <mat-icon class="prompt-icon">delete_forever</mat-icon>
            </div>
            <div class="prompt-text">
              <h3 id="delete-dialog-title" class="prompt-title">Delete this record?</h3>
              <p class="prompt-desc">
                This action will send an HTTP <code>DELETE</code> request to the server and permanently remove the resource if confirmed.
              </p>
            </div>
          </div>

          <!-- Target Record Identity Summary -->
          @if (recordSummaryEntries().length > 0 || resolvedParamEntries().length > 0) {
            <div class="target-record-card">
              <div class="target-header">
                <span class="target-title">Target Record Details</span>
                @if (primaryIdentifier(); as pid) {
                  <span class="primary-id-badge font-mono">{{ pid.key }}: {{ pid.value }}</span>
                }
              </div>

              <div class="record-meta-grid font-mono">
                @for (item of recordSummaryEntries(); track item.key) {
                  <div class="meta-row">
                    <span class="meta-key">{{ item.key }}:</span>
                    <span class="meta-val" [title]="item.value">{{ item.value }}</span>
                  </div>
                }
              </div>

              @if (resolvedParamEntries().length > 0) {
                <div class="resolved-params-block">
                  <span class="params-section-label font-mono">Path Parameters:</span>
                  <div class="param-tags font-mono">
                    @for (param of resolvedParamEntries(); track param.key) {
                      <span class="param-tag">
                        <span class="p-name">{{ param.key }}</span>
                        <span class="p-eq">=</span>
                        <span class="p-val">{{ userParamValues()[param.key] || param.value }}</span>
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- Missing Parameters Form (Fallback if cannot be fully auto-inferred) -->
          @if (hasMissingParams()) {
            <div class="missing-params-section">
              <div class="missing-params-header">
                <mat-icon class="warn-icon">tune</mat-icon>
                <span>Required Parameters</span>
              </div>
              <p class="missing-desc">
                Some path parameters could not be inferred automatically from the row data. Please specify them below:
              </p>

              <div class="params-inputs-list">
                @for (p of missingParams; track p.name) {
                  <div class="param-field">
                    <label class="param-label font-mono" [for]="'delete-param-' + p.name">
                      {{ p.name }}
                      <span class="req-star">*</span>
                      @if (p.schema.type) {
                        <span class="param-type font-mono">&lt;{{ p.schema.type }}&gt;</span>
                      }
                    </label>
                    <input
                      [id]="'delete-param-' + p.name"
                      type="text"
                      class="param-input font-mono"
                      [placeholder]="p.description || ('Value for ' + p.name)"
                      [value]="userParamValues()[p.name] || ''"
                      (input)="onParamChange(p.name, $any($event.target).value)"
                    />
                  </div>
                }
              </div>
            </div>
          }

          <!-- Execution Error Banner -->
          @if (executionResult()?.isSuccess === false) {
            <div class="error-banner font-mono">
              <div class="error-header">
                <mat-icon class="err-icon">error_outline</mat-icon>
                <span class="err-title">
                  HTTP {{ executionResult()?.status }} - {{ executionResult()?.statusText || 'Deletion Failed' }}
                </span>
                @if (executionResult()?.error?.category) {
                  <span class="err-cat font-mono">{{ executionResult()?.error?.category }}</span>
                }
              </div>
              <p class="err-msg">{{ getErrorMessage() }}</p>
              @if (executionResult()?.error?.hint) {
                <p class="err-hint">{{ executionResult()?.error?.hint }}</p>
              }
              @if (executionResult()?.data) {
                <div class="err-raw-wrapper">
                  <app-json-viewer [data]="executionResult()?.data" [showHeader]="false" maxHeight="150px" />
                </div>
              }
            </div>
          }
        </div>

        <!-- Dialog Footer Actions -->
        <footer class="dialog-footer">
          <button
            type="button"
            class="btn-cancel"
            (click)="close.emit()"
            [disabled]="isExecuting()"
          >
            Cancel
          </button>

          <button
            type="button"
            class="btn-delete"
            (click)="executeDelete()"
            [disabled]="isExecuting() || !areAllRequiredParamsProvided()"
          >
            @if (isExecuting()) {
              <app-loading-indicator [inline]="true" size="sm" message="Deleting..." />
            } @else {
              <mat-icon class="icon-sm">delete</mat-icon>
              <span>Delete Record</span>
            }
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .dialog-panel {
      width: 520px;
      max-width: 95vw;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-md, 4px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes scaleIn {
      from { transform: scale(0.96); opacity: 0.8; }
      to { transform: scale(1); opacity: 1; }
    }

    .dialog-header {
      padding: 10px 14px;
      background: var(--canvas-surface-elevated);
      border-bottom: 1px solid var(--canvas-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        overflow: hidden;

        .dialog-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 2px;
          background: rgba(248, 81, 73, 0.15);
          color: var(--color-danger, #f85149);
          border: 1px solid rgba(248, 81, 73, 0.3);
          white-space: nowrap;
        }

        .endpoint-path {
          font-size: 12px;
          font-weight: 600;
          color: var(--canvas-text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;

        .icon-action-btn {
          height: 24px;
          padding: 0 6px;
          background: var(--canvas-surface);
          border: 1px solid var(--canvas-border);
          border-radius: var(--radius-sm);
          color: var(--canvas-text-secondary);
          font-size: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.12s ease;

          &:hover {
            color: var(--canvas-text-primary);
            border-color: var(--canvas-text-muted);
            background: rgba(255, 255, 255, 0.05);
          }

          &.close-btn {
            padding: 0 4px;
          }
        }
      }
    }

    .dialog-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 70vh;
      overflow-y: auto;
      background: var(--canvas-bg);
    }

    .confirmation-prompt {
      display: flex;
      align-items: flex-start;
      gap: 12px;

      .prompt-icon-wrapper {
        width: 32px;
        height: 32px;
        border-radius: var(--radius-sm);
        background: rgba(248, 81, 73, 0.12);
        border: 1px solid rgba(248, 81, 73, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .prompt-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
          color: var(--color-danger, #f85149);
        }
      }

      .prompt-text {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .prompt-title {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--canvas-text-primary);
        }

        .prompt-desc {
          margin: 0;
          font-size: 12px;
          color: var(--canvas-text-secondary);
          line-height: 1.4;

          code {
            font-family: var(--font-mono);
            font-size: 11px;
            color: var(--color-danger, #f85149);
            background: rgba(248, 81, 73, 0.1);
            padding: 1px 4px;
            border-radius: 2px;
          }
        }
      }
    }

    .target-record-card {
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .target-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 11px;

        .target-title {
          font-weight: 600;
          color: var(--canvas-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .primary-id-badge {
          color: var(--canvas-text-primary);
          background: var(--canvas-surface-elevated);
          border: 1px solid var(--canvas-border-subtle);
          padding: 1px 6px;
          border-radius: 2px;
          font-size: 11px;
          font-weight: 600;
        }
      }

      .record-meta-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 4px;
        font-size: 11px;

        .meta-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          overflow: hidden;

          .meta-key {
            color: var(--canvas-text-muted);
            min-width: 80px;
            flex-shrink: 0;
          }

          .meta-val {
            color: var(--canvas-text-primary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }

      .resolved-params-block {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-top: 6px;
        border-top: 1px solid var(--canvas-border-subtle);
        font-size: 11px;

        .params-section-label {
          color: var(--canvas-text-muted);
          font-size: 10px;
          text-transform: uppercase;
        }

        .param-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;

          .param-tag {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            background: var(--canvas-bg);
            border: 1px solid var(--canvas-border);
            padding: 1px 5px;
            border-radius: 2px;
            font-size: 11px;

            .p-name { color: #58a6ff; }
            .p-eq { color: var(--canvas-text-muted); }
            .p-val { color: var(--canvas-text-primary); font-weight: 600; }
          }
        }
      }
    }

    .missing-params-section {
      background: rgba(210, 153, 34, 0.08);
      border: 1px solid rgba(210, 153, 34, 0.25);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;

      .missing-params-header {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #d29922;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;

        .warn-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
        }
      }

      .missing-desc {
        margin: 0;
        font-size: 11px;
        color: var(--canvas-text-secondary);
        line-height: 1.4;
      }

      .params-inputs-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 4px;

        .param-field {
          display: flex;
          flex-direction: column;
          gap: 2px;

          .param-label {
            font-size: 11px;
            color: var(--canvas-text-secondary);

            .req-star { color: var(--color-danger, #f85149); }
            .param-type { font-size: 10px; color: var(--canvas-text-muted); margin-left: 4px; }
          }

          .param-input {
            height: 26px;
            padding: 0 8px;
            background: var(--canvas-surface);
            border: 1px solid var(--canvas-border);
            border-radius: var(--radius-sm);
            color: var(--canvas-text-primary);
            font-size: 11px;
            outline: none;

            &:focus {
              border-color: #58a6ff;
            }
          }
        }
      }
    }

    .error-banner {
      background: rgba(248, 81, 73, 0.08);
      border: 1px solid rgba(248, 81, 73, 0.25);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .error-header {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--color-danger, #f85149);
        font-size: 12px;
        font-weight: 600;

        .err-icon {
          font-size: 15px;
          width: 15px;
          height: 15px;
        }
      }

      .err-msg {
        margin: 0;
        font-size: 11px;
        color: var(--canvas-text-primary);
      }

      .err-raw {
        margin: 4px 0 0;
        padding: 6px 8px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(248, 81, 73, 0.15);
        border-radius: var(--radius-sm);
        font-size: 10px;
        color: var(--canvas-text-secondary);
        white-space: pre-wrap;
        max-height: 100px;
        overflow-y: auto;
      }
    }

    .dialog-footer {
      padding: 10px 14px;
      background: var(--canvas-surface-elevated);
      border-top: 1px solid var(--canvas-border);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;

      .btn-cancel {
        height: 28px;
        padding: 0 12px;
        background: var(--canvas-surface);
        border: 1px solid var(--canvas-border);
        border-radius: var(--radius-sm);
        color: var(--canvas-text-secondary);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.12s ease;

        &:hover:not(:disabled) {
          color: var(--canvas-text-primary);
          border-color: var(--canvas-text-muted);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .btn-delete {
        height: 28px;
        padding: 0 14px;
        background: #da3633;
        border: 1px solid rgba(240, 246, 252, 0.1);
        border-radius: var(--radius-sm);
        color: #ffffff;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: background 0.12s ease;

        &:hover:not(:disabled) {
          background: #f85149;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }

    .icon-sm {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .spinning {
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class DeleteConfirmDialogComponent implements OnInit {
  private readonly session = inject(ApiSessionService);
  private readonly executor = inject(ApiExecutorService);
  private readonly router = inject(Router);

  @Input({ required: true }) operation!: ApiOperation;
  @Input() record: unknown = null;
  @Input() initialParams: Record<string, string> = {};
  @Input() missingParams: ApiParameter[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<ApiExecutionResult>();

  userParamValues = signal<Record<string, string>>({});
  isExecuting = signal<boolean>(false);
  executionResult = signal<ApiExecutionResult | null>(null);

  readonly hasMissingParams = computed<boolean>(() => {
    return this.missingParams.length > 0;
  });

  readonly resolvedParamEntries = computed<KeyValueSummary[]>(() => {
    const params = this.initialParams || {};
    return Object.entries(params).map(([key, value]) => ({ key, value: String(value) }));
  });

  readonly recordSummaryEntries = computed<KeyValueSummary[]>(() => {
    const rec = this.record;
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
      return [];
    }

    const obj = rec as Record<string, unknown>;
    const keys = Object.keys(obj);
    const summaryList: KeyValueSummary[] = [];

    // Prioritize descriptive and identifier fields
    const priorityKeys = ['id', '_id', 'name', 'title', 'code', 'slug', 'email', 'username', 'description', 'status'];

    for (const pKey of priorityKeys) {
      if (pKey in obj && obj[pKey] !== null && obj[pKey] !== undefined && typeof obj[pKey] !== 'object') {
        summaryList.push({ key: pKey, value: String(obj[pKey]) });
      }
    }

    // Add other scalar fields if summary is still small
    for (const [k, v] of Object.entries(obj)) {
      if (summaryList.length >= 6) break;
      if (!priorityKeys.includes(k) && v !== null && v !== undefined && typeof v !== 'object') {
        summaryList.push({ key: k, value: String(v) });
      }
    }

    return summaryList;
  });

  readonly primaryIdentifier = computed<KeyValueSummary | null>(() => {
    const entries = this.recordSummaryEntries();
    const idItem = entries.find((e) => ['id', '_id', 'code', 'uuid', 'slug', 'identifier'].includes(e.key.toLowerCase()));
    return idItem || entries[0] || null;
  });

  ngOnInit(): void {
    this.userParamValues.set({ ...this.initialParams });
  }

  onParamChange(name: string, value: string): void {
    this.userParamValues.update((curr) => ({
      ...curr,
      [name]: value
    }));
  }

  areAllRequiredParamsProvided(): boolean {
    const values = this.userParamValues();
    const pathParams = this.operation.parameters.filter((p) => p.location === 'path');
    return pathParams.every((p) => {
      const val = values[p.name];
      return val !== undefined && String(val).trim().length > 0;
    });
  }

  executeDelete(): void {
    if (!this.operation) return;
    const baseUrl = this.session.baseUrl();

    this.isExecuting.set(true);
    this.executionResult.set(null);

    const input: ApiRequestInput = {
      path: this.userParamValues()
    };

    this.executor.execute(baseUrl, this.operation, input).subscribe({
      next: (result: ApiExecutionResult) => {
        this.isExecuting.set(false);
        this.executionResult.set(result);

        if (result.isSuccess) {
          this.deleted.emit(result);
          this.close.emit();
        }
      },
      error: (err: unknown) => {
        this.isExecuting.set(false);
        const errorObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : null;
        const status = typeof errorObj?.['status'] === 'number' ? errorObj['status'] : 0;
        const statusText = typeof errorObj?.['statusText'] === 'string' ? errorObj['statusText'] : 'Execution Error';
        const errorMsg = err instanceof Error ? err.message : typeof errorObj?.['message'] === 'string' ? errorObj['message'] : 'Failed to execute DELETE request';

        this.executionResult.set({
          status,
          statusText,
          data: errorObj?.['error'] ?? null,
          duration: 0,
          durationMs: 0,
          isSuccess: false,
          error: {
            message: errorMsg,
            status,
            details: errorObj?.['error']
          }
        });
      }
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      if (!this.isExecuting()) {
        this.close.emit();
      }
    }
  }

  onOpenFullOperation(): void {
    const targetId = this.operation.operationId || this.operation.id;
    this.router.navigate(['/operation', targetId]);
    this.close.emit();
  }

  getErrorMessage(): string {
    const res = this.executionResult();
    if (res?.error?.message) {
      return res.error.message;
    }
    if (res?.statusText) {
      return `Server returned error status: ${res.statusText}`;
    }
    return 'An unexpected network error occurred while sending the DELETE request.';
  }

  formatPayload(data: unknown): string {
    if (data === null || data === undefined) return '';
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
}
