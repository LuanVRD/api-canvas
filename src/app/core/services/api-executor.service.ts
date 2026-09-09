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
            : (typeof error.error === 'object' && error.error?.message
                ? error.error.message
                : error.message || `Erro HTTP ${status} retornado pelo servidor.`);

          const hint = isCorsOrNetwork
            ? 'Verifique se o servidor backend está online e se os cabeçalhos de CORS (Access-Control-Allow-Origin, Access-Control-Allow-Methods) permitem requisições do frontend.'
            : undefined;

          return of({
            status,
            statusText,
            data: error.error || null,
            duration,
            durationMs: duration,
            isSuccess: false,
            timestamp: Date.now(),
            error: {
              message,
              category,
              status,
              statusText,
              details: error.error || error.message,
              hint
            }
          });
        })
      );
  }
}
