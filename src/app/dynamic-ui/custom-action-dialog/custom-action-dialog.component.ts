import {
  Component,
  computed,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnDestroy,
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
import { ResolvedCustomAction } from '../../core/models/resolved-resource-page.model';
import { UiActionConfirmationConfig } from '../../core/models/ui-configuration.model';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiExecutorService } from '../../core/services/api-executor.service';
import { UiConfigurationService } from '../../core/services/ui-configuration.service';
import { HttpBadgeComponent } from '../../shared/components/http-badge/http-badge.component';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { JsonViewerComponent } from '../../shared/components/json-viewer/json-viewer.component';

export interface KeyValueSummary {
  key: string;
  value: string;
}

@Component({
  selector: 'app-custom-action-dialog',
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
    <div class="dialog-backdrop" (click)="onBackdropClick($event)" role="presentation">
      <div class="dialog-panel font-sans" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title">
        <!-- Dialog Header -->
        <header class="dialog-header">
          <div class="header-left">
            <span
              class="dialog-badge font-mono"
              [class.danger-badge]="isDestructive()"
              [class.primary-badge]="!isDestructive()"
            >
              {{ isDestructive() ? 'DESTRUCTIVE ACTION' : 'CUSTOM ACTION' }}
            </span>
            <app-http-badge [method]="operation().method" />
            <span class="endpoint-path font-mono" [title]="operation().path">{{ operation().path }}</span>
          </div>

          <div class="header-actions">
            <button
              type="button"
              class="icon-action-btn"
              (click)="onOpenFullOperation()"
              title="Abrir no Workbench"
              aria-label="Abrir operação no workbench"
            >
              <mat-icon class="icon-sm" aria-hidden="true">open_in_new</mat-icon>
              <span>Workbench</span>
            </button>

            <button
              type="button"
              class="icon-action-btn close-btn"
              (click)="onClose()"
              title="Cancelar e fechar (Esc)"
              aria-label="Cancelar e fechar"
            >
              <mat-icon class="icon-sm" aria-hidden="true">close</mat-icon>
            </button>
          </div>
        </header>

        <!-- Dialog Subheader -->
        <div class="dialog-subheader">
          <div class="sub-left">
            <span id="action-dialog-title" class="op-summary">
              {{ action.label || operation().summary || operation().id }}
            </span>
          </div>
          @if (operation().operationId) {
            <div class="sub-right font-mono text-muted op-id">
              op: {{ operation().operationId }}
            </div>
          }
        </div>

        <!-- Dialog Body -->
        <div class="dialog-body">
          <!-- Destructive Action Notice -->
          @if (isDestructive()) {
            <div class="destructive-warning-card" role="alert">
              <mat-icon class="warn-symbol">warning</mat-icon>
              <div class="warn-content">
                <strong class="warn-title">Atenção: Ação com impacto irreversível ou destrutivo</strong>
                <p class="warn-message">
                  Esta operação enviará uma requisição <code>{{ operation().method }}</code> para
                  <code>{{ operation().path }}</code>.
                </p>
              </div>
            </div>
          }

          <!-- Confirmation Prompt for Actions without Request Body -->
          @if (!hasRequestBody()) {
            <div class="confirmation-section">
              <div class="prompt-icon-wrapper" [class.danger-prompt]="isDestructive()">
                <mat-icon class="prompt-icon">{{ action.icon || (isDestructive() ? 'delete_forever' : 'play_arrow') }}</mat-icon>
              </div>
              <div class="prompt-text">
                <h3 class="prompt-title">{{ confirmationTitle() }}</h3>
                <p class="prompt-desc">{{ confirmationMessage() }}</p>
              </div>
            </div>
          }

          <!-- Target Record Identity Summary -->
          @if (recordSummaryEntries().length > 0 || resolvedParamEntries().length > 0) {
            <div class="target-record-card">
              <div class="target-header">
                <span class="target-title">Registro Alvo</span>
                @if (primaryIdentifier(); as pid) {
                  <span class="primary-id-badge font-mono">{{ pid.key }}: {{ pid.value }}</span>
                }
              </div>

              @if (recordSummaryEntries().length > 0) {
                <div class="record-meta-grid font-mono">
                  @for (item of recordSummaryEntries(); track item.key) {
                    <div class="meta-row">
                      <span class="meta-key">{{ item.key }}:</span>
                      <span class="meta-val" [title]="item.value">{{ item.value }}</span>
                    </div>
                  }
                </div>
              }

              @if (resolvedParamEntries().length > 0) {
                <div class="resolved-params-block">
                  <span class="params-section-label font-mono">Parâmetros de Rota:</span>
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

          <!-- Missing Required Path Parameters -->
          @if (activeMissingParams().length > 0) {
            <div class="missing-params-section">
              <div class="missing-params-header">
                <mat-icon class="warn-icon">tune</mat-icon>
                <span>Parâmetros de Rota Obrigatórios</span>
              </div>
              <p class="missing-desc">
                Alguns parâmetros da rota não foram inferidos automaticamente da linha. Forneça os valores abaixo:
              </p>

              <div class="params-inputs-list">
                @for (p of activeMissingParams(); track p.name) {
                  <div class="param-field">
                    <label class="param-label font-mono" [for]="'action-param-' + p.name">
                      {{ p.name }}
                      <span class="req-star">*</span>
                      @if (p.schema.type) {
                        <span class="param-type font-mono">&lt;{{ p.schema.type }}&gt;</span>
                      }
                    </label>
                    <input
                      [id]="'action-param-' + p.name"
                      type="text"
                      class="param-input font-mono"
                      [placeholder]="p.description || ('Valor para ' + p.name)"
                      [value]="userParamValues()[p.name] || ''"
                      (input)="onParamChange(p.name, $any($event.target).value)"
                    />
                  </div>
                }
              </div>
            </div>
          }

          <!-- Request Body Form (When action requires or supports payload) -->
          @if (hasRequestBody() && requestBodySchema(); as bSchema) {
            <div class="form-container-box">
              <div class="form-section-header">
                <span class="section-title">Dados da Requisição (Body)</span>
                <span class="section-sub font-mono">{{ requestBodyContentType() }}</span>
              </div>

              <app-dynamic-form
                #dynForm
                [schema]="bSchema"
                [initialValue]="initialFormValue()"
                [globalFields]="globalFieldConfigs()"
                [showActions]="false"
                (formChange)="onDynamicFormChange($event)"
              />
            </div>
          }

          <!-- Execution Error Banner -->
          @if (executionResult()?.isSuccess === false) {
            <div class="error-banner font-mono" role="alert">
              <div class="error-header">
                <mat-icon class="err-icon">error_outline</mat-icon>
                <span class="err-title">
                  HTTP {{ executionResult()?.status }} - {{ executionResult()?.statusText || 'Falha na Execução' }}
                </span>
                @if (executionResult()?.error?.category) {
                  <span class="err-cat font-mono">{{ executionResult()?.error?.category }}</span>
                }
              </div>
              <p class="err-msg">{{ getErrorMessage() }}</p>
              @if (executionResult()?.error?.hint) {
                <p class="err-hint">{{ executionResult()?.error?.hint }}</p>
              }
              @if (hasErrorPayload()) {
                <div class="err-expandable-section">
                  <button
                    type="button"
                    class="err-toggle-btn font-mono"
                    (click)="toggleErrorExpanded()"
                    title="Alternar visualização do payload de erro"
                  >
                    <mat-icon class="toggle-icon">{{ isErrorExpanded() ? 'expand_less' : 'expand_more' }}</mat-icon>
                    <span>{{ isErrorExpanded() ? 'Ocultar detalhes' : 'Ver payload da resposta de erro' }}</span>
                  </button>

                  @if (isErrorExpanded()) {
                    <div class="err-payload-viewer">
                      @if (isPayloadObject(getErrorPayload())) {
                        <app-json-viewer [data]="getErrorPayload()" [showHeader]="false" maxHeight="150px" />
                      } @else {
                        <pre class="raw-error-text">{{ getErrorPayload() }}</pre>
                      }
                    </div>
                  }
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
            {{ cancelButtonLabel() }}
          </button>

          <button
            type="button"
            class="btn-submit"
            [class.btn-danger]="isDestructive()"
            [class.btn-primary]="!isDestructive()"
            (click)="executeAction()"
            [disabled]="isExecuting() || !areAllRequiredParamsProvided()"
          >
            @if (isExecuting()) {
              <app-loading-indicator [inline]="true" size="sm" message="Executando..." />
            } @else {
              <mat-icon class="icon-sm">{{ action.icon || (isDestructive() ? 'delete' : 'play_arrow') }}</mat-icon>
              <span>{{ confirmButtonLabel() }}</span>
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
      width: 580px;
      max-width: 95vw;
      max-height: 90vh;
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
          white-space: nowrap;

          &.primary-badge {
            background: rgba(31, 111, 235, 0.15);
            color: var(--color-info, #58a6ff);
            border: 1px solid rgba(88, 166, 255, 0.3);
          }

          &.danger-badge {
            background: rgba(248, 81, 73, 0.15);
            color: var(--color-danger, #f85149);
            border: 1px solid rgba(248, 81, 73, 0.3);
          }
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
        gap: 6px;

        .icon-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: transparent;
          border: 1px solid var(--canvas-border);
          border-radius: var(--radius-sm, 3px);
          color: var(--canvas-text-secondary);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.1s ease;

          &:hover {
            color: var(--canvas-text-primary);
            background: var(--action-hover-surface, rgba(255, 255, 255, 0.08));
            border-color: var(--canvas-text-muted);
          }

          &.close-btn {
            padding: 4px;
          }
        }
      }
    }

    .dialog-subheader {
      padding: 6px 14px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--canvas-border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;

      .op-summary {
        font-size: 12px;
        color: var(--canvas-text-secondary);
        font-weight: 500;
      }

      .op-id {
        font-size: 11px;
      }
    }

    .dialog-body {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .destructive-warning-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      background: rgba(218, 54, 51, 0.12);
      border: 1px solid rgba(248, 81, 73, 0.4);
      border-radius: var(--radius-sm, 3px);

      .warn-symbol {
        color: var(--color-danger, #f85149);
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .warn-content {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .warn-title {
          font-size: 12px;
          color: #ff7b72;
        }

        .warn-message {
          font-size: 11px;
          color: var(--canvas-text-secondary);
          margin: 0;

          code {
            background: rgba(0, 0, 0, 0.3);
            padding: 1px 4px;
            border-radius: 2px;
            font-family: var(--font-mono);
          }
        }
      }
    }

    .confirmation-section {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 4px;

      .prompt-icon-wrapper {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(88, 166, 255, 0.12);
        color: var(--color-info, #58a6ff);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &.danger-prompt {
          background: rgba(248, 81, 73, 0.15);
          color: var(--color-danger, #f85149);
        }

        .prompt-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .prompt-text {
        .prompt-title {
          margin: 0 0 2px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--canvas-text-primary);
        }

        .prompt-desc {
          margin: 0;
          font-size: 12px;
          color: var(--canvas-text-secondary);
        }
      }
    }

    .target-record-card {
      background: var(--canvas-surface-elevated);
      border: 1px solid var(--canvas-border-subtle);
      border-radius: var(--radius-sm, 3px);
      padding: 10px 12px;

      .target-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--canvas-border-subtle);

        .target-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--canvas-text-muted);
        }

        .primary-id-badge {
          font-size: 11px;
          padding: 1px 6px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--canvas-border);
          border-radius: var(--radius-xs, 2px);
          color: var(--canvas-text-primary);
        }
      }

      .record-meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 6px 12px;
        font-size: 11px;

        .meta-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          overflow: hidden;

          .meta-key {
            color: var(--canvas-text-muted);
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
        margin-top: 8px;
        padding-top: 6px;
        border-top: 1px dashed var(--canvas-border-subtle);
        display: flex;
        align-items: center;
        gap: 8px;

        .params-section-label {
          font-size: 10px;
          color: var(--canvas-text-muted);
          text-transform: uppercase;
        }

        .param-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;

          .param-tag {
            font-size: 11px;
            padding: 1px 5px;
            background: rgba(88, 166, 255, 0.1);
            border: 1px solid rgba(88, 166, 255, 0.25);
            border-radius: 2px;
            display: inline-flex;
            gap: 2px;

            .p-name { color: #58a6ff; }
            .p-eq { color: var(--canvas-text-muted); }
            .p-val { color: #e6edf3; font-weight: 600; }
          }
        }
      }
    }

    .missing-params-section {
      background: rgba(187, 128, 9, 0.1);
      border: 1px solid rgba(187, 128, 9, 0.35);
      border-radius: var(--radius-sm, 3px);
      padding: 10px 12px;

      .missing-params-header {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        color: #d29922;
        margin-bottom: 4px;

        .warn-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }

      .missing-desc {
        font-size: 11px;
        color: var(--canvas-text-secondary);
        margin: 0 0 10px 0;
      }

      .params-inputs-list {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .param-field {
          display: flex;
          flex-direction: column;
          gap: 3px;

          .param-label {
            font-size: 11px;
            color: var(--canvas-text-secondary);
            display: flex;
            align-items: center;
            gap: 4px;

            .req-star { color: #f85149; }
            .param-type { color: var(--canvas-text-muted); font-size: 10px; }
          }

          .param-input {
            height: 28px;
            padding: 4px 8px;
            font-size: 12px;
            background: var(--canvas-bg);
            border: 1px solid var(--canvas-border);
            border-radius: var(--radius-sm, 3px);
            color: var(--canvas-text-primary);
            outline: none;
            transition: border-color 0.1s ease;

            &:focus {
              border-color: #58a6ff;
            }
          }
        }
      }
    }

    .form-container-box {
      background: var(--canvas-surface-elevated);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm, 3px);
      padding: 12px;

      .form-section-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--canvas-border-subtle);

        .section-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--canvas-text-primary);
        }

        .section-sub {
          font-size: 10px;
          color: var(--canvas-text-muted);
        }
      }
    }

    .error-banner {
      background: rgba(248, 81, 73, 0.12);
      border: 1px solid rgba(248, 81, 73, 0.4);
      border-radius: var(--radius-sm, 3px);
      padding: 10px 12px;
      font-size: 11px;

      .error-header {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #f85149;
        font-weight: 600;
        margin-bottom: 4px;

        .err-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }

        .err-cat {
          margin-left: auto;
          font-size: 10px;
          padding: 1px 4px;
          background: rgba(248, 81, 73, 0.2);
          border-radius: 2px;
        }
      }

      .err-msg {
        color: #ff7b72;
        margin: 0 0 4px 0;
      }

      .err-hint {
        color: var(--canvas-text-secondary);
        font-size: 10px;
        margin: 0 0 6px 0;
      }

      .err-expandable-section {
        margin-top: 6px;

        .err-toggle-btn {
          background: transparent;
          border: none;
          color: var(--canvas-text-muted);
          font-size: 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0;

          &:hover {
            color: var(--canvas-text-primary);
          }

          .toggle-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
          }
        }

        .err-payload-viewer {
          margin-top: 6px;
          border: 1px solid var(--canvas-border);
          border-radius: 2px;
          overflow: hidden;

          .raw-error-text {
            margin: 0;
            padding: 8px;
            background: var(--canvas-bg);
            font-size: 10px;
            max-height: 140px;
            overflow-y: auto;
            color: #ff7b72;
          }
        }
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

      button {
        height: 28px;
        padding: 0 12px;
        border-radius: var(--radius-sm, 3px);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.1s ease;
      }

      .btn-cancel {
        background: transparent;
        border: 1px solid var(--canvas-border);
        color: var(--canvas-text-primary);

        &:hover:not(:disabled) {
          background: var(--action-hover-surface, rgba(255, 255, 255, 0.08));
          border-color: var(--canvas-text-muted);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .btn-submit {
        border: none;
        color: #ffffff;

        &.btn-primary {
          background: var(--action-primary, #238636);

          &:hover:not(:disabled) {
            background: var(--action-primary-hover, #2ea043);
          }
        }

        &.btn-danger {
          background: var(--color-danger, #da3633);

          &:hover:not(:disabled) {
            background: #f85149;
          }
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
  `]
})
export class CustomActionDialogComponent implements OnInit, OnChanges, OnDestroy {
  private readonly session = inject(ApiSessionService);
  private readonly executor = inject(ApiExecutorService);
  private readonly uiConfigService = inject(UiConfigurationService);
  private readonly router = inject(Router);

  @Input({ required: true }) action!: ResolvedCustomAction;
  @Input() record: unknown = null;
  @Input() initialParams: Record<string, string> = {};
  @Input() missingParams: ApiParameter[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() executed = new EventEmitter<ApiExecutionResult>();

  @ViewChild('dynForm') dynamicFormRef?: DynamicFormComponent;

  userParamValues = signal<Record<string, string>>({});
  dynamicFormValue = signal<Record<string, unknown>>({});
  isExecuting = signal<boolean>(false);
  executionResult = signal<ApiExecutionResult | null>(null);
  isErrorExpanded = signal<boolean>(false);

  private previouslyFocusedElement: HTMLElement | null = null;

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (!this.isExecuting()) {
      this.onClose();
    }
  }

  readonly operation = computed<ApiOperation>(() => {
    return this.action.operation;
  });

  readonly isDestructive = computed<boolean>(() => {
    return (
      this.action.danger === true ||
      this.action.style === 'danger' ||
      this.operation().method === 'DELETE'
    );
  });

  readonly hasRequestBody = computed<boolean>(() => {
    return Boolean(this.operation().requestBody);
  });

  readonly requestBodySchema = computed<ApiSchema | null>(() => {
    const rb = this.operation().requestBody;
    if (!rb) return null;
    const schema = 'schema' in rb ? (rb as ApiRequestBody).schema : (rb as ApiSchema);
    return schema ?? null;
  });

  readonly requestBodyContentType = computed<string>(() => {
    const rb = this.operation().requestBody;
    if (rb && 'contentType' in rb && rb.contentType) {
      return rb.contentType;
    }
    return 'application/json';
  });

  readonly activeMissingParams = computed<ApiParameter[]>(() => {
    return this.missingParams || [];
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
    const summaryList: KeyValueSummary[] = [];
    const priorityKeys = [
      'id',
      '_id',
      'name',
      'title',
      'code',
      'slug',
      'email',
      'username',
      'description',
      'status'
    ];

    for (const pKey of priorityKeys) {
      if (pKey in obj && obj[pKey] !== null && obj[pKey] !== undefined && typeof obj[pKey] !== 'object') {
        summaryList.push({ key: pKey, value: String(obj[pKey]) });
      }
    }

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
    const idItem = entries.find((e) =>
      ['id', '_id', 'code', 'uuid', 'slug', 'identifier'].includes(e.key.toLowerCase())
    );
    return idItem || entries[0] || null;
  });

  readonly globalFieldConfigs = computed(() => {
    return this.session.uiConfiguration()?.fields;
  });

  readonly confirmationConfig = computed<UiActionConfirmationConfig | null>(() => {
    if (typeof this.action.confirmation === 'object' && this.action.confirmation !== null) {
      return this.action.confirmation as UiActionConfirmationConfig;
    }
    return null;
  });

  readonly confirmationTitle = computed<string>(() => {
    const cfg = this.confirmationConfig();
    if (cfg?.title) return cfg.title;
    return `Executar ação "${this.action.label || this.operation().summary || this.action.id}"?`;
  });

  readonly confirmationMessage = computed<string>(() => {
    const cfg = this.confirmationConfig();
    if (cfg?.message) return cfg.message;
    return this.isDestructive()
      ? 'Esta ação executará uma operação destrutiva e alterará os dados no servidor.'
      : 'Confirme os parâmetros e prossiga com a execução da operação na API.';
  });

  readonly confirmButtonLabel = computed<string>(() => {
    const cfg = this.confirmationConfig();
    if (cfg?.confirmText) return cfg.confirmText;
    return this.action.label || 'Confirmar';
  });

  readonly cancelButtonLabel = computed<string>(() => {
    const cfg = this.confirmationConfig();
    return cfg?.cancelText || 'Cancelar';
  });

  readonly initialFormValue = computed<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};

    // 1. If row record is object, pre-populate matching properties
    if (this.record && typeof this.record === 'object' && !Array.isArray(this.record)) {
      const rec = this.record as Record<string, unknown>;
      const schema = this.requestBodySchema();
      if (schema?.properties) {
        for (const prop of Object.keys(schema.properties)) {
          if (prop in rec && rec[prop] !== undefined) {
            initial[prop] = rec[prop];
          }
        }
      }
    }

    // 2. Field mappings from descriptor
    if (this.action.descriptor?.fieldMapping && this.record && typeof this.record === 'object') {
      const rec = this.record as Record<string, unknown>;
      for (const [bodyField, recordField] of Object.entries(this.action.descriptor.fieldMapping)) {
        if (recordField in rec && rec[recordField] !== undefined) {
          initial[bodyField] = rec[recordField];
        }
      }
    }

    // 3. Explicit initialValues from descriptor or action override
    const explicit = this.action.initialValues || this.action.descriptor?.initialValues;
    if (explicit) {
      Object.assign(initial, explicit);
    }

    return initial;
  });

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      this.previouslyFocusedElement = document.activeElement as HTMLElement | null;
    }
    this.userParamValues.set({ ...this.initialParams });
    this.dynamicFormValue.set({ ...this.initialFormValue() });
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialParams']) {
      this.userParamValues.set({ ...this.initialParams });
    }
  }

  onParamChange(name: string, value: string): void {
    this.userParamValues.update((curr) => ({
      ...curr,
      [name]: value
    }));
  }

  onDynamicFormChange(val: Record<string, unknown>): void {
    this.dynamicFormValue.set(val);
  }

  areAllRequiredParamsProvided(): boolean {
    const values = this.userParamValues();
    const pathParams = this.operation().parameters.filter((p) => p.location === 'path');
    return pathParams.every((p) => {
      const val = values[p.name];
      return val !== undefined && String(val).trim().length > 0;
    });
  }

  executeAction(): void {
    const op = this.operation();
    if (!op) return;

    // Validate form if dynamic form is rendered
    if (this.hasRequestBody() && this.dynamicFormRef) {
      if (this.dynamicFormRef.form && this.dynamicFormRef.form.invalid) {
        this.dynamicFormRef.form.markAllAsTouched();
        return;
      }
    }

    const baseUrl = this.session.baseUrl();
    this.isExecuting.set(true);
    this.executionResult.set(null);

    const input: ApiRequestInput = {
      path: this.userParamValues()
    };

    if (this.hasRequestBody()) {
      const formPayload = this.dynamicFormRef?.getPayload() ?? this.dynamicFormValue();
      input.body = formPayload;
    }

    this.executor.execute(baseUrl, op, input).subscribe({
      next: (result: ApiExecutionResult) => {
        this.isExecuting.set(false);
        this.executionResult.set(result);

        if (result.isSuccess) {
          this.executed.emit(result);
          this.onClose();
        }
      },
      error: (err: unknown) => {
        this.isExecuting.set(false);
        const errorObj = err && typeof err === 'object' ? (err as Record<string, unknown>) : null;
        const status = typeof errorObj?.['status'] === 'number' ? errorObj['status'] : 0;
        const statusText =
          typeof errorObj?.['statusText'] === 'string' ? errorObj['statusText'] : 'Erro na Execução';
        const errorMsg =
          err instanceof Error
            ? err.message
            : typeof errorObj?.['message'] === 'string'
              ? errorObj['message']
              : 'Falha na execução da requisição';

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
        this.onClose();
      }
    }
  }

  onOpenFullOperation(): void {
    const targetId = this.operation().operationId || this.operation().id;
    this.router.navigate(['/operation', targetId]);
    this.onClose();
  }

  getErrorMessage(): string {
    const res = this.executionResult();
    if (res?.error?.message) {
      return res.error.message;
    }
    if (res?.statusText) {
      return `O servidor retornou erro: ${res.statusText}`;
    }
    return 'Ocorreu um erro inesperado ao processar a requisição.';
  }

  hasErrorPayload(): boolean {
    const res = this.executionResult();
    if (!res) return false;
    const payload = res.data ?? res.error?.details;
    if (payload === null || payload === undefined) return false;
    if (typeof payload === 'string' && payload.trim().length === 0) return false;
    if (typeof payload === 'object' && Object.keys(payload).length === 0) return false;
    return true;
  }

  getErrorPayload(): unknown {
    const res = this.executionResult();
    return res?.data ?? res?.error?.details;
  }

  isPayloadObject(payload: unknown): boolean {
    return typeof payload === 'object' && payload !== null;
  }

  toggleErrorExpanded(): void {
    this.isErrorExpanded.update((v) => !v);
  }
}
