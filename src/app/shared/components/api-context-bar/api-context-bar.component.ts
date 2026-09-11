import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { StatusIndicatorComponent } from '../status-indicator/status-indicator.component';
import { ApiSessionService } from '../../../core/services/api-session.service';

/**
 * Shared context bar displaying API metadata, connection status,
 * authentication controls and API switching.
 *
 * Used by both API Explorer (Workspace) and Dashboard features
 * to avoid markup/style duplication.
 */
@Component({
  selector: 'app-api-context-bar',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    StatusIndicatorComponent
  ],
  template: `
    <header class="context-bar">
      <div class="api-meta">
        <div class="api-identity">
          <span class="api-title" [title]="apiTitle() || 'No API Connected'">
            {{ apiTitle() || 'ApiCanvas Workspace' }}
          </span>
          @if (apiVersion()) {
            <span class="api-version font-mono">v{{ apiVersion() }}</span>
          }
        </div>

        @if (baseUrl()) {
          <div class="api-endpoint" title="{{ baseUrl() }}">
            <span class="endpoint-label">Base URL:</span>
            <span class="endpoint-value font-mono">{{ baseUrl() }}</span>
          </div>
        }

        <app-status-indicator
          [connected]="hasActiveApi()"
          [label]="hasActiveApi() ? 'Connected' : 'Disconnected'"
        />
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="action-btn auth-btn"
          [class.active]="hasAnyAuthCredential()"
          (click)="authClick.emit()"
          title="Configure API Authentication (Bearer Token & API Keys)"
        >
          <mat-icon class="btn-icon">{{ hasAnyAuthCredential() ? 'lock' : 'lock_outline' }}</mat-icon>
          <span>{{ hasAnyAuthCredential() ? 'Auth: Active' : 'Auth' }}</span>
        </button>

        <button
          type="button"
          class="action-btn disconnect-btn"
          (click)="changeApiClick.emit()"
          title="Change connected API specification"
        >
          <mat-icon class="btn-icon">swap_horiz</mat-icon>
          <span>Change API</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .context-bar {
      height: 48px;
      min-height: 48px;
      background: var(--canvas-surface);
      border-bottom: 1px solid var(--canvas-border);
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      z-index: 10;
    }

    .api-meta {
      display: flex;
      align-items: center;
      gap: 14px;
      overflow: hidden;
      flex: 1;
    }

    .api-identity {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .api-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--canvas-text-primary);
      white-space: nowrap;
    }

    .api-version {
      font-size: 11px;
      background: var(--canvas-surface-elevated);
      color: var(--canvas-text-secondary);
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--canvas-border-subtle);
    }

    .api-endpoint {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }

    .endpoint-label {
      font-size: 11px;
      color: var(--canvas-text-muted);
      text-transform: uppercase;
      font-weight: 600;
      white-space: nowrap;
    }

    .endpoint-value {
      font-size: 12px;
      color: var(--canvas-text-secondary);
      background: var(--canvas-bg);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--canvas-border-subtle);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .action-btn {
      height: 28px;
      padding: 0 10px;
      font-size: 12px;
      font-weight: 500;
      color: var(--canvas-text-secondary);
      background: var(--canvas-surface-elevated);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;

      &:hover {
        color: var(--canvas-text-primary);
        border-color: var(--canvas-text-muted);
        background: #282e37;
      }

      &.auth-btn.active {
        color: #34d399;
        background: rgba(52, 211, 153, 0.08);
        border-color: rgba(52, 211, 153, 0.3);

        &:hover {
          background: rgba(52, 211, 153, 0.15);
          border-color: #34d399;
        }
      }

      .btn-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    @media (max-width: 768px) {
      .api-endpoint {
        display: none !important;
      }
    }
  `]
})
export class ApiContextBarComponent {
  private readonly sessionService = inject(ApiSessionService);

  readonly authClick = output<void>();
  readonly changeApiClick = output<void>();

  readonly hasActiveApi = this.sessionService.hasActiveApi;
  readonly hasAnyAuthCredential = this.sessionService.hasAnyAuthCredential;
  readonly apiTitle = this.sessionService.apiTitle;
  readonly apiVersion = this.sessionService.apiVersion;
  readonly baseUrl = this.sessionService.baseUrl;
}
