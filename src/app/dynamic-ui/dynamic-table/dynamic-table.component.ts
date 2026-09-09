import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TableColumnDescriptor } from './table-schema.service';
import { ValueRendererComponent } from '../value-renderer/value-renderer.component';

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
    <div class="table-container">
      <!-- Technical Meta Bar -->
      <div class="table-meta-bar">
        <div class="meta-left">
          <span class="meta-badge font-mono">{{ data.length }} record{{ data.length === 1 ? '' : 's' }}</span>
          <span class="meta-separator">·</span>
          <span class="meta-sub font-mono">{{ columns.length }} column{{ columns.length === 1 ? '' : 's' }}</span>
        </div>
      </div>

      <!-- Compact Technical Table -->
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

            <!-- Optional Actions Column -->
            @if (showActions) {
              <ng-container matColumnDef="_actions">
                <th mat-header-cell *matHeaderCellDef class="table-header actions-header"> Actions </th>
                <td mat-cell *matCellDef="let element" class="table-cell actions-cell">
                  @if (showViewAction) {
                    <button
                      type="button"
                      class="action-icon-btn view-btn"
                      (click)="onViewClicked($event, element)"
                      [title]="viewTooltip"
                    >
                      <mat-icon class="action-icon">visibility</mat-icon>
                    </button>
                  }
                  @if (showEditAction) {
                    <button
                      type="button"
                      class="action-icon-btn edit-btn"
                      (click)="onEditClicked($event, element)"
                      title="Edit"
                    >
                      <mat-icon class="action-icon">edit</mat-icon>
                    </button>
                  }
                  @if (showDeleteAction) {
                    <button
                      type="button"
                      class="action-icon-btn delete delete-btn"
                      (click)="onDeleteClicked($event, element)"
                      [title]="deleteTooltip"
                    >
                      <mat-icon class="action-icon">delete</mat-icon>
                    </button>
                  }
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
        <!-- Minimalist Technical Empty State -->
        <div class="empty-state">
          <mat-icon class="empty-icon">table_rows</mat-icon>
          <span class="empty-title font-mono">No records found</span>
          <p class="empty-desc">The collection is currently empty (0 items).</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .table-container {
      width: 100%;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .table-meta-bar {
      padding: 5px 12px;
      background: var(--canvas-surface-elevated);
      border-bottom: 1px solid var(--canvas-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
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

    .meta-separator {
      color: var(--canvas-text-muted);
    }

    .meta-sub {
      color: var(--canvas-text-secondary);
    }

    .table-scroll-wrapper {
      width: 100%;
      overflow-x: auto;
      max-height: 520px;
    }

    .technical-table {
      width: 100%;
      background: transparent;
      border-collapse: collapse;
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
      z-index: 2;
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
    }

    .table-row {
      transition: background 0.08s ease;
      cursor: default;

      &:hover {
        background: rgba(255, 255, 255, 0.035);
      }
    }

    .actions-header, .actions-cell {
      text-align: right;
      width: 90px;
      padding-right: 10px;
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

      &:hover {
        color: var(--canvas-text-primary);
        background: rgba(255, 255, 255, 0.06);
      }

      &.delete:hover {
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
  @Input() showActions = false;
  @Input() showViewAction = true;
  @Input() showEditAction = true;
  @Input() showDeleteAction = true;
  @Input() viewTooltip = 'View Details';
  @Input() deleteTooltip = 'Delete Record';

  @Output() rowView = new EventEmitter<unknown>();
  @Output() rowEdit = new EventEmitter<unknown>();
  @Output() rowDelete = new EventEmitter<unknown>();
  @Output() rowSelect = new EventEmitter<unknown>();

  get displayedColumns(): string[] {
    const keys = this.columns.map((c) => c.key);
    return this.showActions ? [...keys, '_actions'] : keys;
  }

  onViewClicked(event: MouseEvent, element: unknown): void {
    event.stopPropagation();
    this.rowView.emit(element);
  }

  onEditClicked(event: MouseEvent, element: unknown): void {
    event.stopPropagation();
    this.rowEdit.emit(element);
  }

  onDeleteClicked(event: MouseEvent, element: unknown): void {
    event.stopPropagation();
    this.rowDelete.emit(element);
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
