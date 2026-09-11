import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiContextBarComponent } from '../../shared/components/api-context-bar/api-context-bar.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { DashboardSidebarComponent } from './dashboard-sidebar.component';
import { AuthConfigDialogComponent } from '../workspace/auth-config-dialog.component';
import { ApiSessionService } from '../../core/services/api-session.service';
import { UiConfigurationService } from '../../core/services/ui-configuration.service';
import { UiConfiguration, UiPageConfiguration } from '../../core/models/ui-configuration.model';
import { ResourcePageFacadeService } from './services/resource-page-facade.service';
import { TableActionConfig } from '../../dynamic-ui/dynamic-table/dynamic-table.component';
import { TableSchemaService, TableColumnDescriptor } from '../../dynamic-ui/dynamic-table/table-schema.service';
import { ResourcePageContentComponent } from './components/resource-page-content/resource-page-content.component';
import { CreateRecordDialogComponent } from '../../dynamic-ui/create-dialog/create-record-dialog.component';
import { ApiExecutionResult } from '../../core/models/api-execution-result.model';

/**
 * Dashboard feature page — operational view for custom resource pages.
 *
 * Provides stable URL parameterized routing (/dashboard/:pageSlug), sidebar navigation,
 * default page redirection, invalid slug fallback state, and integration with the active API session.
 * All HTTP execution, caching, mutation listening, errors and loading states are delegated to ResourcePageFacadeService.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    ApiContextBarComponent,
    EmptyStateComponent,
    DashboardSidebarComponent,
    AuthConfigDialogComponent,
    ResourcePageContentComponent,
    CreateRecordDialogComponent
  ],
  providers: [ResourcePageFacadeService],
  template: `
    <div class="dashboard-layout">
      <!-- Context Bar: API Metadata, Auth & Change API -->
      <app-api-context-bar
        (authClick)="isAuthDialogOpen.set(true)"
        (changeApiClick)="onReconnect()"
      />

      <!-- Dashboard Body: Sidebar + Main Content -->
      <div class="dashboard-body">
        <app-dashboard-sidebar
          [pages]="pages()"
          [selectedPageId]="selectedPage()?.id ?? undefined"
          [selectedPageSlug]="selectedPage()?.slug ?? requestedSlug() ?? undefined"
          (pageSelect)="onSelectPage($event)"
          (newPageClick)="onCreatePage()"
          (configurePagesClick)="onConfigurePages()"
        />

        <main class="dashboard-content" role="main">
          @if (pages().length === 0) {
            <!-- Empty state when no custom pages are configured -->
            <section class="unconfigured-state" aria-label="Nenhuma página configurada">
              <div class="unconfigured-card">
                <div class="unconfigured-icon-wrapper">
                  <mat-icon class="unconfigured-hero-icon">dashboard_customize</mat-icon>
                </div>
                <h2 class="unconfigured-title">Nenhuma página configurada</h2>
                <p class="unconfigured-description">
                  O módulo Dashboard permite criar visões operacionais personalizadas para os recursos da sua API, com cards de métricas, filtros rápidos e tabelas sob medida.
                </p>
                <div class="unconfigured-actions">
                  <button
                    type="button"
                    class="btn-primary-action"
                    (click)="onCreatePage()"
                    aria-label="Criar primeira página"
                  >
                    <mat-icon>add</mat-icon>
                    <span>Criar primeira página</span>
                  </button>
                  <button
                    type="button"
                    class="btn-secondary-action"
                    (click)="onOpenExplorer()"
                    aria-label="Abrir no API Explorer"
                  >
                    <mat-icon>code</mat-icon>
                    <span>Explorar Recursos</span>
                  </button>
                </div>
              </div>
            </section>
          } @else if (isInvalidSlug()) {
            <!-- Invalid / Not Found Slug Empty State -->
            <section class="not-found-state" aria-label="Página não encontrada">
              <div class="unconfigured-card">
                <div class="unconfigured-icon-wrapper not-found-icon-wrapper">
                  <mat-icon class="unconfigured-hero-icon not-found-hero-icon">search_off</mat-icon>
                </div>
                <h2 class="unconfigured-title">Página não encontrada</h2>
                <p class="unconfigured-description">
                  A página <strong class="font-mono text-highlight">{{ requestedSlug() }}</strong> não foi encontrada na configuração ativa do dashboard.
                </p>
                <div class="unconfigured-actions">
                  @if (defaultPage()) {
                    <button
                      type="button"
                      class="btn-primary-action"
                      (click)="onGoToDefaultPage()"
                      aria-label="Ir para página inicial do dashboard"
                    >
                      <mat-icon>dashboard</mat-icon>
                      <span>Ir para o Dashboard</span>
                    </button>
                  }
                  <button
                    type="button"
                    class="btn-secondary-action"
                    (click)="onOpenExplorer()"
                    aria-label="Abrir no API Explorer"
                  >
                    <mat-icon>code</mat-icon>
                    <span>Explorar Recursos</span>
                  </button>
                  <button
                    type="button"
                    class="btn-secondary-action"
                    (click)="onCreatePage()"
                    aria-label="Criar nova página"
                  >
                    <mat-icon>add</mat-icon>
                    <span>Nova Página</span>
                  </button>
                </div>
              </div>
            </section>
          } @else if (selectedPage()) {
            <!-- Active Page View via ResourcePageContentComponent -->
            <app-resource-page-content
              [page]="selectedPage()!"
              [resolvedPage]="facade.resolvedPage()"
              [items]="facade.items()"
              [totalCount]="facade.totalCount()"
              [status]="facade.status()"
              [error]="facade.error()"
              [columns]="inferredColumns()"
              [rowActions]="pageRowActions()"
              [lastExecutionDurationMs]="facade.lastExecutionDurationMs()"
              [isRefreshing]="facade.isRefreshing()"
              [searchTerm]="facade.params().searchTerm"
              (refresh)="onRefresh()"
              (retry)="onRetry()"
              (editPage)="onConfigurePages()"
              (createItem)="onCreateItem()"
              (openExplorer)="onOpenExplorer()"
              (searchChange)="onSearchChange($event)"
              (rowView)="onRowView($event)"
              (rowEdit)="onRowEdit($event)"
              (rowDelete)="onRowDelete($event)"
              (rowSelect)="onRowSelect($event)"
            />
          } @else {
            <!-- State when pages exist but none selected (during transition) -->
            <section class="select-page-prompt">
              <app-empty-state
                icon="layers"
                title="Selecione uma Página"
                description="Selecione uma das páginas configuradas na barra lateral para visualizar seu dashboard operacional."
              />
            </section>
          }
        </main>
      </div>

      <!-- Auth Dialog Modal -->
      @if (isAuthDialogOpen()) {
        <app-auth-config-dialog (close)="isAuthDialogOpen.set(false)" />
      }

      <!-- Create Record Dialog Modal -->
      @if (isCreateDialogOpen() && facade.resolvedPage()?.create; as createOp) {
        <app-create-record-dialog
          [operation]="createOp"
          (close)="isCreateDialogOpen.set(false)"
          (created)="onCreateSuccess($event)"
        />
      }
    </div>
  `,
  styles: [`
    .dashboard-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--canvas-bg);
      color: var(--canvas-text-primary);
      overflow: hidden;
    }

    .dashboard-body {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    .dashboard-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px;
      background: var(--canvas-bg);
    }

    /* Unconfigured & Not Found Empty State */
    .unconfigured-state,
    .not-found-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      padding: 32px 16px;
    }

    .unconfigured-card {
      max-width: 520px;
      width: 100%;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-md);
      padding: 36px 28px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: none;
    }

    .unconfigured-icon-wrapper {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-md);
      background: var(--canvas-surface-elevated);
      border: 1px solid var(--canvas-border);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;

      .unconfigured-hero-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--canvas-text-link);
      }

      &.not-found-icon-wrapper {
        .not-found-hero-icon {
          color: var(--canvas-text-muted);
        }
      }
    }

    .unconfigured-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--canvas-text-primary);
      margin: 0 0 8px;
      letter-spacing: -0.2px;
    }

    .unconfigured-description {
      font-size: 13px;
      line-height: 1.6;
      color: var(--canvas-text-secondary);
      margin: 0 0 24px;
      max-width: 440px;
    }

    .text-highlight {
      color: var(--canvas-text-primary);
      background: var(--canvas-surface-elevated);
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--canvas-border-subtle);
    }

    .unconfigured-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn-primary-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 14px;
      background: var(--action-primary);
      color: var(--action-primary-text);
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.12s ease;
      outline: none;

      &:hover {
        background: var(--action-primary-hover);
      }

      &:focus-visible {
        outline: 2px solid var(--canvas-text-link);
        outline-offset: 2px;
      }

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .btn-secondary-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 14px;
      background: var(--canvas-surface-elevated);
      color: var(--canvas-text-primary);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.12s ease, border-color 0.12s ease;
      outline: none;

      &:hover {
        background: var(--action-hover-surface);
        border-color: var(--canvas-border-subtle);
      }

      &:focus-visible {
        outline: 2px solid var(--canvas-text-link);
        outline-offset: 2px;
      }

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--canvas-text-muted);
      }
    }

    .select-page-prompt {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 48px 16px;
    }

    @media (max-width: 768px) {
      .dashboard-content {
        padding: 16px;
      }
    }
  `]
})
export class DashboardPage implements OnInit, OnDestroy {
  private readonly sessionService = inject(ApiSessionService);
  private readonly uiConfigService = inject(UiConfigurationService);
  private readonly tableSchemaService = inject(TableSchemaService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly facade = inject(ResourcePageFacadeService);

  private routeSub?: Subscription;

  readonly isAuthDialogOpen = signal<boolean>(false);
  readonly isCreateDialogOpen = signal<boolean>(false);
  readonly requestedSlug = signal<string | null>(null);

  /**
   * Dynamically inferred column descriptors for the active dashboard page.
   */
  readonly inferredColumns = computed<TableColumnDescriptor[]>(() => {
    const items = this.facade.items();
    const page = this.selectedPage();
    const resolved = this.facade.resolvedPage();
    const schema = resolved?.list?.responses?.[0]?.schema;
    const globalFields = this.sessionService.uiConfiguration()?.fields;

    const resConfig = page
      ? {
          list: {
            columns: page.table?.columns?.map((c) => c.field)
          }
        }
      : null;

    return this.tableSchemaService.inferColumns(items, schema, resConfig, globalFields);
  });

  readonly hasRowActions = computed<boolean>(() => {
    return this.pageRowActions().length > 0;
  });

  readonly pageRowActions = computed<TableActionConfig[]>(() => {
    const page = this.selectedPage();
    const resolved = this.facade.resolvedPage();
    const rowCfg = page?.actions?.rowActions;

    const actions: TableActionConfig[] = [];
    if (resolved?.details || rowCfg?.viewDetails !== false) {
      actions.push({
        id: 'view',
        label: 'Ver detalhes',
        icon: 'visibility',
        tooltip: 'Ver detalhes',
        visible: rowCfg?.viewDetails !== false && !!resolved?.details
      });
    }
    if (resolved?.update || rowCfg?.edit !== false) {
      actions.push({
        id: 'edit',
        label: 'Editar',
        icon: 'edit',
        tooltip: 'Editar registro',
        visible: rowCfg?.edit !== false && !!resolved?.update
      });
    }
    if (resolved?.delete || rowCfg?.delete !== false) {
      actions.push({
        id: 'delete',
        label: 'Excluir',
        icon: 'delete',
        tooltip: 'Excluir registro',
        danger: true,
        visible: rowCfg?.delete !== false && !!resolved?.delete
      });
    }
    return actions;
  });

  /**
   * Computed list of all active custom pages for the connected API.
   */
  readonly pages = computed<UiPageConfiguration[]>(() => {
    const uiConfig = this.sessionService.uiConfiguration();
    const resources = this.sessionService.resources();
    return this.uiConfigService.getCustomPages(uiConfig, resources);
  });

  /**
   * Computed default page to redirect to when navigating directly to /dashboard.
   * Prioritizes isDefault: true / default: true, falling back to the first available page.
   */
  readonly defaultPage = computed<UiPageConfiguration | null>(() => {
    const list = this.pages();
    if (list.length === 0) {
      return null;
    }
    const explicitDefault = list.find((p) => p.isDefault === true || p.default === true);
    return explicitDefault || list[0];
  });

  /**
   * Computed currently resolved page object matching the requested slug or id.
   */
  readonly selectedPage = computed<UiPageConfiguration | null>(() => {
    const list = this.pages();
    if (list.length === 0) {
      return null;
    }
    const slug = this.requestedSlug();
    if (!slug) {
      return null;
    }
    const target = slug.toLowerCase().trim();
    return (
      list.find(
        (p) =>
          p.slug?.toLowerCase() === target ||
          p.id?.toLowerCase() === target ||
          p.resourceId?.toLowerCase() === target
      ) ?? null
    );
  });

  /**
   * True when a page slug was requested in the URL but could not be resolved to any active page.
   */
  readonly isInvalidSlug = computed<boolean>(() => {
    return this.pages().length > 0 && !!this.requestedSlug() && this.selectedPage() === null;
  });

  constructor() {
    // Automatically redirect to default/first page if at root /dashboard and pages are available
    effect(() => {
      const list = this.pages();
      const currentSlug = this.requestedSlug();
      if (!currentSlug && list.length > 0) {
        const def = this.defaultPage();
        const targetSlug = def?.slug || def?.id;
        if (targetSlug) {
          this.router.navigate(['/dashboard', targetSlug], { replaceUrl: true });
        }
      }
    });

    // Synchronize active page with the scoped feature facade
    effect(() => {
      const page = this.selectedPage();
      if (page) {
        this.facade.loadPage(page, { resetParams: true });
      } else {
        this.facade.resetToIdle();
      }
    });
  }

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const pageSlug = params.get('pageSlug') || params.get('pageId');
      if (pageSlug) {
        this.requestedSlug.set(pageSlug);
      } else {
        this.requestedSlug.set(null);
        const def = this.defaultPage();
        const targetSlug = def?.slug || def?.id;
        if (targetSlug) {
          this.router.navigate(['/dashboard', targetSlug], { replaceUrl: true });
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.facade.destroy();
  }

  onSelectPage(page: UiPageConfiguration): void {
    const targetSlug = page.slug || page.id;
    if (targetSlug) {
      this.requestedSlug.set(targetSlug);
      this.router.navigate(['/dashboard', targetSlug]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  onGoToDefaultPage(): void {
    const def = this.defaultPage();
    const targetSlug = def?.slug || def?.id;
    if (targetSlug) {
      this.requestedSlug.set(targetSlug);
      this.router.navigate(['/dashboard', targetSlug]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  onCreatePage(): void {
    const resources = this.sessionService.resources();
    if (resources.length === 0) {
      this.router.navigate(['/workspace']);
      return;
    }

    const currentConfig = this.sessionService.uiConfiguration() || {};
    const existingPages = { ...(currentConfig.pages || {}) };

    // Find first unmapped resource or generate default pages for all discovered resources
    const unmappedResource = resources.find(
      (r) => !Object.values(existingPages).some((p) => p.resourceId === r.id || p.id === r.id)
    );

    let targetSlug: string | undefined;

    if (unmappedResource) {
      const id = `${unmappedResource.id}-page`;
      const slug = unmappedResource.id.toLowerCase();
      existingPages[id] = {
        id,
        resourceId: unmappedResource.id,
        title: unmappedResource.label || unmappedResource.name,
        slug,
        isDefault: Object.keys(existingPages).length === 0,
        icon: 'table_chart',
        order: Object.keys(existingPages).length + 1
      };
      targetSlug = slug;
    } else {
      resources.forEach((r, idx) => {
        const id = `${r.id}-page`;
        const slug = r.id.toLowerCase();
        existingPages[id] = {
          id,
          resourceId: r.id,
          title: r.label || r.name,
          slug,
          isDefault: idx === 0,
          icon: 'table_chart',
          order: idx + 1
        };
        if (idx === 0) {
          targetSlug = slug;
        }
      });
    }

    const newConfig: UiConfiguration = {
      ...currentConfig,
      pages: existingPages
    };

    this.sessionService.replaceUiConfiguration(newConfig);

    if (targetSlug) {
      this.requestedSlug.set(targetSlug);
      this.router.navigate(['/dashboard', targetSlug]);
    }
  }

  onConfigurePages(): void {
    // Stub for page management / edit configuration workflow
  }

  onCreateItem(): void {
    const resolved = this.facade.resolvedPage();
    if (resolved?.create) {
      this.isCreateDialogOpen.set(true);
    }
  }

  onCreateSuccess(_result: ApiExecutionResult): void {
    this.isCreateDialogOpen.set(false);
    this.facade.refresh();
  }

  onSearchChange(searchTerm: string): void {
    this.facade.setSearch(searchTerm);
  }

  onRefresh(): void {
    this.facade.refresh();
  }

  onRetry(): void {
    this.facade.retry();
  }

  onOpenExplorer(): void {
    this.router.navigate(['/workspace']);
  }

  onReconnect(): void {
    this.router.navigate(['/connect']);
  }

  onRowView(_record: unknown): void {
    // Row view inspection handler
  }

  onRowEdit(_record: unknown): void {
    // Row edit dialog handler
  }

  onRowDelete(_record: unknown): void {
    // Row delete confirmation dialog handler
  }

  onRowSelect(_record: unknown): void {
    // Row selection handler
  }
}
