import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  signal,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiOperation, ApiRequestBody } from '../../core/models/api-operation.model';
import { ApiParameter } from '../../core/models/api-parameter.model';
import { ApiSchema } from '../../core/models/api-schema.model';
import { ApiExecutionResult } from '../../core/models/api-execution-result.model';
import { ApiRequestInput } from '../../core/models/api-request-input.model';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiExecutorService } from '../../core/services/api-executor.service';
import { HttpBadgeComponent } from '../../shared/components/http-badge/http-badge.component';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { JsonViewerComponent } from '../../shared/components/json-viewer/json-viewer.component';

@Component({
  selector: 'app-edit-record-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    HttpBadgeComponent,
    DynamicFormComponent,
    LoadingIndicatorComponent,
    JsonViewerComponent
  ],
  template: `
    <div class="dialog-backdrop" (click)="onBackdropClick($event)">
      <div class="dialog-panel font-sans" role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title">
        <!-- Dialog Header -->
        <header class="dialog-header">
          <div class="header-left">
            <span class="dialog-badge font-mono">EDIT RECORD</span>
            <app-http-badge [method]="activeOperation().method" />
            <span class="endpoint-path font-mono" [title]="activeOperation().path">{{ activeOperation().path }}</span>
          </div>

          <div class="header-actions">
            <!-- Optional Method Toggle (When both PUT & PATCH are available) -->
            @if (availableOps().length > 1) {
              <div class="method-selector">
                @for (op of availableOps(); track op.id || op.method) {
                  <button
                    type="button"
                    class="method-btn font-mono"
                    [class.active]="activeOperation().id === op.id || activeOperation().method === op.method"
                    (click)="onSelectOperation(op)"
                  >
                    {{ op.method }}
                  </button>
                }
              </div>
            }

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

        <!-- Dialog Subheader / Status Bar -->
        <div class="dialog-subheader">
          <div class="sub-left">
            @if (activeOperation().summary) {
              <span class="op-summary">{{ activeOperation().summary }}</span>
            } @else {
              <span class="op-summary font-mono">{{ activeOperation().method }} {{ activeOperation().path }}</span>
            }
          </div>

          <div class="sub-right">
            @if (detailsOperation && !isLoadingDetails()) {
              <button
                type="button"
                class="reload-details-btn"
                (click)="fetchDetailsFromServer()"
                [disabled]="isExecuting()"
                title="Fetch latest properties from server"
              >
                <mat-icon class="icon-xs">refresh</mat-icon>
                <span>Reload from API</span>
              </button>
            }
          </div>
        </div>

        <!-- Dialog Body -->
        <div class="dialog-body">
          <!-- Loading State for Server Fetch -->
          @if (isLoadingDetails()) {
            <div class="loading-box">
              <app-loading-indicator message="Fetching current record values from server..." />
            </div>
          }

          <!-- Missing Parameters Form (Fallback if cannot be fully auto-inferred) -->
          @if (hasMissingParams()) {
            <div class="missing-params-section">
              <div class="missing-params-header">
                <mat-icon class="warn-icon">tune</mat-icon>
                <span>Required Path Parameters</span>
              </div>
              <p class="missing-desc">
                Some path parameters could not be resolved automatically from the record. Please specify them:
              </p>

              <div class="params-inputs-list">
                @for (p of missingParams; track p.name) {
                  <div class="param-field">
                    <label class="param-label font-mono" [for]="'edit-param-' + p.name">
                      {{ p.name }}
                      <span class="req-star">*</span>
                      @if (p.schema.type) {
                        <span class="param-type font-mono">&lt;{{ p.schema.type }}&gt;</span>
                      }
                    </label>
                    <input
                      [id]="'edit-param-' + p.name"
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

          <!-- Request Body Form -->
          <div class="form-section">
            <div class="form-section-header">
              <div class="section-title">
                <mat-icon class="sec-icon">edit_note</mat-icon>
                <span>Request Payload ({{ activeOperation().method }})</span>
              </div>
              <span class="method-hint font-mono">
                {{ activeOperation().method === 'PATCH' ? 'Partial update' : 'Full replacement' }}
              </span>
            </div>

            @if (requestBodySchema(); as schema) {
              <div class="dynamic-form-wrapper">
                <app-dynamic-form
                  #dynForm
                  [schema]="schema"
                  [initialValue]="formInitialValue()"
                  [showActions]="false"
                  (formChange)="onDynamicFormChange($event)"
                />
              </div>
            } @else {
              <!-- Fallback when no structured schema defined in request body -->
              <div class="raw-editor-fallback">
                <div class="raw-label font-mono">Request Body (JSON):</div>
                <textarea
                  class="raw-json-textarea font-mono"
                  rows="8"
                  [value]="rawJsonText()"
                  (input)="onRawJsonChange($any($event.target).value)"
                  placeholder="{}"
                ></textarea>
              </div>
            }
          </div>

          <!-- Validation / Execution Error Alert -->
          @if (validationError() || (executionResult()?.isSuccess === false)) {
            <div class="error-banner font-mono">
              <mat-icon class="err-icon">error_outline</mat-icon>
              <div class="err-body">
                @if (validationError(); as vErr) {
                  <span class="err-msg">{{ vErr }}</span>
                } @else if (executionResult(); as res) {
                  <div class="err-title-row">
                    @if (res.error?.category) {
                      <span class="err-cat font-mono">{{ res.error?.category }}</span>
                    }
                    <span class="err-msg">
                      HTTP {{ res.status }} {{ res.statusText }}: {{ res.error?.message || 'Server returned an error.' }}
                    </span>
                  </div>
                  @if (res.error?.hint) {
                    <p class="err-hint">{{ res.error?.hint }}</p>
                  }
                  @if (res.error?.details && res.error?.details !== res.data) {
                    <div class="err-details">
                      <app-json-viewer [data]="res.error?.details" [showHeader]="false" maxHeight="150px" />
                    </div>
                  }
                }
              </div>
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
            class="btn-save"
            (click)="onSave()"
            [disabled]="isExecuting() || !areAllMissingParamsProvided()"
          >
            @if (isExecuting()) {
              <app-loading-indicator [inline]="true" size="sm" message="Saving..." />
            } @else {
              <mat-icon class="icon-sm">save</mat-icon>
              <span>{{ 'Update (' + activeOperation().method + ')' }}</span>
            }
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
      animation: fadeIn 0.12s ease;
    }

    .dialog-panel {
      width: 100%;
      max-width: 680px;
      max-height: 90vh;
      background: var(--canvas-surface, #161b22);
      border: 1px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-md, 6px);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideDown 0.14s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .dialog-header {
      height: 44px;
      min-height: 44px;
      padding: 0 14px;
      background: var(--canvas-surface-elevated, #21262d);
      border-bottom: 1px solid var(--canvas-border, #30363d);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
      min-width: 0;
    }

    .dialog-badge {
      font-size: 10px;
      font-weight: 700;
      color: #d29922;
      background: rgba(210, 153, 34, 0.15);
      border: 1px solid rgba(210, 153, 34, 0.3);
      padding: 1px 5px;
      border-radius: 2px;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    .endpoint-path {
      font-size: 12px;
      font-weight: 600;
      color: var(--canvas-text-primary, #e6edf3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .method-selector {
      display: flex;
      background: var(--canvas-surface, #161b22);
      border: 1px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-sm, 4px);
      padding: 2px;
      gap: 2px;
    }

    .method-btn {
      height: 22px;
      padding: 0 8px;
      font-size: 10px;
      font-weight: 700;
      background: transparent;
      border: none;
      border-radius: 2px;
      color: var(--canvas-text-muted, #6e7681);
      cursor: pointer;
      transition: all 0.1s ease;
    }

    .method-btn:hover {
      color: var(--canvas-text-primary, #e6edf3);
    }

    .method-btn.active {
      color: #ffffff;
      background: #d29922;
    }

    .icon-action-btn {
      height: 26px;
      padding: 0 8px;
      background: transparent;
      border: 1px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-sm, 4px);
      color: var(--canvas-text-secondary, #8b949e);
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.12s ease;
    }

    .icon-action-btn:hover {
      color: var(--canvas-text-primary, #e6edf3);
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--canvas-text-muted, #6e7681);
    }

    .icon-action-btn.close-btn {
      padding: 0 5px;
    }

    .dialog-subheader {
      padding: 6px 14px;
      background: var(--canvas-surface, #161b22);
      border-bottom: 1px solid var(--canvas-border-subtle, #21262d);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
    }

    .op-summary {
      color: var(--canvas-text-secondary, #8b949e);
    }

    .reload-details-btn {
      background: transparent;
      border: 1px solid var(--canvas-border-subtle, #21262d);
      border-radius: var(--radius-sm, 4px);
      color: var(--canvas-text-link, #58a6ff);
      font-size: 11px;
      padding: 2px 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .reload-details-btn:hover:not(:disabled) {
      background: rgba(88, 166, 255, 0.08);
      border-color: rgba(88, 166, 255, 0.3);
    }

    .dialog-body {
      padding: 14px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex: 1;
    }

    .loading-box {
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--canvas-bg, #0d1117);
      border: 1px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-sm, 4px);
      font-size: 12px;
      color: var(--canvas-text-secondary, #8b949e);
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--canvas-border, #30363d);
      border-top-color: var(--canvas-text-link, #58a6ff);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .missing-params-section {
      padding: 10px 12px;
      background: rgba(210, 153, 34, 0.08);
      border: 1px solid rgba(210, 153, 34, 0.25);
      border-radius: var(--radius-sm, 4px);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .missing-params-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #d29922;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .warn-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    .missing-desc {
      margin: 0;
      font-size: 11px;
      color: var(--canvas-text-secondary, #8b949e);
    }

    .params-inputs-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .param-field {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .param-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--canvas-text-primary, #e6edf3);
    }

    .req-star {
      color: #f85149;
    }

    .param-type {
      font-size: 10px;
      color: var(--canvas-text-muted, #6e7681);
      margin-left: 4px;
      font-weight: normal;
    }

    .param-input {
      height: 28px;
      background: var(--canvas-bg, #0d1117);
      border: 1px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-sm, 4px);
      color: var(--canvas-text-primary, #e6edf3);
      font-size: 12px;
      padding: 0 8px;
      outline: none;
    }

    .param-input:focus {
      border-color: var(--canvas-text-link, #58a6ff);
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--canvas-border-subtle, #21262d);
      padding-bottom: 4px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      color: var(--canvas-text-secondary, #8b949e);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .sec-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    .method-hint {
      font-size: 10px;
      color: var(--canvas-text-muted, #6e7681);
    }

    .dynamic-form-wrapper {
      background: var(--canvas-bg, #0d1117);
      border: 1px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-sm, 4px);
      padding: 12px;
    }

    .raw-editor-fallback {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .raw-label {
      font-size: 11px;
      color: var(--canvas-text-secondary, #8b949e);
    }

    .raw-json-textarea {
      width: 100%;
      background: var(--canvas-bg, #0d1117);
      border: 1px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-sm, 4px);
      color: var(--canvas-text-primary, #e6edf3);
      padding: 8px;
      font-size: 12px;
      line-height: 1.5;
      outline: none;
      resize: vertical;
    }

    .raw-json-textarea:focus {
      border-color: var(--canvas-text-link, #58a6ff);
    }

    .error-banner {
      padding: 8px 10px;
      background: rgba(218, 54, 51, 0.12);
      border: 1px solid rgba(218, 54, 51, 0.3);
      border-radius: var(--radius-sm, 4px);
      display: flex;
      align-items: flex-start;
      gap: 8px;
      color: #f85149;
      font-size: 11px;
    }

    .err-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      margin-top: 1px;
      flex-shrink: 0;
    }

    .err-body {
      flex: 1;
    }

    .err-msg {
      font-weight: 600;
      line-height: 1.4;
    }

    .err-details {
      margin-top: 4px;
      opacity: 0.85;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .dialog-footer {
      height: 48px;
      min-height: 48px;
      padding: 0 14px;
      background: var(--canvas-surface-elevated, #21262d);
      border-top: 1px solid var(--canvas-border, #30363d);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }

    .btn-cancel {
      height: 30px;
      padding: 0 12px;
      background: transparent;
      border: 1px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-sm, 4px);
      color: var(--canvas-text-secondary, #8b949e);
      font-size: 12px;
      cursor: pointer;
    }

    .btn-cancel:hover:not(:disabled) {
      color: var(--canvas-text-primary, #e6edf3);
      background: rgba(255, 255, 255, 0.05);
    }

    .btn-save {
      height: 30px;
      padding: 0 14px;
      background: #238636;
      border: 1px solid rgba(240, 246, 252, 0.1);
      border-radius: var(--radius-sm, 4px);
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.12s ease;
    }

    .btn-save:hover:not(:disabled) {
      background: #2ea043;
    }

    .btn-save:disabled, .btn-cancel:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .icon-xs {
      font-size: 13px;
      width: 13px;
      height: 13px;
    }

    .icon-sm {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideDown {
      from { transform: translateY(-8px) scale(0.98); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class EditRecordDialogComponent implements OnInit, OnChanges {
  private readonly session = inject(ApiSessionService);
  private readonly executor = inject(ApiExecutorService);
  private readonly router = inject(Router);

  @ViewChild('dynForm') dynamicFormRef?: DynamicFormComponent;

  @Input({ required: true }) operation!: ApiOperation;
  @Input() availableOperations: ApiOperation[] = [];
  @Input() record: unknown;
  @Input() initialParams: Record<string, string> = {};
  @Input() missingParams: ApiParameter[] = [];
  @Input() detailsOperation?: ApiOperation | null;

  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<ApiExecutionResult>();

  readonly activeOperation = signal<ApiOperation>(this.operation);
  readonly availableOps = signal<ApiOperation[]>([]);
  readonly userParamValues = signal<Record<string, string>>({});
  readonly currentRecordData = signal<Record<string, unknown>>({});
  readonly formInitialValue = signal<Record<string, unknown> | null>(null);
  readonly formCurrentValue = signal<Record<string, unknown>>({});
  readonly rawJsonText = signal<string>('{}');

  readonly isLoadingDetails = signal<boolean>(false);
  readonly isExecuting = signal<boolean>(false);
  readonly executionResult = signal<ApiExecutionResult | null>(null);
  readonly validationError = signal<string | null>(null);

  readonly requestBodySchema = computed<ApiSchema | null>(() => {
    const op = this.activeOperation();
    if (!op || !op.requestBody) return null;

    const rb = op.requestBody;
    const schema = 'schema' in rb ? (rb as ApiRequestBody).schema : (rb as ApiSchema);
    if (!schema) return null;

    if (schema.properties && Object.keys(schema.properties).length > 0) {
      return schema;
    }
    return schema.type === 'object' ? schema : null;
  });

  readonly hasMissingParams = computed<boolean>(() => {
    return this.missingParams.length > 0;
  });

  ngOnInit(): void {
    this.initComponentState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['operation'] && this.operation) {
      this.activeOperation.set(this.operation);
    }
    if (changes['availableOperations']) {
      this.availableOps.set(
        this.availableOperations.length > 0
          ? this.availableOperations
          : [this.operation]
      );
    }
    if (changes['initialParams'] || changes['record']) {
      this.initComponentState();
    }
  }

  private initComponentState(): void {
    this.activeOperation.set(this.operation);
    this.availableOps.set(
      this.availableOperations.length > 0
        ? this.availableOperations
        : [this.operation]
    );

    const initialMap = { ...this.initialParams };
    for (const p of this.missingParams) {
      if (initialMap[p.name] === undefined) {
        initialMap[p.name] = '';
      }
    }
    this.userParamValues.set(initialMap);

    const recObj =
      this.record && typeof this.record === 'object' && !Array.isArray(this.record)
        ? (this.record as Record<string, unknown>)
        : {};

    this.currentRecordData.set(recObj);
    this.formInitialValue.set(recObj);
    this.formCurrentValue.set(recObj);
    this.rawJsonText.set(JSON.stringify(recObj, null, 2));
    this.validationError.set(null);
    this.executionResult.set(null);
  }

  onSelectOperation(op: ApiOperation): void {
    this.activeOperation.set(op);
    this.validationError.set(null);
  }

  onParamChange(paramName: string, value: string): void {
    this.userParamValues.update((curr) => ({ ...curr, [paramName]: value }));
    this.validationError.set(null);
  }

  onDynamicFormChange(val: Record<string, unknown>): void {
    this.formCurrentValue.set(val);
    this.validationError.set(null);
  }

  onRawJsonChange(text: string): void {
    this.rawJsonText.set(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        this.formCurrentValue.set(parsed as Record<string, unknown>);
      }
    } catch {
      // Keep previous formCurrentValue
    }
  }

  fetchDetailsFromServer(): void {
    if (!this.detailsOperation) return;

    const op = this.detailsOperation;
    const base = this.session.baseUrl() || '';
    const pathParams = this.userParamValues();

    this.isLoadingDetails.set(true);
    this.validationError.set(null);

    const inputData: ApiRequestInput = {
      path: pathParams,
      query: {},
      headers: {}
    };

    this.executor.execute(base, op, inputData).subscribe({
      next: (res: ApiExecutionResult) => {
        this.isLoadingDetails.set(false);
        if (res.isSuccess && res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
          const freshData = res.data as Record<string, unknown>;
          this.currentRecordData.set(freshData);
          this.formInitialValue.set(freshData);
          this.formCurrentValue.set(freshData);
          this.rawJsonText.set(JSON.stringify(freshData, null, 2));
        }
      },
      error: () => {
        this.isLoadingDetails.set(false);
      }
    });
  }

  areAllMissingParamsProvided(): boolean {
    const vals = this.userParamValues();
    return this.missingParams.every((p) => {
      const v = vals[p.name];
      return v !== undefined && v !== null && String(v).trim() !== '';
    });
  }

  onSave(): void {
    const op = this.activeOperation();
    if (!op) return;

    this.validationError.set(null);
    this.executionResult.set(null);

    // 1. Validate required path parameters
    const pathParams: Record<string, string> = { ...this.userParamValues() };
    const requiredPathParams = op.parameters.filter((p) => p.location === 'path');

    for (const p of requiredPathParams) {
      const val = pathParams[p.name];
      if (!val || String(val).trim() === '') {
        this.validationError.set(`Missing required path parameter: "${p.name}".`);
        return;
      }
    }

    // 2. Validate form payload
    let payload: unknown;

    if (this.requestBodySchema()) {
      if (this.dynamicFormRef) {
        if (this.dynamicFormRef.form && this.dynamicFormRef.form.invalid) {
          this.dynamicFormRef.form.markAllAsTouched();
          this.validationError.set('Please fill in all required fields correctly before saving.');
          return;
        }
        payload = this.dynamicFormRef.getPayload();
      } else {
        payload = this.formCurrentValue();
      }
    } else {
      const rawText = this.rawJsonText().trim();
      if (rawText) {
        try {
          payload = JSON.parse(rawText);
        } catch (err: any) {
          this.validationError.set(`Invalid JSON: ${err.message}`);
          return;
        }
      } else {
        payload = {};
      }
    }

    const inputData: ApiRequestInput = {
      path: pathParams,
      query: {},
      headers: {},
      body: payload
    };

    const base = this.session.baseUrl() || '';
    this.isExecuting.set(true);

    this.executor.execute(base, op, inputData).subscribe({
      next: (result: ApiExecutionResult) => {
        this.isExecuting.set(false);
        this.executionResult.set(result);

        if (result.isSuccess) {
          this.updated.emit(result);
          this.close.emit();
        }
      },
      error: (err: any) => {
        this.isExecuting.set(false);
        this.executionResult.set({
          status: err?.status || 0,
          statusText: err?.statusText || 'Execution Error',
          data: err?.error || err?.message || 'Update failed',
          duration: 0,
          durationMs: 0,
          isSuccess: false,
          error: {
            message: err?.message || 'Error executing update operation',
            status: err?.status || 0,
            details: err?.error
          }
        });
      }
    });
  }

  onOpenFullOperation(): void {
    const op = this.activeOperation();
    const opId = op.operationId || op.id;
    this.close.emit();
    this.router.navigate(['/operation', opId]);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.close.emit();
    }
  }

  formatDetails(details: unknown): string {
    if (!details) return '';
    if (typeof details === 'string') return details;
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  }
}
