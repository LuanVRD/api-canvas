import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

@Component({
  selector: 'app-value-renderer',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (isNullOrUndefined(value)) {
      <span class="val-null font-mono">null</span>
    } @else if (isBoolean(value)) {
      <span class="badge-bool" [class.is-true]="value === true" [class.is-false]="value === false">
        <mat-icon class="bool-icon">{{ value ? 'check' : 'close' }}</mat-icon>
        <span>{{ value ? 'true' : 'false' }}</span>
      </span>
    } @else if (isDate(value)) {
      <time class="val-date font-mono" [title]="getIsoDate(value)">
        {{ formatDisplayDate(value) }}
      </time>
    } @else if (isNumber(value)) {
      <span class="val-number font-mono">{{ value }}</span>
    } @else if (isArray(value)) {
      @if (value.length === 0) {
        <span class="val-empty font-mono">[]</span>
      } @else if (isPrimitiveArray(value)) {
        <span class="val-array-primitives font-mono" [title]="formatJson(value)">
          [{{ formatPrimitiveArray(value) }}]
        </span>
      } @else {
        <span class="val-array-complex font-mono" [title]="formatJson(value)">
          [{{ value.length }} item{{ value.length === 1 ? '' : 's' }}]
        </span>
      }
    } @else if (isObject(value)) {
      @if (getObjectKeysCount(value) === 0) {
        <span class="val-empty font-mono">&#123;&#125;</span>
      } @else {
        <span class="val-object font-mono" [title]="formatJson(value)">
          {{ formatObjectInline(value) }}
        </span>
      }
    } @else {
      <span class="val-text">{{ value }}</span>
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
    }

    .val-null {
      color: var(--canvas-text-muted);
      font-size: 11px;
      font-style: italic;
      opacity: 0.8;
    }

    .val-empty {
      color: var(--canvas-text-muted);
      font-size: 11px;
      opacity: 0.7;
    }

    .badge-bool {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      line-height: 1.3;

      .bool-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }

      &.is-true {
        background: rgba(46, 160, 67, 0.15);
        color: var(--color-success, #3fb950);
        border: 1px solid rgba(46, 160, 67, 0.35);
      }

      &.is-false {
        background: rgba(218, 54, 51, 0.15);
        color: var(--color-danger, #f85149);
        border: 1px solid rgba(218, 54, 51, 0.35);
      }
    }

    .val-date {
      color: var(--canvas-text-primary);
      font-size: 12px;
      letter-spacing: -0.2px;
    }

    .val-number {
      color: var(--canvas-text-primary);
      font-size: 12px;
    }

    .val-array-primitives {
      color: var(--canvas-text-link, #58a6ff);
      font-size: 11px;
      background: var(--canvas-surface-elevated);
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--canvas-border-subtle);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 240px;
      display: inline-block;
    }

    .val-array-complex {
      color: var(--canvas-text-secondary);
      background: var(--canvas-surface-elevated);
      font-size: 11px;
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--canvas-border-subtle);
      cursor: help;
    }

    .val-object {
      color: var(--canvas-text-secondary);
      background: var(--canvas-surface-elevated);
      font-size: 11px;
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--canvas-border-subtle);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 240px;
      display: inline-block;
      cursor: help;
    }

    .val-text {
      color: var(--canvas-text-primary);
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class ValueRendererComponent {
  @Input() value: unknown;
  @Input() type?: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  @Input() format?: string;

  isNullOrUndefined(val: unknown): boolean {
    return val === null || val === undefined;
  }

  isBoolean(val: unknown): val is boolean {
    if (this.type === 'boolean') return true;
    return typeof val === 'boolean';
  }

  isNumber(val: unknown): val is number {
    if (this.type === 'number') return typeof val === 'number';
    return typeof val === 'number';
  }

  isDate(val: unknown): boolean {
    if (this.type === 'date' || this.format === 'date' || this.format === 'date-time') {
      return true;
    }
    if (val instanceof Date) return true;
    if (typeof val === 'string' && ISO_DATE_REGEX.test(val.trim())) {
      return !isNaN(Date.parse(val.trim()));
    }
    return false;
  }

  isArray(val: unknown): val is unknown[] {
    return Array.isArray(val);
  }

  isPrimitiveArray(val: unknown[]): boolean {
    return val.every((item) => item === null || item === undefined || typeof item !== 'object');
  }

  isObject(val: unknown): val is Record<string, unknown> {
    return typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date);
  }

  getObjectKeysCount(val: Record<string, unknown>): number {
    return Object.keys(val).length;
  }

  getIsoDate(val: unknown): string {
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'string') return val;
    return String(val);
  }

  formatDisplayDate(val: unknown): string {
    let d: Date;
    if (val instanceof Date) {
      d = val;
    } else if (typeof val === 'string') {
      d = new Date(val);
    } else {
      return String(val);
    }

    if (isNaN(d.getTime())) {
      return String(val);
    }

    const isoStr = typeof val === 'string' ? val : d.toISOString();
    const hasTime = isoStr.includes('T') || isoStr.includes(':');

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    if (!hasTime) {
      return `${year}-${month}-${day}`;
    }

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  formatPrimitiveArray(val: unknown[]): string {
    if (val.length <= 3) {
      return val.map((v) => JSON.stringify(v)).join(', ');
    }
    const preview = val.slice(0, 3).map((v) => JSON.stringify(v)).join(', ');
    return `${preview}, +${val.length - 3} more`;
  }

  formatObjectInline(val: Record<string, unknown>): string {
    const keys = Object.keys(val);
    if (keys.length <= 2) {
      const parts = keys.map((k) => {
        const itemVal = val[k];
        const formattedVal = typeof itemVal === 'object' && itemVal !== null ? '{...}' : JSON.stringify(itemVal);
        return `${k}: ${formattedVal}`;
      });
      return `{ ${parts.join(', ')} }`;
    }
    const parts = keys.slice(0, 2).map((k) => {
      const itemVal = val[k];
      const formattedVal = typeof itemVal === 'object' && itemVal !== null ? '{...}' : JSON.stringify(itemVal);
      return `${k}: ${formattedVal}`;
    });
    return `{ ${parts.join(', ')}, ... }`;
  }

  formatJson(val: unknown): string {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }
}
