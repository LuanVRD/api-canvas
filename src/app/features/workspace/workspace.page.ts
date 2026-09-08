import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ResourceSidebarComponent } from './resource-sidebar.component';
import { ApiResource } from '../../core/models/api-resource.model';
import { StatusIndicatorComponent } from '../../shared/components/status-indicator/status-indicator.component';
import { ApiSessionService } from '../../core/services/api-session.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-workspace-page',
  standalone: true,
  imports: [
    CommonModule,
    ResourceSidebarComponent,
    StatusIndicatorComponent,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="workspace-layout">
      <!-- Workspace Top Info Bar -->
      <div class="workspace-header">
        <div class="api-meta">
          <span class="api-title">{{ apiTitle() || 'No API Connected' }}</span>
          @if (apiVersion()) {
            <span class="api-version font-mono">v{{ apiVersion() }}</span>
          }
          @if (baseUrl()) {
            <span class="api-base-url font-mono">{{ baseUrl() }}</span>
          }
          <app-status-indicator [connected]="hasActiveApi()" [label]="hasActiveApi() ? 'Ready' : 'Disconnected'" />
        </div>
        <div class="header-actions">
          <button mat-stroked-button class="action-btn" (click)="onReconnect()">
            <mat-icon>swap_horiz</mat-icon>
            <span>Change API</span>
          </button>
        </div>
      </div>

      <!-- Main Body: Sidebar + Content -->
      <div class="workspace-body">
        <app-resource-sidebar 
          [resources]="resources()"
          [selectedResourceId]="selectedResourceId() ?? undefined"
          (resourceSelect)="onSelectResource($event)"
        />

        <main class="workspace-content">
          @if (selectedResource()) {
            <div class="resource-view">
              <div class="resource-header">
                <h2>{{ selectedResource()?.label }}</h2>
                <span class="resource-desc">{{ selectedResource()?.description || 'Operations available for this resource' }}</span>
              </div>
              
              <div class="operations-grid">
                @for (op of selectedResource()?.operations; track op.id) {
                  <div class="op-card">
                    <div class="op-method-path">
                      <span class="method-tag font-mono" [attr.data-method]="op.method">{{ op.method }}</span>
                      <span class="path-text font-mono">{{ op.path }}</span>
                    </div>
                    <span class="op-summary">{{ op.summary || 'No description provided' }}</span>
                  </div>
                } @empty {
                  <div class="empty-operations">
                    <span>No operations defined for this resource.</span>
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="empty-selection">
              <mat-icon class="empty-icon">dashboard_customize</mat-icon>
              <h3>Select a resource to inspect operations</h3>
              <p>Choose an item from the left sidebar to view endpoints, schemas and forms.</p>
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .workspace-layout {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 48px);
    }
    .workspace-header {
      height: 44px;
      background: var(--canvas-surface);
      border-bottom: 1px solid var(--canvas-border);
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .api-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        overflow: hidden;

        .api-title {
          font-weight: 600;
          font-size: 14px;
          color: var(--canvas-text-primary);
          white-space: nowrap;
        }
        .api-version {
          font-size: 11px;
          background: var(--canvas-surface-elevated);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          color: var(--canvas-text-secondary);
          white-space: nowrap;
        }
        .api-base-url {
          font-size: 11px;
          color: var(--canvas-text-muted);
          background: var(--canvas-surface-elevated);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
      .action-btn {
        height: 28px;
        font-size: 12px;
        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }
    }
    .workspace-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .workspace-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      background: var(--canvas-bg);
    }
    .resource-header {
      margin-bottom: 20px;
      h2 {
        margin: 0 0 4px;
        font-size: 18px;
        font-weight: 600;
        color: var(--canvas-text-primary);
      }
      .resource-desc {
        font-size: 13px;
        color: var(--canvas-text-secondary);
      }
    }
    .operations-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .op-card {
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .op-method-path {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .method-tag {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: var(--radius-sm);
        &[data-method="GET"] {
          background: var(--http-get-bg);
          color: var(--http-get);
          border: 1px solid var(--http-get-border);
        }
        &[data-method="POST"] {
          background: var(--http-post-bg);
          color: var(--http-post);
          border: 1px solid var(--http-post-border);
        }
        &[data-method="PUT"] {
          background: var(--http-put-bg);
          color: var(--http-put);
          border: 1px solid var(--http-put-border);
        }
        &[data-method="PATCH"] {
          background: var(--http-patch-bg);
          color: var(--http-patch);
          border: 1px solid var(--http-patch-border);
        }
        &[data-method="DELETE"] {
          background: var(--http-delete-bg);
          color: var(--http-delete);
          border: 1px solid var(--http-delete-border);
        }
      }
      .path-text {
        font-size: 13px;
        color: var(--canvas-text-primary);
      }
      .op-summary {
        font-size: 12px;
        color: var(--canvas-text-secondary);
      }
    }
    .empty-operations {
      padding: 16px;
      font-size: 13px;
      color: var(--canvas-text-muted);
    }
    .empty-selection {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: var(--canvas-text-muted);
      .empty-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
      }
      h3 {
        margin: 0 0 6px;
        font-size: 16px;
        color: var(--canvas-text-secondary);
      }
      p {
        margin: 0;
        font-size: 13px;
      }
    }
  `]
})
export class WorkspacePage implements OnInit {
  private readonly sessionService = inject(ApiSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly hasActiveApi = this.sessionService.hasActiveApi;
  readonly apiTitle = this.sessionService.apiTitle;
  readonly apiVersion = this.sessionService.apiVersion;
  readonly baseUrl = this.sessionService.baseUrl;
  readonly resources = this.sessionService.resources;
  readonly selectedResourceId = this.sessionService.selectedResourceId;
  readonly selectedResource = this.sessionService.selectedResource;

  ngOnInit(): void {
    const routeResourceId = this.route.snapshot.paramMap.get('resourceId');
    if (routeResourceId) {
      this.sessionService.selectResource(routeResourceId);
    }
  }

  onSelectResource(resource: ApiResource): void {
    this.sessionService.selectResource(resource);
  }

  onReconnect(): void {
    this.router.navigate(['/connect']);
  }
}

