import { Component, computed, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ValueRendererComponent } from '../value-renderer/value-renderer.component';

export interface PropertyItem {
  key: string;
  value: unknown;
  type: string;
  isExpandable: boolean;
  expanded?: boolean;
}

@Component({
  selector: 'app-object-details',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ValueRendererComponent],
  template: `
    <div class="object-details-container">
      <!-- Toolbar: Filter & Summary -->
      <div class="details-toolbar">
        <div class="toolbar-left">
          <mat-icon class="search-icon">search</mat-icon>
          <input
            type="text"
            class="filter-input font-mono"
            placeholder="Filter properties..."
            [ngModel]="filterQuery()"
            (ngModelChange)="filterQuery.set($event)"
          />
          @if (filterQuery()) {
            <button
              type="button"
              class="clear-filter-btn"
              (click)="filterQuery.set('')"
              title="Clear filter"
            >
              <mat-icon class="icon-sm">close</mat-icon>
            </button>
          }
        </div>

        <div class="toolbar-right">
          <span class="prop-count font-mono">
            {{ filteredProperties().length }}/{{ allProperties().length }} properties
          </span>
          <button
            type="button"
            class="copy-all-btn"
            (click)="onCopyEntireObject()"
            [title]="copiedAll() ? 'Copied object!' : 'Copy object as JSON'"
          >
            <mat-icon class="icon-sm">{{ copiedAll() ? 'check' : 'content_copy' }}</mat-icon>
            <span>{{ copiedAll() ? 'Copied' : 'Copy Object' }}</span>
          </button>
        </div>
      </div>

      <!-- Properties Grid Table -->
      <div class="properties-table font-mono" role="table">
        <div class="prop-header-row" role="row">
          <span class="th-key" role="columnheader">Property</span>
          <span class="th-type" role="columnheader">Type</span>
          <span class="th-value" role="columnheader">Value</span>
          <span class="th-actions" role="columnheader"></span>
        </div>

        @for (item of filteredProperties(); track item.key) {
          <div class="prop-row" role="row" [class.expanded]="item.expanded">
            <!-- Property Key & Expand Toggle -->
            <div class="cell-key" role="cell">
              @if (item.isExpandable) {
                <button
                  type="button"
                  class="expand-toggle-btn"
                  (click)="toggleExpand(item.key)"
                  [title]="item.expanded ? 'Collapse' : 'Expand'"
                >
                  <mat-icon class="toggle-icon">
                    {{ item.expanded ? 'expand_more' : 'chevron_right' }}
                  </mat-icon>
                </button>
              } @else {
                <span class="expand-placeholder"></span>
              }
              <span class="key-name" [title]="item.key">{{ item.key }}</span>
            </div>

            <!-- Property Type -->
            <div class="cell-type" role="cell">
              <span class="type-pill" [attr.data-type]="item.type">{{ item.type }}</span>
            </div>

            <!-- Property Value -->
            <div class="cell-value" role="cell">
              <app-value-renderer [value]="item.value" />
            </div>

            <!-- Row Actions (Copy Key/Value) -->
            <div class="cell-actions" role="cell">
              <button
                type="button"
                class="row-copy-btn"
                (click)="onCopyValue(item.value, item.key)"
                [title]="copiedKey() === item.key ? 'Copied value!' : 'Copy property value'"
              >
                <mat-icon class="icon-xs">
                  {{ copiedKey() === item.key ? 'check' : 'content_copy' }}
                </mat-icon>
              </button>
            </div>
          </div>

          <!-- Expanded Nested Sub-view -->
          @if (item.expanded && item.isExpandable) {
            <div class="nested-row">
              <div class="nested-content">
                @if (isPlainObject(item.value)) {
                  <app-object-details [data]="$any(item.value)" />
                } @else if (isArray(item.value)) {
                  <pre class="nested-pre font-mono">{{ formatJson(item.value) }}</pre>
                }
              </div>
            </div>
          }
        } @empty {
          <div class="empty-properties-state">
            <mat-icon class="empty-icon">search_off</mat-icon>
            <span>No properties match the filter "{{ filterQuery() }}".</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .object-details-container {
      width: 100%;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .details-toolbar {
      padding: 6px 12px;
      background: var(--canvas-surface-elevated);
      border-bottom: 1px solid var(--canvas-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      max-width: 360px;
      position: relative;
    }
    .search-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--canvas-text-muted);
    }
    .filter-input {
      width: 100%;
      height: 26px;
      background: var(--canvas-bg);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      padding: 0 24px 0 8px;
      font-size: 11px;
      color: var(--canvas-text-primary);
      outline: none;
      transition: border-color 0.12s ease;
    }
    .filter-input:focus {
      border-color: var(--canvas-text-muted);
    }
    .clear-filter-btn {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: var(--canvas-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;
    }
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .prop-count {
      font-size: 11px;
      color: var(--canvas-text-secondary);
    }
    .copy-all-btn {
      height: 24px;
      padding: 0 8px;
      background: transparent;
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      color: var(--canvas-text-secondary);
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.12s ease;
    }
    .copy-all-btn:hover {
      color: var(--canvas-text-primary);
      border-color: var(--canvas-text-muted);
      background: rgba(255, 255, 255, 0.04);
    }
    .properties-table {
      width: 100%;
      overflow: auto;
      max-height: 480px;
    }
    .prop-header-row {
      display: flex;
      align-items: center;
      padding: 7px 12px;
      background: var(--canvas-surface);
      border-bottom: 1px solid var(--canvas-border);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--canvas-text-secondary);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .th-key { width: 220px; min-width: 160px; }
    .th-type { width: 90px; }
    .th-value { flex: 1; min-width: 140px; }
    .th-actions { width: 32px; text-align: right; }

    .prop-row {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      border-bottom: 1px solid var(--canvas-border-subtle);
      font-size: 12px;
      transition: background 0.1s ease;
    }
    .prop-row:hover {
      background: rgba(255, 255, 255, 0.025);
    }
    .cell-key {
      width: 220px;
      min-width: 160px;
      display: flex;
      align-items: center;
      gap: 4px;
      overflow: hidden;
    }
    .expand-toggle-btn {
      background: transparent;
      border: none;
      padding: 0;
      color: var(--canvas-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 2px;
    }
    .expand-toggle-btn:hover {
      color: var(--canvas-text-primary);
      background: rgba(255, 255, 255, 0.08);
    }
    .toggle-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .expand-placeholder {
      width: 18px;
      display: inline-block;
    }
    .key-name {
      font-weight: 600;
      color: var(--canvas-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cell-type {
      width: 90px;
    }
    .type-pill {
      display: inline-block;
      font-size: 10px;
      color: var(--canvas-text-muted);
      background: var(--canvas-surface-elevated);
      padding: 1px 5px;
      border-radius: 2px;
      border: 1px solid var(--canvas-border-subtle);
    }
    .cell-value {
      flex: 1;
      min-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cell-actions {
      width: 32px;
      text-align: right;
    }
    .row-copy-btn {
      background: transparent;
      border: none;
      color: var(--canvas-text-muted);
      cursor: pointer;
      padding: 2px;
      border-radius: 2px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .row-copy-btn:hover {
      color: var(--canvas-text-primary);
      background: rgba(255, 255, 255, 0.08);
    }
    .nested-row {
      padding: 8px 12px 8px 28px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--canvas-border-subtle);
    }
    .nested-pre {
      margin: 0;
      padding: 8px;
      background: var(--canvas-bg);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      font-size: 11px;
      max-height: 200px;
      overflow: auto;
      color: var(--canvas-text-secondary);
    }
    .empty-properties-state {
      padding: 24px;
      text-align: center;
      color: var(--canvas-text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }
    .empty-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      opacity: 0.6;
    }
    .icon-sm {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .icon-xs {
      font-size: 12px;
      width: 12px;
      height: 12px;
    }
  `]
})
export class ObjectDetailsComponent {
  private _data = signal<Record<string, unknown>>({});

