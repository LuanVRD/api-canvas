import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiContextBarComponent } from '../../shared/components/api-context-bar/api-context-bar.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

/**
 * Dashboard feature page — operational view for custom resource pages.
 *
 * Currently a placeholder that shares the same ApiContextBar as the
 * API Explorer, proving the dual-area navigation works end to end.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    ApiContextBarComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="dashboard-layout">
      <app-api-context-bar
        (authClick)="isAuthDialogOpen.set(true)"
        (changeApiClick)="onReconnect()"
      />

      <main class="dashboard-content" role="main">
        <app-empty-state
          icon="dashboard_customize"
          title="Dashboard"
          description="O módulo Dashboard permite criar páginas operacionais personalizadas para seus recursos da API. Esta funcionalidade será implementada em breve."
        />
      </main>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--canvas-bg);
      color: var(--canvas-text-primary);
      overflow: hidden;
    }

    .dashboard-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
    }
  `]
})
export class DashboardPage {
  private readonly router = inject(Router);

  readonly isAuthDialogOpen = signal<boolean>(false);

  onReconnect(): void {
    this.router.navigate(['/connect']);
  }
}
