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
import { ResourceOperationMatcherService } from '../../core/services/resource-operation-matcher.service';
import { UiConfiguration, UiPageConfiguration } from '../../core/models/ui-configuration.model';
import { ResourcePageFacadeService } from './services/resource-page-facade.service';
import { TableActionConfig } from '../../dynamic-ui/dynamic-table/dynamic-table.component';
import { TableSchemaService, TableColumnDescriptor } from '../../dynamic-ui/dynamic-table/table-schema.service';
import { ResourcePageContentComponent } from './components/resource-page-content/resource-page-content.component';
import { CreateRecordDialogComponent } from '../../dynamic-ui/create-dialog/create-record-dialog.component';
import { RecordDetailsDrawerComponent } from '../../dynamic-ui/object-details/record-details-drawer.component';
import { EditRecordDialogComponent } from '../../dynamic-ui/edit-dialog/edit-record-dialog.component';
import { DeleteConfirmDialogComponent } from '../../dynamic-ui/delete-dialog/delete-confirm-dialog.component';
import { CustomActionDialogComponent } from '../../dynamic-ui/custom-action-dialog/custom-action-dialog.component';
import { ApiExecutionResult } from '../../core/models/api-execution-result.model';
import { ApiOperation } from '../../core/models/api-operation.model';
import { ApiParameter } from '../../core/models/api-parameter.model';
import { ResolvedCustomAction } from '../../core/models/resolved-resource-page.model';
import { ApiExecutorService } from '../../core/services/api-executor.service';

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
    CreateRecordDialogComponent,
    RecordDetailsDrawerComponent,
    EditRecordDialogComponent,
    DeleteConfirmDialogComponent,
    CustomActionDialogComponent
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
              (rowAction)="onRowAction($event)"
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

      <!-- Record Details Drawer / Modal -->
      @if (activeDetailsInspection(); as inspection) {
        <app-record-details-drawer
          [operation]="inspection.detailsOp"
          [initialParams]="inspection.params"
          [missingParams]="inspection.missingParams || []"
          (editRecord)="onEditRecord($event)"
          (close)="onCloseDetailsInspection()"
        />
      }

      <!-- Record Edit Modal -->
      @if (activeEditRecord(); as editRec) {
        <app-edit-record-dialog
          [operation]="editRec.updateOp"
          [availableOperations]="editRec.availableOps || [editRec.updateOp]"
          [record]="editRec.record"
          [initialParams]="editRec.params"
          [missingParams]="editRec.missingParams || []"
          [detailsOperation]="editRec.detailsOp"
          (updated)="onRecordUpdated($event)"
          (close)="onCloseEditRecord()"
        />
      }

      <!-- Record Delete Confirmation Modal -->
      @if (activeDeleteConfirmation(); as delConfirm) {
        <app-delete-confirm-dialog
          [operation]="delConfirm.deleteOp"
          [record]="delConfirm.record"
          [initialParams]="delConfirm.params"
          [missingParams]="delConfirm.missingParams || []"
          (deleted)="onRecordDeleted($event)"
          (close)="onCloseDeleteConfirmation()"
        />
      }

      <!-- Custom Action Dialog Modal -->
      @if (activeCustomAction(); as customModal) {
        <app-custom-action-dialog
          [action]="customModal.action"
          [record]="customModal.record"
          [initialParams]="customModal.params"
          [missingParams]="customModal.missingParams || []"
          (executed)="onCustomActionExecuted(customModal.action, $event)"
          (close)="onCloseCustomAction()"
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
  private readonly matcher = inject(ResourceOperationMatcherService);
  private readonly executor = inject(ApiExecutorService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly facade = inject(ResourcePageFacadeService);

  private routeSub?: Subscription;

  readonly isAuthDialogOpen = signal<boolean>(false);
  readonly isCreateDialogOpen = signal<boolean>(false);
  readonly requestedSlug = signal<string | null>(null);

  readonly activeDetailsInspection = signal<{
    detailsOp: ApiOperation;
    params: Record<string, string>;
    missingParams?: ApiParameter[];
  } | null>(null);

  readonly activeEditRecord = signal<{
    record: unknown;
    updateOp: ApiOperation;
    availableOps?: ApiOperation[];
    params: Record<string, string>;
    missingParams?: ApiParameter[];
    detailsOp?: ApiOperation | null;
  } | null>(null);

  readonly activeDeleteConfirmation = signal<{
    record: unknown;
    deleteOp: ApiOperation;
    params: Record<string, string>;
    missingParams?: ApiParameter[];
  } | null>(null);

  readonly activeCustomAction = signal<{
    action: ResolvedCustomAction;
    record: unknown;
    params: Record<string, string>;
    missingParams?: ApiParameter[];
  } | null>(null);

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
    if (resolved?.details && rowCfg?.viewDetails !== false) {
      actions.push({
        id: 'view',
        label: rowCfg?.viewDetailsLabel || 'Ver detalhes',
        icon: 'visibility',
        tooltip: rowCfg?.viewDetailsTooltip || 'Ver detalhes',
        visible: true
      });
    }
    if (resolved?.update && rowCfg?.edit !== false) {
      actions.push({
        id: 'edit',
        label: rowCfg?.editLabel || 'Editar',
        icon: 'edit',
        tooltip: rowCfg?.editTooltip || 'Editar registro',
        visible: true
      });
    }
    if (resolved?.customActions && resolved.customActions.length > 0) {
      for (const customAct of resolved.customActions) {
        actions.push({
          id: customAct.id,
          label: customAct.label,
          icon: customAct.icon || 'bolt',
          tooltip: customAct.tooltip || customAct.label,
          danger: customAct.danger === true,
          visible: true,
          customAction: customAct
        });
      }
    }
    if (resolved?.delete && rowCfg?.delete !== false) {
      actions.push({
        id: 'delete',
        label: rowCfg?.deleteLabel || 'Excluir',
        icon: 'delete',
        tooltip: rowCfg?.deleteTooltip || 'Excluir registro',
        danger: true,
        visible: true
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

  onCreateSuccess(result: ApiExecutionResult): void {
    const resolved = this.facade.resolvedPage();
    const resourceId = resolved?.resourceId || this.selectedPage()?.resourceId;
    if (resourceId && resolved?.create) {
      this.sessionService.notifyResourceMutation(
        resourceId,
        resolved.create.operationId || resolved.create.id,
        result
      );
    }
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

  onRowView(record: unknown): void {
    const resolved = this.facade.resolvedPage();
    const detailsOp = resolved?.details;
    if (!detailsOp) return;

    const resolution = this.matcher.resolveParameters(detailsOp, record);
    this.activeDetailsInspection.set({
      detailsOp,
      params: resolution.resolvedParams,
      missingParams: resolution.missingParams
    });
  }

  onCloseDetailsInspection(): void {
    this.activeDetailsInspection.set(null);
  }

  onRowEdit(record: unknown): void {
    const resolved = this.facade.resolvedPage();
    const updateOp = resolved?.update;
    if (!updateOp) return;

    const resolution = this.matcher.resolveParameters(updateOp, record);
    this.activeEditRecord.set({
      record,
      updateOp,
      availableOps: resolved?.updateOperations?.length ? resolved.updateOperations : [updateOp],
      params: resolution.resolvedParams,
      missingParams: resolution.missingParams,
      detailsOp: resolved?.details ?? null
    });
  }

  onEditRecord(event: {
    record: unknown;
    updateOp: ApiOperation;
    availableOps?: ApiOperation[];
    params: Record<string, string>;
    missingParams?: ApiParameter[];
    detailsOp?: ApiOperation | null;
  }): void {
    this.activeDetailsInspection.set(null);
    this.activeEditRecord.set(event);
  }

  onCloseEditRecord(): void {
    this.activeEditRecord.set(null);
  }

  onRecordUpdated(result: ApiExecutionResult): void {
    const activeEdit = this.activeEditRecord();
    const resolved = this.facade.resolvedPage();
    const resourceId = resolved?.resourceId || this.selectedPage()?.resourceId;
    if (resourceId && activeEdit) {
      this.sessionService.notifyResourceMutation(
        resourceId,
        activeEdit.updateOp.operationId || activeEdit.updateOp.id,
        result
      );
    }
    this.onCloseEditRecord();
    this.facade.refresh();
  }

  onRowDelete(record: unknown): void {
    const resolved = this.facade.resolvedPage();
    const deleteOp = resolved?.delete;
    if (!deleteOp) return;

    const resolution = this.matcher.resolveParameters(deleteOp, record);
    this.activeDeleteConfirmation.set({
      record,
      deleteOp,
      params: resolution.resolvedParams,
      missingParams: resolution.missingParams
    });
  }

  onCloseDeleteConfirmation(): void {
    this.activeDeleteConfirmation.set(null);
  }

  onRecordDeleted(result: ApiExecutionResult): void {
    const activeConfirm = this.activeDeleteConfirmation();
    const resolved = this.facade.resolvedPage();
    const resourceId = resolved?.resourceId || this.selectedPage()?.resourceId;
    if (resourceId && activeConfirm) {
      this.sessionService.notifyResourceMutation(
        resourceId,
        activeConfirm.deleteOp.operationId || activeConfirm.deleteOp.id,
        result
      );
    }
    this.onCloseDeleteConfirmation();
    this.facade.refresh();
  }

  onRowAction(event: { action: string; row: unknown; event: MouseEvent }): void {
    if (event.action === 'view') {
      this.onRowView(event.row);
      return;
    }
    if (event.action === 'edit') {
      this.onRowEdit(event.row);
      return;
    }
    if (event.action === 'delete') {
      this.onRowDelete(event.row);
      return;
    }

    const resolved = this.facade.resolvedPage();
    const customAct = resolved?.customActions?.find(
      (a) =>
        a.id === event.action ||
        a.operation.id === event.action ||
        a.operation.operationId === event.action
    );
    if (!customAct) return;

    const resolution = this.matcher.resolveParameters(customAct.operation, event.row);
    const hasRequestBody = Boolean(customAct.operation.requestBody);

    // Direct execution without dialog only if explicitly configured
    if (
      customAct.inputMode === 'direct' &&
      customAct.confirmation === false &&
      resolution.canAutoResolve &&
      !hasRequestBody
    ) {
      const baseUrl = this.sessionService.baseUrl();
      const input = { path: resolution.resolvedParams };
      this.executor.execute(baseUrl, customAct.operation, input).subscribe({
        next: (result) => {
          if (result.isSuccess) {
            this.onCustomActionExecuted(customAct, result);
          } else {
            this.activeCustomAction.set({
              action: customAct,
              record: event.row,
              params: resolution.resolvedParams,
              missingParams: resolution.missingParams
            });
          }
        },
        error: () => {
          this.activeCustomAction.set({
            action: customAct,
            record: event.row,
            params: resolution.resolvedParams,
            missingParams: resolution.missingParams
          });
        }
      });
      return;
    }

    // Otherwise open the reusable action dialog
    this.activeCustomAction.set({
      action: customAct,
      record: event.row,
      params: resolution.resolvedParams,
      missingParams: resolution.missingParams
    });
  }

  onCloseCustomAction(): void {
    this.activeCustomAction.set(null);
  }

  onCustomActionExecuted(action: ResolvedCustomAction, result: ApiExecutionResult): void {
    const resolved = this.facade.resolvedPage();
    const resourceId = resolved?.resourceId || this.selectedPage()?.resourceId;
    if (resourceId) {
      this.sessionService.notifyResourceMutation(
        resourceId,
        action.operation.operationId || action.operation.id,
        result
      );
    }
    this.onCloseCustomAction();
    this.facade.refresh();
  }

  onRowSelect(_record: unknown): void {
    // Row selection handler
  }
}
