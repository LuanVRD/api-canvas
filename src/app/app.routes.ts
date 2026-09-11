import { Routes } from '@angular/router';
import { apiSessionGuard } from './core/guards/api-session.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'connect'
  },
  {
    path: 'connect',
    loadComponent: () =>
      import('./features/api-connect/api-connect.page').then(m => m.ApiConnectPage)
  },
  {
    path: 'workspace',
    canActivate: [apiSessionGuard],
    loadComponent: () =>
      import('./features/workspace/workspace.page').then(m => m.WorkspacePage)
  },
  {
    path: 'workspace/:resourceId',
    canActivate: [apiSessionGuard],
    loadComponent: () =>
      import('./features/workspace/workspace.page').then(m => m.WorkspacePage)
  },
  {
    path: 'operation/:operationId',
    canActivate: [apiSessionGuard],
    loadComponent: () =>
      import('./features/operation/operation.page').then(m => m.OperationPage)
  },
  {
    path: 'dashboard',
    canActivate: [apiSessionGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.page').then(m => m.DashboardPage)
  },
  {
    path: '**',
    redirectTo: 'connect'
  }
];

