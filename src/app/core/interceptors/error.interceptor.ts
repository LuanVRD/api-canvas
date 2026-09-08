import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Global error telemetry/logging hook
      console.error(`[ApiCanvas HTTP Error] ${req.method} ${req.url}:`, error);
      return throwError(() => error);
    })
  );
};
