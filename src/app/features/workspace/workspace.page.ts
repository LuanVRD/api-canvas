import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ResourceSidebarComponent } from './resource-sidebar.component';
import { AuthConfigDialogComponent } from './auth-config-dialog.component';
import { ApiResource } from '../../core/models/api-resource.model';
import { ApiOperation } from '../../core/models/api-operation.model';
import { ApiContextBarComponent } from '../../shared/components/api-context-bar/api-context-bar.component';
import { HttpBadgeComponent } from '../../shared/components/http-badge/http-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ApiSessionService } from '../../core/services/api-session.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-workspace-page',
  standalone: true,
  imports: [
    CommonModule,
    ResourceSidebarComponent,
    AuthConfigDialogComponent,
    ApiContextBarComponent,
    HttpBadgeComponent,
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="workspace-layout">
      <!-- Context Bar: API Metadata, Auth & Change API -->
      <app-api-context-bar
        (authClick)="isAuthDialogOpen.set(true)"
        (changeApiClick)="onReconnect()"
      />


      <!-- Workspace Body: Navigation Sidebar + Content Area -->
      <div class="workspace-body">
        <app-resource-sidebar
          [resources]="resources()"
          [selectedResourceId]="selectedResourceId() ?? undefined"
          (resourceSelect)="onSelectResource($event)"
        />

        <main class="workspace-content" role="main">
          @if (selectedResource()) {
            <section class="resource-panel" aria-label="Resource Operations">
              <!-- Resource Header: Label, ID, Description -->
              <div class="resource-header">
                <div class="resource-title-row">
                  <h1 class="resource-title">{{ selectedResource()?.label }}</h1>
                  <span class="resource-id font-mono">{{ selectedResource()?.id }}</span>
                </div>

                @if (selectedResource()?.description) {
                  <p class="resource-description">
                    {{ selectedResource()?.description }}
                  </p>
                }
              </div>

              <!-- Operations List -->
              <div class="operations-section">
                <div class="section-header">
                  <span class="section-title">OPERATIONS</span>
                  <span class="ops-total font-mono">{{ selectedResource()?.operations?.length || 0 }} endpoints</span>
                </div>

                <div class="operations-list" role="list">
                  @for (op of selectedResource()?.operations; track op.id) {
                    <div
                      class="operation-row"
                      role="button"
                      tabindex="0"
                      (click)="onOpenOperation(op)"
                      (keydown.enter)="onOpenOperation(op)"
                      title="Inspect operation details"
                    >
                      <div class="op-main">
                        <app-http-badge [method]="op.method" />
                        <span class="op-path font-mono" [title]="op.path">{{ op.path }}</span>
                        @if (op.requiresAuth) {
                          <span class="auth-lock-badge font-mono" title="Protected operation (Requires Authentication)">
                            <mat-icon class="badge-lock-icon">lock</mat-icon>
                            <span>AUTH</span>
                          </span>
                        }
                        @if (op.type && op.type !== 'unknown') {
                          <span class="op-type-badge">{{ op.type }}</span>
                        }
                        @if (op.deprecated) {
                          <span class="deprecated-badge">deprecated</span>
                        }
                      </div>

                      <div class="op-details">
                        <span class="op-summary" [title]="op.summary || op.description || ''">
                          {{ op.summary || op.description || 'No description provided' }}
                        </span>

                        @if (op.parameters && op.parameters.length > 0) {
                          <span class="param-count font-mono" title="{{ op.parameters.length }} parameters">
                            {{ op.parameters.length }} param{{ op.parameters.length > 1 ? 's' : '' }}
                          </span>
                        }

                        <mat-icon class="op-chevron">chevron_right</mat-icon>
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-operations-wrapper">
                      <app-empty-state
                        icon="info_outline"
                        title="No operations found"
                        description="No operations found for this resource in the OpenAPI specification."
                        [compact]="true"
                      />
                    </div>
                  }
                </div>
              </div>
            </section>
          } @else {
            <section class="empty-workspace">
              <app-empty-state
                icon="account_tree"
                title="Select a Resource"
                description="Select an API resource from the sidebar to inspect its available operations and schemas."
              />
            </section>
          }
        </main>
      </div>

      @if (isAuthDialogOpen()) {
        <app-auth-config-dialog (close)="isAuthDialogOpen.set(false)" />
      }
    </div>

  `,
  styles: [`
    .workspace-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--canvas-bg);
      color: var(--canvas-text-primary);
      overflow: hidden;
    }



    .workspace-body {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    .workspace-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px;
      background: var(--canvas-bg);
    }

    .resource-panel {
      max-width: 1080px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .resource-header {
      border-bottom: 1px solid var(--canvas-border-subtle);
      padding-bottom: 16px;

      .resource-title-row {
        display: flex;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 6px;

        .resource-title {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--canvas-text-primary);
          letter-spacing: -0.2px;
        }

        .resource-id {
          font-size: 12px;
          color: var(--canvas-text-muted);
          background: var(--canvas-surface-elevated);
          padding: 1px 6px;
          border-radius: var(--radius-sm);
        }
      }

      .resource-description {
        margin: 0;
        font-size: 13px;
        line-height: 1.6;
        color: var(--canvas-text-secondary);
      }
    }

    .operations-section {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 4px;

        .section-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--canvas-text-muted);
          letter-spacing: 0.6px;
        }

        .ops-total {
          font-size: 11px;
          color: var(--canvas-text-muted);
        }
      }

      .operations-list {
        display: flex;
        flex-direction: column;
        background: var(--canvas-surface);
        border: 1px solid var(--canvas-border);
        border-radius: var(--radius-md);
        overflow: hidden;
      }

      .operation-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-bottom: 1px solid var(--canvas-border-subtle);
        gap: 16px;
        cursor: pointer;
        transition: background 0.12s ease, border-color 0.12s ease;
        outline: none;

        &:last-child {
          border-bottom: none;
        }

        &:hover, &:focus-visible {
          background: var(--canvas-surface-elevated);

          .op-chevron {
            color: var(--canvas-text-primary);
            transform: translateX(2px);
          }
        }

        .op-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex-shrink: 0;

          .op-path {
            font-size: 13px;
            color: var(--canvas-text-primary);
            font-weight: 500;
          }

          .auth-lock-badge {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            font-size: 9px;
            letter-spacing: 0.04em;
            color: #38bdf8;
            background: rgba(56, 189, 248, 0.08);
            border: 1px solid rgba(56, 189, 248, 0.25);
            padding: 1px 4px;
            border-radius: var(--radius-sm);

            .badge-lock-icon {
              font-size: 10px;
              width: 10px;
              height: 10px;
            }
          }

          .op-type-badge {
            font-size: 10px;
            text-transform: uppercase;
            font-family: var(--font-mono);
            color: var(--canvas-text-muted);
            background: var(--canvas-bg);
            border: 1px solid var(--canvas-border-subtle);
            padding: 1px 5px;
            border-radius: var(--radius-sm);
          }


          .deprecated-badge {
            font-size: 10px;
            text-transform: uppercase;
            font-family: var(--font-mono);
            color: var(--color-danger);
            background: rgba(218, 54, 51, 0.12);
            border: 1px solid rgba(218, 54, 51, 0.3);
            padding: 1px 5px;
            border-radius: var(--radius-sm);
          }
        }

        .op-details {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          overflow: hidden;
          justify-content: flex-end;
          flex: 1;

          .op-summary {
            font-size: 12px;
            color: var(--canvas-text-secondary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: right;
          }

          .param-count {
            font-size: 11px;
            color: var(--canvas-text-muted);
            background: var(--canvas-bg);
            padding: 1px 6px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--canvas-border-subtle);
            white-space: nowrap;
            flex-shrink: 0;
          }

          .op-chevron {
            font-size: 16px;
            width: 16px;
            height: 16px;
            color: var(--canvas-text-muted);
            transition: transform 0.12s ease, color 0.12s ease;
            flex-shrink: 0;
          }
        }
      }

      .empty-operations {
        padding: 32px 16px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        color: var(--canvas-text-muted);

        .empty-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }

        p {
          margin: 0;
          font-size: 13px;
        }
      }
    }

    .empty-workspace {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: var(--canvas-text-muted);
      padding: 48px 16px;

      .empty-icon {
        font-size: 44px;
        width: 44px;
        height: 44px;
        margin-bottom: 12px;
        color: var(--canvas-text-muted);
      }

      h2 {
        margin: 0 0 6px;
        font-size: 16px;
        font-weight: 600;
        color: var(--canvas-text-secondary);
      }

      p {
        margin: 0;
        font-size: 13px;
        max-width: 380px;
        line-height: 1.5;
      }
    }

    @media (max-width: 768px) {
      .workspace-content {
        padding: 16px;
      }
      .operation-row {
        flex-direction: column;
        align-items: flex-start !important;
        gap: 6px !important;

        .op-details {
          justify-content: flex-start !important;
          width: 100%;
          .op-summary {
            text-align: left !important;
          }
        }
      }
    }
  `]
})
export class WorkspacePage implements OnInit, OnDestroy {
  private readonly sessionService = inject(ApiSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private routeSub?: Subscription;

  readonly isAuthDialogOpen = signal<boolean>(false);

  readonly resources = this.sessionService.resources;
  readonly selectedResourceId = this.sessionService.selectedResourceId;
  readonly selectedResource = this.sessionService.selectedResource;


  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const routeResourceId = params.get('resourceId');
      if (routeResourceId) {
        this.sessionService.selectResource(routeResourceId);
      } else {
        const currentSelectedId = this.sessionService.selectedResourceId();
        if (currentSelectedId) {
          // If accessing /workspace directly with an already selected resource, keep session synced
          this.sessionService.selectResource(currentSelectedId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  onSelectResource(resource: ApiResource): void {
    this.sessionService.selectResource(resource);
    this.router.navigate(['/workspace', resource.id]);
  }

  onOpenOperation(op: ApiOperation): void {
    const targetId = op.operationId || op.id;
    this.router.navigate(['/operation', targetId]);
  }

  onReconnect(): void {
    this.router.navigate(['/connect']);
  }
}