  @Input({ required: true })
  set data(val: unknown) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      this._data.set(val as Record<string, unknown>);
    } else {
      this._data.set({});
    }
  }

  filterQuery = signal<string>('');
  expandedKeys = signal<Set<string>>(new Set());
  copiedKey = signal<string | null>(null);
  copiedAll = signal<boolean>(false);

  allProperties = computed<PropertyItem[]>(() => {
    const raw = this._data();
    const expanded = this.expandedKeys();

    return Object.entries(raw).map(([key, value]) => {
      const type = this.detectType(value);
      const isExpandable = (type === 'object' && value !== null && Object.keys(value as object).length > 0) ||
                           (type === 'array' && Array.isArray(value) && value.length > 0);

      return {
        key,
        value,
        type,
        isExpandable,
        expanded: expanded.has(key)
      };
    });
  });

  filteredProperties = computed<PropertyItem[]>(() => {
    const list = this.allProperties();
    const query = this.filterQuery().trim().toLowerCase();

    if (!query) {
      return list;
    }

    return list.filter((item) =>
      item.key.toLowerCase().includes(query) ||
      String(item.value).toLowerCase().includes(query)
    );
  });

  toggleExpand(key: string): void {
    this.expandedKeys.update((set) => {
      const next = new Set(set);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  onCopyValue(val: unknown, key: string): void {
    if (navigator?.clipboard) {
      const text = typeof val === 'object' && val !== null ? JSON.stringify(val, null, 2) : String(val ?? '');
      navigator.clipboard.writeText(text).then(() => {
        this.copiedKey.set(key);
        setTimeout(() => this.copiedKey.set(null), 2000);
      });
    }
  }

  onCopyEntireObject(): void {
    if (navigator?.clipboard) {
      const text = JSON.stringify(this._data(), null, 2);
      navigator.clipboard.writeText(text).then(() => {
        this.copiedAll.set(true);
        setTimeout(() => this.copiedAll.set(false), 2000);
      });
    }
  }

  isPlainObject(val: unknown): boolean {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
  }

  isArray(val: unknown): boolean {
    return Array.isArray(val);
  }

  formatJson(val: unknown): string {
    return JSON.stringify(val, null, 2);
  }

  private detectType(val: unknown): string {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (Array.isArray(val)) return `array[${val.length}]`;
    if (typeof val === 'number') return 'number';
    if (typeof val === 'boolean') return 'boolean';
    if (val instanceof Date) return 'date';
    if (typeof val === 'string') {
      if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/.test(val)) return 'date';
      return 'string';
    }
    if (typeof val === 'object') return 'object';
    return typeof val;
  }
}
