import {
  Component,
  computed,
  EventEmitter,
  Input,
  Output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ApiExecutionResult } from '../../../core/models/api-execution-result.model';
import { ApiOperation } from '../../../core/models/api-operation.model';
import { JsonViewerComponent } from '../json-viewer/json-viewer.component';
import { LoadingIndicatorComponent } from '../loading-indicator/loading-indicator.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

export type ResultActiveTab = 'body' | 'headers' | 'raw';

@Component({
  selector: 'app-execution-result-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    JsonViewerComponent,
    LoadingIndicatorComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="result-viewer-panel">
      <!-- Top Status / Meta Bar -->
      @if (result; as res) {
        <div class="result-header">
          <div class="header-status">
            <span
              class="status-badge font-mono"
              [attr.data-status-group]="statusGroup()"
            >
              <mat-icon class="status-icon">{{ statusIcon() }}</mat-icon>
              <span>HTTP {{ res.status }} {{ res.statusText || defaultStatusText() }}</span>
            </span>

            @if (res.durationMs !== undefined || res.duration !== undefined) {
              <span class="duration-badge font-mono">
                <mat-icon class="icon-xs">timer</mat-icon>
                <span>{{ res.durationMs ?? res.duration }}ms</span>
              </span>
            }
          </div>

          <!-- Navigation Tabs -->
          <div class="header-tabs">
            <button
              type="button"
              class="tab-btn font-mono"
              [class.active]="activeTab() === 'body'"
              (click)="activeTab.set('body')"
            >
              Payload
            </button>

            <button
              type="button"
              class="tab-btn font-mono"
              [class.active]="activeTab() === 'headers'"
              (click)="activeTab.set('headers')"
            >
              Headers
              @if (headerCount() > 0) {
                <span class="tab-badge">{{ headerCount() }}</span>
              }
            </button>

            <button
              type="button"
              class="tab-btn font-mono"
              [class.active]="activeTab() === 'raw'"
              (click)="activeTab.set('raw')"
            >
              Raw Output
            </button>
          </div>
        </div>

        <!-- Result Body -->
        <div class="result-body">
          <!-- 1. Success Message Alert (if operation is create, update or delete or general) -->
          @if (res.isSuccess && showSuccessAlert) {
            <div class="alert-box alert-success font-mono">
              <mat-icon class="alert-icon">check_circle</mat-icon>
              <div class="alert-content">
                <span class="alert-text">{{ computedSuccessMessage() }}</span>
                @if (onNavigateToListAction) {
                  <button type="button" class="action-link-btn" (click)="navigateToList.emit()">
                    <span>View in Resource List &rarr;</span>
                  </button>
                }
              </div>
            </div>
          }

          <!-- 2. Error Diagnostic Alert (CORS, Network, HTTP error, Validation) -->
          @if (!res.isSuccess && res.error) {
            <div class="alert-box alert-error font-mono">
              <mat-icon class="alert-icon">error_outline</mat-icon>
              <div class="alert-content">
                <div class="alert-title-row">
                  <span class="error-category-badge">{{ res.error.category || 'ERROR' }}</span>
                  <span class="error-msg-main">{{ res.error.message }}</span>
                </div>

                @if (res.error.hint) {
                  <p class="error-hint">
                    <mat-icon class="hint-icon">lightbulb</mat-icon>
                    <span>{{ res.error.hint }}</span>
                  </p>
                }

                @if (res.error.details && res.error.details !== res.data) {
                  <div class="error-details-box">
                    <app-json-viewer [data]="res.error.details" [showHeader]="false" maxHeight="200px" />
                  </div>
                }
              </div>
            </div>
          }

          <!-- Tab Content Views -->
          @if (activeTab() === 'body') {
            <div class="tab-content-pane">
              <ng-content />
              @if (!hasProjectedContent) {
                <app-json-viewer [data]="res.data" [title]="'Response Body'" />
              }
            </div>
          } @else if (activeTab() === 'headers') {
            <div class="tab-content-pane">
              @if (headerEntries().length > 0) {
                <div class="headers-table font-mono" role="table">
                  <div class="table-header-row" role="row">
                    <span class="th-key" role="columnheader">Header</span>
                    <span class="th-val" role="columnheader">Value</span>
                  </div>
                  @for (h of headerEntries(); track h.key) {
                    <div class="table-row" role="row">
                      <span class="cell-key" role="cell">{{ h.key }}</span>
                      <span class="cell-val" role="cell">{{ h.value }}</span>
                    </div>
                  }
                </div>
              } @else {
                <app-empty-state
                  icon="receipt_long"
                  title="No response headers captured"
                  description="The server did not expose any custom response headers or request was blocked."
                  [compact]="true"
                />
              }
            </div>
          } @else if (activeTab() === 'raw') {
            <div class="tab-content-pane">
              <app-json-viewer
                [data]="{
                  status: res.status,
                  statusText: res.statusText,
                  durationMs: res.durationMs ?? res.duration,
                  headers: res.headers,
                  data: res.data,
                  error: res.error
                }"
                [title]="'Full Execution Result'"
              />
            </div>
          }
        </div>
      } @else if (loading) {
        <div class="result-loading">
          <app-loading-indicator [message]="loadingMessage || 'Executing HTTP request...'" />
        </div>
      } @else {
        <div class="result-idle">
          <app-empty-state
            icon="play_circle_outline"
            title="Ready to Execute"
            description="Configure parameters or payload and click Execute Request."
          />
        </div>
      }
    </div>
  `,
  styles: [`
    .result-viewer-panel {
      display: flex;
      flex-direction: column;
      width: 100%;
      background: var(--canvas-bg);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }

    .result-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      background: var(--canvas-surface);
      border-bottom: 1px solid var(--canvas-border);
      gap: 12px;
      flex-wrap: wrap;

      .header-status {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 700;
        border-radius: var(--radius-sm);
        background: var(--canvas-surface-elevated);
        border: 1px solid var(--canvas-border);
        color: var(--canvas-text-secondary);

        .status-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
        }

        &[data-status-group="2xx"] {
          background: var(--http-get-bg);
          border-color: var(--http-get-border);
          color: var(--http-get);
        }

        &[data-status-group="3xx"] {
          background: rgba(88, 166, 255, 0.12);
          border-color: rgba(88, 166, 255, 0.3);
          color: var(--canvas-text-link);
        }

        &[data-status-group="4xx"] {
          background: var(--http-put-bg);
          border-color: var(--http-put-border);
          color: var(--http-put);
        }

        &[data-status-group="5xx"],
        &[data-status-group="0"] {
          background: var(--http-delete-bg);
          border-color: var(--http-delete-border);
          color: var(--http-delete);
        }
      }

      .duration-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 11px;
        color: var(--canvas-text-muted);
        padding: 2px 6px;
        background: var(--canvas-surface-elevated);
        border-radius: var(--radius-sm);
        border: 1px solid var(--canvas-border-subtle);

        .icon-xs {
          font-size: 12px;
          width: 12px;
          height: 12px;
        }
      }

      .header-tabs {
        display: flex;
        align-items: center;
        gap: 4px;

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          color: var(--canvas-text-secondary);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            color: var(--canvas-text-primary);
            background: var(--canvas-surface-elevated);
          }

          &.active {
            color: var(--canvas-text-link);
            background: var(--canvas-surface-elevated);
            border-color: var(--canvas-border);
            font-weight: 600;
          }

          .tab-badge {
            background: var(--canvas-bg);
            color: var(--canvas-text-muted);
            font-size: 10px;
            padding: 0 4px;
            border-radius: 2px;
            border: 1px solid var(--canvas-border-subtle);
          }
        }
      }
    }

    .result-body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .alert-box {
      display: flex;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      line-height: 1.4;

      .alert-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      .alert-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      &.alert-success {
        background: var(--http-get-bg);
        border: 1px solid var(--http-get-border);
        color: var(--http-get);

        .action-link-btn {
          background: transparent;
          border: none;
          color: var(--canvas-text-link);
          font-size: 11px;
          cursor: pointer;
          padding: 0;
          text-align: left;
          text-decoration: underline;
          margin-top: 4px;
        }
      }

      &.alert-error {
        background: var(--http-delete-bg);
        border: 1px solid var(--http-delete-border);
        color: var(--http-delete);

        .alert-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;

          .error-category-badge {
            background: rgba(248, 81, 73, 0.2);
            padding: 1px 4px;
            border-radius: 2px;
            font-size: 10px;
            font-weight: 700;
          }

          .error-msg-main {
            font-weight: 600;
          }
        }

        .error-hint {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          margin: 4px 0 0;
          font-size: 11px;
          color: var(--canvas-text-secondary);

          .hint-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
            color: var(--color-warning);
            flex-shrink: 0;
          }
        }

        .error-details-box {
          margin-top: 6px;
        }
      }
    }

    .headers-table {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      font-size: 11px;

      .table-header-row {
        display: flex;
        background: var(--canvas-surface-elevated);
        border-bottom: 1px solid var(--canvas-border);
        font-weight: 600;
        color: var(--canvas-text-secondary);
        padding: 6px 10px;

        .th-key {
          width: 200px;
          flex-shrink: 0;
        }
        .th-val {
          flex: 1;
        }
      }

      .table-row {
        display: flex;
        padding: 6px 10px;
        border-bottom: 1px solid var(--canvas-border-subtle);
        background: var(--canvas-surface);

        &:last-child {
          border-bottom: none;
        }

        .cell-key {
          width: 200px;
          flex-shrink: 0;
          color: var(--canvas-text-link);
          word-break: break-all;
        }

        .cell-val {
          flex: 1;
          color: var(--canvas-text-primary);
          word-break: break-all;
        }
      }
    }

    .result-loading,
    .result-idle {
      padding: 32px 16px;
    }
  `]
})
export class ExecutionResultViewerComponent {
  private readonly _result = signal<ApiExecutionResult | null>(null);

  @Input()
  set result(value: ApiExecutionResult | null) {
    this._result.set(value);
  }
  get result(): ApiExecutionResult | null {
    return this._result();
  }

  @Input() loading = false;
  @Input() loadingMessage?: string;
  @Input() operation?: ApiOperation;
  @Input() showSuccessAlert = true;
  @Input() successMessage?: string;
  @Input() onNavigateToListAction = false;
  @Input() hasProjectedContent = false;

  @Output() navigateToList = new EventEmitter<void>();

  readonly activeTab = signal<ResultActiveTab>('body');

  readonly statusGroup = computed(() => {
    const res = this._result();
    const status = res?.status;
    if (status === undefined || status === null || status === 0) return '0';
    if (status >= 200 && status < 300) return '2xx';
    if (status >= 300 && status < 400) return '3xx';
    if (status >= 400 && status < 500) return '4xx';
    return '5xx';
  });

  readonly statusIcon = computed(() => {
    const group = this.statusGroup();
    switch (group) {
      case '2xx':
        return 'check_circle';
      case '3xx':
        return 'info';
      case '4xx':
        return 'warning';
      case '5xx':
      case '0':
        return 'error';
      default:
        return 'help_outline';
    }
  });

  readonly defaultStatusText = computed(() => {
    const res = this._result();
    const status = res?.status;
    if (!status || status === 0) return 'Network / CORS Error';
    if (status === 200) return 'OK';
    if (status === 201) return 'Created';
    if (status === 204) return 'No Content';
    if (status === 400) return 'Bad Request';
    if (status === 401) return 'Unauthorized';
    if (status === 403) return 'Forbidden';
    if (status === 404) return 'Not Found';
    if (status === 500) return 'Internal Server Error';
    return 'Response';
  });

  readonly computedSuccessMessage = computed(() => {
    if (this.successMessage) return this.successMessage;
    const op = this.operation;
    const res = this._result();
    const status = res?.status;
    const statusText = res?.statusText || this.defaultStatusText();

    if (op?.type === 'create' || op?.method === 'POST') {
      return `Recurso criado com sucesso (HTTP ${status} ${statusText}).`;
    }
    if (op?.type === 'update' || op?.method === 'PUT' || op?.method === 'PATCH') {
      return `Recurso atualizado com sucesso (HTTP ${status} ${statusText}).`;
    }
    if (op?.type === 'delete' || op?.method === 'DELETE') {
      return `Recurso excluído com sucesso (HTTP ${status} ${statusText}).`;
    }
    return `Requisição executada com sucesso (HTTP ${status} ${statusText}).`;
  });

  readonly headerEntries = computed(() => {
    const res = this._result();
    const headers = res?.headers;
    if (!headers) return [];
    return Object.entries(headers).map(([key, value]) => ({ key, value }));
  });

  readonly headerCount = computed(() => this.headerEntries().length);
}
