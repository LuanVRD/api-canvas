import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceSidebarComponent } from './resource-sidebar.component';
import { ApiResource } from '../../core/models/api-resource.model';
import { StatusIndicatorComponent } from '../../shared/components/status-indicator/status-indicator.component';
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
          <span class="api-title">{{ apiTitle() }}</span>
          <span class="api-version font-mono">v{{ apiVersion() }}</span>
          <app-status-indicator [connected]="true" label="Ready" />
        </div>
        <div class="header-actions">
          <button mat-stroked-button class="action-btn">
            <mat-icon>refresh</mat-icon>
            <span>Reload Spec</span>
          </button>
        </div>
      </div>

      <!-- Main Body: Sidebar + Content -->
      <div class="workspace-body">
        <app-resource-sidebar 
          [resources]="mockResources"
          [selectedResourceId]="selectedResourceId()"
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
        .api-title {
          font-weight: 600;
          font-size: 14px;
          color: var(--canvas-text-primary);
        }
        .api-version {
          font-size: 11px;
          background: var(--canvas-surface-elevated);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--canvas-text-secondary);
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
export class WorkspacePage {
  readonly apiTitle = signal('Sample Store API');
  readonly apiVersion = signal('1.0.0');
  readonly selectedResourceId = signal<string | undefined>('products');

  readonly mockResources: ApiResource[] = [
    {
      id: 'products',
      name: 'products',
      label: 'Products',
      description: 'Product catalog operations',
      operations: [
        {
          id: 'get_products',
          method: 'GET',
          path: '/api/products',
          summary: 'List all products in catalog',
          parameters: [],
          responses: [],
          type: 'list'
        },
        {
          id: 'post_products',
          method: 'POST',
          path: '/api/products',
          summary: 'Create a new product',
          parameters: [],
          responses: [],
          type: 'create'
        },
        {
          id: 'delete_product',
          method: 'DELETE',
          path: '/api/products/{id}',
          summary: 'Delete product by ID',
          parameters: [],
          responses: [],
          type: 'delete'
        }
      ]
    },
    {
      id: 'orders',
      name: 'orders',
      label: 'Orders',
      description: 'Order processing and checkout',
      operations: [
        {
          id: 'get_orders',
          method: 'GET',
          path: '/api/orders',
          summary: 'List recent orders',
          parameters: [],
          responses: [],
          type: 'list'
        }
      ]
    }
  ];

  selectedResource = signal<ApiResource | undefined>(this.mockResources[0]);

  onSelectResource(resource: ApiResource): void {
    this.selectedResourceId.set(resource.id);
    this.selectedResource.set(resource);
  }
}
