import {
  Component,
  computed,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnDestroy,
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
import { ResourceOperationMatcherService } from '../../core/services/resource-operation-matcher.service';
import { HttpBadgeComponent } from '../../shared/components/http-badge/http-badge.component';
import { ObjectDetailsComponent } from './object-details.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { JsonViewerComponent } from '../../shared/components/json-viewer/json-viewer.component';

@Component({
  selector: 'app-record-details-drawer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    HttpBadgeComponent,
    ObjectDetailsComponent,
    LoadingIndicatorComponent,
    EmptyStateComponent,
    JsonViewerComponent
  ],
  template: `
    <div class="drawer-backdrop" (click)="onBackdropClick($event)" role="presentation">
      <div class="drawer-panel font-sans" role="dialog" aria-modal="true" aria-label="Detalhes do Registro">
        <!-- Drawer Header -->
        <header class="drawer-header">
          <div class="header-left">
            <div class="header-title-row">
              <span class="drawer-badge font-mono">DETAILS</span>
              <app-http-badge method="GET" />
              <span class="endpoint-path font-mono" [title]="operation.path">{{ operation.path }}</span>
            </div>
            @if (operation.summary) {
              <span class="operation-summary">{{ operation.summary }}</span>
            }
          </div>

          <div class="header-actions">
            @if (hasUpdateOp() && executionResult()?.isSuccess) {
              <button
                type="button"
                class="icon-action-btn edit-action-btn"
                (click)="onEditRecord()"
                title="Editar este registro"
                aria-label="Editar este registro"
              >
                <mat-icon class="icon-sm" aria-hidden="true">edit</mat-icon>
                <span>Editar</span>
              </button>
            }

            <button
              type="button"
              class="icon-action-btn"
              (click)="onOpenFullOperation()"
              title="Abrir no Workbench"
              aria-label="Abrir operação completa no workbench"
            >
              <mat-icon class="icon-sm" aria-hidden="true">open_in_new</mat-icon>
              <span>Workbench</span>
            </button>

            <button
              type="button"
              class="icon-action-btn close-btn"
              (click)="onClose()"
              title="Fechar detalhes (Esc)"
              aria-label="Fechar detalhes"
            >
              <mat-icon class="icon-sm" aria-hidden="true">close</mat-icon>
            </button>
          </div>
        </header>

        <!-- Fallback: Missing Parameters Prompt -->
        @if (hasMissingParams()) {
          <div class="missing-params-banner">
            <div class="banner-heading">
              <mat-icon class="warn-icon">tune</mat-icon>
              <span class="warn-title">Specify Required Parameters</span>
            </div>
            <p class="banner-desc">
              The details operation requires additional parameters that could not be inferred automatically from this record.
            </p>

            <div class="params-form">
              @for (param of missingParams; track param.name) {
                <div class="param-row">
                  <label class="param-label font-mono" [for]="'param-' + param.name">
                    {{ param.name }}
                    <span class="req-star">*</span>
                  </label>
                  <input
                    [id]="'param-' + param.name"
                    type="text"
                    class="param-input font-mono"
                    [placeholder]="param.description || ('Enter ' + param.name)"
                    [value]="userParamValues()[param.name] || ''"
                    (input)="onParamInputChange(param.name, $any($event.target).value)"
                  />
                </div>
              }

              <div class="params-submit-row">
                <button
                  type="button"
                  class="btn-fetch"
                  (click)="fetchDetails()"
                  [disabled]="isExecuting() || !areAllMissingParamsProvided()"
                >
                  <mat-icon class="icon-sm">play_arrow</mat-icon>
                  <span>Fetch Record Details</span>
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Toolbar: Mode Switcher & Copy (When executed) -->
        @if (executionResult(); as res) {
          <div class="drawer-toolbar">
            <div class="toolbar-left">
              <div class="status-indicator-badge font-mono" [attr.data-success]="res.isSuccess">
                <span class="status-code">HTTP {{ res.status }}</span>
                <span class="status-text">{{ res.statusText }}</span>
                <span class="duration-text">{{ res.durationMs }}ms</span>
              </div>

              <div class="view-mode-tabs">
                <button
                  type="button"
                  class="mode-btn"
                  [class.active]="viewMode() === 'visual'"
                  (click)="viewMode.set('visual')"
                >
                  <mat-icon class="icon-xs">data_object</mat-icon>
                  <span>Properties</span>
                </button>
                <button
                  type="button"
                  class="mode-btn"
                  [class.active]="viewMode() === 'raw'"
                  (click)="viewMode.set('raw')"
                >
                  <mat-icon class="icon-xs">code</mat-icon>
                  <span>Raw JSON</span>
                </button>
              </div>
            </div>

            <div class="toolbar-right">
              <button
                type="button"
                class="copy-btn"
                (click)="onCopyPayload()"
                [title]="copied() ? 'Copied!' : 'Copy response payload'"
              >
                <mat-icon class="icon-xs">{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
                <span>{{ copied() ? 'Copied' : 'Copy' }}</span>
              </button>

              <button
                type="button"
                class="refresh-btn"
                (click)="fetchDetails()"
                [disabled]="isExecuting()"
                title="Refetch details"
              >
                <mat-icon class="icon-xs" [class.spinning]="isExecuting()">refresh</mat-icon>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        }

        <!-- Body Content Area -->
        <div class="drawer-body">
          <!-- Loading State -->
          @if (isExecuting()) {
            <div class="loading-state">
              <app-loading-indicator [message]="'Fetching details from ' + operation.path + '...'" />
            </div>
          }

          <!-- Execution Error Banner (e.g. 404, 400, 500, CORS) -->
          @else if (executionResult()?.isSuccess === false) {
            <div class="error-container">
              <div class="error-card font-mono">
                <div class="error-header">
                  <mat-icon class="err-icon">error_outline</mat-icon>
                  <span class="err-title">
                    HTTP {{ executionResult()?.status }} - {{ executionResult()?.statusText || 'Request Failed' }}
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
                  <div class="err-payload-wrapper">
                    <app-json-viewer [data]="executionResult()?.data" [showHeader]="false" maxHeight="200px" />
                  </div>
                }
              </div>

              <div class="error-actions">
                <button type="button" class="retry-btn font-mono" (click)="fetchDetails()">
                  <mat-icon class="icon-sm">replay</mat-icon>
                  <span>Retry Request</span>
                </button>
              </div>
            </div>
          }

          <!-- Successful Result -->
          @else if (executionResult(); as res) {
            @if (viewMode() === 'visual') {
              <div class="visual-details-wrapper">
                <app-object-details [data]="res.data" />
              </div>
            } @else {
              <div class="raw-details-wrapper">
                <app-json-viewer [data]="res.data" [showHeader]="false" />
              </div>
            }
          }

          <!-- Initial / Empty State if not yet executed and not missing params -->
          @else if (!hasMissingParams()) {
            <div class="idle-state">
              <app-empty-state
                icon="hourglass_empty"
                title="Ready to fetch details"
                description="Click Refresh or provide parameters to load record details."
                [compact]="true"
              />
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .drawer-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .drawer-panel {
      width: 640px;
      max-width: 90vw;
      height: 100vh;
      background: var(--canvas-surface);
      border-left: 1px solid var(--canvas-border);
      display: flex;
      flex-direction: column;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
      animation: slideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .drawer-header {
      padding: 12px 16px;
      background: var(--canvas-surface-elevated);
      border-bottom: 1px solid var(--canvas-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-shrink: 0;

      .header-left {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;

        .header-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;

          .drawer-badge {
            font-size: 10px;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 2px;
            background: rgba(56, 139, 253, 0.15);
            color: var(--http-get, #58a6ff);
            border: 1px solid rgba(56, 139, 253, 0.3);
          }

          .endpoint-path {
            font-size: 13px;
            font-weight: 600;
            color: var(--canvas-text-primary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        .operation-summary {
          font-size: 11px;
          color: var(--canvas-text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;

        .icon-action-btn {
          height: 26px;
          padding: 0 8px;
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
            padding: 0 5px;
          }
        }
      }
    }

    .missing-params-banner {
      padding: 12px 16px;
      background: rgba(210, 153, 34, 0.08);
      border-bottom: 1px solid rgba(210, 153, 34, 0.25);
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;

      .banner-heading {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #d29922;

        .warn-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }

        .warn-title {
          font-size: 12px;
          font-weight: 600;
        }
      }

      .banner-desc {
        margin: 0;
        font-size: 11px;
        color: var(--canvas-text-secondary);
        line-height: 1.4;
      }

      .params-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 4px;

        .param-row {
          display: flex;
          flex-direction: column;
          gap: 3px;

          .param-label {
            font-size: 11px;
            color: var(--canvas-text-secondary);
            .req-star {
              color: var(--color-danger, #f85149);
            }
          }

          .param-input {
            height: 28px;
            padding: 0 8px;
            background: var(--canvas-bg);
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

        .params-submit-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 4px;

          .btn-fetch {
            height: 28px;
            padding: 0 12px;
            background: var(--color-primary, #1f6feb);
            color: #ffffff;
            border: none;
            border-radius: var(--radius-sm);
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;

            &:hover:not(:disabled) {
              background: #388bfd;
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
      }
    }

    .drawer-toolbar {
      padding: 6px 16px;
      background: var(--canvas-surface-elevated);
      border-bottom: 1px solid var(--canvas-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-shrink: 0;

      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 12px;

        .status-indicator-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--canvas-border);
          background: var(--canvas-bg);

          &[data-success='true'] {
            border-color: rgba(63, 185, 80, 0.35);
            .status-code { color: var(--color-success, #3fb950); font-weight: 600; }
          }

          &[data-success='false'] {
            border-color: rgba(248, 81, 73, 0.35);
            .status-code { color: var(--color-danger, #f85149); font-weight: 600; }
          }

          .status-text {
            color: var(--canvas-text-secondary);
          }

          .duration-text {
            color: var(--canvas-text-muted);
            font-size: 10px;
          }
        }

        .view-mode-tabs {
          display: flex;
          align-items: center;
          gap: 2px;

          .mode-btn {
            height: 24px;
            padding: 0 8px;
            background: transparent;
            border: 1px solid transparent;
            border-radius: var(--radius-sm);
            color: var(--canvas-text-secondary);
            font-size: 11px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;

            &:hover {
              color: var(--canvas-text-primary);
            }

            &.active {
              background: var(--canvas-bg);
              border-color: var(--canvas-border);
              color: var(--canvas-text-primary);
              font-weight: 600;
            }
          }
        }
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 6px;

        .copy-btn, .refresh-btn {
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

          &:hover {
            color: var(--canvas-text-primary);
            border-color: var(--canvas-text-muted);
            background: rgba(255, 255, 255, 0.04);
          }
        }
      }
    }

    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: var(--canvas-bg);
    }

    .visual-details-wrapper, .raw-details-wrapper {
      width: 100%;
    }

    .raw-pre {
      margin: 0;
      padding: 12px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      font-size: 12px;
      line-height: 1.5;
      color: var(--canvas-text-primary);
      white-space: pre-wrap;
      word-break: break-all;
    }

    .loading-state {
      padding: 48px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: var(--canvas-text-muted);
      font-size: 12px;

      .spinner {
        width: 24px;
        height: 24px;
        border: 2px solid var(--canvas-border);
        border-top-color: #58a6ff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .spinning {
      animation: spin 0.8s linear infinite;
    }

    .error-container {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .error-card {
        padding: 14px;
        background: rgba(248, 81, 73, 0.08);
        border: 1px solid rgba(248, 81, 73, 0.25);
        border-radius: var(--radius-sm);
        display: flex;
        flex-direction: column;
        gap: 8px;

        .error-header {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--color-danger, #f85149);
          font-weight: 600;
          font-size: 13px;

          .err-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }

        .err-msg {
          margin: 0;
          font-size: 12px;
          color: var(--canvas-text-primary);
        }

        .err-payload {
          margin: 0;
          padding: 8px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(248, 81, 73, 0.15);
          border-radius: var(--radius-sm);
          font-size: 11px;
          color: var(--canvas-text-secondary);
          white-space: pre-wrap;
          max-height: 180px;
          overflow: auto;
        }
      }

      .error-actions {
        display: flex;
        justify-content: flex-end;

        .retry-btn {
          height: 28px;
          padding: 0 10px;
          background: var(--canvas-surface-elevated);
          border: 1px solid var(--canvas-border);
          border-radius: var(--radius-sm);
          color: var(--canvas-text-primary);
          font-size: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;

          &:hover {
            background: #282e37;
          }
        }
      }
    }

    .idle-state {
      padding: 48px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: var(--canvas-text-muted);
      font-size: 12px;

      .idle-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        opacity: 0.5;
      }
    }

    .icon-sm {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .icon-xs {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
  `]
})
export class RecordDetailsDrawerComponent implements OnInit, OnDestroy {
  private readonly session = inject(ApiSessionService);
  private readonly executor = inject(ApiExecutorService);
  private readonly matcher = inject(ResourceOperationMatcherService);
  private readonly router = inject(Router);

