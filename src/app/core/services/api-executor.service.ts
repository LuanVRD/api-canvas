import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiOperation } from '../models/api-operation.model';
import { ApiExecutionResult } from '../models/api-execution-result.model';
import { ApiRequestInput } from '../models/api-request-input.model';
import { ApiRequestBuilderService } from './api-request-builder.service';
import { ApiSessionService } from './api-session.service';
import { RequestValidationError } from '../models/built-api-request.model';

@Injectable({
  providedIn: 'root'
})
export class ApiExecutorService {
  private readonly http = inject(HttpClient);
  private readonly requestBuilder = inject(ApiRequestBuilderService);
  private readonly session = inject(ApiSessionService);

  execute(
    baseUrl: string,
    operation: ApiOperation,
    input: ApiRequestInput = {},
    options?: {
      bearerToken?: string | null;
      apiKeys?: Record<string, string>;
      skipValidation?: boolean;
    }
  ): Observable<ApiExecutionResult> {
    const startTime = performance.now();
    const token = options?.bearerToken !== undefined ? options.bearerToken : this.session.bearerToken();
    const keys = options?.apiKeys !== undefined ? options.apiKeys : this.session.apiKeys();

    let built;
    try {
      built = this.requestBuilder.build(baseUrl, operation, input, {
        skipValidation: options?.skipValidation,
        bearerToken: token,
        apiKeys: keys,
        securitySchemes: this.session.securitySchemes()
      });
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
        timestamp: Date.now(),
        error: {
          message,
          category: 'VALIDATION_ERROR',
          status: 0,
          statusText: 'Validation Error',
          details,
          hint: 'Preencha todos os parâmetros obrigatórios antes de enviar a requisição.'
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
            statusText: response.statusText || (response.status === 200 ? 'OK' : response.status === 201 ? 'Created' : response.status === 204 ? 'No Content' : 'Success'),
            headers: resHeaders,
            data: response.body,
            duration,
            durationMs: duration,
            isSuccess: response.ok || (response.status >= 200 && response.status < 300),
            timestamp: Date.now()
          };
        }),
        catchError((error): Observable<ApiExecutionResult> => {
          const duration = Math.round(performance.now() - startTime);
          const isCorsOrNetwork = !error.status || error.status === 0;
          const status = error.status || 0;
          const statusText = isCorsOrNetwork
            ? 'CORS or Network Error'
            : error.statusText || (status >= 500 ? 'Server Error' : 'Client Error');

          const category = isCorsOrNetwork ? 'CORS_OR_NETWORK' : 'HTTP_ERROR';
          const message = isCorsOrNetwork
            ? `Falha de rede ou restrição de CORS ao conectar a ${built.url}.`
            : this.extractErrorMessage(error, status, statusText);

          const hint = isCorsOrNetwork
            ? 'Verifique se o servidor backend está online e se os cabeçalhos de CORS (Access-Control-Allow-Origin, Access-Control-Allow-Methods) permitem requisições do frontend.'
            : undefined;

          const rawDetails = error.error !== undefined ? error.error : error.message;

          return of({
            status,
            statusText,
            data: error.error ?? null,
            duration,
            durationMs: duration,
            isSuccess: false,
            timestamp: Date.now(),
            error: {
              message,
              category,
              status,
              statusText,
              details: rawDetails,
              hint
            }
          });
        })
      );
  }

  private extractErrorMessage(error: any, status: number, statusText: string): string {
    const errBody = error?.error;

    if (typeof errBody === 'string' && errBody.trim().length > 0) {
      try {
        const parsed = JSON.parse(errBody);
        const fromParsed = this.extractFromObject(parsed);
        if (fromParsed) return fromParsed;
      } catch {
        return errBody.trim();
      }
      return errBody.trim();
    }

    if (typeof errBody === 'object' && errBody !== null) {
      const extracted = this.extractFromObject(errBody);
      if (extracted) {
        return extracted;
      }
    }

    if (error?.statusText && error.statusText !== 'Unknown Error' && error.statusText !== 'OK') {
      return `Erro HTTP ${status} (${error.statusText}) retornado pelo servidor.`;
    }

    return `Erro HTTP ${status} retornado pelo servidor.`;
  }

  private extractFromObject(obj: Record<string, any>): string | null {
    // RFC 7807 / RFC 9457 Problem Details 'detail'
    if (typeof obj['detail'] === 'string' && obj['detail'].trim()) {
      return obj['detail'].trim();
    }

    // Common error fields
    if (typeof obj['message'] === 'string' && obj['message'].trim()) {
      return obj['message'].trim();
    }

    if (typeof obj['error'] === 'string' && obj['error'].trim()) {
      return obj['error'].trim();
    }

    if (typeof obj['errorMessage'] === 'string' && obj['errorMessage'].trim()) {
      return obj['errorMessage'].trim();
    }

    if (typeof obj['msg'] === 'string' && obj['msg'].trim()) {
      return obj['msg'].trim();
    }

    if (typeof obj['description'] === 'string' && obj['description'].trim()) {
      return obj['description'].trim();
    }

    // ASP.NET Core ValidationProblemDetails / errors dictionary
    if (obj['errors'] && typeof obj['errors'] === 'object' && !Array.isArray(obj['errors'])) {
      const entries = Object.entries(obj['errors']);
      if (entries.length > 0) {
        const messages: string[] = [];
        for (const [field, val] of entries) {
          if (Array.isArray(val) && val.length > 0) {
            messages.push(`${field}: ${val.join(', ')}`);
          } else if (typeof val === 'string' && val.trim()) {
            messages.push(`${field}: ${val}`);
          }
        }
        if (messages.length > 0) {
          return messages.join(' | ');
        }
      }
    }

    if (Array.isArray(obj['errors']) && obj['errors'].length > 0) {
      return obj['errors']
        .map((e: any) => (typeof e === 'string' ? e : e?.message || JSON.stringify(e)))
        .join(' | ');
    }

    // Title fallback if not generic
    if (typeof obj['title'] === 'string' && obj['title'].trim()) {
      return obj['title'].trim();
    }

    return null;
  }
}
