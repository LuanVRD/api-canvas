import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-unsaved-changes-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="modal-backdrop" (click)="onCancel()" role="presentation">
      <div
        class="modal-panel"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
      >
        <div class="modal-header">
          <div class="header-main">
            <div class="warning-icon-badge">
              <mat-icon>warning</mat-icon>
            </div>
            <h3 id="unsaved-title" class="header-title">Alterações não salvas</h3>
          </div>
          <button
            type="button"
            class="close-btn"
            (click)="onCancel()"
            aria-label="Fechar diálogo"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="modal-body">
          <p class="warning-message">
            Você possui alterações na configuração de páginas que ainda não foram publicadas. Se fechar agora, todas as modificações do rascunho serão perdidas.
          </p>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn-secondary"
            (click)="onCancel()"
            aria-label="Continuar editando"
          >
            Continuar editando
          </button>
          <button
            type="button"
            class="btn-danger"
            (click)="onConfirmDiscard()"
            aria-label="Descartar alterações"
          >
            Descartar alterações
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(2px);
      z-index: 1200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.12s ease;
    }

    .modal-panel {
      width: 100%;
      max-width: 460px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-md);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideIn 0.15s ease;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--canvas-surface-elevated);
      border-bottom: 1px solid var(--canvas-border-subtle);

      .header-main {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .warning-icon-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: var(--radius-sm);
        background: rgba(187, 128, 9, 0.15);
        border: 1px solid rgba(187, 128, 9, 0.35);
        color: var(--color-warning);

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }

      .header-title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--canvas-text-primary);
      }

      .close-btn {
        background: transparent;
        border: none;
        color: var(--canvas-text-muted);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
        transition: color 0.12s ease, background 0.12s ease;

        &:hover {
          color: var(--canvas-text-primary);
          background: var(--canvas-surface);
        }

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }
    }

    .modal-body {
      padding: 16px;

      .warning-message {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: var(--canvas-text-secondary);
      }
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 16px;
      background: var(--canvas-surface);
      border-top: 1px solid var(--canvas-border-subtle);

      .btn-secondary {
        height: 30px;
        padding: 0 12px;
        background: var(--canvas-surface-elevated);
        border: 1px solid var(--canvas-border);
        border-radius: var(--radius-sm);
        color: var(--canvas-text-primary);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.12s ease;

        &:hover {
          background: var(--action-hover-surface);
        }
      }

      .btn-danger {
        height: 30px;
        padding: 0 12px;
        background: rgba(248, 81, 73, 0.15);
        border: 1px solid rgba(248, 81, 73, 0.35);
        border-radius: var(--radius-sm);
        color: var(--color-danger);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.12s ease;

        &:hover {
          background: rgba(248, 81, 73, 0.25);
        }
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from { transform: translateY(-8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class UnsavedChangesDialogComponent {
  readonly cancel = output<void>();
  readonly confirmDiscard = output<void>();

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirmDiscard(): void {
    this.confirmDiscard.emit();
  }
}
