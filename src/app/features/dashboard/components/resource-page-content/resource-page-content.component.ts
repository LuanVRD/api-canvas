import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  UiMetricConfiguration,
  UiPageConfiguration
} from '../../../../core/models/ui-configuration.model';
import { ResolvedResourcePage } from '../../../../core/models/resolved-resource-page.model';
import {
  ResourcePageError,
  ResourcePageStatus
} from '../../models/resource-page-state.model';

export interface CalculatedMetric {
  id?: string;
  label: string;
  icon?: string;
  value: string | number;
  colorClass: string;
  description?: string;
}

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

          <button
            type="button"
            class="btn-action-primary"
            (click)="createItem.emit()"
            [attr.aria-label]="createButtonLabel()"
          >
            <mat-icon class="action-btn-icon">add</mat-icon>
            <span>{{ createButtonLabel() }}</span>
          </button>
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
                {{ metric.value }}
              </div>
              @if (metric.description) {
                <span class="metric-hint">{{ metric.description }}</span>
              }
            </div>
          }
        </section>
      }

      <!-- Barra de Ferramentas / Filtro Rápido / Total de Registros -->
      <div class="resource-toolbar">
        <div class="search-box">
          <mat-icon class="search-icon">search</mat-icon>
          <input
            type="text"
            class="search-input"
            [placeholder]="searchPlaceholder()"
            [ngModel]="searchTerm()"
            (ngModelChange)="onSearchInput($event)"
            aria-label="Buscar registros"
          />
        </div>

        <div class="toolbar-meta">
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
                <button
                  type="button"
                  class="btn-action-primary"
                  (click)="createItem.emit()"
                  aria-label="Adicionar registro"
                >
                  <mat-icon class="action-btn-icon">add</mat-icon>
                  <span>{{ createButtonLabel() }}</span>
                </button>
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
              (rowView)="rowView.emit($event)"
              (rowEdit)="rowEdit.emit($event)"
              (rowDelete)="rowDelete.emit($event)"
              (rowSelect)="rowSelect.emit($event)"
            />
            <div class="table-meta-footer">
              <span class="meta-item font-mono">
                Total carregado: <strong>{{ items().length }}</strong> de <strong>{{ totalCount() }}</strong>
              </span>
              @if (lastExecutionDurationMs()) {
                <span class="meta-item font-mono text-muted">
                  Tempo: {{ lastExecutionDurationMs() }}ms
                </span>
              }
            </div>
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
      gap: 16px;
      flex-shrink: 0;

      .search-box {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
        max-width: 360px;

        .search-icon {
          position: absolute;
          left: 10px;
          font-size: 16px;
          width: 16px;
          height: 16px;
          color: var(--canvas-text-muted, #6e7681);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          height: 30px;
          padding: 0 10px 0 32px;
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
      }

      .toolbar-meta {
        display: flex;
        align-items: center;
        gap: 12px;

        .records-count {
          font-size: 12px;
          color: var(--canvas-text-secondary, #8b949e);
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

    .table-meta-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4px;
      font-size: 11px;
      color: var(--canvas-text-secondary, #8b949e);
      flex-shrink: 0;

      .text-muted {
        color: var(--canvas-text-muted, #6e7681);
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
    }
  `]
})
export class ResourcePageContentComponent {
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

  readonly refresh = output<void>();
  readonly retry = output<void>();
  readonly editPage = output<void>();
  readonly createItem = output<void>();
  readonly openExplorer = output<void>();
  readonly searchChange = output<string>();
  readonly rowView = output<unknown>();
  readonly rowEdit = output<unknown>();
  readonly rowDelete = output<unknown>();
  readonly rowSelect = output<unknown>();

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
    const metricsConfig = this.page().metrics;
    if (!metricsConfig || metricsConfig.length === 0) {
      return [];
    }

    const items = this.items();
    const total = this.totalCount();

    return metricsConfig.map((cfg) => {
      let value: string | number = 0;

      if (cfg.type === 'count_all') {
        value = total || items.length;
      } else if (cfg.type === 'count_matching' && cfg.field && cfg.matchingValue !== undefined) {
        value = items.filter((item) => {
          if (item && typeof item === 'object') {
            const val = (item as Record<string, unknown>)[cfg.field!];
            return String(val).toLowerCase() === String(cfg.matchingValue).toLowerCase();
          }
          return false;
        }).length;
      } else if (cfg.type === 'sum_field' && cfg.field) {
        const sum = items.reduce<number>((acc: number, item: unknown) => {
          if (item && typeof item === 'object') {
            const num = Number((item as Record<string, unknown>)[cfg.field!]);
            return acc + (isNaN(num) ? 0 : num);
          }
          return acc;
        }, 0);
        value = sum;
      } else {
        value = total || items.length;
      }

      let colorClass = 'color-default';
      switch (cfg.colorScheme) {
        case 'primary':
          colorClass = 'color-primary';
          break;
        case 'warning':
          colorClass = 'color-warning';
          break;
        case 'info':
          colorClass = 'color-info';
          break;
        case 'success':
          colorClass = 'color-success';
          break;
        case 'danger':
          colorClass = 'color-danger';
          break;
        default:
          colorClass = 'color-default';
          break;
      }

      return {
        id: cfg.id,
        label: cfg.label,
        icon: cfg.icon,
        value,
        colorClass,
        description: cfg.description
      };
    });
  });

  onSearchInput(value: string): void {
    this.searchChange.emit(value);
  }
}