  @Input({ required: true }) operation!: ApiOperation;
  @Input() initialParams: Record<string, string> = {};
  @Input() missingParams: ApiParameter[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() editRecord = new EventEmitter<{
    record: unknown;
    updateOp: ApiOperation;
    availableOps?: ApiOperation[];
    params: Record<string, string>;
    missingParams?: ApiParameter[];
    detailsOp?: ApiOperation | null;
  }>();

  userParamValues = signal<Record<string, string>>({});
  isExecuting = signal<boolean>(false);
  executionResult = signal<ApiExecutionResult | null>(null);
  viewMode = signal<'visual' | 'raw'>('visual');
  copied = signal<boolean>(false);

  private previouslyFocusedElement: HTMLElement | null = null;

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    this.onClose();
  }

  readonly hasMissingParams = computed<boolean>(() => {
    return this.missingParams.length > 0;
  });

  /**
   * Discovered compatible update operation for this item.
   */
  readonly updateOperation = computed<ApiOperation | null>(() => {
    const parentRes = this.session.getResourceForOperation?.(this.operation.id || this.operation.operationId || '');
    if (!parentRes) return null;
    return this.matcher.findCompatibleUpdateOperation(parentRes, this.operation);
  });

  readonly updateOperations = computed<ApiOperation[]>(() => {
    const parentRes = this.session.getResourceForOperation?.(this.operation.id || this.operation.operationId || '');
    if (!parentRes) return [];
    return this.matcher.findCompatibleUpdateOperations(parentRes, this.operation);
  });

