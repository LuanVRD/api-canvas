import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageDraftService } from '../../services/page-draft.service';
import {
  UiColumnConfiguration,
  UiMetricConfiguration,
  UiPageConfiguration
} from '../../../../core/models/ui-configuration.model';
import { ApiResource } from '../../../../core/models/api-resource.model';
import { ApiSchema } from '../../../../core/models/api-schema.model';

export type WizardStep = 1 | 2 | 3 | 4;

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
          aria-label="Etapa 2: Métricas operacionais"
        >
          <span class="step-badge">2</span>
          <span class="step-label">Métricas (KPIs)</span>
          <span class="step-count font-mono">{{ metricsArray.length }}</span>
        </button>

        <div class="step-divider"></div>

        <button
          type="button"
          class="step-tab"
          [class.active]="currentStep() === 3"
          (click)="goToStep(3)"
          aria-label="Etapa 3: Tabela e Colunas"
        >
          <span class="step-badge">3</span>
          <span class="step-label">Tabela & Colunas</span>
          <span class="step-count font-mono">{{ columnsArray.length }}</span>
        </button>

        <div class="step-divider"></div>

        <button
          type="button"
          class="step-tab"
          [class.active]="currentStep() === 4"
          (click)="goToStep(4)"
          aria-label="Etapa 4: Filtros e Ações"
        >
          <span class="step-badge">4</span>
          <span class="step-label">Filtros & Ações</span>
        </button>
      </nav>

      <!-- Main Form Container -->
      <form [formGroup]="form" class="wizard-form-body">
        <!-- ==================== ETAPA 1: GERAL & RECURSO ==================== -->
        @if (currentStep() === 1) {
          <section class="step-section" aria-label="Configurações gerais e recurso">
            <div class="section-lead">
              <h5 class="lead-title">Identificação da Página e Vínculo OpenAPI</h5>
              <p class="lead-desc">Defina o recurso da API que alimentará os dados desta página e os dados de navegação.</p>
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
                    (input)="markDirty()"
                  />
                </div>
                @if (form.get('slug')?.touched && form.get('slug')?.errors?.['required']) {
                  <span class="field-error">O slug é obrigatório.</span>
                } @else if (form.get('slug')?.touched && form.get('slug')?.errors?.['pattern']) {
                  <span class="field-error">Use apenas letras minúsculas, números e hífens (ex: meus-pedidos).</span>
                }
              </div>

              <!-- Icon Selector -->
              <div class="form-field">
                <label class="field-label">Ícone da Barra Lateral</label>
                <div class="icon-selector-grid">
                  @for (icon of availableIcons; track icon) {
                    <button
                      type="button"
                      class="icon-choice-btn"
                      [class.selected]="form.get('icon')?.value === icon"
                      (click)="form.get('icon')?.setValue(icon); markDirty()"
                      [title]="icon"
                      [attr.aria-label]="'Selecionar ícone ' + icon"
                    >
                      <mat-icon>{{ icon }}</mat-icon>
                    </button>
                  }
                </div>
              </div>

              <!-- Description -->
              <div class="form-field full-width">
                <label for="field-desc" class="field-label">Descrição Contextual (Opcional)</label>
                <textarea
                  id="field-desc"
                  formControlName="description"
                  rows="2"
                  class="form-control textarea-control"
                  placeholder="Explicação sobre o propósito desta visão no dashboard..."
                  (input)="markDirty()"
                ></textarea>
              </div>

              <!-- Checkbox Options -->
              <div class="checkbox-row full-width">
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="isDefault" (change)="markDirty()" />
                  <span>Definir como página inicial do Dashboard</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="hidden" (change)="markDirty()" />
                  <span>Ocultar esta página na barra lateral de navegação</span>
                </label>
              </div>
            </div>
          </section>
        }

        <!-- ==================== ETAPA 2: MÉTRICAS (KPIS) ==================== -->
        @if (currentStep() === 2) {
          <section class="step-section" aria-label="Configuração de métricas">
            <div class="section-lead-row">
              <div class="section-lead">
                <h5 class="lead-title">Cards de Métricas Operacionais (KPIs)</h5>
                <p class="lead-desc">Configure até 6 cards resumidos com contagens ou agregações a serem exibidos no topo da página.</p>
              </div>
              <button
                type="button"
                class="btn-secondary-action"
                [disabled]="metricsArray.length >= 6"
                (click)="addMetric()"
                aria-label="Adicionar novo card de métrica"
              >
                <mat-icon>add</mat-icon>
                <span>Adicionar métrica</span>
              </button>
            </div>

            @if (metricsArray.length > 0) {
              <div class="metrics-list" formArrayName="metrics">
                @for (metricCtrl of metricsArray.controls; track $index; let idx = $index; let isFirst = $first; let isLast = $last) {
                  <div [formGroupName]="idx" class="metric-card-editor">
                    <div class="metric-editor-header">
                      <div class="metric-num-title">
                        <span class="order-badge font-mono">#{{ idx + 1 }}</span>
                        <span class="metric-preview-label">{{ metricCtrl.get('label')?.value || 'Nova Métrica' }}</span>
                      </div>
                      <div class="metric-header-actions">
                        <button
                          type="button"
                          class="btn-icon-sm"
                          [disabled]="isFirst"
                          (click)="moveMetric(idx, 'up')"
                          title="Mover para cima"
                        >
                          <mat-icon>keyboard_arrow_up</mat-icon>
                        </button>
                        <button
                          type="button"
                          class="btn-icon-sm"
                          [disabled]="isLast"
                          (click)="moveMetric(idx, 'down')"
                          title="Mover para baixo"
                        >
                          <mat-icon>keyboard_arrow_down</mat-icon>
                        </button>
                        <button
                          type="button"
                          class="btn-icon-sm btn-danger"
                          (click)="removeMetric(idx)"
                          title="Remover métrica"
                        >
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    </div>

                    <div class="metric-fields-grid">
                      <!-- Label -->
                      <div class="form-field">
                        <label class="field-label">Rótulo <span class="required">*</span></label>
                        <input
                          type="text"
                          formControlName="label"
                          class="form-control"
                          placeholder="Ex: Total, Pendentes, Faturamento"
                          (input)="markDirty()"
                        />
                      </div>

                      <!-- Type -->
                      <div class="form-field">
                        <label class="field-label">Tipo de Agregação</label>
                        <select formControlName="type" class="form-control" (change)="markDirty()">
                          <option value="count_all">Contar todos os registros (count_all)</option>
                          <option value="count_matching">Contar registros com valor correspondente (count_matching)</option>
                          <option value="sum_field">Somar valores de um campo numérico (sum_field)</option>
                        </select>
                      </div>

                      <!-- Field (if count_matching or sum_field) -->
                      @if (metricCtrl.get('type')?.value === 'count_matching' || metricCtrl.get('type')?.value === 'sum_field') {
                        <div class="form-field">
                          <label class="field-label">Campo do Registro <span class="required">*</span></label>
                          <select formControlName="field" class="form-control font-mono" (change)="markDirty()">
                            <option value="">Selecione um campo...</option>
                            @for (prop of availableSchemaProperties(); track prop.key) {
                              <option [value]="prop.key">{{ prop.key }} ({{ prop.label }} - {{ prop.type }})</option>
                            }
                          </select>
                        </div>
                      }

                      <!-- Matching Value (if count_matching) -->
                      @if (metricCtrl.get('type')?.value === 'count_matching') {
                        <div class="form-field">
                          <label class="field-label">Valor Esperado <span class="required">*</span></label>
                          <input
                            type="text"
                            formControlName="matchingValue"
                            class="form-control font-mono"
                            placeholder="Ex: pending, completed, true"
                            (input)="markDirty()"
                          />
                        </div>
                      }

                      <!-- Color Scheme -->
                      <div class="form-field">
                        <label class="field-label">Cor Semântica</label>
                        <select formControlName="colorScheme" class="form-control" (change)="markDirty()">
                          <option value="default">Padrão (Neutro)</option>
                          <option value="primary">Azul (Informativo)</option>
                          <option value="warning">Âmbar (Atenção/Pendente)</option>
                          <option value="info">Ciano/Azul (Processando)</option>
                          <option value="success">Verde (Concluído/Sucesso)</option>
                          <option value="danger">Vermelho (Alerta/Erro)</option>
                        </select>
                      </div>

                      <!-- Format -->
                      <div class="form-field">
                        <label class="field-label">Formato Numérico</label>
                        <select formControlName="format" class="form-control" (change)="markDirty()">
                          <option value="number">Número Inteiro / Decimal</option>
                          <option value="currency">Moeda (R$)</option>
                          <option value="percent">Porcentagem (%)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-placeholder">
                <mat-icon class="empty-icon">speed</mat-icon>
                <span>Nenhum card de métrica configurado.</span>
                <button type="button" class="btn-text-action" (click)="addMetric()">
                  + Adicionar primeiro card de métrica
                </button>
              </div>
            }
          </section>
        }

        <!-- ==================== ETAPA 3: TABELA & COLUNAS ==================== -->
        @if (currentStep() === 3) {
          <section class="step-section" aria-label="Configuração de colunas da tabela">
            <!-- Datalist for autocomplete on column fields -->
            <datalist id="schema-fields-list">
              @for (prop of availableSchemaProperties(); track prop.key) {
                <option [value]="prop.key">{{ prop.label }} ({{ prop.type }})</option>
              }
            </datalist>

            <div class="section-lead-row">
              <div class="section-lead">
                <h5 class="lead-title">Estrutura e Tipos de Colunas</h5>
                <p class="lead-desc">Personalize os rótulos, tipos de renderização e ordenação das colunas exibidas na tabela de dados.</p>
              </div>
              <div class="lead-actions">
                @if (availableSchemaProperties().length > 0) {
                  <button
                    type="button"
                    class="btn-secondary-action"
                    (click)="restoreSchemaColumns()"
                    title="Restaurar todas as colunas a partir do schema OpenAPI retornado pelo endpoint GET"
                  >
                    <mat-icon>refresh</mat-icon>
                    <span>Restaurar do schema</span>
                  </button>
                }
                <button
                  type="button"
                  class="btn-secondary-action"
                  (click)="addColumn()"
                  aria-label="Adicionar coluna manual"
                >
                  <mat-icon>add</mat-icon>
                  <span>Adicionar coluna</span>
                </button>
              </div>
            </div>

            <!-- Quick Add Unadded Schema Properties Banner -->
            @if (unaddedSchemaProperties().length > 0) {
              <div class="schema-suggestions-bar">
                <span class="suggestion-label">Campos da API disponíveis para adicionar:</span>
                <div class="suggestion-pills">
                  @for (prop of unaddedSchemaProperties(); track prop.key) {
                    <button
                      type="button"
                      class="btn-add-schema-prop"
                      (click)="addSchemaPropertyAsColumn(prop)"
                      [title]="'Adicionar campo ' + prop.key + ' à tabela'"
                    >
                      <mat-icon>add</mat-icon>
                      <span class="font-mono">{{ prop.key }}</span>
                      <span class="prop-type">({{ prop.type }})</span>
                    </button>
                  }
                </div>
              </div>
            }

            <div class="columns-table-container" formArrayName="columns">
              <table class="columns-editor-table">
                <thead>
                  <tr>
                    <th class="col-th-reorder" scope="col">Ordem</th>
                    <th scope="col">Campo OpenAPI</th>
                    <th scope="col">Rótulo da Coluna</th>
                    <th scope="col">Tipo Visual</th>
                    <th scope="col">Ordenável</th>
                    <th class="col-th-actions" scope="col">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  @for (colCtrl of columnsArray.controls; track $index; let idx = $index; let isFirst = $first; let isLast = $last) {
                    <tr [formGroupName]="idx">
                      <!-- Reorder Buttons -->
                      <td class="col-td-reorder">
                        <div class="order-btns-col">
                          <button
                            type="button"
                            class="btn-icon-micro"
                            [disabled]="isFirst"
                            (click)="moveColumn(idx, 'up')"
                            title="Mover para cima"
                          >
                            <mat-icon>keyboard_arrow_up</mat-icon>
                          </button>
                          <button
                            type="button"
                            class="btn-icon-micro"
                            [disabled]="isLast"
                            (click)="moveColumn(idx, 'down')"
                            title="Mover para baixo"
                          >
                            <mat-icon>keyboard_arrow_down</mat-icon>
                          </button>
                        </div>
                      </td>

                      <!-- Field Key (with autocomplete datalist) -->
                      <td>
                        <input
                          type="text"
                          formControlName="field"
                          list="schema-fields-list"
                          class="form-control font-mono table-input"
                          placeholder="ex: id, name, status"
                          (input)="onColumnFieldInput(idx)"
                          (change)="onColumnFieldChanged(idx)"
                        />
                      </td>

                      <!-- Label -->
                      <td>
                        <input
                          type="text"
                          formControlName="label"
                          class="form-control table-input"
                          placeholder="Nome da Coluna"
                          (input)="markDirty()"
                        />
                      </td>

                      <!-- Type -->
                      <td>
                        <select formControlName="type" class="form-control table-select" (change)="markDirty()">
                          <option value="text">Texto (Padrão)</option>
                          <option value="number">Número</option>
                          <option value="currency">Moeda (R$)</option>
                          <option value="date">Data (DD/MM/AAAA)</option>
                          <option value="datetime">Data e Hora</option>
                          <option value="boolean">Booleano (Sim/Não)</option>
                          <option value="status_badge">Badge de Status</option>
                          <option value="monospace">Código / ID Monospace</option>
                        </select>
                      </td>

                      <!-- Sortable -->
                      <td class="text-center">
                        <input type="checkbox" formControlName="sortable" (change)="markDirty()" />
                      </td>

                      <!-- Remove -->
                      <td class="col-td-actions">
                        <button
                          type="button"
                          class="btn-icon-action btn-danger"
                          (click)="removeColumn(idx)"
                          title="Remover coluna"
                        >
                          <mat-icon>delete</mat-icon>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Table Pagination Settings -->
            <div class="pagination-settings-card">
              <h6 class="settings-card-title">Configurações de Paginação</h6>
              <div class="form-grid">
                <div class="form-field">
                  <label class="field-label">Tamanho de Página Padrão</label>
                  <select formControlName="pageSize" class="form-control" (change)="markDirty()">
                    <option [value]="5">5 registros</option>
                    <option [value]="10">10 registros (Recomendado)</option>
                    <option [value]="25">25 registros</option>
                    <option [value]="50">50 registros</option>
                    <option [value]="100">100 registros</option>
                  </select>
                </div>
              </div>
            </div>
          </section>
        }

        <!-- ==================== ETAPA 4: FILTROS & AÇÕES ==================== -->
        @if (currentStep() === 4) {
          <section class="step-section" aria-label="Configuração de filtros e ações">
            <div class="section-lead">
              <h5 class="lead-title">Filtros Rápidos e Ações Operacionais</h5>
              <p class="lead-desc">Defina os controles de busca, filtros rápidos e quais ações de linha e inserção estarão ativas.</p>
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
                  placeholder="Buscar pedidos, clientes..."
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
                  placeholder="+ Adicionar item"
                  (input)="markDirty()"
                />
              </div>

              <!-- Row Action Switches -->
              <div class="form-field full-width">
                <label class="field-label">Ações Permitidas por Linha da Tabela</label>
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
      min-width: 0;
    }

    /* Stepper Navigation */
    .stepper-nav {
      display: flex;
      align-items: center;
      background: var(--canvas-surface-elevated);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      padding: 4px;
      gap: 4px;
      width: 100%;
      min-width: 0;
    }

    .step-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
      height: 32px;
      padding: 0 10px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-xs);
      color: var(--canvas-text-secondary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
      outline: none;

      &:hover {
        color: var(--canvas-text-primary);
        background: rgba(255, 255, 255, 0.04);
      }

      &.active {
        background: var(--canvas-surface);
        border-color: var(--canvas-border);
        color: var(--canvas-text-link);
        font-weight: 600;

        .step-badge {
          background: var(--canvas-text-link);
          color: #0d1117;
        }
      }

      .step-badge {
        width: 18px;
        height: 18px;
        border-radius: var(--radius-xs);
        background: var(--canvas-surface);
        border: 1px solid var(--canvas-border);
        color: var(--canvas-text-muted);
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .step-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .step-count {
        font-size: 10px;
        background: var(--canvas-bg);
        color: var(--canvas-text-muted);
        padding: 1px 5px;
        border-radius: var(--radius-xs);
        margin-left: auto;
      }
    }

    .step-divider {
      width: 1px;
      height: 16px;
      background: var(--canvas-border);
      flex-shrink: 0;
    }

    /* Section Lead */
    .section-lead {
      margin-bottom: 8px;

      .lead-title {
        margin: 0 0 4px;
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
    }

    .section-lead-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      gap: 12px;

      .lead-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    /* Schema Suggestions Bar */
    .schema-suggestions-bar {
      padding: 8px 10px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border-subtle);
      border-radius: var(--radius-sm);
      margin-bottom: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;

      .suggestion-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--canvas-text-secondary);
      }

      .suggestion-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;

        .btn-add-schema-prop {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 22px;
          padding: 0 8px;
          background: var(--canvas-surface-elevated);
          border: 1px solid var(--canvas-border);
          border-radius: var(--radius-xs);
          color: var(--canvas-text-primary);
          font-size: 11px;
          cursor: pointer;
          transition: background 0.1s ease, border-color 0.1s ease, color 0.1s ease;

          &:hover {
            background: rgba(88, 166, 255, 0.15);
            border-color: var(--canvas-text-link);
            color: var(--canvas-text-link);
          }

          mat-icon {
            font-size: 13px !important;
            width: 13px !important;
            height: 13px !important;
            line-height: 13px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .prop-type {
            color: var(--canvas-text-muted);
            font-size: 10px;
          }
        }
      }
    }

    /* Form Grid */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 16px;
      width: 100%;
      min-width: 0;

      .full-width {
        grid-column: 1 / -1;
      }
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      width: 100%;

      .field-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--canvas-text-secondary);

        .required {
          color: var(--color-danger);
        }
      }

      .field-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .field-hint {
        font-size: 11px;
        color: var(--canvas-text-muted);
      }

      .field-error {
        font-size: 11px;
        color: var(--color-danger);
      }
    }

    .form-control {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      height: 28px;
      padding: 0 8px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      color: var(--canvas-text-primary);
      font-size: 12px;
      outline: none;
      transition: border-color 0.12s ease;
      text-overflow: ellipsis;

      &:focus {
        border-color: var(--canvas-text-link);
      }

      &::placeholder {
        color: var(--canvas-text-muted);
      }
    }

    .textarea-control {
      height: auto;
      padding: 6px 8px;
      resize: vertical;
      font-family: inherit;
    }

    .slug-input-wrapper {
      display: flex;
      align-items: center;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      width: 100%;
      box-sizing: border-box;

      &:focus-within {
        border-color: var(--canvas-text-link);
      }

      .slug-prefix {
        padding: 0 6px 0 8px;
        font-size: 11px;
        color: var(--canvas-text-muted);
        background: var(--canvas-surface-elevated);
        border-right: 1px solid var(--canvas-border);
        height: 28px;
        display: flex;
        align-items: center;
        user-select: none;
        flex-shrink: 0;
      }

      input {
        flex: 1;
        min-width: 0;
        border: none;
        background: transparent;
        height: 28px;
        padding: 0 8px;
        outline: none;
        color: var(--canvas-text-primary);
        font-size: 12px;
      }
    }

    .icon-selector-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;

      .icon-choice-btn {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--canvas-surface);
        border: 1px solid var(--canvas-border-subtle);
        border-radius: var(--radius-sm);
        color: var(--canvas-text-secondary);
        cursor: pointer;
        transition: background 0.1s ease, color 0.1s ease, border-color 0.1s ease;

        &:hover {
          background: var(--canvas-surface-elevated);
          color: var(--canvas-text-primary);
        }

        &.selected {
          background: rgba(88, 166, 255, 0.15);
          border-color: var(--canvas-text-link);
          color: var(--canvas-text-link);
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
    }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-top: 4px;
    }

    .checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--canvas-text-primary);
      cursor: pointer;
      user-select: none;

      input[type="checkbox"] {
        accent-color: var(--canvas-text-link);
      }
    }

    .btn-text-action {
      background: transparent;
      border: none;
      padding: 0;
      color: var(--canvas-text-link);
      font-size: 11px;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    .btn-secondary-action {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 26px;
      padding: 0 8px;
      background: var(--canvas-surface-elevated);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      color: var(--canvas-text-primary);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.12s ease;

      &:hover:not(:disabled) {
        background: var(--action-hover-surface);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      mat-icon {
        font-size: 14px !important;
        width: 14px !important;
        height: 14px !important;
        line-height: 14px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
    }

    /* Metrics List */
    .metrics-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 380px;
      overflow-y: auto;
      padding-right: 4px;
      width: 100%;
      min-width: 0;
    }

    .metric-card-editor {
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      box-sizing: border-box;
      min-width: 0;
    }

    .metric-editor-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--canvas-border-subtle);
      padding-bottom: 6px;

      .metric-num-title {
        display: flex;
        align-items: center;
        gap: 6px;

        .order-badge {
          font-size: 10px;
          background: var(--canvas-surface-elevated);
          padding: 1px 4px;
          border-radius: var(--radius-xs);
          color: var(--canvas-text-muted);
        }

        .metric-preview-label {
          font-size: 12px;
          font-weight: 600;
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
        &.col-th-actions { width: 44px; text-align: right; }
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
        font-size: 11px;
      }

      .order-btns-col {
        display: flex;
        flex-direction: column;
        gap: 1px;
        align-items: center;
      }

      .btn-icon-micro {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 16px;
        padding: 0;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--radius-xs);
        color: var(--canvas-text-muted);
        cursor: pointer;

        &:hover:not(:disabled) {
          background: var(--canvas-surface-elevated);
          border-color: var(--canvas-border);
          color: var(--canvas-text-primary);
        }

        &:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        mat-icon {
          font-size: 14px !important;
          width: 14px !important;
          height: 14px !important;
          line-height: 14px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
      }

      .btn-icon-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--radius-sm);
        color: var(--canvas-text-muted);
        cursor: pointer;
        transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;

        &:hover:not(:disabled) {
          background: var(--canvas-surface-elevated);
          border-color: var(--canvas-border);
          color: var(--canvas-text-primary);
        }

        &.btn-danger:hover:not(:disabled) {
          background: rgba(248, 81, 73, 0.15);
          border-color: rgba(248, 81, 73, 0.35);
          color: var(--color-danger);
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
    }

    .pagination-settings-card {
      margin-top: 12px;
      padding: 10px 12px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border-subtle);
      border-radius: var(--radius-sm);

      .settings-card-title {
        margin: 0 0 8px;
        font-size: 12px;
        font-weight: 600;
        color: var(--canvas-text-primary);
      }
    }

    /* Filters & Actions */
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
  readonly draftService = inject(PageDraftService);

  readonly availableIcons = AVAILABLE_PAGE_ICONS;
  readonly currentStep = signal<WizardStep>(1);

  readonly formChange = output<Partial<UiPageConfiguration>>();

  private loadedPageId: string | null = null;

  readonly availableResources = computed<ApiResource[]>(() => {
    return this.draftService.apiDefinition()?.resources ?? [];
  });

  readonly currentValidation = this.draftService.validationResult;

  readonly form: FormGroup = this.fb.group({
    id: [''],
    resourceId: ['', Validators.required],
    title: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    icon: ['table_chart'],
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
    searchFields: [[] as string[]],
    metrics: this.fb.array([]),
    columns: this.fb.array([])
  });

  get metricsArray(): FormArray {
    return this.form.get('metrics') as FormArray;
  }

  get columnsArray(): FormArray {
    return this.form.get('columns') as FormArray;
  }

  /**
   * Computed list of all properties defined in the OpenAPI schema of the active resource.
   */
  readonly availableSchemaProperties = computed<SchemaPropertyOption[]>(() => {
    const resId = this.form.get('resourceId')?.value;
    if (!resId) return [];
    const resource = this.availableResources().find((r) => r.id === resId || r.name === resId);
    if (!resource) return [];

    const listOp = resource.operations.find((o) => o.method === 'GET' && !o.path.includes('{')) || resource.operations.find((o) => o.method === 'GET');
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

  goToStep(step: WizardStep): void {
    this.currentStep.set(step);
  }

  populateForm(page: UiPageConfiguration): void {
    this.form.patchValue({
      id: page.id || '',
      resourceId: page.resourceId || '',
      title: page.title || '',
      slug: page.slug || '',
      icon: page.icon || 'table_chart',
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
      searchFields: page.filters?.searchFields ? [...page.filters.searchFields] : []
    }, { emitEvent: false });

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
    this.columnsArray.push(this.createColumnGroup({
      field: '',
      label: '',
      type: 'text',
      sortable: true
    }));
    this.markDirty();
  }

  addSchemaPropertyAsColumn(prop: SchemaPropertyOption): void {
    this.columnsArray.push(this.createColumnGroup({
      field: prop.key,
      label: prop.label,
      type: this.inferColumnTypeFromSchema(prop.key, prop.schema),
      sortable: true
    }));
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
    // If slug is empty or matches auto pattern, auto sync
    if (!currentSlug || currentSlug === this.slugify(titleVal.slice(0, -1))) {
      this.form.get('slug')?.setValue(this.slugify(titleVal));
    }
    this.markDirty();
  }

  autoGenerateSlug(): void {
    const title = this.form.get('title')?.value || this.form.get('resourceId')?.value || 'pagina';
    this.form.get('slug')?.setValue(this.slugify(title));
    this.markDirty();
  }

  onResourceChanged(): void {
    const resId = this.form.get('resourceId')?.value;
    const resource = this.availableResources().find((r) => r.id === resId || r.name === resId);
    if (!resource) return;

    // Suggest defaults if title is empty or default
    const titleCtrl = this.form.get('title');
    if (!titleCtrl?.value || titleCtrl.value === 'Página') {
      titleCtrl?.setValue(resource.label || resource.name);
      this.autoGenerateSlug();
    }

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
      description: val.description,
      isDefault: val.isDefault,
      default: val.isDefault,
      hidden: val.hidden,
      resourceId: val.resourceId,
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
        primaryCreateLabel: val.primaryCreateLabel || undefined,
        rowActions: {
          ...(existing?.actions?.rowActions || {}),
          viewDetails: val.actionViewDetails,
          edit: val.actionEdit,
          delete: val.actionDelete
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
    if (lower.includes('price') || lower.includes('amount') || lower.includes('total') || lower.includes('cost') || lower.includes('valor')) {
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
