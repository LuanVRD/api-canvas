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
      <table mat-table [dataSource]="data" class="mat-elevation-z0 technical-table">
        @for (col of columns; track col.key) {
          <ng-container [matColumnDef]="col.key">
            <th mat-header-cell *matHeaderCellDef class="table-header"> {{ col.label }} </th>
            <td mat-cell *matCellDef="let element" class="table-cell">
              <app-value-renderer [value]="element[col.key]" />
            </td>
          </ng-container>
        }

        <!-- Actions Column -->
        <ng-container matColumnDef="_actions">
          <th mat-header-cell *matHeaderCellDef class="table-header actions-header"> Actions </th>
          <td mat-cell *matCellDef="let element" class="table-cell actions-cell">
            <button mat-icon-button class="action-btn" (click)="rowView.emit(element)" title="View Details">
              <mat-icon>visibility</mat-icon>
            </button>
            <button mat-icon-button class="action-btn" (click)="rowEdit.emit(element)" title="Edit">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button class="action-btn delete" (click)="rowDelete.emit(element)" title="Delete">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
      </table>

      @if (data.length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">inbox</mat-icon>
          <p>No records found</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .table-container {
      width: 100%;
      overflow-x: auto;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-md);
    }
    .technical-table {
      width: 100%;
      background: transparent;
    }
    .table-header {
      background: var(--canvas-surface-elevated);
      color: var(--canvas-text-secondary);
      font-family: var(--font-sans);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--canvas-border);
      padding: 10px 16px;
    }
    .table-cell {
      color: var(--canvas-text-primary);
      font-size: 13px;
      border-bottom: 1px solid var(--canvas-border-subtle);
      padding: 10px 16px;
    }
    .table-row:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    .actions-header, .actions-cell {
      text-align: right;
      width: 120px;
    }
    .action-btn {
      width: 32px;
      height: 32px;
      line-height: 32px;
      color: var(--canvas-text-secondary);
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      &:hover {
        color: var(--canvas-text-primary);
      }
      &.delete:hover {
        color: var(--http-delete);
      }
    }
    .empty-state {
      padding: 32px;
      text-align: center;
      color: var(--canvas-text-muted);
      .empty-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        margin-bottom: 8px;
      }
    }
  `]
})
export class DynamicTableComponent {
  @Input({ required: true }) data: Record<string, unknown>[] = [];
  @Input({ required: true }) columns: TableColumnDescriptor[] = [];
  @Input() showActions = true;

  @Output() rowView = new EventEmitter<Record<string, unknown>>();
  @Output() rowEdit = new EventEmitter<Record<string, unknown>>();
  @Output() rowDelete = new EventEmitter<Record<string, unknown>>();

  get displayedColumns(): string[] {
    const keys = this.columns.map(c => c.key);
    return this.showActions ? [...keys, '_actions'] : keys;
  }
}
