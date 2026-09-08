import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { ApiResource } from '../../core/models/api-resource.model';

@Component({
  selector: 'app-resource-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule
  ],
  template: `
    <div class="sidebar-container">
      <div class="sidebar-header">
        <span class="header-title">RESOURCES</span>
        <span class="count-badge">{{ resources.length }}</span>
      </div>

      <div class="resource-list">
        @for (resource of resources; track resource.id) {
          <div 
            class="resource-item" 
            [class.active]="selectedResourceId === resource.id"
            (click)="resourceSelect.emit(resource)"
          >
            <div class="resource-info">
              <mat-icon class="resource-icon">folder_open</mat-icon>
              <span class="resource-name">{{ resource.label }}</span>
            </div>
            <div class="operations-chips">
              <span class="ops-count">{{ resource.operations.length }}</span>
            </div>
          </div>
        }

        @if (resources.length === 0) {
          <div class="empty-resources">
            <span>No resources discovered</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .sidebar-container {
      width: 260px;
      height: 100%;
      background: var(--canvas-surface);
      border-right: 1px solid var(--canvas-border);
      display: flex;
      flex-direction: column;
    }
    .sidebar-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--canvas-border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      .header-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--canvas-text-muted);
        letter-spacing: 0.5px;
      }
      .count-badge {
        font-family: var(--font-mono);
        font-size: 11px;
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-secondary);
        padding: 2px 6px;
        border-radius: 10px;
      }
    }
    .resource-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .resource-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background 0.15s ease;
      color: var(--canvas-text-secondary);

      &:hover {
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-primary);
      }

      &.active {
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-link);
        font-weight: 600;
        border-left: 2px solid var(--canvas-text-link);
      }

      .resource-info {
        display: flex;
        align-items: center;
        gap: 8px;
        .resource-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
        .resource-name {
          font-size: 13px;
        }
      }

      .ops-count {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--canvas-text-muted);
      }
    }
    .empty-resources {
      padding: 24px 16px;
      text-align: center;
      font-size: 12px;
      color: var(--canvas-text-muted);
    }
  `]
})
export class ResourceSidebarComponent {
  @Input() resources: ApiResource[] = [];
  @Input() selectedResourceId?: string;

  @Output() resourceSelect = new EventEmitter<ApiResource>();
}
