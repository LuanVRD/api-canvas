import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiOperation } from '../models/api-operation.model';
import { ApiExecutionResult } from '../models/api-execution-result.model';
import { ApiRequestInput } from '../models/api-request-input.model';
import { ApiRequestBuilderService } from './api-request-builder.service';
import { RequestValidationError } from '../models/built-api-request.model';

@Injectable({
  providedIn: 'root'
})
export class ApiExecutorService {
  private readonly http = inject(HttpClient);
  private readonly requestBuilder = inject(ApiRequestBuilderService);

  execute(
    baseUrl: string,
    operation: ApiOperation,
    input: ApiRequestInput = {}
  ): Observable<ApiExecutionResult> {
    const startTime = performance.now();

    let built;
    try {
      built = this.requestBuilder.build(baseUrl, operation, input);
    } catch (err: unknown) {
      const duration = Math.round(performance.now() - startTime);
      const message = err instanceof Error ? err.message : 'Invalid request parameters';
      const details = err instanceof RequestValidationError ? err.errors : undefined;

      return of({
        status: 0,
        statusText: 'Validation Error',
        data: null,
        duration,
        durationMs: duration,
        isSuccess: false,
        error: {
          message,
          status: 0,
          details
        }
      });
    }

    let params = new HttpParams();
    for (const [key, val] of Object.entries(built.queryParams)) {
      if (Array.isArray(val)) {
        for (const item of val) {
          params = params.append(key, item);
        }
      } else {
        params = params.set(key, val);
      }
    }

    let headers = new HttpHeaders();
    for (const [key, val] of Object.entries(built.headers)) {
      headers = headers.set(key, val);
    }

    return this.http
      .request(built.method, built.url, {
        body: built.body,
        headers,
        params,
        observe: 'response',
        responseType: 'json'
      })
      .pipe(
        map((response: HttpResponse<unknown>): ApiExecutionResult => {
          const duration = Math.round(performance.now() - startTime);
          const resHeaders: Record<string, string> = {};
          response.headers.keys().forEach((k) => {
            resHeaders[k] = response.headers.get(k) || '';
          });

          return {
            status: response.status,
            statusText: response.statusText,
            headers: resHeaders,
            data: response.body,
            duration,
            durationMs: duration,
            isSuccess: response.ok || (response.status >= 200 && response.status < 300)
          };
        }),
        catchError((error): Observable<ApiExecutionResult> => {
          const duration = Math.round(performance.now() - startTime);
          return of({
            status: error.status || 0,
            statusText: error.statusText || 'Network Error',
            data: error.error || error.message,
            duration,
            durationMs: duration,
            isSuccess: false,
            error: {
              message: error.message || 'Unknown network error',
              status: error.status,
              details: error.error
            }
          });
        })
      );
  }
}
