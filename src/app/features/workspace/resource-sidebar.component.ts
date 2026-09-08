import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiResource } from '../../core/models/api-resource.model';

@Component({
  selector: 'app-resource-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule
  ],
  template: `
    <aside class="sidebar-container" aria-label="API Resources Navigation">
      <div class="sidebar-header">
        <div class="header-top">
          <span class="header-title">RESOURCES</span>
          <span class="count-badge">{{ resources().length }}</span>
        </div>

        @if (resources().length > 5) {
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              type="text"
              class="search-input"
              placeholder="Filter resources..."
              [ngModel]="filterQuery()"
              (ngModelChange)="filterQuery.set($event)"
              aria-label="Filter resources"
            />
            @if (filterQuery()) {
              <button class="clear-btn" (click)="filterQuery.set('')" aria-label="Clear filter">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
        }
      </div>

      <nav class="resource-list" role="list">
        @for (resource of filteredResources(); track resource.id) {
          <button
            type="button"
            role="listitem"
            class="resource-item"
            [class.active]="selectedResourceId() === resource.id"
            (click)="selectResource(resource)"
          >
            <div class="resource-main">
              <mat-icon class="resource-icon">folder_open</mat-icon>
              <span class="resource-name" [title]="resource.label">{{ resource.label }}</span>
            </div>
            <span class="ops-count" title="{{ resource.operations.length }} operations">
              {{ resource.operations.length }}
            </span>
          </button>
        }

        @if (resources().length === 0) {
          <div class="empty-state">
            <span>No resources discovered</span>
          </div>
        } @else if (filteredResources().length === 0) {
          <div class="empty-state">
            <span>No matching resources</span>
          </div>
        }
      </nav>
    </aside>
  `,
  styles: [`
    .sidebar-container {
      width: 250px;
      min-width: 220px;
      max-width: 320px;
      height: 100%;
      background: var(--canvas-surface);
      border-right: 1px solid var(--canvas-border);
      display: flex;
      flex-direction: column;
      user-select: none;
    }

    .sidebar-header {
      padding: 12px 14px 10px;
      border-bottom: 1px solid var(--canvas-border-subtle);
      display: flex;
      flex-direction: column;
      gap: 8px;

      .header-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .header-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--canvas-text-muted);
        letter-spacing: 0.6px;
      }

      .count-badge {
        font-family: var(--font-mono);
        font-size: 11px;
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-secondary);
        padding: 1px 6px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--canvas-border-subtle);
      }
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;

      .search-icon {
        position: absolute;
        left: 6px;
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--canvas-text-muted);
        pointer-events: none;
      }

      .search-input {
        width: 100%;
        height: 26px;
        padding: 0 22px 0 24px;
        background: var(--canvas-bg);
        border: 1px solid var(--canvas-border);
        border-radius: var(--radius-sm);
        color: var(--canvas-text-primary);
        font-size: 12px;
        outline: none;
        transition: border-color 0.15s ease;

        &:focus {
          border-color: var(--canvas-text-link);
        }

        &::placeholder {
          color: var(--canvas-text-muted);
        }
      }

      .clear-btn {
        position: absolute;
        right: 4px;
        background: transparent;
        border: none;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--canvas-text-muted);

        &:hover {
          color: var(--canvas-text-primary);
        }

        mat-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
        }
      }
    }

    .resource-list {
      flex: 1;
      overflow-y: auto;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .resource-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 7px 10px;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      text-align: left;
      color: var(--canvas-text-secondary);
      transition: background 0.12s ease, color 0.12s ease;
      box-sizing: border-box;

      &:hover {
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-primary);
      }

      &.active {
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-link);
        border-left-color: var(--canvas-text-link);
        font-weight: 600;
      }

      .resource-main {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;

        .resource-icon {
          font-size: 15px;
          width: 15px;
          height: 15px;
          color: var(--canvas-text-muted);
          flex-shrink: 0;
        }

        .resource-name {
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .ops-count {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--canvas-text-muted);
        background: var(--canvas-bg);
        padding: 1px 5px;
        border-radius: var(--radius-sm);
        margin-left: 6px;
        flex-shrink: 0;
      }
    }

    .empty-state {
      padding: 24px 12px;
      text-align: center;
      font-size: 12px;
      color: var(--canvas-text-muted);
    }
  `]
})
export class ResourceSidebarComponent {
  readonly resources = input<ApiResource[]>([]);
  readonly selectedResourceId = input<string | undefined>(undefined);

  readonly resourceSelect = output<ApiResource>();

  readonly filterQuery = signal<string>('');

  readonly filteredResources = computed<ApiResource[]>(() => {
    const q = this.filterQuery().trim().toLowerCase();
    const list = this.resources();
    if (!q) return list;
    return list.filter((r) =>
      r.label.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  selectResource(resource: ApiResource): void {
    this.resourceSelect.emit(resource);
  }
}
