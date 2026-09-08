import { Routes } from '@angular/router';

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
    loadComponent: () =>
      import('./features/workspace/workspace.page').then(m => m.WorkspacePage)
  },
  {
    path: 'workspace/:resourceId',
    loadComponent: () =>
      import('./features/workspace/workspace.page').then(m => m.WorkspacePage)
  },
  {
    path: 'operation/:operationId',
    loadComponent: () =>
      import('./features/operation/operation.page').then(m => m.OperationPage)
  },
  {
    path: '**',
    redirectTo: 'connect'
  }
];
