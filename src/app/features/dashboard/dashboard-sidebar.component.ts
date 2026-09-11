import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { UiPageConfiguration } from '../../core/models/ui-configuration.model';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule
  ],
  template: `
    <aside class="sidebar-container" aria-label="Navegação de Páginas do Dashboard">
      <!-- Header: Title, Total Badge, and New Page Action -->
      <div class="sidebar-header">
        <div class="header-top">
          <span class="header-title">PÁGINAS</span>
          <span class="count-badge font-mono" aria-label="Total de páginas">{{ pages().length }}</span>
        </div>

        <button
          type="button"
          class="new-page-btn"
          (click)="onNewPage()"
          aria-label="Criar nova página"
        >
          <mat-icon class="btn-icon">add</mat-icon>
          <span>Nova página</span>
        </button>

        @if (pages().length > 5) {
          <div class="search-box">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              type="text"
              class="search-input"
              placeholder="Filtrar páginas..."
              [ngModel]="filterQuery()"
              (ngModelChange)="filterQuery.set($event)"
              aria-label="Filtrar páginas"
            />
            @if (filterQuery()) {
              <button class="clear-btn" (click)="filterQuery.set('')" aria-label="Limpar filtro">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
        }
      </div>

      <!-- Custom Pages Navigation List -->
      <nav class="page-list" role="list" aria-label="Lista de páginas personalizadas">
        @for (page of filteredPages(); track page.id) {
          <button
            type="button"
            role="listitem"
            class="page-item"
            [class.active]="selectedPageId() === page.id"
            [attr.aria-current]="selectedPageId() === page.id ? 'page' : null"
            (click)="selectPage(page)"
            (keydown.enter)="selectPage(page)"
            (keydown.space)="selectPage(page); $event.preventDefault()"
          >
            <div class="page-main">
              <mat-icon class="page-icon">{{ page.icon || 'table_chart' }}</mat-icon>
              <span class="page-name" [title]="page.title || page.id">{{ page.title || page.id }}</span>
            </div>

            @if (pageCounts()[page.id!] !== undefined) {
              <span class="page-count font-mono" [title]="pageCounts()[page.id!] + ' registros'">
                {{ pageCounts()[page.id!] }}
              </span>
            }
          </button>
        }

        @if (pages().length === 0) {
          <div class="empty-state" role="status">
            <mat-icon class="empty-icon">dashboard_customize</mat-icon>
            <span>Nenhuma página configurada</span>
          </div>
        } @else if (filteredPages().length === 0) {
          <div class="empty-state" role="status">
            <span>Nenhuma página encontrada</span>
          </div>
        }
      </nav>

      <!-- Persistent Footer Action -->
      <div class="sidebar-footer">
        <button
          type="button"
          class="configure-pages-btn"
          (click)="onConfigurePages()"
          aria-label="Configurar páginas"
        >
          <mat-icon class="footer-icon">settings</mat-icon>
          <span>Configurar páginas</span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar-container {
      width: 250px;
      min-width: 220px;
      max-width: 320px;
      height: 100%;
      background: var(--canvas-surface);
      border-right: 1px solid var(--canvas-border);
      display: flex;
      flex-direction: column;
      user-select: none;
    }

    .sidebar-header {
      padding: 12px 14px 10px;
      border-bottom: 1px solid var(--canvas-border-subtle);
      display: flex;
      flex-direction: column;
      gap: 8px;

      .header-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .header-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--canvas-text-muted);
        letter-spacing: 0.6px;
      }

      .count-badge {
        font-family: var(--font-mono);
        font-size: 11px;
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-secondary);
        padding: 1px 6px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--canvas-border-subtle);
      }
    }

    .new-page-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 28px;
      width: 100%;
      padding: 0 10px;
      background: transparent;
      border: 1px dashed var(--canvas-border);
      border-radius: var(--radius-sm);
      color: var(--canvas-text-secondary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
      outline: none;

      &:hover, &:focus-visible {
        background: var(--canvas-surface-elevated);
        border-color: var(--canvas-text-link);
        color: var(--canvas-text-primary);
      }

      &:focus-visible {
        outline: 2px solid var(--canvas-text-link);
        outline-offset: -2px;
      }

      .btn-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--canvas-text-muted);
      }
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;

      .search-icon {
        position: absolute;
        left: 6px;
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: var(--canvas-text-muted);
        pointer-events: none;
      }

      .search-input {
        width: 100%;
        height: 26px;
        padding: 0 22px 0 24px;
        background: var(--canvas-bg);
        border: 1px solid var(--canvas-border);
        border-radius: var(--radius-sm);
        color: var(--canvas-text-primary);
        font-size: 12px;
        outline: none;
        transition: border-color 0.15s ease;

        &:focus {
          border-color: var(--canvas-text-link);
        }

        &::placeholder {
          color: var(--canvas-text-muted);
        }
      }

      .clear-btn {
        position: absolute;
        right: 4px;
        background: transparent;
        border: none;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--canvas-text-muted);

        &:hover {
          color: var(--canvas-text-primary);
        }

        mat-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
        }
      }
    }

    .page-list {
      flex: 1;
      overflow-y: auto;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .page-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 7px 10px;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      text-align: left;
      color: var(--canvas-text-secondary);
      transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
      box-sizing: border-box;
      outline: none;

      &:hover {
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-primary);
      }

      &:focus-visible {
        outline: 2px solid var(--canvas-text-link);
        outline-offset: -2px;
      }

      &.active {
        background: var(--canvas-surface-elevated);
        color: var(--canvas-text-link);
        border-left: 2px solid var(--canvas-text-link);
        font-weight: 600;

        .page-icon {
          color: var(--canvas-text-link);
        }
      }

      .page-main {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;

        .page-icon {
          font-size: 15px;
          width: 15px;
          height: 15px;
          color: var(--canvas-text-muted);
          flex-shrink: 0;
        }

        .page-name {
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .page-count {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--canvas-text-muted);
        background: var(--canvas-bg);
        padding: 1px 5px;
        border-radius: var(--radius-sm);
        margin-left: 6px;
        flex-shrink: 0;
      }
    }

    .empty-state {
      padding: 24px 12px;
      text-align: center;
      font-size: 12px;
      color: var(--canvas-text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;

      .empty-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--canvas-text-muted);
      }
    }

    .sidebar-footer {
      padding: 8px 10px;
      border-top: 1px solid var(--canvas-border-subtle);
      background: var(--canvas-surface);

      .configure-pages-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        height: 28px;
        padding: 0 8px;
        border-radius: var(--radius-sm);
        border: 1px solid transparent;
        background: transparent;
        color: var(--canvas-text-muted);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.12s ease, color 0.12s ease;
        outline: none;

        &:hover {
          background: var(--canvas-surface-elevated);
          color: var(--canvas-text-primary);
        }

        &:focus-visible {
          outline: 2px solid var(--canvas-text-link);
          outline-offset: -2px;
        }

        .footer-icon {
          font-size: 15px;
          width: 15px;
          height: 15px;
          color: var(--canvas-text-muted);
        }
      }
    }
  `]
})
export class DashboardSidebarComponent {
  readonly pages = input<UiPageConfiguration[]>([]);
  readonly selectedPageId = input<string | undefined>(undefined);
  readonly pageCounts = input<Record<string, number>>({});

  readonly pageSelect = output<UiPageConfiguration>();
  readonly newPageClick = output<void>();
  readonly configurePagesClick = output<void>();

  readonly filterQuery = signal<string>('');

  readonly filteredPages = computed<UiPageConfiguration[]>(() => {
    const q = this.filterQuery().trim().toLowerCase();
    const list = this.pages();
    if (!q) return list;
    return list.filter((p) =>
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.id && p.id.toLowerCase().includes(q)) ||
      (p.slug && p.slug.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  selectPage(page: UiPageConfiguration): void {
    this.pageSelect.emit(page);
  }

  onNewPage(): void {
    this.newPageClick.emit();
  }

  onConfigurePages(): void {
    this.configurePagesClick.emit();
  }
}
