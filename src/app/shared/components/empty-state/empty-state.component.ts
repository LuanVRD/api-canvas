import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div
      class="empty-state-card"
      [class.compact]="compact"
      role="status"
    >
      @if (icon) {
        <mat-icon class="empty-icon" aria-hidden="true">{{ icon }}</mat-icon>
      }
      <div class="empty-content">
        @if (title) {
          <h4 class="empty-title">{{ title }}</h4>
        }
        @if (description) {
          <p class="empty-description">{{ description }}</p>
        }
        <div class="empty-actions">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .empty-state-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 32px 20px;
      color: var(--canvas-text-secondary);
      background-color: var(--canvas-surface);
      border: 1px dashed var(--canvas-border);
      border-radius: var(--radius-sm);
      gap: 12px;

      &.compact {
        padding: 16px 12px;
        gap: 8px;

        .empty-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        .empty-title {
          font-size: 13px;
        }

        .empty-description {
          font-size: 11px;
        }
      }
    }

    .empty-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--canvas-text-muted);
      opacity: 0.8;
    }

    .empty-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      max-width: 480px;
    }

    .empty-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--canvas-text-primary);
      letter-spacing: -0.2px;
    }

    .empty-description {
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--canvas-text-muted);
    }

    .empty-actions {
      margin-top: 8px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;

      &:empty {
        display: none;
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon?: string;
  @Input() title = 'No data available';
  @Input() description?: string;
  @Input() compact = false;
}
