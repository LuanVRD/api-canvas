import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { ApiSessionService } from '../services/api-session.service';

/**
 * Functional route guard to prevent access to workspace and operation views
 * when no API definition has been connected or loaded in the session.
 */
export const apiSessionGuard: CanActivateFn = (): boolean | UrlTree => {
  const sessionService = inject(ApiSessionService);
  const router = inject(Router);

  if (sessionService.hasActiveApi()) {
    return true;
  }

  return router.createUrlTree(['/connect']);
};
