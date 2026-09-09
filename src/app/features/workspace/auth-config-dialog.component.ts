import { Component, EventEmitter, inject, OnInit, Output, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiSecurityScheme } from '../../core/models/api-definition.model';

@Component({
  selector: 'app-auth-config-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="dialog-backdrop" (click)="onBackdropClick($event)">
      <div class="dialog-panel font-sans" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
        <!-- Dialog Header -->
        <header class="dialog-header">
          <div class="header-left">
            <div class="header-badge-row">
              <span class="dialog-badge font-mono">AUTHENTICATION</span>
              @if (hasAnyCredential()) {
                <span class="status-badge active font-mono">CREDENTIALS ACTIVE</span>
              } @else {
                <span class="status-badge inactive font-mono">NO CREDENTIALS</span>
              }
            </div>
            <h2 id="auth-dialog-title" class="dialog-title">API Authentication Configuration</h2>
          </div>

          <button
            type="button"
            class="icon-action-btn close-btn"
            (click)="close.emit()"
            title="Close dialog (Esc)"
          >
            <mat-icon class="icon-sm">close</mat-icon>
          </button>
        </header>

        <!-- Dialog Content -->
        <div class="dialog-body">
          <!-- Detected Security Schemes from Spec -->
          <div class="section-block">
            <div class="section-header">
              <span class="section-label">DETECTED OPENAPI SECURITY SCHEMES</span>
              <span class="schemes-count font-mono">{{ securitySchemes().length }} scheme{{ securitySchemes().length !== 1 ? 's' : '' }}</span>
            </div>

            @if (securitySchemes().length > 0) {
              <div class="schemes-list">
                @for (scheme of securitySchemes(); track scheme.id) {
                  <div class="scheme-item" [class.is-bearer]="scheme.isBearer" [class.is-api-key]="scheme.type === 'apiKey' || scheme.isApiKey">
                    <div class="scheme-meta">
                      <div class="scheme-id-row">
                        <span class="scheme-name font-mono">{{ scheme.id }}</span>
                        @if (scheme.isBearer) {
                          <span class="scheme-tag bearer-tag font-mono">BEARER HTTP</span>
                        }
                        @if (scheme.type === 'apiKey' || scheme.isApiKey) {
                          <span class="scheme-tag apikey-tag font-mono">API KEY ({{ (scheme.in || 'header').toUpperCase() }})</span>
                        }
                        <span class="scheme-type font-mono">{{ scheme.type }}</span>
                        @if (scheme.name) {
                          <span class="scheme-param-target font-mono">target: <code>{{ scheme.name }}</code></span>
                        }
                      </div>
                      <div class="scheme-target-info font-mono">
                        @if (scheme.in === 'header') {
                          <span class="target-badge">Header: {{ scheme.name || 'Authorization' }}</span>
                        } @else if (scheme.in === 'query') {
                          <span class="target-badge">Query Param: ?{{ scheme.name }}=...</span>
                        } @else if (scheme.in === 'cookie') {
                          <span class="target-badge cookie-badge">Cookie: {{ scheme.name }}</span>
                        }
                      </div>
                      @if (scheme.description) {
                        <p class="scheme-desc">{{ scheme.description }}</p>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="schemes-empty">
                <mat-icon class="empty-icon">info_outline</mat-icon>
                <span>No explicit security schemes defined in OpenAPI spec. You can still set a Bearer token or API keys manually below.</span>
              </div>
            }
          </div>

          <!-- API Key Inputs (if any apiKey scheme exists) -->
          @if (apiKeySchemes().length > 0) {
            <div class="section-block">
              <div class="section-header">
                <span class="section-label">API KEYS (SESSION)</span>
                <span class="schemes-count font-mono">{{ apiKeySchemes().length }} key{{ apiKeySchemes().length !== 1 ? 's' : '' }}</span>
              </div>

              <div class="keys-forms-list">
                @for (scheme of apiKeySchemes(); track scheme.id) {
                  <div class="key-field-group">
                    <div class="key-field-header">
                      <div class="key-field-title font-mono">
                        <strong>{{ scheme.id }}</strong>
                        <span class="key-location-pill" [attr.data-in]="scheme.in">
                          {{ scheme.in === 'query' ? 'Query: ?' + scheme.name : (scheme.in === 'cookie' ? 'Cookie: ' + scheme.name : 'Header: ' + scheme.name) }}
                        </span>
                      </div>
                      @if (inputApiKeys[scheme.id]?.trim()?.length) {
                        <span class="token-char-count font-mono">{{ inputApiKeys[scheme.id].trim().length }} chars</span>
                      }
                    </div>

                    @if (scheme.in === 'cookie') {
                      <div class="cookie-notice font-sans">
                        <mat-icon class="notice-icon-sm">info</mat-icon>
                        <span>
                          Browser limitation: JavaScript client requests cannot set <code>Cookie</code> headers directly (Forbidden Header). If this API relies on browser session cookies, ensure backend CORS and cookie sessions are configured on the target domain.
                        </span>
                      </div>
                    } @else {
                      <div class="token-input-wrapper">
                        <input
                          [id]="'api-key-' + scheme.id"
                          [type]="showKeyPassword[scheme.id] ? 'text' : 'password'"
                          [(ngModel)]="inputApiKeys[scheme.id]"
                          [placeholder]="'Enter value for ' + (scheme.in === 'query' ? 'query parameter ?' + scheme.name : 'header ' + scheme.name)"
                          class="token-input font-mono"
                          autocomplete="off"
                          spellcheck="false"
                          (keydown.enter)="onSave()"
                        />

                        <button
                          type="button"
                          class="input-action-btn"
                          (click)="toggleShowKeyPassword(scheme.id)"
                          [title]="showKeyPassword[scheme.id] ? 'Hide key' : 'Show key'"
                        >
                          <mat-icon class="icon-sm">{{ showKeyPassword[scheme.id] ? 'visibility_off' : 'visibility' }}</mat-icon>
                        </button>

                        @if (inputApiKeys[scheme.id]?.length) {
                          <button
                            type="button"
                            class="input-action-btn clear-input-btn"
                            (click)="inputApiKeys[scheme.id] = ''"
                            title="Clear input"
                          >
                            <mat-icon class="icon-sm">backspace</mat-icon>
                          </button>
                        }
                      </div>
                      <div class="field-destination-hint font-mono">
                        <span>Will be sent as <strong>{{ scheme.in === 'query' ? 'URL query parameter' : 'HTTP header' }}</strong> <code>{{ scheme.name }}</code> on protected operations.</span>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Bearer Token Input (if bearer scheme exists OR no explicit schemes defined) -->
          @if (bearerSchemes().length > 0 || securitySchemes().length === 0) {
            <div class="section-block">
              <div class="section-header">
                <label for="bearer-token-input" class="section-label">HTTP BEARER TOKEN (SESSION)</label>
                @if (inputToken.trim().length > 0) {
                  <span class="token-char-count font-mono">{{ inputToken.trim().length }} chars</span>
                }
              </div>

              <div class="token-input-wrapper">
                <input
                  id="bearer-token-input"
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="inputToken"
                  placeholder="Enter or paste Bearer token (JWT, opaque token...)"
                  class="token-input font-mono"
                  autocomplete="off"
                  spellcheck="false"
                  (keydown.enter)="onSave()"
                />

                <button
                  type="button"
                  class="input-action-btn"
                  (click)="toggleShowPassword()"
                  [title]="showPassword() ? 'Hide token' : 'Show token'"
                >
                  <mat-icon class="icon-sm">{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>

                @if (inputToken.length > 0) {
                  <button
                    type="button"
                    class="input-action-btn clear-input-btn"
                    (click)="inputToken = ''"
                    title="Clear input"
                  >
                    <mat-icon class="icon-sm">backspace</mat-icon>
                  </button>
                }
              </div>
              <div class="field-destination-hint font-mono">
                <span>Will be sent as <strong>HTTP header</strong> <code>Authorization: Bearer &lt;token&gt;</code> on protected operations.</span>
              </div>
            </div>
          }

          <!-- In-Memory Notice -->
          <div class="security-notice">
            <mat-icon class="notice-icon">lock</mat-icon>
            <div class="notice-text">
              <span class="notice-title">In-Memory Session Only</span>
              <span class="notice-desc">
                Credentials are stored strictly in memory for the active session. They will <strong>never</strong> be persisted to localStorage or disk and are applied only to operations requiring authentication.
              </span>
            </div>
          </div>
        </div>

        <!-- Dialog Footer -->
        <footer class="dialog-footer">
          <div class="footer-left">
            @if (hasAnyCredential()) {
              <button
                type="button"
                class="btn-secondary btn-danger"
                (click)="onClearAllCredentials()"
                title="Remove all credentials from active session"
              >
                <mat-icon class="btn-icon">delete_outline</mat-icon>
                <span>Clear All</span>
              </button>
            }
          </div>

          <div class="footer-right">
            <button
              type="button"
              class="btn-secondary"
              (click)="close.emit()"
            >
              Cancel
            </button>

            <button
              type="button"
              class="btn-primary"
              (click)="onSave()"
            >
              <mat-icon class="btn-icon">check</mat-icon>
              <span>Apply to Session</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.65);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .dialog-panel {
      background-color: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      width: 100%;
      max-width: 660px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }

    .dialog-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #1e2535;
      background-color: #161b26;
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .header-badge-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dialog-badge {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      background-color: #242c3d;
      padding: 0.15rem 0.4rem;
      border-radius: 2px;
    }

    .status-badge {
      font-size: 0.65rem;
      letter-spacing: 0.05em;
      padding: 0.15rem 0.4rem;
      border-radius: 2px;
      border: 1px solid transparent;
    }

    .status-badge.active {
      color: #34d399;
      background-color: rgba(52, 211, 153, 0.1);
      border-color: rgba(52, 211, 153, 0.25);
    }

    .status-badge.inactive {
      color: #94a3b8;
      background-color: rgba(148, 163, 184, 0.08);
      border-color: rgba(148, 163, 184, 0.15);
    }

    .dialog-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0;
    }

    .icon-action-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.35rem;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s, background-color 0.15s;
    }

    .icon-action-btn:hover {
      color: #f1f5f9;
      background-color: #232a3b;
    }

    .icon-sm {
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
    }

    .dialog-body {
      padding: 1.25rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .section-block {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .section-label {
      font-size: 0.72rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .schemes-count, .token-char-count {
      font-size: 0.72rem;
      color: #64748b;
    }

    .schemes-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 150px;
      overflow-y: auto;
    }

    .scheme-item {
      background-color: #161b26;
      border: 1px solid #232a3b;
      border-radius: 3px;
      padding: 0.55rem 0.75rem;
    }

    .scheme-item.is-bearer {
      border-left: 3px solid #38bdf8;
    }

    .scheme-item.is-api-key {
      border-left: 3px solid #a78bfa;
    }

    .scheme-meta {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .scheme-id-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .scheme-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .scheme-tag {
      font-size: 0.65rem;
      padding: 0.1rem 0.35rem;
      border-radius: 2px;
    }

    .bearer-tag {
      color: #38bdf8;
      background-color: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .apikey-tag {
      color: #c084fc;
      background-color: rgba(192, 132, 252, 0.12);
      border: 1px solid rgba(192, 132, 252, 0.3);
    }

    .scheme-type, .scheme-param-target {
      font-size: 0.72rem;
      color: #94a3b8;
    }

    .scheme-param-target code {
      color: #38bdf8;
    }

    .scheme-target-info {
      font-size: 0.7rem;
      display: flex;
      gap: 0.4rem;
    }

    .target-badge {
      color: #94a3b8;
      background-color: #1a2233;
      padding: 0.1rem 0.35rem;
      border-radius: 2px;
    }

    .cookie-badge {
      color: #fbbf24;
      background-color: rgba(251, 191, 36, 0.1);
    }

    .scheme-desc {
      font-size: 0.75rem;
      color: #64748b;
      margin: 0;
      line-height: 1.35;
    }

    .schemes-empty {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.75rem;
      background-color: #161b26;
      border: 1px dashed #232a3b;
      border-radius: 3px;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .empty-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #64748b;
      flex-shrink: 0;
    }

    .keys-forms-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .key-field-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      background-color: #161b26;
      border: 1px solid #232a3b;
      border-radius: 3px;
      padding: 0.75rem;
    }

    .key-field-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .key-field-title {
      font-size: 0.8rem;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .key-location-pill {
      font-size: 0.68rem;
      padding: 0.1rem 0.35rem;
      border-radius: 2px;
      background-color: #222b3d;
      color: #cbd5e1;
    }

    .key-location-pill[data-in="query"] {
      color: #38bdf8;
      background-color: rgba(56, 189, 248, 0.12);
    }

    .key-location-pill[data-in="header"] {
      color: #a78bfa;
      background-color: rgba(167, 139, 250, 0.12);
    }

    .token-input-wrapper {
      display: flex;
      align-items: center;
      background-color: #0b0e14;
      border: 1px solid #232a3b;
      border-radius: 3px;
      padding: 0 0.5rem;
      transition: border-color 0.15s;
    }

    .token-input-wrapper:focus-within {
      border-color: #38bdf8;
    }

    .token-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #f1f5f9;
      font-size: 0.82rem;
      padding: 0.6rem 0.25rem;
      outline: none;
      width: 100%;
    }

    .token-input::placeholder {
      color: #475569;
    }

    .field-destination-hint {
      font-size: 0.7rem;
      color: #64748b;
    }

    .field-destination-hint strong {
      color: #94a3b8;
    }

    .field-destination-hint code {
      color: #38bdf8;
    }

    .cookie-notice {
      display: flex;
      align-items: flex-start;
      gap: 0.4rem;
      font-size: 0.72rem;
      color: #94a3b8;
      background-color: rgba(251, 191, 36, 0.08);
      border: 1px solid rgba(251, 191, 36, 0.2);
      border-radius: 2px;
      padding: 0.5rem;
      line-height: 1.35;
    }

    .cookie-notice code {
      color: #fbbf24;
    }

    .notice-icon-sm {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: #fbbf24;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .input-action-btn {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 2px;
      transition: color 0.15s;
    }

    .input-action-btn:hover {
      color: #94a3b8;
    }

    .clear-input-btn:hover {
      color: #f87171;
    }

    .security-notice {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.6rem 0.75rem;
      background-color: rgba(30, 41, 59, 0.4);
      border: 1px solid #1e293b;
      border-radius: 3px;
    }

    .notice-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #38bdf8;
      margin-top: 0.1rem;
      flex-shrink: 0;
    }

    .notice-text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .notice-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: #e2e8f0;
    }

    .notice-desc {
      font-size: 0.72rem;
      color: #94a3b8;
      line-height: 1.35;
    }

    .dialog-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1.25rem;
      border-top: 1px solid #1e2535;
      background-color: #161b26;
    }

    .footer-left, .footer-right {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .btn-primary, .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 500;
      border-radius: 3px;
      cursor: pointer;
      transition: background-color 0.15s, border-color 0.15s, color 0.15s;
    }

    .btn-primary {
      background-color: #0284c7;
      color: #ffffff;
      border: 1px solid #0369a1;
    }

    .btn-primary:hover {
      background-color: #0369a1;
    }

    .btn-secondary {
      background-color: #1e2535;
      color: #cbd5e1;
      border: 1px solid #283248;
    }

    .btn-secondary:hover {
      background-color: #283248;
      color: #f1f5f9;
    }

    .btn-danger {
      color: #f87171;
      border-color: rgba(248, 113, 113, 0.25);
    }

    .btn-danger:hover {
      background-color: rgba(248, 113, 113, 0.12);
      border-color: #f87171;
      color: #fca5a5;
    }

    .btn-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
  `]
})
export class AuthConfigDialogComponent implements OnInit {
  private readonly session = inject(ApiSessionService);

  @Output() close = new EventEmitter<void>();

  inputToken = '';
  inputApiKeys: Record<string, string> = {};
  showPassword = signal<boolean>(false);
  showKeyPassword: Record<string, boolean> = {};

  readonly securitySchemes = computed<ApiSecurityScheme[]>(() => this.session.securitySchemes());
  readonly bearerSchemes = computed<ApiSecurityScheme[]>(() => this.session.bearerSchemes());
  readonly apiKeySchemes = computed<ApiSecurityScheme[]>(() => this.session.apiKeySchemes());
  readonly hasBearerToken = computed<boolean>(() => this.session.hasBearerToken());
  readonly hasAnyApiKey = computed<boolean>(() => this.session.hasAnyApiKey());
  readonly hasAnyCredential = computed<boolean>(() => this.session.hasAnyAuthCredential());

  ngOnInit(): void {
    this.inputToken = this.session.bearerToken() ?? '';
    const currentKeys = this.session.apiKeys();
    this.inputApiKeys = { ...currentKeys };
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.close.emit();
    }
  }

  toggleShowPassword(): void {
    this.showPassword.update((val) => !val);
  }

  toggleShowKeyPassword(schemeId: string): void {
    this.showKeyPassword[schemeId] = !this.showKeyPassword[schemeId];
  }

  onSave(): void {
    this.session.setBearerToken(this.inputToken);
    this.session.setApiKeys(this.inputApiKeys);
    this.close.emit();
  }

  onClearSessionToken(): void {
    this.session.clearBearerToken();
    this.inputToken = '';
  }

  onClearAllCredentials(): void {
    this.session.clearBearerToken();
    this.session.clearApiKeys();
    this.inputToken = '';
    this.inputApiKeys = {};
    this.close.emit();
  }
}