  readonly hasUpdateOp = computed<boolean>(() => {
    return this.updateOperation() !== null;
  });

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      this.previouslyFocusedElement = document.activeElement as HTMLElement | null;
    }

    this.userParamValues.set({ ...this.initialParams });

    // Auto-fetch if no missing parameters required
    if (!this.hasMissingParams()) {
      this.fetchDetails();
    }
  }

  ngOnDestroy(): void {
    this.restoreFocus();
  }

  private restoreFocus(): void {
    if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
      this.previouslyFocusedElement.focus();
      this.previouslyFocusedElement = null;
    }
  }

  onClose(): void {
    this.restoreFocus();
    this.close.emit();
  }

  onParamInputChange(paramName: string, value: string): void {
    this.userParamValues.update((curr) => ({
      ...curr,
      [paramName]: value
    }));
  }

  areAllMissingParamsProvided(): boolean {
    const values = this.userParamValues();
    return this.missingParams.every((p) => {
      const val = values[p.name];
      return val !== undefined && val.trim().length > 0;
    });
  }

  fetchDetails(): void {
    const baseUrl = this.session.baseUrl();
    if (!this.operation) return;

    this.isExecuting.set(true);

    const input: ApiRequestInput = {
      path: this.userParamValues()
    };

    this.executor.execute(baseUrl, this.operation, input).subscribe({
      next: (result) => {
        this.executionResult.set(result);
        this.isExecuting.set(false);
      },
      error: (err) => {
        this.executionResult.set({
          status: err?.status || 0,
          statusText: err?.statusText || 'Execution Error',
          data: err?.error || null,
          duration: 0,
          durationMs: 0,
          isSuccess: false,
          error: {
            message: err?.message || 'Failed to fetch details',
            status: err?.status || 0,
            details: err?.error
          }
        });
        this.isExecuting.set(false);
      }
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('drawer-backdrop')) {
      this.onClose();
    }
  }

  onOpenFullOperation(): void {
    const targetId = this.operation.operationId || this.operation.id;
    this.router.navigate(['/operation', targetId]);
    this.onClose();
  }

  onCopyPayload(): void {
    const res = this.executionResult();
    if (res && navigator?.clipboard) {
      navigator.clipboard.writeText(this.formatJson(res.data)).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }

  getErrorMessage(): string {
    const res = this.executionResult();
    if (res?.error?.message) {
      return res.error.message;
    }
    if (res?.status === 404) {
      return 'The requested record was not found on the server (404 Not Found).';
    }
    return `Server returned HTTP ${res?.status || 0} ${res?.statusText || ''}`;
  }

  formatJson(data: unknown): string {
    if (data === null || data === undefined) return '';
    if (typeof data === 'string') {
      try {
        return JSON.stringify(JSON.parse(data), null, 2);
      } catch {
        return data;
      }
    }
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  onEditRecord(): void {
    const updateOp = this.updateOperation();
    if (!updateOp) return;

    const resData = this.executionResult()?.data;
    const resolution = this.matcher.resolveParameters(
      updateOp,
      resData,
      this.userParamValues()
    );

    this.editRecord.emit({
      record: resData,
      updateOp,
      availableOps: this.updateOperations(),
      params: resolution.resolvedParams,
      missingParams: resolution.missingParams,
      detailsOp: this.operation
    });
  }

  reload(): void {
    this.fetchDetails();
  }
}
