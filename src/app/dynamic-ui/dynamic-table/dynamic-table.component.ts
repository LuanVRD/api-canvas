import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TableColumnDescriptor } from './table-schema.service';
import { ValueRendererComponent } from '../value-renderer/value-renderer.component';

export type TableLayoutMode = 'compact' | 'full-height';

export interface TableActionConfig {
  id: string;
  label?: string;
  icon?: string;
  tooltip?: string;
  ariaLabel?: string;
  cssClass?: string;
  danger?: boolean;
  disabled?: boolean | ((item: unknown) => boolean);
  visible?: boolean | ((item: unknown) => boolean);
}

@Component({
  selector: 'app-dynamic-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    ValueRendererComponent
  ],
  template: `
    <div
      class="table-container"
      [class.full-height]="effectiveLayoutMode === 'full-height'"
      [class.compact]="effectiveLayoutMode === 'compact'"
    >
      <!-- Technical Meta Bar -->
      <div class="table-meta-bar">
        <div class="meta-left">
          <span class="meta-badge font-mono">{{ data.length }} record{{ data.length === 1 ? '' : 's' }}@if (totalCount !== undefined && totalCount !== data.length) {<span class="meta-total font-mono"> (de {{ totalCount }})</span>}</span>
          <span class="meta-separator">·</span>
          <span class="meta-sub font-mono">{{ columns.length }} column{{ columns.length === 1 ? '' : 's' }}</span>
        </div>

        @if (loading) {
          <div class="meta-loading font-mono">
            <span class="loading-spinner-inline" aria-hidden="true"></span>
            <span>{{ loadingMessage }}</span>
          </div>
        }
      </div>

      <!-- Table Body Area -->
      <div class="table-body-container">
        <!-- Loading Overlay (active during refresh/loading with existing data) -->
        @if (loading && data.length > 0) {
          <div class="table-loading-overlay" aria-live="polite">
            <div class="loading-spinner" aria-hidden="true"></div>
            <span class="loading-text">{{ loadingMessage }}</span>
          </div>
        }

        <!-- Technical Table -->
        @if (data.length > 0 && columns.length > 0) {
          <div class="table-scroll-wrapper">
            <table mat-table [dataSource]="data" class="mat-elevation-z0 technical-table">
              @for (col of columns; track col.key) {
                <ng-container [matColumnDef]="col.key">
                  <th mat-header-cell *matHeaderCellDef class="table-header">
                    <span class="header-label" [title]="col.description || col.label">{{ col.label }}</span>
                    <span class="header-type font-mono">&lt;{{ col.type }}&gt;</span>
                  </th>
                  <td mat-cell *matCellDef="let element" class="table-cell">
                    <app-value-renderer
                      [value]="getCellValue(element, col.key)"
                      [type]="col.type"
                      [format]="col.format"
                    />
                  </td>
                </ng-container>
              }

              <!-- Actions Column -->
              @if (hasActions) {
                <ng-container matColumnDef="_actions">
                  <th
                    mat-header-cell
                    *matHeaderCellDef
                    class="table-header actions-header"
                    [class.sticky-action-header]="stickyActions"
                  >
                    Actions
                  </th>
                  <td
                    mat-cell
                    *matCellDef="let element"
                    class="table-cell actions-cell"
                    [class.sticky-action-cell]="stickyActions"
                  >
                    <div class="actions-group">
                      @for (action of resolvedActions; track action.id) {
                        @if (isActionVisible(action, element)) {
                          <button
                            type="button"
                            class="action-icon-btn"
                            [ngClass]="[
                              action.id + '-btn',
                              action.cssClass || '',
                              action.danger || action.id === 'delete' ? 'delete delete-btn' : ''
                            ]"
                            [disabled]="isActionDisabled(action, element)"
                            [title]="action.tooltip || action.label || action.id"
                            [attr.aria-label]="action.ariaLabel || action.tooltip || action.label || action.id"
                            (click)="onActionTriggered($event, action, element)"
                          >
                            <mat-icon class="action-icon">{{ action.icon || 'settings' }}</mat-icon>
                          </button>
                        }
                      }
                    </div>
                  </td>
                </ng-container>
              }

              <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: displayedColumns;"
                class="table-row"
                (click)="rowSelect.emit(row)"
              ></tr>
            </table>
          </div>
        } @else {
          <!-- Empty State -->
          <div class="empty-state">
            <mat-icon class="empty-icon">{{ emptyIcon }}</mat-icon>
            <span class="empty-title font-mono">{{ emptyTitle }}</span>
            <p class="empty-desc">{{ emptyDescription }}</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .table-container {
      width: 100%;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: border-color 0.15s ease;

      &.full-height {
        height: 100%;
        min-height: 0;
        flex: 1;

        .table-body-container {
          flex: 1;
          height: 100%;
          min-height: 0;
        }

        .table-scroll-wrapper {
          max-height: none;
          height: 100%;
          flex: 1;
          min-height: 0;
        }

        .empty-state {
          flex: 1;
          min-height: 240px;
          justify-content: center;
        }
      }

      &.compact {
        .table-scroll-wrapper {
          max-height: 480px;
        }
      }
    }

    .table-meta-bar {
      padding: 5px 12px;
      background: var(--canvas-surface-elevated);
      border-bottom: 1px solid var(--canvas-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      flex-shrink: 0;
      z-index: 15;
    }

    .meta-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta-badge {
      color: var(--canvas-text-primary);
      font-weight: 600;
    }

    .meta-total {
      color: var(--canvas-text-muted);
      font-weight: normal;
    }

    .meta-separator {
      color: var(--canvas-text-muted);
    }

    .meta-sub {
      color: var(--canvas-text-secondary);
    }

    .meta-loading {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--canvas-text-link, #58a6ff);
      font-size: 11px;
    }

    .loading-spinner-inline {
      width: 10px;
      height: 10px;
      border: 2px solid rgba(88, 166, 255, 0.2);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    .table-body-container {
      position: relative;
      width: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .table-loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(13, 17, 23, 0.65);
      backdrop-filter: blur(1.5px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      z-index: 20;
      pointer-events: all;
    }

    .loading-spinner {
      width: 24px;
      height: 24px;
      border: 2.5px solid rgba(255, 255, 255, 0.15);
      border-top-color: var(--canvas-text-link, #58a6ff);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loading-text {
      font-size: 12px;
      color: var(--canvas-text-secondary, #8b949e);
      font-family: var(--font-sans);
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .table-scroll-wrapper {
      width: 100%;
      overflow: auto;
      position: relative;
    }

    .technical-table {
      min-width: 100%;
      width: max-content;
      background: transparent;
      border-collapse: separate;
      border-spacing: 0;
    }

    .table-header {
      background: var(--canvas-surface) !important;
      color: var(--canvas-text-secondary);
      font-family: var(--font-sans);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--canvas-border);
      padding: 7px 12px;
      white-space: nowrap;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .header-label {
      margin-right: 4px;
    }

    .header-type {
      color: var(--canvas-text-muted);
      font-size: 10px;
      text-transform: lowercase;
      font-weight: normal;
    }

    .table-cell {
      color: var(--canvas-text-primary);
      font-size: 12px;
      border-bottom: 1px solid var(--canvas-border-subtle);
      padding: 6px 12px;
      white-space: nowrap;
      line-height: 1.4;
      background: inherit;
    }

    .table-row {
      transition: background 0.08s ease;
      cursor: default;
      background: var(--canvas-surface);

      &:hover {
        background: var(--canvas-surface-elevated, rgba(255, 255, 255, 0.035));

        .sticky-action-cell {
          background: var(--canvas-surface-elevated) !important;
        }
      }
    }

    .actions-header, .actions-cell {
      text-align: right;
      padding: 6px 12px;
      white-space: nowrap;
    }

    .actions-group {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 3px;
    }

    .sticky-action-header {
      position: sticky;
      right: 0;
      top: 0;
      z-index: 12;
      background: var(--canvas-surface) !important;
      box-shadow: -1px 0 0 var(--canvas-border);
    }

    .sticky-action-cell {
      position: sticky;
      right: 0;
      z-index: 5;
      background: var(--canvas-surface) !important;
      box-shadow: -1px 0 0 var(--canvas-border-subtle);
    }

    .action-icon-btn {
      background: transparent;
      border: none;
      color: var(--canvas-text-secondary);
      cursor: pointer;
      padding: 3px;
      border-radius: var(--radius-sm);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.1s ease;

      &:hover:not(:disabled) {
        color: var(--canvas-text-primary);
        background: rgba(255, 255, 255, 0.08);
      }

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }

      &.delete:hover:not(:disabled),
      &.delete-btn:hover:not(:disabled) {
        color: var(--http-delete, #f85149);
        background: var(--http-delete-bg, rgba(218, 54, 51, 0.15));
      }

      .action-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .empty-state {
      padding: 36px 16px;
      text-align: center;
      color: var(--canvas-text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;

      .empty-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        opacity: 0.5;
        margin-bottom: 2px;
      }

      .empty-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--canvas-text-secondary);
      }

      .empty-desc {
        margin: 0;
        font-size: 11px;
        color: var(--canvas-text-muted);
      }
    }
  `]
})
export class DynamicTableComponent {
  @Input({ required: true }) data: unknown[] = [];
  @Input({ required: true }) columns: TableColumnDescriptor[] = [];

