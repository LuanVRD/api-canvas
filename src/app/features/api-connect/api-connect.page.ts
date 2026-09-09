import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OpenApiLoaderService } from '../../openapi/services/openapi-loader.service';
import { OpenApiParserService } from '../../openapi/services/openapi-parser.service';
import { ApiSessionService } from '../../core/services/api-session.service';
import { StorageService } from '../../core/services/storage.service';
import { RecentApiEntry } from '../../core/models/storage.model';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';

export interface ApiConnectionConfig {
  openApiUrl: string;
  baseUrl?: string;
  rawSpec?: unknown;
}

/**
 * Validates that an input string is a well-formed HTTP/HTTPS URL.
 */
export function httpUrlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')) {
      return null;
    }
    const val = String(raw).trim();
    try {
      const parsed = new URL(val);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { invalidUrl: true };
      }
      return null;
    } catch {
      return { invalidUrl: true };
    }
  };
}

@Component({
  selector: 'app-api-connect-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    LoadingIndicatorComponent
  ],
  template: `
    <div class="connect-container">
      <div class="connect-panel">
        <header class="connect-header">
          <div class="brand-row">
            <mat-icon class="brand-icon">terminal</mat-icon>
            <h1 class="brand-title">ApiCanvas</h1>
          </div>
          <p class="brand-tagline">Your API, rendered.</p>
        </header>

        @if (errorMessage()) {
          <div class="error-banner" role="alert">
            <mat-icon class="error-icon">error_outline</mat-icon>
            <div class="error-content">
              <span class="error-text">{{ errorMessage() }}</span>
            </div>
            <button
              type="button"
              class="error-dismiss"
              (click)="clearError()"
              aria-label="Dismiss error"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onConnect()" class="connect-form" novalidate>
          <div class="form-field-group">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>OpenAPI URL</mat-label>
              <input
                matInput
                formControlName="openApiUrl"
                placeholder="https://api.example.com/openapi.json"
                autocomplete="off"
                spellcheck="false"
                class="font-mono"
              />
              <mat-icon matPrefix class="field-icon">link</mat-icon>
              @if (form.controls.openApiUrl.hasError('required') && form.controls.openApiUrl.touched) {
                <mat-error>OpenAPI URL is required.</mat-error>
              } @else if (form.controls.openApiUrl.hasError('invalidUrl') && form.controls.openApiUrl.touched) {
                <mat-error>Enter a valid HTTP or HTTPS URL.</mat-error>
              }
              <mat-hint>URL to an OpenAPI 3.x or Swagger 2.0 JSON/YAML specification</mat-hint>
            </mat-form-field>
          </div>

          <div class="form-field-group">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Base URL (Optional)</mat-label>
              <input
                matInput
                formControlName="baseUrl"
                placeholder="https://api.example.com/v1"
                autocomplete="off"
                spellcheck="false"
                class="font-mono"
              />
              <mat-icon matPrefix class="field-icon">dns</mat-icon>
              @if (form.controls.baseUrl.hasError('invalidUrl') && form.controls.baseUrl.touched) {
                <mat-error>Enter a valid HTTP or HTTPS URL.</mat-error>
              }
              <mat-hint>Optional override for the server URL specified in the schema</mat-hint>
            </mat-form-field>
          </div>

          <div class="form-actions">
            <button
              mat-flat-button
              color="primary"
              type="submit"
              class="connect-button"
              [disabled]="form.invalid || loading()"
            >
              @if (loading()) {
                <span class="btn-inner">
                  <app-loading-indicator class="button-spinner" [inline]="true" size="sm" message="Connecting..." />
                </span>
              } @else {
                <span class="btn-inner">
                  <mat-icon class="btn-icon">bolt</mat-icon>
                  <span>Connect</span>
                </span>
              }
            </button>
          </div>
        </form>


        @if (recentApis().length > 0) {
          <div class="recent-section">
            <div class="recent-header">
              <span class="recent-title">Recent Connections</span>
              <span class="recent-count">{{ recentApis().length }}</span>
            </div>
            <div class="recent-list" role="list">
              @for (item of recentApis(); track item.id) {
                <div
                  class="recent-item"
                  role="button"
                  tabindex="0"
                  (click)="selectRecentApi(item)"
                  (keydown.enter)="selectRecentApi(item)"
                  (keydown.space)="selectRecentApi(item); $event.preventDefault()"
                  [attr.aria-label]="'Select recent API: ' + (item.title || item.openApiUrl)"
                >
                  <div class="recent-item-main">
                    <div class="recent-item-title-row">
                      <span class="recent-item-title">{{ item.title || 'OpenAPI Specification' }}</span>
                      @if (item.baseUrl) {
                        <span class="recent-badge font-mono" [title]="item.baseUrl">Base: {{ item.baseUrl }}</span>
                      }
                    </div>
                    <div class="recent-item-url font-mono" [title]="item.openApiUrl">
                      {{ item.openApiUrl }}
                    </div>
                  </div>
                  <button
                    type="button"
                    class="recent-remove-btn"
                    (click)="removeRecentApi($event, item.id)"
                    [disabled]="loading()"
                    [attr.aria-label]="'Remove ' + (item.title || item.openApiUrl) + ' from history'"
                    title="Remove from history"
                  >
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .connect-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 48px);
      padding: 24px 16px;
      background-color: var(--canvas-bg);
    }

    .connect-panel {
      width: 100%;
      max-width: 500px;
      background-color: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-md);
      padding: 28px 24px;
      box-shadow: none;
    }

    .connect-header {
      margin-bottom: 24px;

      .brand-row {
        display: flex;
        align-items: center;
        gap: 8px;

        .brand-icon {
          color: var(--canvas-text-link);
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        .brand-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.3px;
          color: var(--canvas-text-primary);
        }
      }

      .brand-tagline {
        margin: 4px 0 0;
        font-size: 12px;
        color: var(--canvas-text-muted);
        letter-spacing: 0.2px;
      }
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      margin-bottom: 20px;
      background: var(--http-delete-bg);
      border: 1px solid var(--http-delete-border);
      border-radius: var(--radius-sm);
      color: var(--http-delete);
      font-size: 13px;

      .error-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      .error-content {
        flex: 1;
        line-height: 1.4;
      }

      .error-dismiss {
        background: transparent;
        border: none;
        color: var(--http-delete);
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        opacity: 0.8;
        transition: opacity 0.15s ease;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }

        &:hover {
          opacity: 1;
        }
      }
    }

    .connect-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-field-group {
      display: flex;
      flex-direction: column;
    }

    .w-full {
      width: 100%;
    }

    .field-icon {
      color: var(--canvas-text-muted);
      margin-right: 6px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
    }

    .connect-button {
      height: 36px;
      padding: 0 16px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.2px;
      border-radius: var(--radius-sm);

      .btn-inner {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .btn-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .button-spinner {
        display: inline-block;
        margin-right: 6px;
      }
    }


    .recent-section {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid var(--canvas-border-subtle);

      .recent-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;

        .recent-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--canvas-text-muted);
        }

        .recent-count {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--canvas-text-muted);
          background: var(--canvas-surface-elevated);
          padding: 1px 5px;
          border-radius: var(--radius-sm);
        }
      }

      .recent-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 220px;
        overflow-y: auto;
      }

      .recent-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 7px 10px;
        background: var(--canvas-surface-elevated);
        border: 1px solid var(--canvas-border-subtle);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: border-color 0.15s ease, background-color 0.15s ease;
        outline: none;

        &:hover {
          border-color: var(--canvas-border);
          background-color: #282e36;
        }

        &:focus-visible {
          border-color: var(--canvas-text-link);
          box-shadow: 0 0 0 1px var(--canvas-text-link);
        }

        .recent-item-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .recent-item-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow: hidden;
        }

        .recent-item-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--canvas-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .recent-badge {
          font-size: 10px;
          color: var(--canvas-text-secondary);
          background: rgba(88, 166, 255, 0.1);
          border: 1px solid rgba(88, 166, 255, 0.2);
          padding: 0 4px;
          border-radius: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 160px;
        }

        .recent-item-url {
          font-size: 11px;
          color: var(--canvas-text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .recent-remove-btn {
          background: transparent;
          border: none;
          color: var(--canvas-text-muted);
          cursor: pointer;
          padding: 3px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.7;
          transition: opacity 0.15s ease, color 0.15s ease, background-color 0.15s ease;

          mat-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
          }

          &:hover:not(:disabled) {
            opacity: 1;
            color: var(--http-delete);
            background-color: var(--http-delete-bg);
          }

          &:disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }
        }
      }
    }
  `]
})
export class ApiConnectPage {
  private readonly fb = inject(FormBuilder);
  private readonly openApiLoader = inject(OpenApiLoaderService);
  private readonly openApiParser = inject(OpenApiParserService);
  private readonly sessionService = inject(ApiSessionService);
  private readonly storageService = inject(StorageService);
  private readonly router = inject(Router);

