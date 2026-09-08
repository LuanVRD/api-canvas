import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-value-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (value === null || value === undefined) {
      <span class="text-muted font-mono">null</span>
    } @else if (isBoolean(value)) {
      <span class="badge-bool" [class.true]="value" [class.false]="!value">
        {{ value ? 'true' : 'false' }}
      </span>
    } @else if (isObject(value)) {
      <span class="object-preview font-mono">{{ formatObject(value) }}</span>
    } @else {
      <span>{{ value }}</span>
    }
  `,
  styles: [`
    .text-muted {
      color: var(--canvas-text-muted);
      font-style: italic;
    }
    .badge-bool {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      &.true {
        background: var(--http-get-bg);
        color: var(--http-get);
        border: 1px solid var(--http-get-border);
      }
      &.false {
        background: var(--http-delete-bg);
        color: var(--http-delete);
        border: 1px solid var(--http-delete-border);
      }
    }
    .object-preview {
      font-size: 12px;
      color: var(--canvas-text-secondary);
      background: var(--canvas-surface-elevated);
      padding: 2px 6px;
      border-radius: 4px;
    }
  `]
})
export class ValueRendererComponent {
  @Input() value: unknown;

  isBoolean(val: unknown): val is boolean {
    return typeof val === 'boolean';
  }

  isObject(val: unknown): val is object {
    return typeof val === 'object' && val !== null;
  }

  formatObject(val: object): string {
    if (Array.isArray(val)) {
      return `Array(${val.length})`;
    }
    return '{...}';
  }
}
