import { Component, computed, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-json-viewer',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="json-viewer-container" [style.max-height]="maxHeight || 'none'">
      @if (showHeader) {
        <div class="json-viewer-header">
          <div class="header-left">
            <span class="format-tag font-mono">{{ title || 'JSON' }}</span>
            <span class="meta-tag font-mono">{{ lineCount() }} lines</span>
            <span class="meta-tag font-mono">{{ byteSizeFormatted() }}</span>
          </div>
          @if (showCopy) {
            <button
              type="button"
              class="copy-btn font-mono"
              (click)="onCopy()"
              [title]="copied() ? 'Copied to clipboard!' : 'Copy raw content'"
            >
              <mat-icon class="btn-icon">{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
              <span>{{ copied() ? 'Copied' : 'Copy' }}</span>
            </button>
          }
        </div>
      }
      <div class="json-content-wrapper">
        <pre class="json-pre font-mono"><code>{{ formattedJson() }}</code></pre>
      </div>
    </div>
  `,
  styles: [`
    .json-viewer-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      background-color: var(--canvas-bg);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }

    .json-viewer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 32px;
      min-height: 32px;
      padding: 0 10px;
      background-color: var(--canvas-surface);
      border-bottom: 1px solid var(--canvas-border);
      font-size: 11px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;

        .format-tag {
          font-weight: 600;
          color: var(--canvas-text-link);
          text-transform: uppercase;
        }

        .meta-tag {
          color: var(--canvas-text-muted);
        }
      }

      .copy-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: transparent;
        border: 1px solid var(--canvas-border);
        color: var(--canvas-text-secondary);
        padding: 2px 8px;
        border-radius: var(--radius-sm);
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s ease;

        .btn-icon {
          font-size: 13px;
          width: 13px;
          height: 13px;
        }

        &:hover {
          color: var(--canvas-text-primary);
          border-color: var(--canvas-text-link);
          background-color: var(--canvas-surface-elevated);
        }
      }
    }

    .json-content-wrapper {
      flex: 1;
      overflow: auto;
      padding: 12px;
    }

    .json-pre {
      margin: 0;
      padding: 0;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.5;
      color: var(--canvas-text-primary);
      white-space: pre-wrap;
      word-break: break-all;
    }
  `]
})
export class JsonViewerComponent {
  private readonly _data = signal<unknown>(undefined);

  @Input()
  set data(value: unknown) {
    this._data.set(value);
  }
  get data(): unknown {
    return this._data();
  }

  @Input() title?: string;
  @Input() maxHeight?: string;
  @Input() showHeader = true;
  @Input() showCopy = true;

  readonly copied = signal<boolean>(false);

  readonly formattedJson = computed(() => {
    const val = this._data();
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return val;
      }
    }
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  });

  readonly lineCount = computed(() => {
    const text = this.formattedJson();
    return text ? text.split('\n').length : 0;
  });

  readonly byteSizeFormatted = computed(() => {
    const text = this.formattedJson();
    const bytes = new Blob([text]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  });

  onCopy(): void {
    const text = this.formattedJson();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    this.copied.set(true);
    setTimeout(() => {
      this.copied.set(false);
    }, 2000);
  }
}
