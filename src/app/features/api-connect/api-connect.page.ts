import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-api-connect-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="connect-container">
      <div class="connect-card">
        <div class="card-header">
          <div class="logo-wrapper">
            <mat-icon class="logo-icon">dataset</mat-icon>
          </div>
          <h1 class="title">ApiCanvas</h1>
          <p class="subtitle">Universal OpenAPI Explorer & Admin Panel</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onConnect()" class="connect-form">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>OpenAPI / Swagger JSON URL</mat-label>
            <input 
              matInput 
              formControlName="openApiUrl" 
              placeholder="https://petstore.swagger.io/v2/swagger.json"
              autocomplete="off"
            >
            <mat-icon matPrefix class="input-icon">link</mat-icon>
            @if (form.get('openApiUrl')?.hasError('required') && form.get('openApiUrl')?.touched) {
              <mat-error>A URL do OpenAPI é obrigatória.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Base URL da API (opcional)</mat-label>
            <input 
              matInput 
              formControlName="baseUrl" 
              placeholder="Ex: https://api.exemplo.com/v1"
              autocomplete="off"
            >
            <mat-icon matPrefix class="input-icon">dns</mat-icon>
            <mat-hint>Deixe em branco para usar o servidor definido no OpenAPI</mat-hint>
          </mat-form-field>

          @if (errorMessage()) {
            <div class="error-banner">
              <mat-icon class="error-icon">error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <div class="form-actions">
            <button 
              mat-flat-button 
              color="primary" 
              type="submit" 
              class="connect-button"
              [disabled]="form.invalid || loading()"
            >
              @if (loading()) {
                <mat-spinner diameter="18" class="button-spinner" />
                <span>Conectando...</span>
              } @else {
                <span class="btn-content">
                  <mat-icon>play_arrow</mat-icon>
                  <span>Explorar API</span>
                </span>
              }
            </button>
          </div>
        </form>

        <div class="quick-examples">
          <span class="examples-label">Exemplos rápidos:</span>
          <div class="examples-pills">
            <button type="button" class="example-pill" (click)="setExample('https://petstore.swagger.io/v2/swagger.json')">
              Swagger Petstore
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .connect-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 64px);
      padding: 24px;
    }
    .connect-card {
      width: 100%;
      max-width: 520px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-lg);
      padding: 32px;
    }
    .card-header {
      text-align: center;
      margin-bottom: 28px;
      .logo-wrapper {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        background: var(--canvas-surface-elevated);
        border: 1px solid var(--canvas-border);
        border-radius: var(--radius-md);
        margin-bottom: 12px;
        .logo-icon {
          color: var(--canvas-text-link);
          font-size: 26px;
          width: 26px;
          height: 26px;
        }
      }
      .title {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: var(--canvas-text-primary);
      }
      .subtitle {
        margin: 6px 0 0;
        font-size: 13px;
        color: var(--canvas-text-secondary);
      }
    }
    .connect-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .w-full {
      width: 100%;
    }
    .input-icon {
      color: var(--canvas-text-muted);
      margin-right: 8px;
    }
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: var(--http-delete-bg);
      border: 1px solid var(--http-delete-border);
      border-radius: var(--radius-sm);
      color: var(--http-delete);
      font-size: 12px;
      .error-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }
    .connect-button {
      height: 38px;
      padding: 0 20px;
      font-weight: 600;
      font-size: 13px;
    }
    .btn-content {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .quick-examples {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--canvas-border-subtle);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      .examples-label {
        color: var(--canvas-text-muted);
      }
      .examples-pills {
        display: flex;
        gap: 6px;
      }
      .example-pill {
        background: var(--canvas-surface-elevated);
        border: 1px solid var(--canvas-border);
        color: var(--canvas-text-secondary);
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 11px;
        font-family: var(--font-mono);
        transition: all 0.15s ease;
        &:hover {
          color: var(--canvas-text-link);
          border-color: var(--canvas-text-link);
        }
      }
    }
  `]
})
export class ApiConnectPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    openApiUrl: ['', [Validators.required]],
    baseUrl: ['']
  });

  setExample(url: string): void {
    this.form.patchValue({ openApiUrl: url });
  }

  onConnect(): void {
    if (this.form.invalid) return;
    this.router.navigate(['/workspace']);
  }
}