  // Layout mode: 'compact' (default, 480px max height) or 'full-height' (fills parent container)
  @Input() layoutMode: TableLayoutMode = 'compact';
  @Input() set layout(val: TableLayoutMode) {
    if (val) {
      this.layoutMode = val;
    }
  }

  // Action configuration
  @Input() showActions = false;
  @Input() showViewAction = true;
  @Input() showEditAction = true;
  @Input() showDeleteAction = true;
  @Input() viewTooltip = 'View Details';
  @Input() editTooltip = 'Edit';
  @Input() deleteTooltip = 'Delete Record';
  @Input() actions?: TableActionConfig[];
  @Input() actionOrder?: string[];
  @Input() stickyActions = true;

  // Status, Loading & Empty states
  @Input() loading = false;
  @Input() loadingMessage = 'Carregando dados...';
  @Input() totalCount?: number;
  @Input() emptyTitle = 'No records found';
  @Input() emptyDescription = 'The collection is currently empty (0 items).';
  @Input() emptyIcon = 'table_rows';

  // Event Outputs
  @Output() rowView = new EventEmitter<unknown>();
  @Output() rowEdit = new EventEmitter<unknown>();
  @Output() rowDelete = new EventEmitter<unknown>();
  @Output() rowSelect = new EventEmitter<unknown>();
  @Output() rowAction = new EventEmitter<{ action: string; row: unknown; event: MouseEvent }>();

