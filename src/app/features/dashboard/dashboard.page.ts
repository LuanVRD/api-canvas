import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
import { UiPageConfiguration } from '../../core/models/ui-configuration.model';

/**
 * Dashboard feature page — operational view for custom resource pages.
 *
 * Provides sidebar navigation for configured custom pages, header controls,
 * empty state onboarding, and integration with the active API session.
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
    AuthConfigDialogComponent
  ],
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
          } @else if (selectedPage()) {
            <!-- Active Page View -->
            <section class="page-panel" [attr.aria-label]="selectedPage()?.title">
              <!-- Page Header -->
              <header class="page-header">
                <div class="header-left">
                  <div class="page-title-row">
                    <mat-icon class="page-title-icon">{{ selectedPage()?.icon || 'table_chart' }}</mat-icon>
                    <h1 class="page-title">{{ selectedPage()?.title }}</h1>
                    @if (selectedPage()?.resourceId) {
                      <span class="resource-pill font-mono">{{ selectedPage()?.resourceId }}</span>
                    }
                  </div>
                  @if (selectedPage()?.description) {
                    <p class="page-description">{{ selectedPage()?.description }}</p>
                  }
                </div>

                <div class="header-actions">
                  <button
                    type="button"
                    class="btn-header-secondary"
                    (click)="onConfigurePages()"
                    aria-label="Editar configuração da página"
                    title="Editar página"
                  >
                    <mat-icon class="action-icon">settings</mat-icon>
                    <span>Editar página</span>
                  </button>
                  <button
                    type="button"
                    class="btn-header-secondary"
                    (click)="onRefresh()"
                    aria-label="Recarregar dados"
                    title="Recarregar dados"
                  >
                    <mat-icon class="action-icon">refresh</mat-icon>
                    <span>Recarregar</span>
                  </button>
                  @if (selectedPage()?.actions?.primaryCreateLabel || selectedPage()?.actions?.primaryCreateActionId) {
                    <button
                      type="button"
                      class="btn-header-primary"
                      aria-label="Ação primária de criação"
                    >
                      <mat-icon class="action-icon">add</mat-icon>
                      <span>{{ selectedPage()?.actions?.primaryCreateLabel || 'Adicionar' }}</span>
                    </button>
                  }
                </div>
              </header>

              <!-- Page Content Container -->
              <div class="page-content-wrapper">
                <div class="page-placeholder-card">
                  <div class="placeholder-content">
                    <mat-icon class="placeholder-icon">layers</mat-icon>
                    <h3 class="placeholder-title">{{ selectedPage()?.title }}</h3>
                    <p class="placeholder-text">
                      Estrutura visual da página pronta. Os componentes dinâmicos de Métricas, Filtros e Tabela serão carregados nesta visão.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          } @else {
            <!-- State when pages exist but none selected -->
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

    /* Unconfigured Empty State */
    .unconfigured-state {
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

    /* Active Page View */
    .page-panel {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid var(--canvas-border-subtle);
      padding-bottom: 16px;

      .header-left {
        min-width: 0;

        .page-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;

          .page-title-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
            color: var(--canvas-text-link);
            flex-shrink: 0;
          }

          .page-title {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: var(--canvas-text-primary);
            letter-spacing: -0.2px;
          }

          .resource-pill {
            font-size: 11px;
            color: var(--canvas-text-muted);
            background: var(--canvas-surface-elevated);
            padding: 1px 6px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--canvas-border-subtle);
          }
        }

        .page-description {
          margin: 0;
          font-size: 13px;
          color: var(--canvas-text-secondary);
          line-height: 1.5;
        }
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
    }

    .btn-header-secondary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 10px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      color: var(--canvas-text-secondary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
      outline: none;

      &:hover {
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-primary);
        border-color: var(--canvas-border-subtle);
      }

      &:focus-visible {
        outline: 2px solid var(--canvas-text-link);
        outline-offset: -2px;
      }

      .action-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--canvas-text-muted);
      }
    }

    .btn-header-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 12px;
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

      .action-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .page-content-wrapper {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .page-placeholder-card {
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-md);
      padding: 48px 24px;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;

      .placeholder-content {
        max-width: 400px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;

        .placeholder-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          color: var(--canvas-text-muted);
        }

        .placeholder-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--canvas-text-secondary);
          margin: 0;
        }

        .placeholder-text {
          font-size: 12px;
          color: var(--canvas-text-muted);
          line-height: 1.5;
          margin: 0;
        }
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
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        .header-actions {
          width: 100%;
          justify-content: flex-start;
          flex-wrap: wrap;
        }
      }
    }
  `]
})
export class DashboardPage implements OnInit, OnDestroy {
  private readonly sessionService = inject(ApiSessionService);
  private readonly uiConfigService = inject(UiConfigurationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private routeSub?: Subscription;

  readonly isAuthDialogOpen = signal<boolean>(false);
  readonly selectedPageId = signal<string | null>(null);

  /**
   * Computed list of all active custom pages for the connected API.
   */
  readonly pages = computed<UiPageConfiguration[]>(() => {
    const uiConfig = this.sessionService.uiConfiguration();
    const resources = this.sessionService.resources();
    return this.uiConfigService.getCustomPages(uiConfig, resources);
  });

  /**
   * Computed currently active page object.
   */
  readonly selectedPage = computed<UiPageConfiguration | null>(() => {
    const list = this.pages();
    if (list.length === 0) {
      return null;
    }
    const id = this.selectedPageId();
    if (id) {
      const match = list.find(
        (p) =>
          p.id === id ||
          p.slug === id ||
          p.resourceId === id ||
          p.id?.toLowerCase() === id.toLowerCase() ||
          p.slug?.toLowerCase() === id.toLowerCase()
      );
      if (match) return match;
    }
    return list[0];
  });

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const pageId = params.get('pageId');
      if (pageId) {
        this.selectedPageId.set(pageId);
      } else {
        const available = this.pages();
        if (available.length > 0 && !this.selectedPageId()) {
          const firstId = available[0].id || available[0].slug || null;
          this.selectedPageId.set(firstId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  onSelectPage(page: UiPageConfiguration): void {
    const targetId = page.id || page.slug;
    this.selectedPageId.set(targetId || null);
    if (targetId) {
      this.router.navigate(['/dashboard', targetId]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  onCreatePage(): void {
    // Stub for page creation workflow / modal trigger
  }

  onConfigurePages(): void {
    // Stub for page management / edit configuration workflow
  }

  onRefresh(): void {
    // Refresh handler for data reload
  }

  onOpenExplorer(): void {
    this.router.navigate(['/workspace']);
  }

  onReconnect(): void {
    this.router.navigate(['/connect']);
  }
}
