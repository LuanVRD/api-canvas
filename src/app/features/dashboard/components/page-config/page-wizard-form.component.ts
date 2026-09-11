import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PageDraftService } from '../../services/page-draft.service';
import {
  UiActionInputMode,
  UiActionStyle,
  UiColumnConfiguration,
  UiCustomActionDescriptor,
  UiMetricConfiguration,
  UiPageConfiguration
} from '../../../../core/models/ui-configuration.model';
import { ApiResource } from '../../../../core/models/api-resource.model';
import { ApiSchema } from '../../../../core/models/api-schema.model';
import { ApiOperation } from '../../../../core/models/api-operation.model';
import { ApiParameter } from '../../../../core/models/api-parameter.model';
import { ResourceOperationMatcherService } from '../../../../core/services/resource-operation-matcher.service';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export const AVAILABLE_PAGE_ICONS = [
  'table_chart',
  'receipt_long',
  'inventory_2',
  'people',
  'payments',
  'shopping_cart',
  'assessment',
  'local_shipping',
  'storefront',
  'account_balance',
  'category',
  'article',
  'task_alt',
  'view_list',
  'widgets',
  'layers'
];

export const ACTION_STYLE_OPTIONS: Array<{ value: UiActionStyle; label: string; color: string }> = [
  { value: 'default', label: 'Padrão (Neutro)', color: '#8b949e' },
  { value: 'primary', label: 'Primário (Azul)', color: '#58a6ff' },
  { value: 'success', label: 'Sucesso (Verde)', color: '#3fb950' },
  { value: 'warning', label: 'Atenção (Amarelo)', color: '#d29922' },
  { value: 'danger', label: 'Destrutivo (Vermelho)', color: '#f85149' },
  { value: 'info', label: 'Informativo (Ciano)', color: '#39c5cf' }
];

export const ACTION_ICON_OPTIONS = [
  'bolt',
  'edit_note',
  'cancel',
  'check_circle',
  'send',
  'refresh',
  'published_with_changes',
  'block',
  'done',
  'flag',
  'play_arrow',
  'archive',
  'lock_open',
  'local_shipping'
];

export interface SchemaPropertyOption {
  key: string;
  type: string;
  label: string;
  description?: string;
  schema?: ApiSchema;
}