  @Output() readonly connected = new EventEmitter<ApiConnectionConfig>();

  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly recentApis = signal<RecentApiEntry[]>(this.storageService.getRecentApis());

  readonly form = this.fb.group({
    openApiUrl: ['', [Validators.required, httpUrlValidator()]],
    baseUrl: ['', [httpUrlValidator()]]
  });


  selectRecentApi(api: RecentApiEntry): void {
    this.form.patchValue({
      openApiUrl: api.openApiUrl,
      baseUrl: api.baseUrl || ''
    });
    this.form.controls.openApiUrl.markAsDirty();
    this.form.controls.openApiUrl.markAsTouched();
    this.form.controls.openApiUrl.updateValueAndValidity();
    this.form.controls.baseUrl.markAsDirty();
    this.form.controls.baseUrl.markAsTouched();
    this.form.controls.baseUrl.updateValueAndValidity();
  }

  removeRecentApi(event: Event, id: string): void {
    event.stopPropagation();
    const updated = this.storageService.removeRecentApi(id);
    this.recentApis.set(updated);
  }

  clearError(): void {
    this.errorMessage.set(null);
  }

  setLoading(state: boolean): void {
    this.loading.set(state);
    if (state) {
      this.form.disable();
    } else {
      this.form.enable();
    }
  }

