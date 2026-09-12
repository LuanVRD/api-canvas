import { Component, computed, HostListener, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PageDraftService } from '../../services/page-draft.service';
import { UiPageConfiguration } from '../../../../core/models/ui-configuration.model';

@Component({
  selector: 'app-page-manager-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="page-manager-container">
      <!-- Header Toolbar: Title, Counter & Add Page Action -->
      <div class="manager-header">
        <div class="header-left">
          <h4 class="section-title">Páginas Configuradas</h4>
          <span class="count-badge font-mono">{{ draftPages().length }}</span>
        </div>
        <button
          type="button"
          class="btn-primary-action"
          (click)="onCreatePage()"
          aria-label="Criar nova página"
        >
          <mat-icon class="btn-icon" aria-hidden="true">add</mat-icon>
          <span>Nova página</span>
        </button>
      </div>

      <!-- Main Pages Table / List -->
      @if (draftPages().length > 0) {
        <div class="table-container" role="region" aria-label="Tabela de gerenciamento de páginas">
          <table class="manager-table">
            <thead>
              <tr>
                <th class="th-order" scope="col">Ordem</th>
                <th scope="col">Página</th>
                <th scope="col">Recurso Vinculado</th>
                <th scope="col">Visibilidade</th>
                <th scope="col">Padrão</th>
                <th class="th-actions" scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (page of draftPages(); track page.id; let idx = $index; let isFirst = $first; let isLast = $last) {
                <tr class="page-row" [class.is-hidden]="page.hidden">
                  <!-- Order & Position Control -->
                  <td class="td-order">
                    <div class="order-controls">
                      <span class="order-num font-mono">{{ page.order ?? (idx + 1) }}</span>
                      <div class="order-buttons">
                        <button
                          type="button"
                          class="btn-icon-action"
                          [disabled]="isFirst"
                          (click)="onMoveOrder(page.id!, 'up')"
                          [title]="'Mover ' + (page.title || page.id) + ' para cima'"
                          [attr.aria-label]="'Mover ' + (page.title || page.id) + ' para cima'"
                        >
                          <mat-icon aria-hidden="true">keyboard_arrow_up</mat-icon>
                        </button>
                        <button
                          type="button"
                          class="btn-icon-action"
                          [disabled]="isLast"
                          (click)="onMoveOrder(page.id!, 'down')"
                          [title]="'Mover ' + (page.title || page.id) + ' para baixo'"
                          [attr.aria-label]="'Mover ' + (page.title || page.id) + ' para baixo'"
                        >
                          <mat-icon aria-hidden="true">keyboard_arrow_down</mat-icon>
                        </button>
                      </div>
                    </div>
                  </td>

                  <!-- Page Details -->
                  <td>
                    <div class="page-cell">
                      <div class="page-icon-wrapper">
                        <mat-icon class="page-icon" aria-hidden="true">{{ page.icon || 'table_chart' }}</mat-icon>
                      </div>
                      <div class="page-meta">
                        <span class="page-title">{{ page.title || page.id }}</span>
                        <span class="page-slug font-mono">/dashboard/{{ page.slug }}</span>
                      </div>
                    </div>
                  </td>

                  <!-- Linked Resource -->
                  <td>
                    <span class="resource-badge font-mono">
                      {{ getResourceLabel(page.resourceId) }}
                    </span>
                  </td>

                  <!-- Visibility State -->
                  <td>
                    @if (page.hidden) {
                      <span class="status-badge badge-muted">
                        <mat-icon class="badge-icon" aria-hidden="true">visibility_off</mat-icon>
                        <span>Oculta</span>
                      </span>
                    } @else {
                      <span class="status-badge badge-success">
                        <mat-icon class="badge-icon" aria-hidden="true">visibility</mat-icon>
                        <span>Ativa</span>
                      </span>
                    }
                  </td>

                  <!-- Default Landing Page State -->
                  <td>
                    @if (page.isDefault || page.default) {
                      <span class="status-badge badge-primary">
                        <mat-icon class="badge-icon" aria-hidden="true">star</mat-icon>
                        <span>Padrão</span>
                      </span>
                    } @else {
                      <button
                        type="button"
                        class="btn-set-default"
                        (click)="onSetDefault(page.id!)"
                        [title]="'Definir ' + (page.title || page.id) + ' como página padrão'"
                        [attr.aria-label]="'Definir ' + (page.title || page.id) + ' como página padrão'"
                      >
                        <mat-icon aria-hidden="true">star_border</mat-icon>
                        <span>Definir</span>
                      </button>
                    }
                  </td>

                  <!-- Action Buttons -->
                  <td class="td-actions">
                    <div class="actions-group">
                      <button
                        type="button"
                        class="btn-action-compact"
                        (click)="onEditPage(page.id!)"
                        [title]="'Editar ' + (page.title || page.id)"
                        [attr.aria-label]="'Editar ' + (page.title || page.id)"
                      >
                        <mat-icon aria-hidden="true">edit</mat-icon>
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        class="btn-icon-action"
                        (click)="onDuplicatePage(page.id!)"
                        [title]="'Duplicar ' + (page.title || page.id)"
                        [attr.aria-label]="'Duplicar ' + (page.title || page.id)"
                      >
                        <mat-icon aria-hidden="true">content_copy</mat-icon>
                      </button>

                      <button
                        type="button"
                        class="btn-icon-action"
                        [title]="page.hidden ? 'Exibir ' + (page.title || page.id) + ' na navegação' : 'Ocultar ' + (page.title || page.id) + ' da navegação'"
                        (click)="onToggleVisibility(page.id!)"
                        [attr.aria-label]="page.hidden ? 'Exibir ' + (page.title || page.id) + ' na navegação' : 'Ocultar ' + (page.title || page.id) + ' da navegação'"
                      >
                        <mat-icon aria-hidden="true">{{ page.hidden ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>

                      <button
                        type="button"
                        class="btn-icon-action btn-danger-action"
                        (click)="onPromptDelete(page)"
                        [title]="'Excluir ' + (page.title || page.id)"
                        [attr.aria-label]="'Excluir ' + (page.title || page.id)"
                      >
                        <mat-icon aria-hidden="true">delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <!-- Empty State -->
        <div class="empty-state" role="status">
          <mat-icon class="empty-icon" aria-hidden="true">dashboard_customize</mat-icon>
          <h5 class="empty-title">Nenhuma página configurada</h5>
          <p class="empty-description">
            Crie sua primeira página operacional para visualizar recursos, configurar tabelas e cards de métricas.
          </p>
          <button
            type="button"
            class="btn-primary-action"
            (click)="onCreatePage()"
            aria-label="Criar primeira página"
          >
            <mat-icon class="btn-icon" aria-hidden="true">add</mat-icon>
            <span>Criar primeira página</span>
          </button>
        </div>
      }

      <!-- Delete Confirmation Sub-Dialog -->
      @if (pendingDeletePage(); as pageToDelete) {
        <div class="delete-backdrop" (click)="cancelDelete()" role="presentation">
          <div
            class="delete-dialog-panel"
            (click)="$event.stopPropagation()"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div class="delete-header">
              <div class="delete-icon-badge">
                <mat-icon aria-hidden="true">delete_forever</mat-icon>
              </div>
              <h4 id="delete-dialog-title" class="delete-title">Excluir página</h4>
            </div>

            <p class="delete-message">
              Tem certeza de que deseja excluir a página <strong>{{ pageToDelete.title || pageToDelete.id }}</strong>?
              Esta ação removerá a visualização personalizada do dashboard, sem alterar a API OpenAPI.
            </p>

            <div class="delete-footer">
              <button
                type="button"
                class="btn-secondary"
                (click)="cancelDelete()"
                aria-label="Cancelar exclusão"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="btn-danger"
                (click)="confirmDelete(pageToDelete.id!)"
                aria-label="Confirmar exclusão da página"
              >
                Excluir página
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-manager-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: 100%;
    }

    .manager-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .section-title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--canvas-text-primary);
      }

      .count-badge {
        font-size: 11px;
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-secondary);
        padding: 1px 6px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--canvas-border-subtle);
      }
    }

    .table-container {
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      overflow-x: auto;
      background: var(--canvas-surface);
    }

    .manager-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;

      th {
        padding: 8px 12px;
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-secondary);
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid var(--canvas-border);
        white-space: nowrap;

        &.th-order {
          width: 70px;
          text-align: center;
        }

        &.th-actions {
          width: 180px;
          text-align: right;
        }
      }

      td {
        padding: 8px 12px;
        border-bottom: 1px solid var(--canvas-border-subtle);
        color: var(--canvas-text-primary);
        vertical-align: middle;

        &.td-order {
          text-align: center;
        }

        &.td-actions {
          text-align: right;
        }
      }

      .page-row {
        transition: background 0.08s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        &.is-hidden {
          opacity: 0.65;
        }
      }
    }

    .order-controls {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      justify-content: center;
      vertical-align: middle;

      .order-num {
        font-size: 12px;
        color: var(--canvas-text-secondary);
        min-width: 16px;
        text-align: center;
        line-height: 1;
      }

      .order-buttons {
        display: flex;
        flex-direction: column;
        gap: 1px;

        .btn-icon-action {
          width: 20px;
          height: 14px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;

          mat-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
            line-height: 1;
          }
        }
      }
    }

    .page-cell {
      display: flex;
      align-items: center;
      gap: 10px;

      .page-icon-wrapper {
        width: 32px;
        height: 32px;
        border-radius: var(--radius-sm);
        background: var(--canvas-surface-elevated);
        border: 1px solid var(--canvas-border-subtle);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .page-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          line-height: 1;
          color: var(--canvas-text-link);
        }
      }

      .page-meta {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;

        .page-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--canvas-text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .page-slug {
          font-size: 11px;
          color: var(--canvas-text-muted);
        }
      }
    }

    .resource-badge {
      font-size: 11px;
      background: var(--canvas-bg);
      color: var(--canvas-text-secondary);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--canvas-border-subtle);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      line-height: 1.5;

      .badge-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        line-height: 1;
      }

      &.badge-success {
        background: rgba(46, 160, 67, 0.12);
        color: var(--color-success);
        border: 1px solid rgba(46, 160, 67, 0.3);
      }

      &.badge-muted {
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-muted);
        border: 1px solid var(--canvas-border-subtle);
      }

      &.badge-primary {
        background: rgba(88, 166, 255, 0.12);
        color: var(--canvas-text-link);
        border: 1px solid rgba(88, 166, 255, 0.3);
      }
    }

    .btn-set-default {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 24px;
      padding: 0 8px;
      background: transparent;
      border: 1px dashed var(--canvas-border);
      border-radius: var(--radius-sm);
      color: var(--canvas-text-muted);
      font-size: 11px;
      cursor: pointer;
      transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;

      &:hover {
        background: var(--canvas-surface-elevated);
        border-color: var(--canvas-text-link);
        color: var(--canvas-text-link);
      }

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        line-height: 1;
      }
    }

    .actions-group {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      justify-content: flex-end;
    }

    .btn-action-compact {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 26px;
      padding: 0 8px;
      background: var(--canvas-surface-elevated);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-sm);
      color: var(--canvas-text-primary);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.12s ease;

      &:hover {
        background: var(--action-hover-surface);
      }

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        line-height: 1;
        color: var(--canvas-text-muted);
      }
    }

    .btn-icon-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      padding: 0;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      color: var(--canvas-text-muted);
      cursor: pointer;
      transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;

      &:hover:not(:disabled) {
        background: var(--canvas-surface-elevated);
        border-color: var(--canvas-border);
        color: var(--canvas-text-primary);
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      &.btn-danger-action:hover:not(:disabled) {
        background: rgba(248, 81, 73, 0.12);
        border-color: rgba(248, 81, 73, 0.3);
        color: var(--color-danger);
      }

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        line-height: 1;
      }
    }

    .btn-primary-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 12px;
      background: var(--action-primary);
      color: var(--action-primary-text);
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.12s ease;

      &:hover {
        background: var(--action-primary-hover);
      }

      .btn-icon, mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        line-height: 1;
      }
    }

    .empty-state {
      padding: 36px 16px;
      text-align: center;
      border: 1px dashed var(--canvas-border);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;

      .empty-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--canvas-text-muted);
      }

      .empty-title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--canvas-text-primary);
      }

      .empty-description {
        margin: 0 0 8px;
        font-size: 12px;
        color: var(--canvas-text-secondary);
        max-width: 360px;
        line-height: 1.5;
      }
    }

    /* Delete Sub-Modal */
    .delete-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      z-index: 1300;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .delete-dialog-panel {
      width: 100%;
      max-width: 440px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-md);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .delete-header {
      display: flex;
      align-items: center;
      gap: 10px;

      .delete-icon-badge {
        width: 28px;
        height: 28px;
        border-radius: var(--radius-sm);
        background: rgba(248, 81, 73, 0.12);
        border: 1px solid rgba(248, 81, 73, 0.3);
        color: var(--color-danger);
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }

      .delete-title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--canvas-text-primary);
      }
    }

    .delete-message {
      margin: 0;
      font-size: 12px;
      color: var(--canvas-text-secondary);
      line-height: 1.5;

      strong {
        color: var(--canvas-text-primary);
      }
    }

    .delete-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;

      .btn-secondary {
        height: 28px;
        padding: 0 10px;
        background: var(--canvas-surface-elevated);
        border: 1px solid var(--canvas-border);
        border-radius: var(--radius-sm);
        color: var(--canvas-text-primary);
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;

        &:hover {
          background: var(--action-hover-surface);
        }
      }

      .btn-danger {
        height: 28px;
        padding: 0 10px;
        background: rgba(248, 81, 73, 0.15);
        border: 1px solid rgba(248, 81, 73, 0.35);
        border-radius: var(--radius-sm);
        color: var(--color-danger);
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;

        &:hover {
          background: rgba(248, 81, 73, 0.25);
        }
      }
    }
  `]
})
export class PageManagerListComponent {
  readonly draftService = inject(PageDraftService);

  readonly editPage = output<string>();
  readonly createPage = output<void>();

  readonly draftPages = this.draftService.draftPages;
  readonly pendingDeletePage = signal<UiPageConfiguration | null>(null);

  getResourceLabel(resourceId?: string): string {
    if (!resourceId) return 'Sem vínculo';
    const def = this.draftService.apiDefinition();
    const match = def?.resources?.find((r) => r.id === resourceId || r.name === resourceId);
    return match?.label || match?.name || resourceId;
  }

  onCreatePage(): void {
    this.createPage.emit();
  }

  onEditPage(pageId: string): void {
    this.editPage.emit(pageId);
  }

  onDuplicatePage(pageId: string): void {
    this.draftService.duplicatePage(pageId);
  }

  onToggleVisibility(pageId: string): void {
    this.draftService.togglePageVisibility(pageId);
  }

  onMoveOrder(pageId: string, direction: 'up' | 'down'): void {
    this.draftService.movePageOrder(pageId, direction);
  }

  onSetDefault(pageId: string): void {
    this.draftService.setPageAsDefault(pageId);
  }

  onPromptDelete(page: UiPageConfiguration): void {
    this.pendingDeletePage.set(page);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pendingDeletePage()) {
      this.cancelDelete();
    }
  }

  cancelDelete(): void {
    this.pendingDeletePage.set(null);
  }

  confirmDelete(pageId: string): void {
    this.draftService.deletePage(pageId);
    this.pendingDeletePage.set(null);
  }
}
