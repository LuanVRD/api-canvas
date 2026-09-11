import { Component, computed, inject, input, OnInit, output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PageConfigMode, PageDraftService } from '../../services/page-draft.service';
import { PageManagerListComponent } from './page-manager-list.component';
import { PageWizardFormComponent } from './page-wizard-form.component';
import { UnsavedChangesDialogComponent } from './unsaved-changes-dialog.component';
import { UiConfiguration, UiPageConfiguration } from '../../../../core/models/ui-configuration.model';
import { ApiDefinition } from '../../../../core/models/api-definition.model';

@Component({
  selector: 'app-page-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    PageManagerListComponent,
    PageWizardFormComponent,
    UnsavedChangesDialogComponent
  ],
  providers: [PageDraftService],
  template: `
    <div class="modal-backdrop" (click)="onAttemptClose()" role="presentation">
      <div
        class="modal-panel"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <!-- Modal Header -->
        <header class="dialog-header">
          <div class="header-left">
            <div class="header-icon-box">
              <mat-icon>{{ getHeaderIcon() }}</mat-icon>
            </div>
            <div class="header-title-meta">
              <h3 id="dialog-title" class="dialog-title">{{ getHeaderTitle() }}</h3>
              <span class="dialog-subtitle">{{ getHeaderSubtitle() }}</span>
            </div>
          </div>

          <div class="header-right">
            @if (draftService.isDirty()) {
              <span class="dirty-badge" title="Você possui alterações locais não publicadas">
                <span class="dirty-dot"></span>
                <span>Rascunho não publicado</span>
              </span>
            }

            <button
              type="button"
              class="close-btn"
              (click)="onAttemptClose()"
              aria-label="Fechar modal de configuração"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </header>

        <!-- Sub-Nav / Breadcrumb when in Wizard -->
        @if (draftService.activeMode() !== 'manage') {
          <div class="wizard-subbar">
            <button
              type="button"
              class="btn-back-to-list"
              (click)="onBackToManage()"
              aria-label="Voltar para a lista de páginas"
            >
              <mat-icon>arrow_back</mat-icon>
              <span>Voltar para Lista de Páginas</span>
            </button>

            @if (draftService.activeEditingPage(); as editingPage) {
              <span class="editing-target-pill font-mono">
                {{ editingPage.title || editingPage.id }}
              </span>
            }
          </div>
        }

        <!-- Dialog Body View Container -->
        <main class="dialog-body" role="region">
          @if (draftService.activeMode() === 'manage') {
            <app-page-manager-list
              (createPage)="onCreateNewPage()"
              (editPage)="onEditPage($event)"
            />
          } @else {
            <app-page-wizard-form #wizard />
          }
        </main>

        <!-- Dialog Footer -->
        <footer class="dialog-footer">
          <div class="footer-left">
            @if (draftService.isDirty()) {
              <button
                type="button"
                class="btn-discard"
                (click)="onPromptDiscard()"
                aria-label="Descartar alterações do rascunho"
              >
                Descartar rascunho
              </button>
            } @else {
              <button
                type="button"
                class="btn-cancel"
                (click)="onClose()"
                aria-label="Fechar"
              >
                Fechar
              </button>
            }
          </div>

          <div class="footer-right">
            @if (draftService.activeMode() !== 'manage') {
              <!-- Wizard Navigation Step Controls -->
              @if (wizardComponent?.currentStep() ?? 1; as step) {
                @if (step > 1) {
                  <button
                    type="button"
                    class="btn-secondary"
                    (click)="goToPreviousStep()"
                    aria-label="Etapa anterior"
                  >
                    <mat-icon>chevron_left</mat-icon>
                    <span>Anterior</span>
                  </button>
                }

                @if (step < 5) {
                  <button
                    type="button"
                    class="btn-secondary"
                    (click)="goToNextStep()"
                    aria-label="Próxima etapa"
                  >
                    <span>Próximo</span>
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                }

                <button
                  type="button"
                  class="btn-secondary"
                  (click)="onBackToManage()"
                  aria-label="Concluir edição e voltar à lista"
                >
                  <mat-icon>done</mat-icon>
                  <span>Concluir página</span>
                </button>
              }
            }

            <!-- Primary Save and Publish Action -->
            <button
              type="button"
              class="btn-primary-publish"
              [disabled]="draftService.hasBlockingErrors() || !draftService.isDirty()"
              (click)="onSaveAndPublish()"
              title="Publicar todas as alterações de páginas no workspace"
              aria-label="Salvar e publicar alterações"
            >
              <mat-icon>check_circle</mat-icon>
              <span>Salvar e Publicar</span>
            </button>
          </div>
        </footer>
      </div>

      <!-- Unsaved Changes Protection Modal -->
      @if (isUnsavedDialogOpen()) {
        <app-unsaved-changes-dialog
          (cancel)="isUnsavedDialogOpen.set(false)"
          (confirmDiscard)="onDiscardAndClose()"
        />
      }
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(2px);
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.12s ease;
    }

    .modal-panel {
      width: min(980px, 96vw);
      max-width: 980px;
      height: 90vh;
      max-height: 800px;
      background: var(--canvas-surface);
      border: 1px solid var(--canvas-border);
      border-radius: var(--radius-md);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideIn 0.15s ease;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 48px;
      padding: 0 16px;
      background: var(--canvas-surface-elevated);
      border-bottom: 1px solid var(--canvas-border-subtle);
      flex-shrink: 0;

      .header-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .header-icon-box {
        width: 28px;
        height: 28px;
        border-radius: var(--radius-sm);
        background: var(--canvas-surface);
        border: 1px solid var(--canvas-border-subtle);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--canvas-text-link);

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }

      .header-title-meta {
        display: flex;
        flex-direction: column;
        gap: 1px;

        .dialog-title {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--canvas-text-primary);
        }

        .dialog-subtitle {
          font-size: 11px;
          color: var(--canvas-text-muted);
        }
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .dirty-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        background: rgba(187, 128, 9, 0.15);
        color: var(--color-warning);
        border: 1px solid rgba(187, 128, 9, 0.35);
        padding: 2px 8px;
        border-radius: var(--radius-sm);

        .dirty-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--color-warning);
        }
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

    .wizard-subbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 16px;
      background: var(--canvas-bg);
      border-bottom: 1px solid var(--canvas-border-subtle);
      flex-shrink: 0;

      .btn-back-to-list {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: transparent;
        border: none;
        color: var(--canvas-text-link);
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        padding: 0;

        &:hover {
          text-decoration: underline;
        }

        mat-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
        }
      }

      .editing-target-pill {
        font-size: 11px;
        color: var(--canvas-text-secondary);
        background: var(--canvas-surface-elevated);
        padding: 1px 6px;
        border-radius: var(--radius-xs);
        border: 1px solid var(--canvas-border-subtle);
      }
    }

    .dialog-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      min-height: 0;
    }

    .dialog-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 48px;
      padding: 0 16px;
      background: var(--canvas-surface-elevated);
      border-top: 1px solid var(--canvas-border-subtle);
      flex-shrink: 0;

      .footer-left, .footer-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .btn-cancel, .btn-secondary {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 28px;
        padding: 0 10px;
        background: var(--canvas-surface);
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

        mat-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
          color: var(--canvas-text-muted);
        }
      }

      .btn-discard {
        height: 28px;
        padding: 0 10px;
        background: transparent;
        border: 1px solid rgba(248, 81, 73, 0.3);
        border-radius: var(--radius-sm);
        color: var(--color-danger);
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.12s ease;

        &:hover {
          background: rgba(248, 81, 73, 0.12);
        }
      }

      .btn-primary-publish {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 28px;
        padding: 0 12px;
        background: var(--action-primary);
        color: var(--action-primary-text);
        border: 1px solid transparent;
        border-radius: var(--radius-sm);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.12s ease;

        &:hover:not(:disabled) {
          background: var(--action-primary-hover);
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        mat-icon {
          font-size: 15px;
          width: 15px;
          height: 15px;
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
export class PageConfigDialogComponent implements OnInit {
  readonly initialMode = input<PageConfigMode>('manage');
  readonly initialPageId = input<string | undefined>(undefined);
  readonly publishedConfiguration = input<UiConfiguration | null>(null);
  readonly apiDefinition = input<ApiDefinition | null>(null);

  readonly close = output<void>();
  readonly save = output<UiConfiguration>();

  readonly draftService = inject(PageDraftService);

  @ViewChild('wizard') wizardComponent?: PageWizardFormComponent;

  readonly isUnsavedDialogOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.draftService.initDraft(
      this.publishedConfiguration(),
      this.apiDefinition(),
      this.initialMode(),
      this.initialPageId()
    );
  }

  getHeaderIcon(): string {
    const mode = this.draftService.activeMode();
    if (mode === 'create') return 'add_circle';
    if (mode === 'edit') return 'edit';
    return 'settings';
  }

  getHeaderTitle(): string {
    const mode = this.draftService.activeMode();
    if (mode === 'create') return 'Nova Página do Dashboard';
    if (mode === 'edit') {
      const page = this.draftService.activeEditingPage();
      return page ? `Editar Página: ${page.title || page.id}` : 'Editar Página';
    }
    return 'Configurar Páginas';
  }

  getHeaderSubtitle(): string {
    const mode = this.draftService.activeMode();
    if (mode === 'create') return 'Configure os dados gerais, métricas, colunas e filtros para o novo recurso.';
    if (mode === 'edit') return 'Ajuste colunas, KPIs, filtros rápidos e ações sem alterar dados brutos OpenAPI.';
    return 'Gerencie a lista de páginas, visibilidade, ordenação e crie novas visões operacionais.';
  }

  onCreateNewPage(): void {
    this.draftService.startCreatePage();
  }

  onEditPage(pageId: string): void {
    this.draftService.startEditPage(pageId);
  }

  goToPreviousStep(): void {
    const current = this.wizardComponent?.currentStep() ?? 1;
    if (current > 1) {
      this.wizardComponent?.goToStep((current - 1) as any);
    }
  }

  goToNextStep(): void {
    const current = this.wizardComponent?.currentStep() ?? 1;
    if (current < 5) {
      this.wizardComponent?.goToStep((current + 1) as any);
    }
  }

  onBackToManage(): void {
    this.draftService.setMode('manage');
  }

  onPromptDiscard(): void {
    this.isUnsavedDialogOpen.set(true);
  }

  onDiscardAndClose(): void {
    this.draftService.resetDraft();
    this.isUnsavedDialogOpen.set(false);
    this.close.emit();
  }

  onAttemptClose(): void {
    if (this.draftService.isDirty()) {
      this.isUnsavedDialogOpen.set(true);
    } else {
      this.onClose();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onSaveAndPublish(): void {
    if (this.draftService.hasBlockingErrors()) return;
    const committed = this.draftService.commitDraft();
    this.save.emit(committed);
    this.close.emit();
  }
}