  get effectiveLayoutMode(): TableLayoutMode {
    return this.layoutMode || 'compact';
  }

  get hasActions(): boolean {
    return this.showActions || (Array.isArray(this.actions) && this.actions.length > 0);
  }

  get resolvedActions(): TableActionConfig[] {
    let list: TableActionConfig[] = [];

    if (this.actions && this.actions.length > 0) {
      list = [...this.actions];
    } else {
      // Build default actions from individual flags
      list = [
        {
          id: 'view',
          label: 'View',
          icon: 'visibility',
          tooltip: this.viewTooltip,
          visible: this.showViewAction
        },
        {
          id: 'edit',
          label: 'Edit',
          icon: 'edit',
          tooltip: this.editTooltip,
          visible: this.showEditAction
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: 'delete',
          tooltip: this.deleteTooltip,
          danger: true,
          visible: this.showDeleteAction
        }
      ];
    }

    if (this.actionOrder && this.actionOrder.length > 0) {
      const orderMap = new Map<string, number>();
      this.actionOrder.forEach((id, index) => orderMap.set(id, index));

      list.sort((a, b) => {
        const orderA = orderMap.has(a.id) ? (orderMap.get(a.id) as number) : 999;
        const orderB = orderMap.has(b.id) ? (orderMap.get(b.id) as number) : 999;
        return orderA - orderB;
      });
    }

    return list;
  }

  get displayedColumns(): string[] {
    const keys = this.columns.map((c) => c.key);
    return this.hasActions ? [...keys, '_actions'] : keys;
  }

  isActionVisible(action: TableActionConfig, element: unknown): boolean {
    if (typeof action.visible === 'function') {
      return action.visible(element);
    }
    return action.visible !== false;
  }

  isActionDisabled(action: TableActionConfig, element: unknown): boolean {
    if (typeof action.disabled === 'function') {
      return action.disabled(element);
    }
    return action.disabled === true;
  }

  onActionTriggered(event: MouseEvent, action: TableActionConfig, element: unknown): void {
    event.stopPropagation();
    this.rowAction.emit({ action: action.id, row: element, event });

    if (action.id === 'view') {
      this.rowView.emit(element);
    } else if (action.id === 'edit') {
      this.rowEdit.emit(element);
    } else if (action.id === 'delete') {
      this.rowDelete.emit(element);
    }
  }

  onViewClicked(event: MouseEvent, element: unknown): void {
    this.onActionTriggered(
      event,
      { id: 'view', tooltip: this.viewTooltip, icon: 'visibility' },
      element
    );
  }

  onEditClicked(event: MouseEvent, element: unknown): void {
    this.onActionTriggered(
      event,
      { id: 'edit', tooltip: this.editTooltip, icon: 'edit' },
      element
    );
  }

  onDeleteClicked(event: MouseEvent, element: unknown): void {
    this.onActionTriggered(
      event,
      { id: 'delete', tooltip: this.deleteTooltip, icon: 'delete', danger: true },
      element
    );
  }

  getCellValue(element: unknown, key: string): unknown {
    if (element && typeof element === 'object' && !Array.isArray(element)) {
      return (element as Record<string, unknown>)[key];
    }
    if (key === '_value') {
      return element;
    }
    return undefined;
  }
}

