import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpMethod } from '../../../core/models/api-operation.model';

@Component({
  selector: 'app-http-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="http-badge" [attr.data-method]="normalizedMethod">
      {{ normalizedMethod }}
    </span>
  `,
  styles: [`
    .http-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 6px;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      border-radius: var(--radius-sm);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      user-select: none;

      &[data-method="GET"] {
        background: var(--http-get-bg);
        color: var(--http-get);
        border: 1px solid var(--http-get-border);
      }
      &[data-method="POST"] {
        background: var(--http-post-bg);
        color: var(--http-post);
        border: 1px solid var(--http-post-border);
      }
      &[data-method="PUT"] {
        background: var(--http-put-bg);
        color: var(--http-put);
        border: 1px solid var(--http-put-border);
      }
      &[data-method="PATCH"] {
        background: var(--http-patch-bg);
        color: var(--http-patch);
        border: 1px solid var(--http-patch-border);
      }
      &[data-method="DELETE"] {
        background: var(--http-delete-bg);
        color: var(--http-delete);
        border: 1px solid var(--http-delete-border);
      }
    }
  `]
})
export class HttpBadgeComponent {
  @Input({ required: true }) method!: HttpMethod | string;

  get normalizedMethod(): string {
    return (this.method || 'GET').toUpperCase();
  }
}
