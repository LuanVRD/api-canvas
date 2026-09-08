import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-indicator" [class.connected]="connected" [class.idle]="!connected">
      <span class="dot"></span>
      <span class="label">{{ connected ? (label || 'Connected') : (label || 'Disconnected') }}</span>
    </span>
  `,
  styles: [`
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      color: var(--canvas-text-secondary);

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--canvas-text-muted);
      }

      &.connected {
        color: var(--color-success);
        .dot {
          background-color: var(--color-success);
          box-shadow: 0 0 6px rgba(46, 160, 67, 0.4);
        }
      }

      &.idle {
        color: var(--canvas-text-muted);
        .dot {
          background-color: var(--canvas-text-muted);
        }
      }
    }
  `]
})
export class StatusIndicatorComponent {
  @Input() connected = false;
  @Input() label?: string;
}
