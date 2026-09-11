import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingIndicatorComponent } from '../../../../shared/components/loading-indicator/loading-indicator.component';
import {
  DynamicTableComponent,
  TableActionConfig
} from '../../../../dynamic-ui/dynamic-table/dynamic-table.component';
import { TableColumnDescriptor } from '../../../../dynamic-ui/dynamic-table/table-schema.service';
import {
  UiPageConfiguration
} from '../../../../core/models/ui-configuration.model';
import { ResolvedResourcePage } from '../../../../core/models/resolved-resource-page.model';
import {
  ResourcePageError,
  ResourcePageStatus
} from '../../models/resource-page-state.model';
import {
  CalculatedMetric,
  UiMetricEvaluatorService
} from '../../../../core/services/ui-metric-evaluator.service';
import { ResolvedFilterBinding } from '../../../../core/services/list-query-binding.service';

@Component({
  selector: 'app-resource-page-content',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    EmptyStateComponent,
    LoadingIndicatorComponent,
    DynamicTableComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="resource-page-root">
      <!-- Header do Recurso -->
      <header class="resource-header">
        <div class="header-left">
          <div class="title-row">
            <mat-icon class="title-icon">{{ page().icon || 'table_chart' }}</mat-icon>
            <h1 class="page-title">{{ page().title || 'Recurso' }}</h1>
            @if (page().resourceId) {
              <span class="resource-badge font-mono">{{ page().resourceId }}</span>
            }
          </div>
          @if (page().description) {
            <p class="page-description">{{ page().description }}</p>
          }
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="btn-action-secondary"
            (click)="editPage.emit()"
            aria-label="Editar página"
            title="Editar configuração da página"
          >
            <mat-icon class="action-btn-icon">tune</mat-icon>
            <span>Editar página</span>
          </button>

          <button
            type="button"
            class="btn-action-secondary"
            (click)="refresh.emit()"
            [disabled]="status() === 'loading' || isRefreshing()"
            aria-label="Recarregar dados"
            title="Recarregar dados da lista"
          >
            <mat-icon
              class="action-btn-icon"
              [class.rotating]="isRefreshing()"
            >refresh</mat-icon>
            <span>{{ isRefreshing() ? 'Recarregando...' : 'Recarregar' }}</span>
          </button>

          @if (canCreate()) {
            <button
              type="button"
              class="btn-action-primary"
              (click)="createItem.emit()"
              [attr.aria-label]="createButtonLabel()"
            >
              <mat-icon class="action-btn-icon">add</mat-icon>
              <span>{{ createButtonLabel() }}</span>
            </button>
          }
        </div>
      </header>

      <!-- Métricas Operacionais (quando configuradas) -->
      @if (metricsList().length > 0) {
        <section class="metrics-grid" aria-label="Métricas do recurso">
          @for (metric of metricsList(); track metric.label) {
            <div class="metric-card">
              <div class="metric-header">
                @if (metric.icon) {
                  <mat-icon class="metric-icon" [ngClass]="metric.colorClass">{{ metric.icon }}</mat-icon>
                }
                <span class="metric-label">{{ metric.label }}</span>
              </div>
              <div class="metric-value font-mono" [ngClass]="metric.colorClass">
                {{ metric.formattedValue || metric.value }}
              </div>
              @if (metric.description) {
                <span class="metric-hint">{{ metric.description }}</span>
              }
            </div>
          }
        </section>
      }

      <!-- Barra de Ferramentas / Filtros / Busca / Total de Registros -->
      <div class="resource-toolbar">
        <div class="toolbar-left">
          <!-- Busca Textual com Debounce -->
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              type="text"
              class="search-input"
              [placeholder]="searchPlaceholder()"
              [ngModel]="localSearchTerm()"
              (ngModelChange)="onSearchInput($event)"
              aria-label="Buscar registros"
            />
            @if (localSearchTerm()) {
              <button
                type="button"
                class="btn-clear-search"
                (click)="onClearSearch()"
                aria-label="Limpar busca"
                title="Limpar busca"
              >
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>

          <!-- Filtros Select Dinâmicos (Gerados a partir de schemas/bindings) -->
          @if (filterBindings().length > 0) {
            <div class="filters-group" role="group" aria-label="Filtros de consulta">
              @for (binding of filterBindings(); track binding.name) {
                @if (binding.type === 'select' && binding.options.length > 0) {
                  <div class="filter-control">
                    <label class="filter-label" [for]="'filter-' + binding.name">{{ binding.label }}:</label>
                    <select
                      [id]="'filter-' + binding.name"
                      class="filter-select"
                      [value]="getFilterValue(binding.name)"
                      (change)="onSelectFilterChange(binding.name, $event)"
                      [attr.aria-label]="binding.label"
                    >
                      <option value="" [selected]="!getFilterValue(binding.name)">Todos</option>
                      @for (opt of binding.options; track opt.label) {
                        <option [value]="opt.value" [selected]="getFilterValue(binding.name) === '' + opt.value">{{ opt.label }}</option>
                      }
                    </select>
                  </div>
                }
              }
            </div>
          }

          <!-- Botão Reset de Filtros -->
          @if (hasActiveFilters()) {
            <button
              type="button"
              class="btn-reset-filters"
              (click)="resetFilters.emit()"
              title="Limpar todos os filtros e ordenações"
              aria-label="Limpar filtros"
            >
              <mat-icon class="reset-icon">filter_alt_off</mat-icon>
              <span>Limpar filtros</span>
            </button>
          }
        </div>

        <div class="toolbar-right">
          <span class="records-count font-mono" aria-label="Total de registros">
            {{ totalCount() }} {{ totalCount() === 1 ? 'registro' : 'registros' }}
          </span>
        </div>
      </div>

      <!-- Área de Dados e Estados -->
      <main class="content-body" role="region" [attr.aria-label]="page().title">
        @if (status() === 'loading') {
          <!-- Loading State -->
          <div class="state-container" aria-label="Carregando dados">
            <app-loading-indicator label="Carregando registros..." />
          </div>
        } @else if (status() === 'error') {
          <!-- Error State com Retry e Link para API Explorer -->
          <div class="error-state-card" role="alert">
            <div class="error-icon-box">
              <mat-icon class="error-hero-icon">error_outline</mat-icon>
            </div>
            <h3 class="error-title">Falha ao carregar registros</h3>
            <p class="error-message">{{ error()?.message || 'Ocorreu um erro ao processar a requisição.' }}</p>
            @if (error()?.hint) {
              <p class="error-hint">{{ error()?.hint }}</p>
            }
            <div class="error-actions">
              <button
                type="button"
                class="btn-action-primary"
                (click)="retry.emit()"
                aria-label="Tentar novamente"
              >
                <mat-icon class="action-btn-icon">refresh</mat-icon>
                <span>Tentar novamente</span>
              </button>
              <button
                type="button"
                class="btn-action-secondary"
                (click)="openExplorer.emit()"
                aria-label="Abrir no API Explorer"
              >
                <mat-icon class="action-btn-icon">code</mat-icon>
                <span>Abrir no API Explorer</span>
              </button>
            </div>
          </div>
        } @else if (status() === 'idle') {
          <!-- Idle / AutoLoad False State -->
          <div class="idle-state-container">
            <app-empty-state
              icon="touch_app"
              title="Carga de dados sob demanda"
              description="O carregamento automático inicial está desativado para esta página."
            >
              <button
                type="button"
                class="btn-action-primary"
                (click)="refresh.emit()"
                aria-label="Carregar dados agora"
              >
                <mat-icon class="action-btn-icon">refresh</mat-icon>
                <span>Carregar dados</span>
              </button>
            </app-empty-state>
          </div>
        } @else if (status() === 'empty' || items().length === 0) {
          <!-- Empty State -->
          <div class="empty-state-container">
            <app-empty-state
              icon="inbox"
              title="Nenhum registro encontrado"
              description="Não há dados cadastrados para este recurso ou nenhum registro correspondeu à busca."
            >
              <div class="empty-action-row">
                @if (canCreate()) {
                  <button
                    type="button"
                    class="btn-action-primary"
                    (click)="createItem.emit()"
                    aria-label="Adicionar registro"
                  >
                    <mat-icon class="action-btn-icon">add</mat-icon>
                    <span>{{ createButtonLabel() }}</span>
                  </button>
                }
                @if (hasActiveFilters()) {
                  <button
                    type="button"
                    class="btn-action-secondary"
                    (click)="resetFilters.emit()"
                    aria-label="Limpar filtros aplicados"
                  >
                    <mat-icon class="action-btn-icon">filter_alt_off</mat-icon>
                    <span>Limpar Filtros</span>
                  </button>
                }
                <button
                  type="button"
                  class="btn-action-secondary"
                  (click)="openExplorer.emit()"
                  aria-label="Inspecionar no API Explorer"
                >
                  <mat-icon class="action-btn-icon">code</mat-icon>
                  <span>Inspecionar no Explorer</span>
                </button>
              </div>
            </app-empty-state>
          </div>
        } @else {
          <!-- Success State: Dynamic Table Full-Height -->
          <div class="table-container">
            <app-dynamic-table
              [data]="items()"
              [columns]="columns()"
              [totalCount]="totalCount()"
              [loading]="isRefreshing()"
              layoutMode="full-height"
              [showActions]="rowActions().length > 0"
              [actions]="rowActions()"
              [sortField]="sortField()"
              [sortOrder]="sortOrder()"
              (sortChange)="sortChange.emit($event)"
              (rowView)="rowView.emit($event)"
              (rowEdit)="rowEdit.emit($event)"
              (rowDelete)="rowDelete.emit($event)"
              (rowSelect)="rowSelect.emit($event)"
              (rowAction)="rowAction.emit($event)"
            />

            <!-- Rodapé Operacional / Controles de Paginação -->
            <footer class="table-footer-bar">
              <div class="footer-left">
                <span class="meta-item font-mono">
                  Exibindo <strong>{{ items().length }}</strong> de <strong>{{ totalCount() }}</strong>
                </span>
                @if (lastExecutionDurationMs()) {
                  <span class="meta-separator">·</span>
                  <span class="meta-item font-mono text-muted">
                    {{ lastExecutionDurationMs() }}ms
                  </span>
                }
              </div>

              <div class="footer-pagination">
                <!-- Seletor de Page Size -->
                <div class="page-size-control">
                  <span class="page-size-label">Linhas por pág:</span>
                  <select
                    class="page-size-select"
                    [value]="pageSize()"
                    (change)="onPageSizeChange($event)"
                    aria-label="Quantidade de linhas por página"
                  >
                    @for (sizeOpt of pageSizeOptions(); track sizeOpt) {
                      <option [value]="sizeOpt">{{ sizeOpt }}</option>
                    }
                  </select>
                </div>

                <!-- Botões de Navegação -->
                <div class="pagination-nav">
                  <button
                    type="button"
                    class="btn-page-nav"
                    [disabled]="currentPage() <= 1 || isRefreshing()"
                    (click)="pageChange.emit(currentPage() - 1)"
                    aria-label="Página anterior"
                    title="Página anterior"
                  >
                    <mat-icon>chevron_left</mat-icon>
                  </button>

                  <span class="page-number-display font-mono">
                    {{ currentPage() }} / {{ totalPages() }}
                  </span>

                  <button
                    type="button"
                    class="btn-page-nav"
                    [disabled]="currentPage() >= totalPages() || isRefreshing()"
                    (click)="pageChange.emit(currentPage() + 1)"
                    aria-label="Próxima página"
                    title="Próxima página"
                  >
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                </div>
              </div>
            </footer>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .resource-page-root {
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: 100%;
      min-height: 0;
      background: var(--canvas-bg);
      color: var(--canvas-text-primary);
    }

    /* --- Header do Recurso --- */
    .resource-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-shrink: 0;

      .header-left {
        min-width: 0;

        .title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;

          .title-icon {
            font-size: 22px;
            width: 22px;
            height: 22px;
            color: var(--canvas-text-link, #58a6ff);
            flex-shrink: 0;
          }

          .page-title {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: var(--canvas-text-primary, #e6edf3);
            letter-spacing: -0.2px;
            line-height: 1.2;
          }

          .resource-badge {
            font-size: 11px;
            color: var(--canvas-text-muted, #6e7681);
            background: var(--canvas-surface-elevated, #21262d);
            border: 1px solid var(--canvas-border-subtle, #21262d);
            padding: 1px 6px;
            border-radius: var(--radius-sm, 4px);
          }
        }

        .page-description {
          margin: 0;
          font-size: 13px;
          color: var(--canvas-text-secondary, #8b949e);
          line-height: 1.4;
        }
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
    }

    /* --- Botões de Ação --- */
    .btn-action-secondary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 10px;
      background: var(--canvas-surface, #161b22);
      border: 1px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-sm, 4px);
      color: var(--canvas-text-secondary, #8b949e);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
      outline: none;

      &:hover:not(:disabled) {
        background: var(--canvas-surface-elevated, #21262d);
        color: var(--canvas-text-primary, #e6edf3);
        border-color: var(--canvas-border, #30363d);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline: 2px solid var(--canvas-text-link, #58a6ff);
        outline-offset: -2px;
      }

      .action-btn-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--canvas-text-muted, #6e7681);

        &.rotating {
          animation: spin 1s linear infinite;
        }
      }
    }

    .btn-action-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 12px;
      background: var(--color-info, #1f6feb);
      color: #ffffff;
      border: 1px solid transparent;
      border-radius: var(--radius-sm, 4px);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.12s ease, filter 0.12s ease;
      outline: none;

      &:hover:not(:disabled) {
        filter: brightness(1.1);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline: 2px solid var(--canvas-text-link, #58a6ff);
        outline-offset: 2px;
      }

      .action-btn-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    @keyframes spin {
      100% {
        transform: rotate(360deg);
      }
    }

    /* --- Grid de Métricas --- */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      flex-shrink: 0;
    }

    .metric-card {
      background: var(--canvas-surface, #161b22);
      border: 1px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-md, 6px);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .metric-header {
        display: flex;
        align-items: center;
        gap: 6px;

        .metric-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }

        .metric-label {
          font-size: 12px;
          color: var(--canvas-text-secondary, #8b949e);
          font-weight: 500;
        }
      }

      .metric-value {
        font-size: 20px;
        font-weight: 700;
        line-height: 1.2;
        color: var(--canvas-text-primary, #e6edf3);
      }

      .metric-hint {
        font-size: 11px;
        color: var(--canvas-text-muted, #6e7681);
      }
    }

    /* Cores Semânticas para Métricas */
    .color-default {
      color: var(--canvas-text-primary, #e6edf3);
    }
    .color-primary {
      color: var(--canvas-text-link, #58a6ff);
    }
    .color-warning {
      color: var(--color-warning, #d29922);
    }
    .color-info {
      color: var(--color-info, #58a6ff);
    }
    .color-success {
      color: var(--color-success, #2ea043);
    }
    .color-danger {
      color: var(--color-danger, #f85149);
    }

    /* --- Toolbar / Filtros --- */
    .resource-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-shrink: 0;
      flex-wrap: wrap;

      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        flex: 1;
      }

      .search-box {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
        max-width: 280px;

        .search-icon {
          position: absolute;
          left: 9px;
          font-size: 15px;
          width: 15px;
          height: 15px;
          color: var(--canvas-text-muted, #6e7681);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          height: 28px;
          padding: 0 26px 0 28px;
          background: var(--canvas-surface, #161b22);
          border: 1px solid var(--canvas-border, #30363d);
          border-radius: var(--radius-sm, 4px);
          color: var(--canvas-text-primary, #e6edf3);
          font-size: 12px;
          outline: none;
          transition: border-color 0.12s ease;

          &::placeholder {
            color: var(--canvas-text-muted, #6e7681);
          }

          &:focus {
            border-color: var(--canvas-text-link, #58a6ff);
          }
        }

        .btn-clear-search {
          position: absolute;
          right: 4px;
          background: transparent;
          border: none;
          color: var(--canvas-text-muted, #6e7681);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;

          &:hover {
            color: var(--canvas-text-primary, #e6edf3);
          }

          mat-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
          }
        }
      }

      .filters-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;

        .filter-control {
          display: flex;
          align-items: center;
          gap: 6px;

          .filter-label {
            font-size: 11px;
            color: var(--canvas-text-secondary, #8b949e);
            white-space: nowrap;
          }

          .filter-select {
            height: 28px;
            background: var(--canvas-surface, #161b22);
            border: 1px solid var(--canvas-border, #30363d);
            border-radius: var(--radius-sm, 4px);
            color: var(--canvas-text-primary, #e6edf3);
            font-size: 11px;
            padding: 0 8px;
            outline: none;
            cursor: pointer;

            &:focus {
              border-color: var(--canvas-text-link, #58a6ff);
            }
          }
        }
      }

      .btn-reset-filters {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 26px;
        padding: 0 8px;
        background: transparent;
        border: 1px dashed var(--canvas-border, #30363d);
        border-radius: var(--radius-sm, 4px);
        color: var(--canvas-text-muted, #6e7681);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.12s ease;

        &:hover {
          color: var(--color-danger, #f85149);
          border-color: var(--color-danger, #f85149);
          background: rgba(248, 81, 73, 0.08);
        }

        .reset-icon {
          font-size: 13px;
          width: 13px;
          height: 13px;
        }
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 12px;

        .records-count {
          font-size: 12px;
          color: var(--canvas-text-secondary, #8b949e);
          white-space: nowrap;
        }
      }
    }

    /* --- Content Body --- */
    .content-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      position: relative;
    }

    .table-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      gap: 8px;

      app-dynamic-table {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
    }

    /* Rodapé Operacional com Paginação */
    .table-footer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      background: var(--canvas-surface, #161b22);
      border: 1px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-sm, 4px);
      font-size: 11px;
      color: var(--canvas-text-secondary, #8b949e);
      flex-shrink: 0;

      .footer-left {
        display: flex;
        align-items: center;
        gap: 6px;

        .meta-separator {
          color: var(--canvas-text-muted, #6e7681);
        }

        .text-muted {
          color: var(--canvas-text-muted, #6e7681);
        }
      }

      .footer-pagination {
        display: flex;
        align-items: center;
        gap: 14px;

        .page-size-control {
          display: flex;
          align-items: center;
          gap: 6px;

          .page-size-label {
            color: var(--canvas-text-muted, #6e7681);
            font-size: 11px;
          }

          .page-size-select {
            height: 24px;
            background: var(--canvas-surface-elevated, #21262d);
            border: 1px solid var(--canvas-border, #30363d);
            border-radius: var(--radius-sm, 4px);
            color: var(--canvas-text-primary, #e6edf3);
            font-size: 11px;
            padding: 0 4px;
            outline: none;
            cursor: pointer;
          }
        }

        .pagination-nav {
          display: flex;
          align-items: center;
          gap: 4px;

          .btn-page-nav {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            background: var(--canvas-surface-elevated, #21262d);
            border: 1px solid var(--canvas-border, #30363d);
            border-radius: var(--radius-sm, 4px);
            color: var(--canvas-text-primary, #e6edf3);
            cursor: pointer;
            transition: background 0.1s ease;

            &:hover:not(:disabled) {
              background: var(--canvas-border, #30363d);
            }

            &:disabled {
              opacity: 0.35;
              cursor: not-allowed;
            }

            mat-icon {
              font-size: 16px;
              width: 16px;
              height: 16px;
            }
          }

          .page-number-display {
            padding: 0 6px;
            color: var(--canvas-text-primary, #e6edf3);
            font-size: 11px;
            min-width: 44px;
            text-align: center;
          }
        }
      }
    }

    /* --- Estados --- */
    .state-container,
    .empty-state-container,
    .idle-state-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--canvas-surface, #161b22);
      border: 1px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-md, 6px);
      padding: 32px;
      min-height: 260px;
    }

    .empty-action-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8px;
    }

    /* Card de Erro */
    .error-state-card {
      background: var(--canvas-surface, #161b22);
      border: 1px solid rgba(248, 81, 73, 0.3);
      border-radius: var(--radius-md, 6px);
      padding: 36px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 260px;

      .error-icon-box {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-md, 6px);
        background: rgba(248, 81, 73, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;

        .error-hero-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
          color: var(--color-danger, #f85149);
        }
      }

      .error-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--canvas-text-primary, #e6edf3);
        margin: 0 0 6px;
      }

      .error-message {
        font-size: 13px;
        color: var(--canvas-text-secondary, #8b949e);
        margin: 0 0 8px;
        max-width: 520px;
      }

      .error-hint {
        font-size: 11px;
        color: var(--canvas-text-muted, #6e7681);
        margin: 0 0 20px;
        max-width: 480px;
      }

      .error-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
    }

    @media (max-width: 768px) {
      .resource-header {
        flex-direction: column;
        align-items: flex-start;

        .header-actions {
          width: 100%;
          flex-wrap: wrap;
        }
      }

      .resource-toolbar {
        flex-direction: column;
        align-items: stretch;

        .search-box {
          max-width: none;
        }
      }

      .table-footer-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;

        .footer-pagination {
          justify-content: space-between;
        }
      }
    }
  `]
})
export class ResourcePageContentComponent implements OnInit, OnDestroy {
  readonly page = input.required<UiPageConfiguration>();
  readonly resolvedPage = input<ResolvedResourcePage | null>(null);
  readonly items = input<unknown[]>([]);
  readonly totalCount = input<number>(0);
  readonly status = input<ResourcePageStatus>('idle');
  readonly error = input<ResourcePageError | null>(null);
  readonly columns = input<TableColumnDescriptor[]>([]);
  readonly rowActions = input<TableActionConfig[]>([]);
  readonly lastExecutionDurationMs = input<number | undefined>(undefined);
  readonly isRefreshing = input<boolean>(false);
  readonly searchTerm = input<string>('');

  // Pagination & Filtering Inputs
  readonly currentPage = input<number>(1);
  readonly pageSize = input<number>(10);
  readonly totalPages = input<number>(1);
  readonly pageSizeOptions = input<number[]>([10, 25, 50, 100]);
  readonly filterBindings = input<ResolvedFilterBinding[]>([]);
  readonly activeFilters = input<Record<string, unknown>>({});
  readonly sortField = input<string | null>(null);
  readonly sortOrder = input<'asc' | 'desc' | null>(null);
  readonly hasActiveFilters = input<boolean>(false);

  // Outputs
  readonly refresh = output<void>();
  readonly retry = output<void>();
  readonly editPage = output<void>();
  readonly createItem = output<void>();
  readonly openExplorer = output<void>();
  readonly searchChange = output<string>();
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly filterChange = output<{ key: string; value: unknown }>();
  readonly resetFilters = output<void>();
  readonly sortChange = output<{ field: string | null; order: 'asc' | 'desc' | null }>();
  readonly rowView = output<unknown>();
  readonly rowEdit = output<unknown>();
  readonly rowDelete = output<unknown>();
  readonly rowSelect = output<unknown>();
  readonly rowAction = output<{ action: string; row: unknown; event: MouseEvent }>();

  private readonly metricEvaluator = inject(UiMetricEvaluatorService);

  // Debounce pipeline for search input
  readonly localSearchTerm = signal<string>('');
  private readonly searchInput$ = new Subject<string>();
  private readonly subs = new Subscription();

  readonly searchPlaceholder = computed<string>(() => {
    return (
      this.page().filters?.searchPlaceholder ||
      `Buscar em ${this.page().title || 'registros'}...`
    );
  });

  readonly createButtonLabel = computed<string>(() => {
    if (this.page().actions?.primaryCreateLabel) {
      return this.page().actions!.primaryCreateLabel!;
    }
    const title = this.page().title;
    return title ? `Adicionar ${title.toLowerCase()}` : 'Adicionar item';
  });

  readonly metricsList = computed<CalculatedMetric[]>(() => {
    return this.metricEvaluator.evaluateMetrics(
      this.page().metrics,
      this.items(),
      this.totalCount()
    );
  });

  readonly canCreate = computed<boolean>(() => {
    return Boolean(this.resolvedPage()?.create);
  });

  ngOnInit(): void {
    // Sync initial search term
    this.localSearchTerm.set(this.searchTerm() || '');

    // Setup 300ms debounce pipeline
    this.subs.add(
      this.searchInput$
        .pipe(
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe((term) => {
          this.searchChange.emit(term);
        })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.searchInput$.complete();
  }

  onSearchInput(value: string): void {
    const val = value ?? '';
    this.localSearchTerm.set(val);
    this.searchInput$.next(val);
  }

  onClearSearch(): void {
    this.localSearchTerm.set('');
    this.searchChange.emit('');
  }

  getFilterValue(key: string): string {
    const val = this.activeFilters()?.[key];
    return val !== undefined && val !== null ? String(val) : '';
  }

  onSelectFilterChange(key: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target ? target.value : '';
    this.filterChange.emit({ key, value: val });
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target ? Number(target.value) : 10;
    if (!isNaN(val) && val > 0) {
      this.pageSizeChange.emit(val);
    }
  }
}