  setError(message: string | null): void {
    this.errorMessage.set(message);
  }

  onConnect(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.clearError();
    const rawValues = this.form.getRawValue();
    const openApiUrl = (rawValues.openApiUrl || '').trim();
    const baseUrl = rawValues.baseUrl && rawValues.baseUrl.trim() !== '' ? rawValues.baseUrl.trim() : undefined;

    this.setLoading(true);

    this.openApiLoader.load(openApiUrl).subscribe({
      next: (rawSpec) => {
        try {
          const apiDefinition = this.openApiParser.parse(rawSpec);

          if (baseUrl) {
            apiDefinition.baseUrl = baseUrl;
          }

          this.sessionService.setSession(apiDefinition, {
            openApiUrl,
            rawSpec
          });

          // Persist recent API connection history (excluding any credentials)
          const updatedRecent = this.storageService.addRecentApi({
            openApiUrl,
            baseUrl,
            title: apiDefinition.title
          });
          this.recentApis.set(updatedRecent);

          this.setLoading(false);

          this.connected.emit({
            openApiUrl,
            baseUrl,
            rawSpec
          });

          this.router.navigate(['/workspace']);
        } catch (err: unknown) {
          this.setLoading(false);
          const message =
            err instanceof Error ? err.message : 'Falha ao processar a especificação OpenAPI.';
          this.setError(message);
        }
      },
      error: (err: Error) => {
        this.setLoading(false);
        this.setError(err.message || 'Falha ao carregar a especificação OpenAPI.');
      }
    });
  }
}
