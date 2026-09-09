import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="loading-container"
      [class.inline]="inline"
      [class.size-sm]="size === 'sm'"
      [class.size-md]="size === 'md'"
      [class.size-lg]="size === 'lg'"
      role="status"
      aria-live="polite"
    >
      <div class="spinner-track" aria-hidden="true">
        <div class="spinner-thumb"></div>
      </div>
      @if (message) {
        <span class="loading-message font-mono">{{ message }}</span>
      }
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 24px;
      color: var(--canvas-text-secondary);

      &.inline {
        display: inline-flex;
        flex-direction: row;
        gap: 8px;
        padding: 0;
      }

      &.size-sm {
        gap: 6px;
        .spinner-track {
          width: 14px;
          height: 14px;
          border-width: 1.5px;
        }
        .loading-message {
          font-size: 11px;
        }
      }

      &.size-md {
        .spinner-track {
          width: 18px;
          height: 18px;
          border-width: 2px;
        }
        .loading-message {
          font-size: 12px;
        }
      }

      &.size-lg {
        gap: 12px;
        .spinner-track {
          width: 26px;
          height: 26px;
          border-width: 2.5px;
        }
        .loading-message {
          font-size: 13px;
        }
      }
    }

    .spinner-track {
      position: relative;
      border-radius: 50%;
      border-style: solid;
      border-color: var(--canvas-border);
      border-top-color: var(--canvas-text-link);
      animation: spin 0.65s linear infinite;
      flex-shrink: 0;
    }

    .loading-message {
      color: var(--canvas-text-secondary);
      letter-spacing: 0.2px;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `]
})
export class LoadingIndicatorComponent {
  @Input() message?: string = 'Loading...';
  @Input() inline = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
}
