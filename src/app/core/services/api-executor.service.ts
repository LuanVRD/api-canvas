import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiOperation } from '../models/api-operation.model';
import { ApiExecutionResult, ApiRequestInput } from '../models/api-execution-result.model';

@Injectable({
  providedIn: 'root'
})
export class ApiExecutorService {
  private readonly http = inject(HttpClient);

  execute(
    baseUrl: string,
    operation: ApiOperation,
    input: ApiRequestInput
  ): Observable<ApiExecutionResult> {
    const startTime = performance.now();
    let url = this.buildUrl(baseUrl, operation.path, input.path);
    
    let params = new HttpParams();
    if (input.query) {
      Object.entries(input.query).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          params = params.set(key, String(val));
        }
      });
    }

    let headers = new HttpHeaders();
    if (input.headers) {
      Object.entries(input.headers).forEach(([key, val]) => {
        headers = headers.set(key, val);
      });
    }

    return this.http.request(operation.method, url, {
      body: input.body,
      headers,
      params,
      observe: 'response',
      responseType: 'json'
    }).pipe(
      map((response: HttpResponse<unknown>) => {
        const duration = Math.round(performance.now() - startTime);
        const resHeaders: Record<string, string> = {};
        response.headers.keys().forEach(k => {
          resHeaders[k] = response.headers.get(k) || '';
        });

        return {
          status: response.status,
          statusText: response.statusText,
          headers: resHeaders,
          data: response.body,
          duration
        };
      }),
      catchError((error) => {
        const duration = Math.round(performance.now() - startTime);
        return of({
          status: error.status || 0,
          statusText: error.statusText || 'Network Error',
          data: error.error || error.message,
          duration
        });
      })
    );
  }

  private buildUrl(baseUrl: string, pathTemplate: string, pathParams?: Record<string, unknown>): string {
    let resolved = pathTemplate;
    if (pathParams) {
      Object.entries(pathParams).forEach(([key, val]) => {
        resolved = resolved.replace(`{${key}}`, encodeURIComponent(String(val)));
      });
    }
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = resolved.startsWith('/') ? resolved : `/${resolved}`;
    return `${cleanBase}${cleanPath}`;
  }
}