@Component({
  selector: 'app-page-wizard-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="wizard-container">
      <!-- Wizard Stepper Navigation Header -->
      <nav class="stepper-nav" aria-label="Etapas de configuração da página">
        <button
          type="button"
          class="step-tab"
          [class.active]="currentStep() === 1"
          (click)="goToStep(1)"
          aria-label="Etapa 1: Dados Gerais e Recurso"
        >
          <span class="step-badge">1</span>
          <span class="step-label">Geral & Recurso</span>
        </button>

        <div class="step-divider"></div>

        <button
          type="button"
          class="step-tab"
          [class.active]="currentStep() === 2"
          (click)="goToStep(2)"
          aria-label="Etapa 2: Endpoints e CRUD"
        >
          <span class="step-badge">2</span>
          <span class="step-label">Endpoints & CRUD</span>
        </button>

        <div class="step-divider"></div>

        <button
          type="button"
          class="step-tab"
          [class.active]="currentStep() === 3"
          (click)="goToStep(3)"
          aria-label="Etapa 3: Métricas operacionais"
        >
          <span class="step-badge">3</span>
          <span class="step-label">Métricas (KPIs)</span>
        </button>

        <div class="step-divider"></div>

        <button
          type="button"
          class="step-tab"
          [class.active]="currentStep() === 4"
          (click)="goToStep(4)"
          aria-label="Etapa 4: Tabela e Colunas"
        >
          <span class="step-badge">4</span>
          <span class="step-label">Tabela & Colunas</span>
        </button>

        <div class="step-divider"></div>

        <button
          type="button"
          class="step-tab"
          [class.active]="currentStep() === 5"
          (click)="goToStep(5)"
          aria-label="Etapa 5: Filtros e Ações"
        >
          <span class="step-badge">5</span>
          <span class="step-label">Filtros & Ações</span>
        </button>
      </nav>

      <!-- Main Form Container -->
      <form [formGroup]="form" class="wizard-form-body">
        <!-- ==================== ETAPA 1: GERAL & RECURSO ==================== -->
        @if (currentStep() === 1) {
          <section class="step-section" aria-label="Configurações gerais e recurso">
            <!-- Navigation Item Preview -->
            <div class="nav-preview-card" aria-label="Prévia visual do item na barra lateral">
              <div class="nav-preview-header">
                <span class="preview-title-badge">Prévia da Barra Lateral</span>
                <span class="preview-subtitle">Como esta página será exibida na navegação do Dashboard</span>
              </div>
              <div class="nav-preview-row" [class.is-hidden-item]="form.get('hidden')?.value">
                <div class="preview-icon-box">
                  <mat-icon>{{ form.get('icon')?.value || 'table_chart' }}</mat-icon>
                </div>
                <div class="preview-info-col">
                  <div class="preview-title-line">
                    <span class="preview-page-title">{{ form.get('title')?.value || 'Página sem título' }}</span>
                    @if (form.get('isDefault')?.value) {
                      <span class="preview-badge badge-default" title="Página inicial ao abrir o Dashboard">Inicial</span>
                    }
                    @if (form.get('hidden')?.value) {
                      <span class="preview-badge badge-hidden" title="Esta página não será exibida na lista do menu lateral">Oculta</span>
                    }
                  </div>
                  <div class="preview-route-line font-mono">
                    <span class="preview-route-path">/dashboard/{{ form.get('slug')?.value || '...' }}</span>
                  </div>
                </div>
                <div class="preview-order-pill" title="Posição na ordem da barra lateral">
                  <span>Posição #{{ form.get('order')?.value || 1 }}</span>
                </div>
              </div>
            </div>

            <div class="section-lead">
              <h5 class="lead-title">Identificação da Página e Vínculo OpenAPI</h5>
              <p class="lead-desc">Defina o recurso da API que alimentará os dados desta página e configure sua rota e identidade visual.</p>
            </div>

            <div class="form-grid">
              <!-- Linked Resource -->
              <div class="form-field">
                <label for="field-resource" class="field-label">
                  Recurso da API <span class="required">*</span>
                </label>
                <select
                  id="field-resource"
                  formControlName="resourceId"
                  class="form-control"
                  (change)="onResourceChanged()"
                >
                  <option value="" disabled>Selecione um recurso...</option>
                  @for (res of availableResources(); track res.id) {
                    <option [value]="res.id">{{ res.label || res.name }} ({{ res.operations.length }} operações)</option>
                  }
                </select>
                <span class="field-hint">Recurso OpenAPI que fornecerá as operações de listagem e CRUD.</span>
              </div>

              <!-- Page Title -->
              <div class="form-field">
                <label for="field-title" class="field-label">
                  Título da Página <span class="required">*</span>
                </label>
                <input
                  id="field-title"
                  type="text"
                  formControlName="title"
                  class="form-control"
                  placeholder="Ex: Pedidos, Clientes, Produtos"
                  (input)="onTitleInput()"
                />
                @if (form.get('title')?.touched && form.get('title')?.errors?.['required']) {
                  <span class="field-error">O título da página é obrigatório.</span>
                }
              </div>

              <!-- Page Slug -->
              <div class="form-field">
                <div class="field-header-row">
                  <label for="field-slug" class="field-label">
                    Slug da URL <span class="required">*</span>
                  </label>
                  <button type="button" class="btn-text-action" (click)="autoGenerateSlug()">
                    Auto-gerar do título
                  </button>
                </div>
                <div class="slug-input-wrapper">
                  <span class="slug-prefix font-mono">/dashboard/</span>
                  <input
                    id="field-slug"
                    type="text"
                    formControlName="slug"
                    class="form-control font-mono"
                    placeholder="pedidos"
                    (input)="onSlugInput()"
                  />
                </div>
                @if (form.get('slug')?.touched && form.get('slug')?.errors?.['required']) {
                  <span class="field-error">O slug é obrigatório.</span>
                } @else if (form.get('slug')?.touched && form.get('slug')?.errors?.['pattern']) {
                  <span class="field-error">Use apenas letras minúsculas, números e hífens (ex: meus-pedidos).</span>
                } @else if (form.get('slug')?.errors?.['slugConflict']) {
                  <span class="field-error">
                    Este slug já está em uso pela página "{{ form.get('slug')?.errors?.['slugConflict']?.conflictingTitle }}".
                  </span>
                }
              </div>

              <!-- Sidebar Position (Order) -->
              <div class="form-field">
                <label for="field-order" class="field-label">
                  Posição na Barra Lateral
                </label>
                <select
                  id="field-order"
                  formControlName="order"
                  class="form-control"
                  (change)="onOrderChanged()"
                >
                  @for (pos of availablePositions(); track pos) {
                    <option [value]="pos">{{ pos }}ª posição {{ pos === 1 ? '(Topo)' : '' }}</option>
                  }
                </select>
                <span class="field-hint">Posição de ordenação do item no menu lateral do Dashboard.</span>
              </div>

              <!-- Icon Selector -->
              <div class="form-field full-width">
                <label class="field-label">Ícone da Barra Lateral</label>
                <div class="icon-selector-grid">
                  @for (icon of availableIcons; track icon) {
                    <button
                      type="button"
                      class="icon-choice-btn"
                      [class.selected]="form.get('icon')?.value === icon"
                      (click)="form.get('icon')?.setValue(icon); markDirty()"
                      [attr.aria-label]="'Selecionar ícone ' + icon"
                    >
                      <mat-icon>{{ icon }}</mat-icon>
                    </button>
                  }
                </div>
              </div>

              <!-- Description -->
              <div class="form-field full-width">
                <label for="field-description" class="field-label">Descrição da Página</label>
                <textarea
                  id="field-description"
                  formControlName="description"
                  class="form-control"
                  rows="2"
                  placeholder="Breve descrição dos dados ou contexto desta página..."
                  (input)="markDirty()"
                ></textarea>
              </div>

              <!-- Boolean Flags -->
              <div class="form-field full-width">
                <div class="flags-row">
                  <label class="checkbox-label">
                    <input type="checkbox" formControlName="isDefault" (change)="markDirty()" />
                    <span>Definir como página padrão inicial do Dashboard</span>
                  </label>

                  <label class="checkbox-label">
                    <input type="checkbox" formControlName="hidden" (change)="markDirty()" />
                    <span>Ocultar item na barra lateral (acessível apenas por link direto)</span>
                  </label>
                </div>
              </div>
            </div>
          </section>
        }

        <!-- ==================== ETAPA 2: ENDPOINTS & CRUD ==================== -->
        @if (currentStep() === 2) {
          <section class="step-section" aria-label="Mapeamento de endpoints e operações CRUD">
            <div class="section-lead">
              <h5 class="lead-title">Vínculo de Operações OpenAPI (CRUD)</h5>
              <p class="lead-desc">
                Selecione quais endpoints fornecem os dados e executam as ações desta página. O resolvedor automático sugere a melhor opção, identificada visualmente pelo selo <span class="badge-inline-suggested">Sugerido</span>.
              </p>
            </div>

            <div class="operations-grid">
              <!-- 1. List Operation (GET) -->
              <div class="operation-card" [class.has-selection]="form.get('operationList')?.value">
                <div class="operation-card-header">
                  <div class="role-meta">
                    <span class="method-badge method-get">GET</span>
                    <strong class="role-title">Listagem Principal</strong>
                  </div>
                  @if (isSuggested('list', form.get('operationList')?.value)) {
                    <span class="badge-suggested" title="Operação inferida automaticamente pelo resolvedor OpenAPI">
                      <mat-icon class="badge-icon">auto_awesome</mat-icon> Sugerido
                    </span>
                  }
                </div>

                <div class="operation-card-body">
                  <select
                    formControlName="operationList"
                    class="form-control op-select font-mono"
                    (change)="onOperationChanged('list')"
                  >
                    <option value="">Nenhuma (Sem carregamento automático)</option>
                    @for (op of compatibleListOperations(); track op.id) {
                      <option [value]="op.operationId || op.id">
                        [{{ op.method }}] {{ op.path }} {{ op.summary ? '— ' + op.summary : '' }}
                      </option>
                    }
                  </select>

                  @if (getOperationDetails(form.get('operationList')?.value); as op) {
                    <div class="op-meta-panel">
                      <div class="op-meta-row">
                        <span class="op-path font-mono">{{ op.path }}</span>
                        <button
                          type="button"
                          class="btn-inspect-explorer"
                          (click)="openInExplorer(op.operationId || op.id, $event)"
                          title="Inspecionar operação no API Explorer"
                        >
                          <mat-icon>open_in_new</mat-icon>
                          <span>API Explorer</span>
                        </button>
                      </div>
                      <div class="op-summary-text">{{ op.summary || op.description || 'Sem resumo fornecido' }}</div>
                      @if (op.parameters && op.parameters.length > 0) {
                        <div class="op-params-list">
                          <span class="params-label">Parâmetros:</span>
                          @for (param of op.parameters; track param.name) {
                            <span class="param-pill font-mono" [class.required]="param.required">
                              {{ param.name }} <small>({{ param.location }})</small>
                            </span>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- 2. Create Operation (POST) -->
              <div class="operation-card" [class.has-selection]="form.get('operationCreate')?.value">
                <div class="operation-card-header">
                  <div class="role-meta">
                    <span class="method-badge method-post">POST</span>
                    <strong class="role-title">Criação de Registro</strong>
                  </div>
                  @if (isSuggested('create', form.get('operationCreate')?.value)) {
                    <span class="badge-suggested" title="Operação inferida automaticamente pelo resolvedor OpenAPI">
                      <mat-icon class="badge-icon">auto_awesome</mat-icon> Sugerido
                    </span>
                  }
                </div>

                <div class="operation-card-body">
                  <select
                    formControlName="operationCreate"
                    class="form-control op-select font-mono"
                    (change)="onOperationChanged('create')"
                  >
                    <option value="">Nenhuma (Desabilitar criação)</option>
                    @for (op of compatibleCreateOperations(); track op.id) {
                      <option [value]="op.operationId || op.id">
                        [{{ op.method }}] {{ op.path }} {{ op.summary ? '— ' + op.summary : '' }}
                      </option>
                    }
                  </select>

                  @if (getOperationDetails(form.get('operationCreate')?.value); as op) {
                    <div class="op-meta-panel">
                      <div class="op-meta-row">
                        <span class="op-path font-mono">{{ op.path }}</span>
                        <button
                          type="button"
                          class="btn-inspect-explorer"
                          (click)="openInExplorer(op.operationId || op.id, $event)"
                          title="Inspecionar operação no API Explorer"
                        >
                          <mat-icon>open_in_new</mat-icon>
                          <span>API Explorer</span>
                        </button>
                      </div>
                      <div class="op-summary-text">{{ op.summary || op.description || 'Sem resumo fornecido' }}</div>
                      @if (op.parameters && op.parameters.length > 0) {
                        <div class="op-params-list">
                          <span class="params-label">Parâmetros:</span>
                          @for (param of op.parameters; track param.name) {
                            <span class="param-pill font-mono" [class.required]="param.required">
                              {{ param.name }} <small>({{ param.location }})</small>
                            </span>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- 3. Details Operation (GET with ID) -->
              <div class="operation-card" [class.has-selection]="form.get('operationDetails')?.value">
                <div class="operation-card-header">
                  <div class="role-meta">
                    <span class="method-badge method-get">GET</span>
                    <strong class="role-title">Visualização de Detalhes</strong>
                  </div>
                  @if (isSuggested('details', form.get('operationDetails')?.value)) {
                    <span class="badge-suggested" title="Operação inferida automaticamente pelo resolvedor OpenAPI">
                      <mat-icon class="badge-icon">auto_awesome</mat-icon> Sugerido
                    </span>
                  }
                </div>

                <div class="operation-card-body">
                  <select
                    formControlName="operationDetails"
                    class="form-control op-select font-mono"
                    (change)="onOperationChanged('details')"
                  >
                    <option value="">Nenhuma (Exibir apenas dados locais da linha)</option>
                    @for (op of compatibleDetailsOperations(); track op.id) {
                      <option [value]="op.operationId || op.id">
                        [{{ op.method }}] {{ op.path }} {{ op.summary ? '— ' + op.summary : '' }}
                      </option>
                    }
                  </select>

                  @if (getOperationDetails(form.get('operationDetails')?.value); as op) {
                    <div class="op-meta-panel">
                      <div class="op-meta-row">
                        <span class="op-path font-mono">{{ op.path }}</span>
                        <button
                          type="button"
                          class="btn-inspect-explorer"
                          (click)="openInExplorer(op.operationId || op.id, $event)"
                          title="Inspecionar operação no API Explorer"
                        >
                          <mat-icon>open_in_new</mat-icon>
                          <span>API Explorer</span>
                        </button>
                      </div>
                      <div class="op-summary-text">{{ op.summary || op.description || 'Sem resumo fornecido' }}</div>
                      @if (checkParamInference(op); as check) {
                        @if (!check.canInfer) {
                          <div class="param-warning-box">
                            <mat-icon class="warn-icon">warning_amber</mat-icon>
                            <span class="warn-text">
                              Aviso: Parâmetro(s) <strong>{{ formatMissingParams(check.missingParams) }}</strong> não foram encontrados nas colunas e podem requerer mapeamento.
                            </span>
                          </div>
                        }
                      }
                      @if (op.parameters && op.parameters.length > 0) {
                        <div class="op-params-list">
                          <span class="params-label">Parâmetros:</span>
                          @for (param of op.parameters; track param.name) {
                            <span class="param-pill font-mono" [class.required]="param.required">
                              {{ param.name }} <small>({{ param.location }})</small>
                            </span>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- 4. Update Operation (PUT / PATCH) -->
              <div class="operation-card" [class.has-selection]="form.get('operationUpdate')?.value">
                <div class="operation-card-header">
                  <div class="role-meta">
                    <span class="method-badge method-put">PUT/PATCH</span>
                    <strong class="role-title">Atualização de Registro</strong>
                  </div>
                  @if (isSuggested('update', form.get('operationUpdate')?.value)) {
                    <span class="badge-suggested" title="Operação inferida automaticamente pelo resolvedor OpenAPI">
                      <mat-icon class="badge-icon">auto_awesome</mat-icon> Sugerido
                    </span>
                  }
                </div>

                <div class="operation-card-body">
                  <select
                    formControlName="operationUpdate"
                    class="form-control op-select font-mono"
                    (change)="onOperationChanged('update')"
                  >
                    <option value="">Nenhuma (Desabilitar edição padrão)</option>
                    @for (op of compatibleUpdateOperations(); track op.id) {
                      <option [value]="op.operationId || op.id">
                        [{{ op.method }}] {{ op.path }} {{ op.summary ? '— ' + op.summary : '' }}
                      </option>
                    }
                  </select>

                  @if (getOperationDetails(form.get('operationUpdate')?.value); as op) {
                    <div class="op-meta-panel">
                      <div class="op-meta-row">
                        <span class="op-path font-mono">{{ op.path }}</span>
                        <button
                          type="button"
                          class="btn-inspect-explorer"
                          (click)="openInExplorer(op.operationId || op.id, $event)"
                          title="Inspecionar operação no API Explorer"
                        >
                          <mat-icon>open_in_new</mat-icon>
                          <span>API Explorer</span>
                        </button>
                      </div>
                      <div class="op-summary-text">{{ op.summary || op.description || 'Sem resumo fornecido' }}</div>
                      @if (checkParamInference(op); as check) {
                        @if (!check.canInfer) {
                          <div class="param-warning-box">
                            <mat-icon class="warn-icon">warning_amber</mat-icon>
                            <span class="warn-text">
                              Aviso: Parâmetro(s) <strong>{{ formatMissingParams(check.missingParams) }}</strong> podem não ser inferidos a partir da linha.
                            </span>
                          </div>
                        }
                      }
                      @if (op.parameters && op.parameters.length > 0) {
                        <div class="op-params-list">
                          <span class="params-label">Parâmetros:</span>
                          @for (param of op.parameters; track param.name) {
                            <span class="param-pill font-mono" [class.required]="param.required">
                              {{ param.name }} <small>({{ param.location }})</small>
                            </span>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- 5. Delete Operation (DELETE) -->
              <div class="operation-card" [class.has-selection]="form.get('operationDelete')?.value">
                <div class="operation-card-header">
                  <div class="role-meta">
                    <span class="method-badge method-delete">DELETE</span>
                    <strong class="role-title">Exclusão de Registro</strong>
                  </div>
                  @if (isSuggested('delete', form.get('operationDelete')?.value)) {
                    <span class="badge-suggested" title="Operação inferida automaticamente pelo resolvedor OpenAPI">
                      <mat-icon class="badge-icon">auto_awesome</mat-icon> Sugerido
                    </span>
                  }
                </div>

                <div class="operation-card-body">
                  <select
                    formControlName="operationDelete"
                    class="form-control op-select font-mono"
                    (change)="onOperationChanged('delete')"
                  >
                    <option value="">Nenhuma (Desabilitar exclusão)</option>
                    @for (op of compatibleDeleteOperations(); track op.id) {
                      <option [value]="op.operationId || op.id">
                        [{{ op.method }}] {{ op.path }} {{ op.summary ? '— ' + op.summary : '' }}
                      </option>
                    }
                  </select>

                  @if (getOperationDetails(form.get('operationDelete')?.value); as op) {
                    <div class="op-meta-panel">
                      <div class="op-meta-row">
                        <span class="op-path font-mono">{{ op.path }}</span>
                        <button
                          type="button"
                          class="btn-inspect-explorer"
                          (click)="openInExplorer(op.operationId || op.id, $event)"
                          title="Inspecionar operação no API Explorer"
                        >
                          <mat-icon>open_in_new</mat-icon>
                          <span>API Explorer</span>
                        </button>
                      </div>
                      <div class="op-summary-text">{{ op.summary || op.description || 'Sem resumo fornecido' }}</div>
                      @if (checkParamInference(op); as check) {
                        @if (!check.canInfer) {
                          <div class="param-warning-box">
                            <mat-icon class="warn-icon">warning_amber</mat-icon>
                            <span class="warn-text">
                              Aviso: Parâmetro(s) <strong>{{ formatMissingParams(check.missingParams) }}</strong> podem requerer atenção.
                            </span>
                          </div>
                        }
                      }
                      @if (op.parameters && op.parameters.length > 0) {
                        <div class="op-params-list">
                          <span class="params-label">Parâmetros:</span>
                          @for (param of op.parameters; track param.name) {
                            <span class="param-pill font-mono" [class.required]="param.required">
                              {{ param.name }} <small>({{ param.location }})</small>
                            </span>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>
          </section>
        }

        <!-- ==================== ETAPA 3: MÉTRICAS (KPIS) ==================== -->
        @if (currentStep() === 3) {
          <section class="step-section" aria-label="Configuração de métricas operacionais">
            <div class="section-lead-row">
              <div class="section-lead">
                <h5 class="lead-title">Cards de Métricas e Indicadores Operacionais</h5>
                <p class="lead-desc">Configure até 6 cartões de KPIs calculados com base nos dados do recurso carregado.</p>
              </div>
              <button
                type="button"
                class="btn-secondary-sm"
                (click)="addMetric()"
                [disabled]="metricsArray.length >= 6"
              >
                <mat-icon>add</mat-icon>
                <span>Adicionar Métrica</span>
              </button>
            </div>

            @if (metricsArray.length === 0) {
              <div class="empty-placeholder">
                <mat-icon class="empty-icon">assessment</mat-icon>
                <span>Nenhuma métrica configurada para esta página.</span>
                <button type="button" class="btn-text-action" (click)="addMetric()">
                  + Adicionar primeiro card de indicador
                </button>
              </div>
            } @else {
              <div class="metrics-editor-list" formArrayName="metrics">
                @for (mCtrl of metricsArray.controls; track mCtrl; let i = $index) {
                  <div class="metric-editor-card" [formGroupName]="i">
                    <div class="metric-card-header">
                      <div class="metric-header-left">
                        <span class="metric-num font-mono">#{{ i + 1 }}</span>
                        <mat-icon class="metric-card-icon">{{ mCtrl.get('icon')?.value || 'tag' }}</mat-icon>
                        <strong class="metric-title-display">{{ mCtrl.get('label')?.value || 'Métrica sem nome' }}</strong>
                      </div>
                      <div class="metric-header-actions">
                        <button
                          type="button"
                          class="btn-icon-sm"
                          [disabled]="i === 0"
                          (click)="moveMetric(i, 'up')"
                          title="Mover para cima"
                        >
                          <mat-icon>arrow_upward</mat-icon>
                        </button>
                        <button
                          type="button"
                          class="btn-icon-sm"
                          [disabled]="i === metricsArray.length - 1"
                          (click)="moveMetric(i, 'down')"
                          title="Mover para baixo"
                        >
                          <mat-icon>arrow_downward</mat-icon>
                        </button>
                        <button
                          type="button"
                          class="btn-icon-sm btn-danger"
                          (click)="removeMetric(i)"
                          title="Remover métrica"
                        >
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    </div>

                    <div class="metric-fields-grid">
                      <!-- Label -->
                      <div class="form-field">
                        <label class="field-label">Rótulo / Título <span class="required">*</span></label>
                        <input type="text" formControlName="label" class="form-control" placeholder="Ex: Total de Pedidos" (input)="markDirty()" />
                      </div>

                      <!-- Aggregation Type -->
                      <div class="form-field">
                        <label class="field-label">Tipo de Cálculo</label>
                        <select formControlName="type" class="form-control" (change)="markDirty()">
                          <option value="count_all">Contagem Total (count_all)</option>
                          <option value="count_matching">Contagem Condicional (count_matching)</option>
                          <option value="sum_field">Soma de Campo (sum_field)</option>
                        </select>
                      </div>

                      <!-- Target Field -->
                      <div class="form-field">
                        <label class="field-label">Campo Alvo</label>
                        <select formControlName="field" class="form-control font-mono" (change)="markDirty()">
                          <option value="">Nenhum (usa contagem geral)</option>
                          @for (prop of availablePropertyKeys(); track prop) {
                            <option [value]="prop">{{ prop }}</option>
                          }
                        </select>
                      </div>

                      <!-- Matching Value (if conditional) -->
                      @if (mCtrl.get('type')?.value === 'count_matching') {
                        <div class="form-field">
                          <label class="field-label">Valor Esperado</label>
                          <input type="text" formControlName="matchingValue" class="form-control" placeholder="Ex: pending, true, 1" (input)="markDirty()" />
                        </div>
                      }

                      <!-- Color Scheme -->
                      <div class="form-field">
                        <label class="field-label">Cor do Card</label>
                        <select formControlName="colorScheme" class="form-control" (change)="markDirty()">
                          <option value="default">Padrão (Cinza)</option>
                          <option value="primary">Primário (Azul)</option>
                          <option value="warning">Alerta (Amarelo)</option>
                          <option value="success">Sucesso (Verde)</option>
                          <option value="danger">Crítico (Vermelho)</option>
                          <option value="info">Informativo (Ciano)</option>
                        </select>
                      </div>

                      <!-- Format -->
                      <div class="form-field">
                        <label class="field-label">Formato</label>
                        <select formControlName="format" class="form-control" (change)="markDirty()">
                          <option value="number">Numérico (1.234)</option>
                          <option value="currency">Moeda (R$ 1.234,00)</option>
                          <option value="percent">Percentual (12%)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </section>
        }

        <!-- ==================== ETAPA 4: TABELA & COLUNAS ==================== -->
        @if (currentStep() === 4) {
          <section class="step-section" aria-label="Configuração da tabela e colunas">
            <div class="section-lead-row">
              <div class="section-lead">
                <h5 class="lead-title">Estrutura de Colunas da Tabela</h5>
                <p class="lead-desc">Configure a visibilidade, rótulos, tipos de renderização e ordem das colunas da listagem.</p>
              </div>
              <div class="section-header-actions">
                <button
                  type="button"
                  class="btn-text-action"
                  (click)="restoreSchemaColumns()"
                  title="Restaurar colunas a partir do schema OpenAPI"
                >
                  <mat-icon>sync</mat-icon>
                  <span>Auto-gerar do Schema</span>
                </button>
                <button type="button" class="btn-secondary-sm" (click)="addColumn()">
                  <mat-icon>add</mat-icon>
                  <span>Nova Coluna</span>
                </button>
              </div>
            </div>

            <!-- Add Schema Property Chips -->
            @if (unaddedSchemaProperties().length > 0) {
              <div class="unadded-props-box">
                <span class="unadded-label">Campos disponíveis no schema:</span>
                <div class="props-chips-wrapper">
                  @for (prop of unaddedSchemaProperties(); track prop.key) {
                    <button
                      type="button"
                      class="prop-chip"
                      (click)="addSchemaPropertyAsColumn(prop)"
                      [title]="'Adicionar coluna ' + prop.key + ' (' + prop.type + ')'"
                    >
                      <mat-icon class="chip-add-icon">add</mat-icon>
                      <span class="font-mono">{{ prop.key }}</span>
                    </button>
                  }
                </div>
              </div>
            }

            <div class="columns-table-container">
              <table class="columns-editor-table" formArrayName="columns">
                <thead>
                  <tr>
                    <th class="col-th-reorder">#</th>
                    <th>Campo no Registro (Key)</th>
                    <th>Rótulo da Coluna</th>
                    <th>Tipo de Exibição</th>
                    <th>Ordenável</th>
                    <th class="col-th-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (cCtrl of columnsArray.controls; track cCtrl; let i = $index) {
                    <tr [formGroupName]="i">
                      <td class="col-td-reorder font-mono text-muted">{{ i + 1 }}</td>
                      <td>
                        <input
                          type="text"
                          formControlName="field"
                          class="table-input font-mono"
                          placeholder="nome_do_campo"
                          (input)="onColumnFieldInput(i)"
                          (change)="onColumnFieldChanged(i)"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          formControlName="label"
                          class="table-input"
                          placeholder="Nome da Coluna"
                          (input)="markDirty()"
                        />
                      </td>
                      <td>
                        <select formControlName="type" class="table-select" (change)="markDirty()">
                          <option value="text">Texto</option>
                          <option value="number">Número</option>
                          <option value="currency">Moeda (R$)</option>
                          <option value="date">Data (DD/MM/AAAA)</option>
                          <option value="datetime">Data e Hora</option>
                          <option value="boolean">Booleano (Sim/Não)</option>
                          <option value="status_badge">Badge de Status</option>
                          <option value="monospace">Código / ID (Mono)</option>
                        </select>
                      </td>
                      <td class="text-center">
                        <input type="checkbox" formControlName="sortable" (change)="markDirty()" />
                      </td>
                      <td class="col-td-actions">
                        <div class="table-row-actions">
                          <button
                            type="button"
                            class="btn-icon-sm"
                            [disabled]="i === 0"
                            (click)="moveColumn(i, 'up')"
                            title="Mover para cima"
                          >
                            <mat-icon>arrow_upward</mat-icon>
                          </button>
                          <button
                            type="button"
                            class="btn-icon-sm"
                            [disabled]="i === columnsArray.length - 1"
                            (click)="moveColumn(i, 'down')"
                            title="Mover para baixo"
                          >
                            <mat-icon>arrow_downward</mat-icon>
                          </button>
                          <button
                            type="button"
                            class="btn-icon-sm btn-danger"
                            (click)="removeColumn(i)"
                            title="Remover coluna"
                          >
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Page Size -->
            <div class="form-grid" style="margin-top: 16px;">
              <div class="form-field">
                <label class="field-label">Itens por Página Padrão</label>
                <select formControlName="pageSize" class="form-control" (change)="markDirty()">
                  <option [value]="5">5 registros</option>
                  <option [value]="10">10 registros</option>
                  <option [value]="25">25 registros</option>
                  <option [value]="50">50 registros</option>
                  <option [value]="100">100 registros</option>
                </select>
              </div>
            </div>
          </section>
        }

        <!-- ==================== ETAPA 5: FILTROS & AÇÕES ==================== -->
        @if (currentStep() === 5) {
          <section class="step-section" aria-label="Configuração de filtros e ações">
            <div class="section-lead">
              <h5 class="lead-title">Filtros Rápidos e Ações Operacionais</h5>
              <p class="lead-desc">Configure os controles de busca, filtros rápidos, ações padrão e ações customizadas da linha.</p>
            </div>

            <div class="form-grid">
              <!-- Search Fields -->
              <div class="form-field full-width">
                <label class="field-label">Campos Incluídos na Busca Textual</label>
                <div class="search-fields-pills">
                  @for (col of getAvailableColumnNames(); track col) {
                    <label class="pill-checkbox" [class.checked]="isSearchFieldSelected(col)">
                      <input
                        type="checkbox"
                        [checked]="isSearchFieldSelected(col)"
                        (change)="toggleSearchField(col)"
                      />
                      <span class="font-mono">{{ col }}</span>
                    </label>
                  }
                </div>
                <span class="field-hint">A busca local avaliará os campos selecionados quando o usuário digitar na barra de pesquisa.</span>
              </div>

              <!-- Search Placeholder -->
              <div class="form-field">
                <label class="field-label">Placeholder da Busca</label>
                <input
                  type="text"
                  formControlName="searchPlaceholder"
                  class="form-control"
                  placeholder="Buscar registros..."
                  (input)="markDirty()"
                />
              </div>

              <!-- Status Filter Field -->
              <div class="form-field">
                <label class="field-label">Campo do Filtro Rápido de Status</label>
                <select formControlName="statusField" class="form-control font-mono" (change)="markDirty()">
                  <option value="">Nenhum filtro de status</option>
                  @for (prop of availablePropertyKeys(); track prop) {
                    <option [value]="prop">{{ prop }}</option>
                  }
                </select>
              </div>

              <!-- Primary Action Label -->
              <div class="form-field">
                <label class="field-label">Rótulo do Botão de Inserção</label>
                <input
                  type="text"
                  formControlName="primaryCreateLabel"
                  class="form-control"
                  placeholder="+ Adicionar registro"
                  (input)="markDirty()"
                />
              </div>

              <!-- Row Action Switches -->
              <div class="form-field full-width">
                <label class="field-label">Ações Padrão de Linha</label>
                <div class="action-switches-grid">
                  <label class="checkbox-label card-switch">
                    <input type="checkbox" formControlName="actionViewDetails" (change)="markDirty()" />
                    <div class="switch-meta">
                      <strong>Visualizar detalhes</strong>
                      <span>Abre drawer com dados completos e schemas</span>
                    </div>
                  </label>

                  <label class="checkbox-label card-switch">
                    <input type="checkbox" formControlName="actionEdit" (change)="markDirty()" />
                    <div class="switch-meta">
                      <strong>Editar registro</strong>
                      <span>Abre formulário dinâmico para operações PUT/PATCH</span>
                    </div>
                  </label>

                  <label class="checkbox-label card-switch">
                    <input type="checkbox" formControlName="actionDelete" (change)="markDirty()" />
                    <div class="switch-meta">
                      <strong>Excluir registro</strong>
                      <span>Exibe diálogo de confirmação para operação DELETE</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <!-- ==================== CUSTOM ACTIONS / RPC SECTION ==================== -->
            <div class="custom-actions-container">
              <div class="section-lead-row">
                <div class="section-lead">
                  <h5 class="lead-title">Ações Customizadas da Página (RPC / Operações Adicionais)</h5>
                  <p class="lead-desc">
                    Adicione ações específicas de negócio como <em>"Editar status"</em>, <em>"Cancelar pedido"</em>, <em>"Aprovar"</em> ou <em>"Reenviar"</em>.
                  </p>
                </div>
                <button type="button" class="btn-secondary-sm" (click)="addCustomAction()">
                  <mat-icon>add</mat-icon>
                  <span>Adicionar Ação Customizada</span>
                </button>
              </div>

              @if (customActionsArray.length === 0) {
                <div class="empty-placeholder">
                  <mat-icon class="empty-icon">bolt</mat-icon>
                  <span>Nenhuma ação customizada configurada para esta página.</span>
                  <button type="button" class="btn-text-action" (click)="addCustomAction()">
                    + Criar primeira ação customizada
                  </button>
                </div>
              } @else {
                <div class="custom-actions-list" formArrayName="customActions">
                  @for (caCtrl of customActionsArray.controls; track caCtrl; let i = $index) {
                    <div class="custom-action-card" [formGroupName]="i">
                      <div class="action-card-top-row">
                        <div class="action-card-left">
                          <mat-icon class="action-icon-pill" [style.color]="getActionStyleColor(caCtrl.get('style')?.value)">
                            {{ caCtrl.get('icon')?.value || 'bolt' }}
                          </mat-icon>
                          <strong class="action-title-display">{{ caCtrl.get('label')?.value || 'Nova Ação' }}</strong>
                          <span class="style-badge" [class]="'style-' + (caCtrl.get('style')?.value || 'default')">
                            {{ caCtrl.get('style')?.value || 'default' }}
                          </span>
                        </div>
                        <div class="action-card-actions">
                          <button
                            type="button"
                            class="btn-icon-sm"
                            [disabled]="i === 0"
                            (click)="moveCustomAction(i, 'up')"
                            title="Mover para cima"
                          >
                            <mat-icon>arrow_upward</mat-icon>
                          </button>
                          <button
                            type="button"
                            class="btn-icon-sm"
                            [disabled]="i === customActionsArray.length - 1"
                            (click)="moveCustomAction(i, 'down')"
                            title="Mover para baixo"
                          >
                            <mat-icon>arrow_downward</mat-icon>
                          </button>
                          <button
                            type="button"
                            class="btn-icon-sm btn-danger"
                            (click)="removeCustomAction(i)"
                            title="Remover ação"
                          >
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      </div>

                      <div class="action-fields-grid">
                        <!-- Linked Operation -->
                        <div class="form-field full-width">
                          <label class="field-label">Operação OpenAPI Vinculada <span class="required">*</span></label>
                          <select
                            formControlName="operationId"
                            class="form-control font-mono"
                            (change)="onCustomActionOpSelected(i)"
                          >
                            <option value="" disabled>Selecione a operação da API...</option>
                            @for (op of compatibleCustomOperations(); track op.id) {
                              <option [value]="op.operationId || op.id">
                                [{{ op.method }}] {{ op.path }} {{ op.summary ? '— ' + op.summary : '' }}
                              </option>
                            }
                          </select>
                        </div>

                        <!-- Action Label -->
                        <div class="form-field">
                          <label class="field-label">Rótulo do Botão <span class="required">*</span></label>
                          <input
                            type="text"
                            formControlName="label"
                            class="form-control"
                            placeholder="Ex: Cancelar Pedido, Editar status"
                            (input)="markDirty()"
                          />
                        </div>

                        <!-- Action Icon -->
                        <div class="form-field">
                          <label class="field-label">Ícone Material</label>
                          <select formControlName="icon" class="form-control" (change)="markDirty()">
                            @for (ic of actionIcons; track ic) {
                              <option [value]="ic">{{ ic }}</option>
                            }
                          </select>
                        </div>

                        <!-- Action Style -->
                        <div class="form-field">
                          <label class="field-label">Estilo Visual</label>
                          <select formControlName="style" class="form-control" (change)="markDirty()">
                            @for (st of actionStyleOptions; track st.value) {
                              <option [value]="st.value">{{ st.label }}</option>
                            }
                          </select>
                        </div>

                        <!-- Input Mode -->
                        <div class="form-field">
                          <label class="field-label">Modo de Entrada</label>
                          <select formControlName="inputMode" class="form-control" (change)="markDirty()">
                            <option value="auto">Automático (Detecta Body/Parâmetros)</option>
                            <option value="dialog">Forçar Modal com Formulário</option>
                            <option value="direct">Execução Direta (Sem modal se sem body)</option>
                          </select>
                        </div>

                        <!-- Confirmation Toggle -->
                        <div class="form-field full-width">
                          <div class="flags-row">
                            <label class="checkbox-label">
                              <input type="checkbox" formControlName="confirmation" (change)="markDirty()" />
                              <span>Exigir diálogo de confirmação antes de executar</span>
                            </label>
                            <label class="checkbox-label">
                              <input type="checkbox" formControlName="danger" (change)="markDirty()" />
                              <span>Marcar como ação destrutiva / irreversível</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <!-- Operation Metadata & Parameter Warnings -->
                      @if (getOperationDetails(caCtrl.get('operationId')?.value); as op) {
                        <div class="op-meta-panel" style="margin-top: 10px;">
                          <div class="op-meta-row">
                            <span class="method-badge font-mono" [class]="'method-' + op.method.toLowerCase()">{{ op.method }}</span>
                            <span class="op-path font-mono">{{ op.path }}</span>
                            <button
                              type="button"
                              class="btn-inspect-explorer"
                              (click)="openInExplorer(op.operationId || op.id, $event)"
                              title="Inspecionar operação no API Explorer"
                            >
                              <mat-icon>open_in_new</mat-icon>
                              <span>API Explorer</span>
                            </button>
                          </div>
                          @if (checkParamInference(op); as check) {
                            @if (!check.canInfer) {
                              <div class="param-warning-box">
                                <mat-icon class="warn-icon">warning_amber</mat-icon>
                                <span class="warn-text">
                                  Aviso: O(s) parâmetro(s) <strong>{{ formatMissingParams(check.missingParams) }}</strong> da rota não correspondem a nenhuma coluna da tabela e precisarão ser preenchidos pelo usuário ou contexto.
                                </span>
                              </div>
                            }
                          }
                          @if (op.parameters && op.parameters.length > 0) {
                            <div class="op-params-list">
                              <span class="params-label">Parâmetros:</span>
                              @for (param of op.parameters; track param.name) {
                                <span class="param-pill font-mono" [class.required]="param.required">
                                  {{ param.name }} <small>({{ param.location }})</small>
                                </span>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </section>
        }
      </form>

      <!-- Real-Time Validation Warnings / Errors Panel -->
      @if (currentValidation(); as val) {
        @if (val.hasErrors || val.hasWarnings) {
          <div class="validation-summary-box" [class.has-errors]="val.hasErrors">
            <div class="validation-header">
              <mat-icon class="val-icon">{{ val.hasErrors ? 'error_outline' : 'warning_amber' }}</mat-icon>
              <span class="val-title">
                {{ val.hasErrors ? 'Erros de validação na configuração' : 'Avisos da validação' }}
              </span>
            </div>
            <ul class="validation-issues-list">
              @for (err of val.errors; track err.path + err.code) {
                <li class="issue-item issue-error">
                  <span class="issue-path font-mono">[{{ err.path }}]</span>
                  <span class="issue-msg">{{ err.message }}</span>
                </li>
              }
              @for (warn of val.warnings; track warn.path + warn.code) {
                <li class="issue-item issue-warning">
                  <span class="issue-path font-mono">[{{ warn.path }}]</span>
                  <span class="issue-msg">{{ warn.message }}</span>
                  @if (warn.fallbackApplied) {
                    <span class="issue-fallback font-mono">↳ {{ warn.fallbackApplied }}</span>
                  }
                </li>
              }
            </ul>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .wizard-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      min-width: 0;
    }

    .wizard-form-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
    }

    /* Stepper Header */
    .stepper-nav {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: var(--canvas-surface-elevated);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      width: 100%;
      box-sizing: border-box;
    }

    .step-tab {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 10px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-xs);
      color: var(--canvas-text-secondary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
      transition: all 0.15s ease;

      &:hover:not(.active) {
        background: rgba(255, 255, 255, 0.04);
        color: var(--canvas-text-primary);
      }

      &.active {
        background: var(--canvas-surface);
        border-color: var(--canvas-border);
        color: var(--canvas-text-primary);
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

        .step-badge {
          background: var(--canvas-text-link);
          color: #ffffff;
        }
      }
    }

    .step-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border-subtle);
      font-size: 10px;
      font-weight: 700;
      color: var(--canvas-text-muted);
      flex-shrink: 0;
    }

    .step-divider {
      display: none;
    }

    /* Section Lead */
    .step-section {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
    }

    .section-lead-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .section-lead {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .lead-title {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--canvas-text-primary);
    }

    .lead-desc {
      margin: 0;
      font-size: 12px;
      color: var(--canvas-text-secondary);
      line-height: 1.4;
    }

    /* Navigation Item Preview */
    .nav-preview-card {
      padding: 10px 14px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 8px;

      .nav-preview-header {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .preview-title-badge {
        font-size: 10px;
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: var(--canvas-text-muted);
      }

      .preview-subtitle {
        font-size: 11px;
        color: var(--canvas-text-muted);
      }

      .nav-preview-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        background: var(--canvas-surface-elevated);
        border: 1px solid var(--canvas-border-subtle);
        border-radius: var(--radius-xs);

        &.is-hidden-item {
          opacity: 0.6;
          border-style: dashed;
        }
      }

      .preview-icon-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: rgba(88, 166, 255, 0.12);
        color: var(--canvas-text-link);
        border-radius: var(--radius-xs);

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }

      .preview-info-col {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }

      .preview-title-line {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .preview-page-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--canvas-text-primary);
      }

      .preview-badge {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 10px;
        font-weight: 600;

        &.badge-default {
          background: rgba(63, 185, 80, 0.15);
          color: var(--color-success);
          border: 1px solid rgba(63, 185, 80, 0.3);
        }

        &.badge-hidden {
          background: rgba(139, 148, 158, 0.15);
          color: var(--canvas-text-secondary);
          border: 1px solid var(--canvas-border-subtle);
        }
      }

      .preview-route-path {
        font-size: 11px;
        color: var(--canvas-text-link);
      }

      .preview-order-pill {
        font-size: 11px;
        padding: 3px 8px;
        background: var(--canvas-surface);
        border: 1px solid var(--canvas-border-subtle);
        border-radius: 12px;
        color: var(--canvas-text-secondary);
      }
    }

    /* Form Grid */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 16px;
      width: 100%;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;

      &.full-width {
        grid-column: 1 / -1;
      }
    }

    .field-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--canvas-text-secondary);

      .required {
        color: var(--color-danger);
      }
    }

    .field-hint {
      font-size: 11px;
      color: var(--canvas-text-muted);
      line-height: 1.3;
    }

    .field-error {
      font-size: 11px;
      color: var(--color-danger);
    }

    .form-control {
      height: 32px;
      padding: 0 10px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-xs);
      color: var(--canvas-text-primary);
      font-size: 12px;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;

      &:focus {
        border-color: var(--canvas-text-link);
        box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.15);
      }

      &::placeholder {
        color: var(--canvas-text-muted);
      }
    }

    textarea.form-control {
      height: auto;
      padding: 6px 10px;
      resize: vertical;
    }

    .slug-input-wrapper {
      display: flex;
      align-items: center;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-xs);
      overflow: hidden;

      .slug-prefix {
        padding: 0 8px;
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-muted);
        font-size: 11px;
        height: 30px;
        display: flex;
        align-items: center;
        border-right: 1px solid var(--canvas-border-subtle);
        user-select: none;
      }

      .form-control {
        border: none;
        box-shadow: none;
        flex: 1;
        height: 30px;
      }
    }

    .field-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .btn-text-action {
      background: none;
      border: none;
      padding: 0;
      color: var(--canvas-text-link);
      font-size: 11px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;

      &:hover {
        text-decoration: underline;
      }
    }

    .icon-selector-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 6px;
      padding: 6px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-xs);

      .icon-choice-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 32px;
        background: var(--canvas-surface-elevated);
        border: 1px solid var(--canvas-border-subtle);
        border-radius: var(--radius-xs);
        color: var(--canvas-text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          background: #30363d;
          color: var(--canvas-text-primary);
        }

        &.selected {
          background: rgba(88, 166, 255, 0.15);
          border-color: var(--canvas-text-link);
          color: var(--canvas-text-link);
        }

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .flags-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-xs);
    }

    .checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--canvas-text-secondary);
      cursor: pointer;

      input[type="checkbox"] {
        cursor: pointer;
        accent-color: var(--canvas-text-link);
      }
    }

    /* ==================== ETAPA 2: ENDPOINTS & CRUD STYLES ==================== */
    .operations-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }

    .operation-card {
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.15s ease;

      &.has-selection {
        border-color: var(--canvas-border-active, #388bfd44);
      }
    }

    .operation-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;

      .role-meta {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .role-title {
        font-size: 12px;
        color: var(--canvas-text-primary);
      }
    }

    .method-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 1px 6px;
      border-radius: var(--radius-xs);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;

      &.method-get {
        background: rgba(63, 185, 80, 0.15);
        color: #3fb950;
        border: 1px solid rgba(63, 185, 80, 0.3);
      }

      &.method-post {
        background: rgba(88, 166, 255, 0.15);
        color: #58a6ff;
        border: 1px solid rgba(88, 166, 255, 0.3);
      }

      &.method-put, &.method-patch {
        background: rgba(210, 153, 34, 0.15);
        color: #d29922;
        border: 1px solid rgba(210, 153, 34, 0.3);
      }

      &.method-delete {
        background: rgba(248, 81, 73, 0.15);
        color: #f85149;
        border: 1px solid rgba(248, 81, 73, 0.3);
      }
    }

    .badge-suggested, .badge-inline-suggested {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 1px 6px;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      color: #38bdf8;

      .badge-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }
    }

    .operation-card-body {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .op-select {
        font-size: 11px;
      }
    }

    .op-meta-panel {
      padding: 8px 10px;
      background: var(--canvas-surface-elevated);
      border: 1px solid var(--canvas-border-subtle);
      border-radius: var(--radius-xs);
      display: flex;
      flex-direction: column;
      gap: 6px;

      .op-meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }

      .op-path {
        font-size: 11px;
        color: var(--canvas-text-link);
        font-weight: 600;
      }

      .op-summary-text {
        font-size: 11px;
        color: var(--canvas-text-secondary);
        line-height: 1.3;
      }

      .op-params-list {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
        font-size: 11px;

        .params-label {
          color: var(--canvas-text-muted);
          font-size: 10px;
          margin-right: 2px;
        }

        .param-pill {
          padding: 1px 5px;
          background: var(--canvas-surface);
          border: 1px solid var(--canvas-border-subtle);
          border-radius: var(--radius-xs);
          font-size: 10px;
          color: var(--canvas-text-secondary);

          &.required {
            border-color: rgba(248, 81, 73, 0.4);
            color: var(--color-danger);
          }

          small {
            color: var(--canvas-text-muted);
          }
        }
      }
    }

    .btn-inspect-explorer {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-xs);
      color: var(--canvas-text-secondary);
      font-size: 10px;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #30363d;
        color: var(--canvas-text-primary);
        border-color: var(--canvas-text-link);
      }

      mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }
    }

    .param-warning-box {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 6px 8px;
      background: rgba(210, 153, 34, 0.12);
      border: 1px solid rgba(210, 153, 34, 0.3);
      border-radius: var(--radius-xs);
      font-size: 11px;
      color: var(--color-warning);

      .warn-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--color-warning);
        flex-shrink: 0;
        margin-top: 1px;
      }

      .warn-text {
        line-height: 1.3;
      }
    }

    /* ==================== CUSTOM ACTIONS SECTION STYLES ==================== */
    .custom-actions-container {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--canvas-border);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .custom-actions-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .custom-action-card {
      padding: 12px 14px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 10px;

      .action-card-top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .action-card-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .action-icon-pill {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .action-title-display {
        font-size: 13px;
        color: var(--canvas-text-primary);
      }

      .style-badge {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 10px;
        text-transform: uppercase;
        font-weight: 600;

        &.style-default { background: rgba(139, 148, 158, 0.15); color: #8b949e; }
        &.style-primary { background: rgba(88, 166, 255, 0.15); color: #58a6ff; }
        &.style-success { background: rgba(63, 185, 80, 0.15); color: #3fb950; }
        &.style-warning { background: rgba(210, 153, 34, 0.15); color: #d29922; }
        &.style-danger { background: rgba(248, 81, 73, 0.15); color: #f85149; }
        &.style-info { background: rgba(57, 197, 207, 0.15); color: #39c5cf; }
      }

      .action-card-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .action-fields-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px 12px;
      }
    }

    /* Metrics & Columns Styles */
    .btn-secondary-sm {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: var(--canvas-surface-elevated);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-xs);
      color: var(--canvas-text-primary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: #30363d;
        border-color: #8b949e;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .metrics-editor-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }

    .metric-editor-card {
      padding: 10px 12px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 8px;

      .metric-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .metric-header-left {
        display: flex;
        align-items: center;
        gap: 8px;

        .metric-num {
          font-size: 11px;
          color: var(--canvas-text-muted);
        }

        .metric-card-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
          color: var(--canvas-text-link);
        }

        .metric-title-display {
          font-size: 12px;
          color: var(--canvas-text-primary);
        }
      }

      .metric-header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }

    .metric-fields-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px 12px;
      width: 100%;
      min-width: 0;
    }

    .btn-icon-sm {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      background: var(--canvas-surface-elevated);
      border: 1px solid var(--canvas-border-subtle);
      border-radius: var(--radius-xs);
      color: var(--canvas-text-secondary);
      cursor: pointer;
      transition: background 0.1s ease, color 0.1s ease, border-color 0.1s ease;

      &:hover:not(:disabled) {
        background: #30363d;
        border-color: #8b949e;
        color: var(--canvas-text-primary);
      }

      &.btn-danger {
        color: var(--canvas-text-muted);
      }

      &.btn-danger:hover:not(:disabled) {
        background: rgba(248, 81, 73, 0.15);
        border-color: rgba(248, 81, 73, 0.35);
        color: var(--color-danger);
      }

      &:disabled {
        opacity: 0.25;
        cursor: not-allowed;
      }

      mat-icon {
        font-size: 16px !important;
        width: 16px !important;
        height: 16px !important;
        line-height: 16px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
    }

    /* Columns Table */
    .columns-table-container {
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      overflow-x: auto;
      max-height: 320px;
      background: var(--canvas-surface);
      width: 100%;
      box-sizing: border-box;
    }

    .columns-editor-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;

      th {
        padding: 6px 10px;
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-secondary);
        font-size: 11px;
        font-weight: 600;
        border-bottom: 1px solid var(--canvas-border);
        text-align: left;

        &.col-th-reorder { width: 36px; text-align: center; }
        &.col-th-actions { width: 92px; text-align: right; }
      }

      td {
        padding: 6px 8px;
        border-bottom: 1px solid var(--canvas-border-subtle);
        vertical-align: middle;

        &.col-td-reorder { text-align: center; }
        &.col-td-actions { text-align: right; }
      }

      .table-input, .table-select {
        width: 100%;
        height: 26px;
        padding: 0 6px;
        background: var(--canvas-surface);
        border: 1px solid var(--canvas-border);
        border-radius: var(--radius-xs);
        color: var(--canvas-text-primary);
        font-size: 11px;
        outline: none;

        &:focus {
          border-color: var(--canvas-text-link);
        }
      }
    }

    .table-row-actions {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }

    .unadded-props-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 8px 10px;
      background: var(--canvas-surface);
      border: 1px dashed var(--canvas-border);
      border-radius: var(--radius-xs);

      .unadded-label {
        font-size: 10px;
        text-transform: uppercase;
        font-weight: 700;
        color: var(--canvas-text-muted);
        letter-spacing: 0.5px;
      }

      .props-chips-wrapper {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .prop-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        background: var(--canvas-surface-elevated);
        border: 1px solid var(--canvas-border-subtle);
        border-radius: var(--radius-xs);
        color: var(--canvas-text-secondary);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          background: #30363d;
          border-color: var(--canvas-text-link);
          color: var(--canvas-text-link);
        }

        .chip-add-icon {
          font-size: 13px;
          width: 13px;
          height: 13px;
        }
      }
    }

    .section-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-fields-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 6px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);

      .pill-checkbox {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        background: var(--canvas-surface-elevated);
        border: 1px solid var(--canvas-border-subtle);
        border-radius: var(--radius-xs);
        font-size: 11px;
        color: var(--canvas-text-secondary);
        cursor: pointer;

        &.checked {
          background: rgba(88, 166, 255, 0.12);
          border-color: rgba(88, 166, 255, 0.3);
          color: var(--canvas-text-link);
        }
      }
    }

    .action-switches-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      width: 100%;
      min-width: 0;
    }

    .card-switch {
      padding: 8px 10px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      align-items: flex-start;
      gap: 8px;

      .switch-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;

        strong {
          font-size: 12px;
          color: var(--canvas-text-primary);
        }

        span {
          font-size: 11px;
          color: var(--canvas-text-muted);
          line-height: 1.3;
        }
      }
    }

    .empty-placeholder {
      padding: 24px;
      text-align: center;
      border: 1px dashed var(--canvas-border);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      color: var(--canvas-text-muted);
      font-size: 12px;

      .empty-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    /* Validation Box */
    .validation-summary-box {
      padding: 10px 12px;
      background: rgba(187, 128, 9, 0.1);
      border: 1px solid rgba(187, 128, 9, 0.3);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 6px;

      &.has-errors {
        background: rgba(248, 81, 73, 0.1);
        border-color: rgba(248, 81, 73, 0.3);

        .val-icon, .val-title {
          color: var(--color-danger);
        }
      }

      .validation-header {
        display: flex;
        align-items: center;
        gap: 6px;

        .val-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
          color: var(--color-warning);
        }

        .val-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-warning);
        }
      }

      .validation-issues-list {
        margin: 0;
        padding-left: 20px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 11px;

        .issue-item {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .issue-error {
          color: var(--color-danger);
        }

        .issue-warning {
          color: var(--color-warning);
        }

        .issue-path {
          font-weight: 600;
        }

        .issue-fallback {
          color: var(--canvas-text-muted);
          width: 100%;
        }
      }
    }
  `]
})
export class PageWizardFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router, { optional: true });
  readonly draftService = inject(PageDraftService);
  readonly matcher = inject(ResourceOperationMatcherService);

  readonly availableIcons = AVAILABLE_PAGE_ICONS;
  readonly actionStyleOptions = ACTION_STYLE_OPTIONS;
  readonly actionIcons = ACTION_ICON_OPTIONS;

  readonly currentStep = signal<WizardStep>(1);

  readonly formChange = output<Partial<UiPageConfiguration>>();

  private loadedPageId: string | null = null;

  readonly availableResources = computed<ApiResource[]>(() => {
    return this.draftService.apiDefinition()?.resources ?? [];
  });

  readonly availablePositions = computed<number[]>(() => {
    const total = Math.max(this.draftService.draftPages().length, 1);
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  readonly currentValidation = this.draftService.validationResult;

  readonly form: FormGroup = this.fb.group({
    id: [''],
    resourceId: ['', Validators.required],
    title: ['', Validators.required],
    slug: ['', [this.slugValidator()]],
    icon: ['table_chart'],
    order: [1],
    description: [''],
    isDefault: [false],
    hidden: [false],
    pageSize: [10],
    searchPlaceholder: [''],
    statusField: [''],
    dateField: [''],
    primaryCreateLabel: [''],
    actionViewDetails: [true],
    actionEdit: [true],
    actionDelete: [true],
    operationList: [''],
    operationCreate: [''],
    operationDetails: [''],
    operationUpdate: [''],
    operationDelete: [''],
    searchFields: [[] as string[]],
    metrics: this.fb.array([]),
    columns: this.fb.array([]),
    customActions: this.fb.array([])
  });

  get metricsArray(): FormArray {
    return this.form.get('metrics') as FormArray;
  }

  get columnsArray(): FormArray {
    return this.form.get('columns') as FormArray;
  }

  get customActionsArray(): FormArray {
    return this.form.get('customActions') as FormArray;
  }

  readonly currentResource = computed<ApiResource | null>(() => {
    const resId = this.form.get('resourceId')?.value;
    if (!resId) return null;
    return this.availableResources().find((r) => r.id === resId || r.name === resId) ?? null;
  });

  /**
   * Compatible operations lists for each CRUD role.
   */
  readonly compatibleListOperations = computed<ApiOperation[]>(() => {
    const res = this.currentResource();
    return res ? this.matcher.getCompatibleOperationsForRole(res, 'list') : [];
  });

  readonly compatibleCreateOperations = computed<ApiOperation[]>(() => {
    const res = this.currentResource();
    return res ? this.matcher.getCompatibleOperationsForRole(res, 'create') : [];
  });

  readonly compatibleDetailsOperations = computed<ApiOperation[]>(() => {
    const res = this.currentResource();
    return res ? this.matcher.getCompatibleOperationsForRole(res, 'details') : [];
  });

  readonly compatibleUpdateOperations = computed<ApiOperation[]>(() => {
    const res = this.currentResource();
    return res ? this.matcher.getCompatibleOperationsForRole(res, 'update') : [];
  });

  readonly compatibleDeleteOperations = computed<ApiOperation[]>(() => {
    const res = this.currentResource();
    return res ? this.matcher.getCompatibleOperationsForRole(res, 'delete') : [];
  });

  readonly compatibleCustomOperations = computed<ApiOperation[]>(() => {
    const res = this.currentResource();
    const apiDef = this.draftService.apiDefinition();
    if (!res) {
      // If no specific resource, return all action-capable operations from the entire API
      const allOps: ApiOperation[] = [];
      apiDef?.resources?.forEach((r) => {
        allOps.push(...this.matcher.getCompatibleOperationsForRole(r, 'custom'));
      });
      return allOps;
    }
    return this.matcher.getCompatibleOperationsForRole(res, 'custom');
  });

  /**
   * Computed list of all properties defined in the OpenAPI schema of the active resource.
   */
  readonly availableSchemaProperties = computed<SchemaPropertyOption[]>(() => {
    const resId = this.form.get('resourceId')?.value;
    if (!resId) return [];
    const resource = this.availableResources().find((r) => r.id === resId || r.name === resId);
    if (!resource) return [];

    const listOp =
      resource.operations.find((o) => o.method === 'GET' && !o.path.includes('{')) ||
      resource.operations.find((o) => o.method === 'GET');
    const rawSchema = listOp?.responses?.[0]?.schema;
    const properties = this.draftService.extractSchemaProperties(rawSchema);
    if (!properties || Object.keys(properties).length === 0) return [];

    return Object.entries(properties).map(([key, propSchema]) => ({
      key,
      type: propSchema.type || 'string',
      label: propSchema.title || this.formatLabel(key),
      description: propSchema.description,
      schema: propSchema
    }));
  });

  readonly availablePropertyKeys = computed<string[]>(() => {
    const schemaProps = this.availableSchemaProperties();
    if (schemaProps.length > 0) {
      return schemaProps.map((p) => p.key);
    }
    return this.getAvailableColumnNames();
  });

  /**
   * Schema properties that have not yet been added as columns in the table.
   */
  readonly unaddedSchemaProperties = computed<SchemaPropertyOption[]>(() => {
    const all = this.availableSchemaProperties();
    const currentFields = new Set(
      this.columnsArray.controls.map((c) => (c.get('field')?.value || '').trim().toLowerCase())
    );
    return all.filter((p) => !currentFields.has(p.key.toLowerCase()));
  });

  constructor() {
    // Keep form in sync when pageId changes (e.g. switching pages), avoiding circular re-population on user input
    effect(() => {
      const page = this.draftService.activeEditingPage();
      if (page && page.id !== this.loadedPageId) {
        this.loadedPageId = page.id || null;
        this.populateForm(page);
      }
    });

    // Update draft on value change without recreating controls
    this.form.valueChanges.subscribe(() => {
      const pageId = this.draftService.editingPageId();
      if (pageId) {
        this.saveFormToDraft(pageId);
      }
    });
  }

  private slugValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const val = control.value;
      if (!val || typeof val !== 'string' || val.trim() === '') {
        return { required: true };
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val.trim())) {
        return { pattern: true };
      }
      const editingId = this.draftService.editingPageId() || this.loadedPageId;
      if (this.draftService.isSlugConflict(val, editingId || undefined)) {
        const conflictPage = this.draftService.getConflictingPage(val, editingId || undefined);
        return {
          slugConflict: {
            conflictingTitle: conflictPage?.title || conflictPage?.id || val
          }
        };
      }
      return null;
    };
  }

  goToStep(step: WizardStep): void {
    this.currentStep.set(step);
  }

  populateForm(page: UiPageConfiguration): void {
    const resId = page.resourceId || '';
    const resource = this.availableResources().find((r) => r.id === resId || r.name === resId);

    // If explicit operations aren't set in page, calculate suggested defaults
    const suggestedList = resource ? this.matcher.getSuggestedOperationForRole(resource, 'list') : null;
    const suggestedCreate = resource ? this.matcher.getSuggestedOperationForRole(resource, 'create') : null;
    const suggestedDetails = resource ? this.matcher.getSuggestedOperationForRole(resource, 'details') : null;
    const suggestedUpdate = resource ? this.matcher.getSuggestedOperationForRole(resource, 'update') : null;
    const suggestedDelete = resource ? this.matcher.getSuggestedOperationForRole(resource, 'delete') : null;

    const opList = page.operations?.list ?? (suggestedList?.operationId || suggestedList?.id || '');
    const opCreate = page.operations?.create ?? (suggestedCreate?.operationId || suggestedCreate?.id || '');
    const opDetails = page.operations?.details ?? (suggestedDetails?.operationId || suggestedDetails?.id || '');
    const opUpdate = page.operations?.update ?? (suggestedUpdate?.operationId || suggestedUpdate?.id || '');
    const opDelete = page.operations?.delete ?? (suggestedDelete?.operationId || suggestedDelete?.id || '');

    this.form.patchValue(
      {
        id: page.id || '',
        resourceId: resId,
        title: page.title || '',
        slug: page.slug || '',
        icon: page.icon || 'table_chart',
        order: page.order ?? 1,
        description: page.description || '',
        isDefault: page.isDefault ?? page.default ?? false,
        hidden: page.hidden ?? false,
        pageSize: page.table?.pageSize ?? 10,
        searchPlaceholder: page.filters?.searchPlaceholder || '',
        statusField: page.filters?.statusField || '',
        dateField: page.filters?.dateField || '',
        primaryCreateLabel: page.actions?.primaryCreateLabel || '',
        actionViewDetails: page.actions?.rowActions?.viewDetails !== false,
        actionEdit: page.actions?.rowActions?.edit !== false,
        actionDelete: page.actions?.rowActions?.delete !== false,
        operationList: opList,
        operationCreate: opCreate,
        operationDetails: opDetails,
        operationUpdate: opUpdate,
        operationDelete: opDelete,
        searchFields: page.filters?.searchFields ? [...page.filters.searchFields] : []
      },
      { emitEvent: false }
    );

    this.form.get('slug')?.updateValueAndValidity({ emitEvent: false });

    // Populate metrics array
    this.metricsArray.clear({ emitEvent: false });
    if (page.metrics && page.metrics.length > 0) {
      for (const m of page.metrics) {
        this.metricsArray.push(this.createMetricGroup(m), { emitEvent: false });
      }
    }

    // Populate columns array
    this.columnsArray.clear({ emitEvent: false });
    if (page.table?.columns && page.table.columns.length > 0) {
      for (const c of page.table.columns) {
        this.columnsArray.push(this.createColumnGroup(c), { emitEvent: false });
      }
    }

    // Populate custom actions array
    this.customActionsArray.clear({ emitEvent: false });
    const actionsSource =
      page.actions?.rowActions?.customActions ||
      page.actions?.rowActions?.actions ||
      [];
    if (actionsSource && actionsSource.length > 0) {
      for (const a of actionsSource) {
        this.customActionsArray.push(this.createCustomActionGroup(a), { emitEvent: false });
      }
    }
  }

  isSuggested(role: 'list' | 'create' | 'details' | 'update' | 'delete', currentOpId: string): boolean {
    const res = this.currentResource();
    if (!res || !currentOpId) return false;
    return this.matcher.isRoleOperationSuggested(undefined, role, currentOpId, res);
  }

  getOperationDetails(operationId: string): ApiOperation | null {
    if (!operationId) return null;
    const res = this.currentResource();
    const apiDef = this.draftService.apiDefinition();
    return this.matcher.findOperationInResourceOrApi(operationId, res, apiDef);
  }

  checkParamInference(operation: ApiOperation): {
    canInfer: boolean;
    missingParams: ApiParameter[];
    inferredParams: Record<string, string>;
  } {
    const availableFields = this.getAvailableColumnNames();
    return this.matcher.checkParamInferenceForOperation(operation, availableFields);
  }

  formatMissingParams(params: ApiParameter[]): string {
    return params.map((p) => p.name).join(', ');
  }

  openInExplorer(operationId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!operationId) return;

    if (this.router) {
      this.router.navigate(['/operation', operationId]);
    } else {
      window.open(`/operation/${encodeURIComponent(operationId)}`, '_blank');
    }
  }

  onOperationChanged(role: 'list' | 'create' | 'details' | 'update' | 'delete'): void {
    this.markDirty();
  }

  private createMetricGroup(m?: UiMetricConfiguration): FormGroup {
    return this.fb.group({
      id: [m?.id || `metric-${Date.now()}`],
      label: [m?.label || '', Validators.required],
      type: [m?.type || 'count_all'],
      field: [m?.field || ''],
      matchingValue: [m?.matchingValue ?? ''],
      colorScheme: [m?.colorScheme || 'default'],
      format: [m?.format || 'number'],
      icon: [m?.icon || 'tag']
    });
  }

  private createColumnGroup(c?: UiColumnConfiguration): FormGroup {
    return this.fb.group({
      field: [c?.field || '', Validators.required],
      label: [c?.label || (c?.field ? this.formatLabel(c.field) : '')],
      type: [c?.type || 'text'],
      sortable: [c?.sortable ?? true]
    });
  }

  private createCustomActionGroup(a?: UiCustomActionDescriptor): FormGroup {
    return this.fb.group({
      id: [a?.id || `action-${Date.now()}`],
      operationId: [a?.operationId || '', Validators.required],
      label: [a?.label || '', Validators.required],
      icon: [a?.icon || 'bolt'],
      tooltip: [a?.tooltip || ''],
      style: [a?.style || 'default'],
      danger: [a?.danger ?? false],
      confirmation: [Boolean(a?.confirmation)],
      inputMode: [a?.inputMode || 'auto']
    });
  }

  addMetric(): void {
    if (this.metricsArray.length >= 6) return;
    this.metricsArray.push(this.createMetricGroup());
    this.markDirty();
  }

  removeMetric(index: number): void {
    this.metricsArray.removeAt(index);
    this.markDirty();
  }

  moveMetric(index: number, direction: 'up' | 'down'): void {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= this.metricsArray.length) return;
    const item = this.metricsArray.at(index);
    this.metricsArray.removeAt(index);
    this.metricsArray.insert(target, item);
    this.markDirty();
  }

  addColumn(): void {
    this.columnsArray.push(
      this.createColumnGroup({
        field: '',
        label: '',
        type: 'text',
        sortable: true
      })
    );
    this.markDirty();
  }

  addSchemaPropertyAsColumn(prop: SchemaPropertyOption): void {
    this.columnsArray.push(
      this.createColumnGroup({
        field: prop.key,
        label: prop.label,
        type: this.inferColumnTypeFromSchema(prop.key, prop.schema),
        sortable: true
      })
    );
    this.markDirty();
  }

  restoreSchemaColumns(): void {
    const resId = this.form.get('resourceId')?.value;
    const resource = this.availableResources().find((r) => r.id === resId || r.name === resId);
    if (!resource) return;

    const defaults = this.draftService.inferPageDefaultsFromResource(resource);
    if (defaults.table?.columns && defaults.table.columns.length > 0) {
      this.columnsArray.clear();
      for (const col of defaults.table.columns) {
        this.columnsArray.push(this.createColumnGroup(col));
      }
      this.markDirty();
    }
  }

  removeColumn(index: number): void {
    this.columnsArray.removeAt(index);
    this.markDirty();
  }

  moveColumn(index: number, direction: 'up' | 'down'): void {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= this.columnsArray.length) return;
    const item = this.columnsArray.at(index);
    this.columnsArray.removeAt(index);
    this.columnsArray.insert(target, item);
    this.markDirty();
  }

  addCustomAction(): void {
    const compatible = this.compatibleCustomOperations();
    const firstOp =
      compatible.find(
        (o) =>
          o.type === 'action' ||
          o.path.includes('/cancel') ||
          o.path.includes('/status') ||
          o.method === 'POST'
      ) || compatible[0];

    const isCancel = firstOp?.path.toLowerCase().includes('cancel');
    const newGroup = this.createCustomActionGroup({
      id: `action-${Date.now()}`,
      operationId: firstOp ? (firstOp.operationId || firstOp.id) : '',
      label: firstOp ? (firstOp.summary || this.formatLabel(firstOp.operationId || firstOp.id)) : 'Nova Ação',
      icon: isCancel ? 'cancel' : 'bolt',
      style: isCancel ? 'danger' : 'default',
      danger: isCancel,
      confirmation: false,
      inputMode: 'auto'
    });

    this.customActionsArray.push(newGroup);
    this.markDirty();
  }

  removeCustomAction(index: number): void {
    this.customActionsArray.removeAt(index);
    this.markDirty();
  }

  moveCustomAction(index: number, direction: 'up' | 'down'): void {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= this.customActionsArray.length) return;
    const item = this.customActionsArray.at(index);
    this.customActionsArray.removeAt(index);
    this.customActionsArray.insert(target, item);
    this.markDirty();
  }

  onCustomActionOpSelected(index: number): void {
    const group = this.customActionsArray.at(index);
    const opId = group.get('operationId')?.value;
    const op = this.getOperationDetails(opId);
    if (op) {
      group.get('label')?.setValue(op.summary || this.formatLabel(op.operationId || op.id));
      const lower = (op.path + ' ' + (op.summary || '') + ' ' + (op.operationId || '')).toLowerCase();
      if (lower.includes('cancel') || lower.includes('cancelar')) {
        group.get('icon')?.setValue('cancel');
        group.get('style')?.setValue('danger');
        group.get('danger')?.setValue(true);
      } else if (lower.includes('status') || lower.includes('state') || lower.includes('situacao')) {
        group.get('icon')?.setValue('edit_note');
        group.get('style')?.setValue('primary');
      } else if (lower.includes('approve') || lower.includes('aprovar') || lower.includes('check')) {
        group.get('icon')?.setValue('check_circle');
        group.get('style')?.setValue('success');
      }
    }
    this.markDirty();
  }

  getActionStyleColor(style?: string): string {
    const match = this.actionStyleOptions.find((s) => s.value === style);
    return match ? match.color : '#8b949e';
  }

  onColumnFieldInput(index: number): void {
    this.markDirty();
  }

  onColumnFieldChanged(index: number): void {
    const ctrl = this.columnsArray.at(index);
    const fieldVal = (ctrl.get('field')?.value || '').trim();
    if (!fieldVal) return;

    const labelCtrl = ctrl.get('label');
    if (!labelCtrl?.value || labelCtrl.value.trim() === '' || labelCtrl.value.startsWith('Nova Coluna')) {
      labelCtrl?.setValue(this.formatLabel(fieldVal));
    }

    const typeCtrl = ctrl.get('type');
    const matchedProp = this.availableSchemaProperties().find((p) => p.key === fieldVal);
    const inferredType = this.inferColumnTypeFromSchema(fieldVal, matchedProp?.schema);
    typeCtrl?.setValue(inferredType);

    this.markDirty();
  }

  onTitleInput(): void {
    const titleVal = this.form.get('title')?.value;
    const currentSlug = this.form.get('slug')?.value;
    if (!currentSlug || currentSlug === this.slugify(titleVal.slice(0, -1))) {
      this.form.get('slug')?.setValue(this.slugify(titleVal));
      this.form.get('slug')?.updateValueAndValidity();
    }
    this.markDirty();
  }

  onSlugInput(): void {
    this.form.get('slug')?.updateValueAndValidity();
    this.markDirty();
  }

  onOrderChanged(): void {
    const pageId = this.draftService.editingPageId();
    const newOrder = Number(this.form.get('order')?.value) || 1;
    if (pageId) {
      this.draftService.setPagePosition(pageId, newOrder);
      this.markDirty();
    }
  }

  autoGenerateSlug(): void {
    const title = this.form.get('title')?.value || this.form.get('resourceId')?.value || 'pagina';
    this.form.get('slug')?.setValue(this.slugify(title));
    this.form.get('slug')?.updateValueAndValidity();
    this.markDirty();
  }

  onResourceChanged(): void {
    const resId = this.form.get('resourceId')?.value;
    const resource = this.availableResources().find((r) => r.id === resId || r.name === resId);
    if (!resource) return;

    const resourceLabel = resource.label || resource.name;

    // Suggest defaults for title and slug
    const titleCtrl = this.form.get('title');
    titleCtrl?.setValue(resourceLabel);
    this.autoGenerateSlug();

    // Suggest contextual icon from resource name
    const iconCtrl = this.form.get('icon');
    const inferredIcon = this.draftService.inferIconFromResource(resource.id || resource.name);
    iconCtrl?.setValue(inferredIcon);

    // Suggest contextual description
    const descCtrl = this.form.get('description');
    descCtrl?.setValue(`Gerenciamento operacional e visualização de ${resourceLabel.toLowerCase()}.`);

    // Auto-suggest operations from resolved suite
    const suggestedList = this.matcher.getSuggestedOperationForRole(resource, 'list');
    const suggestedCreate = this.matcher.getSuggestedOperationForRole(resource, 'create');
    const suggestedDetails = this.matcher.getSuggestedOperationForRole(resource, 'details');
    const suggestedUpdate = this.matcher.getSuggestedOperationForRole(resource, 'update');
    const suggestedDelete = this.matcher.getSuggestedOperationForRole(resource, 'delete');

    this.form.patchValue(
      {
        operationList: suggestedList?.operationId || suggestedList?.id || '',
        operationCreate: suggestedCreate?.operationId || suggestedCreate?.id || '',
        operationDetails: suggestedDetails?.operationId || suggestedDetails?.id || '',
        operationUpdate: suggestedUpdate?.operationId || suggestedUpdate?.id || '',
        operationDelete: suggestedDelete?.operationId || suggestedDelete?.id || ''
      },
      { emitEvent: false }
    );

    // Re-infer columns and metrics from the newly selected resource
    const inferred = this.draftService.inferPageDefaultsFromResource(resource);
    if (inferred.table?.columns && inferred.table.columns.length > 0) {
      this.columnsArray.clear();
      for (const col of inferred.table.columns) {
        this.columnsArray.push(this.createColumnGroup(col));
      }
    }
    if (inferred.metrics && inferred.metrics.length > 0) {
      this.metricsArray.clear();
      for (const met of inferred.metrics) {
        this.metricsArray.push(this.createMetricGroup(met));
      }
    }

    this.markDirty();
  }

  getAvailableColumnNames(): string[] {
    const cols = this.columnsArray.controls.map((c) => c.get('field')?.value).filter(Boolean);
    if (cols.length > 0) return cols;
    return ['id', 'status', 'createdAt', 'title'];
  }

  isSearchFieldSelected(field: string): boolean {
    const current: string[] = this.form.get('searchFields')?.value || [];
    return current.includes(field);
  }

  toggleSearchField(field: string): void {
    const current: string[] = [...(this.form.get('searchFields')?.value || [])];
    const index = current.indexOf(field);
    if (index === -1) {
      current.push(field);
    } else {
      current.splice(index, 1);
    }
    this.form.get('searchFields')?.setValue(current);
    this.markDirty();
  }

  markDirty(): void {
    const pageId = this.draftService.editingPageId();
    if (pageId) {
      this.saveFormToDraft(pageId);
    }
  }

  private saveFormToDraft(pageId: string): void {
    const val = this.form.value;
    const existing = this.draftService.draftPages().find((p) => p.id === pageId);

    const updatedConfig: Partial<UiPageConfiguration> = {
      title: val.title,
      slug: val.slug,
      icon: val.icon,
      order: Number(val.order) || existing?.order || 1,
      description: val.description,
      isDefault: val.isDefault,
      default: val.isDefault,
      hidden: val.hidden,
      resourceId: val.resourceId,
      operations: {
        ...(existing?.operations || {}),
        list: val.operationList || undefined,
        create: val.operationCreate || undefined,
        details: val.operationDetails || undefined,
        update: val.operationUpdate || undefined,
        delete: val.operationDelete || undefined
      },
      metrics: (val.metrics || []).map((m: any) => ({
        id: m.id,
        label: m.label,
        type: m.type,
        field: m.field || undefined,
        matchingValue: m.matchingValue || undefined,
        colorScheme: m.colorScheme,
        format: m.format,
        icon: m.icon
      })),
      table: {
        ...(existing?.table || {}),
        columns: (val.columns || []).map((c: any) => ({
          field: c.field,
          label: c.label || undefined,
          type: c.type,
          sortable: c.sortable
        })),
        pageSize: val.pageSize
      },
      filters: {
        ...(existing?.filters || {}),
        searchFields: val.searchFields,
        searchPlaceholder: val.searchPlaceholder,
        statusField: val.statusField || undefined,
        dateField: val.dateField || undefined
      },
      actions: {
        ...(existing?.actions || {}),
        primaryCreateActionId: val.operationCreate || existing?.actions?.primaryCreateActionId,
        primaryCreateLabel: val.primaryCreateLabel || undefined,
        rowActions: {
          ...(existing?.actions?.rowActions || {}),
          viewDetails: val.actionViewDetails,
          edit: val.actionEdit,
          delete: val.actionDelete,
          customActions: (val.customActions || []).map((a: any) => ({
            id: a.id,
            operationId: a.operationId,
            label: a.label,
            icon: a.icon || 'bolt',
            tooltip: a.tooltip || undefined,
            style: a.style || 'default',
            danger: Boolean(a.danger),
            confirmation: Boolean(a.confirmation),
            inputMode: a.inputMode || 'auto'
          }))
        }
      }
    };

    this.draftService.updatePage(pageId, updatedConfig);
    this.formChange.emit(updatedConfig);
  }

  private inferColumnTypeFromSchema(field: string, schema?: ApiSchema): UiColumnConfiguration['type'] {
    const lower = field.toLowerCase();
    if (lower === 'id' || lower.endsWith('_id') || lower === 'uuid' || lower === 'guid' || lower === 'sku') {
      return 'monospace';
    }
    if (lower.includes('status') || lower.includes('state')) {
      return 'status_badge';
    }
    if (
      lower.includes('price') ||
      lower.includes('amount') ||
      lower.includes('total') ||
      lower.includes('cost') ||
      lower.includes('valor')
    ) {
      return 'currency';
    }
    if (schema?.type === 'integer' || schema?.type === 'number') {
      return 'number';
    }
    if (schema?.type === 'boolean') {
      return 'boolean';
    }
    if (schema?.format === 'date' || lower.endsWith('date') || lower === 'data') {
      return 'date';
    }
    if (schema?.format === 'date-time' || lower.includes('at') || lower.includes('time')) {
      return 'datetime';
    }
    return 'text';
  }

  private formatLabel(key: string): string {
    if (!key) return '';
    const acronyms = new Set(['id', 'sku', 'url', 'uri', 'ip', 'api', 'uuid', 'guid', 'http', 'ssl', 'tls']);
    if (acronyms.has(key.toLowerCase())) {
      return key.toUpperCase();
    }
    return key
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((w) => (acronyms.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ')
      .trim();
  }

  private slugify(text: string): string {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
