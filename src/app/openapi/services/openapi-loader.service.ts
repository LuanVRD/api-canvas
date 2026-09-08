import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OpenApiLoaderService {
  private readonly http = inject(HttpClient);

  /**
   * Loads an OpenAPI specification document from the given URL as a raw unknown JSON document.
   * Maintains isolation of responsibilities: does NOT parse paths, operations, or schemas.
   *
   * @param url The absolute HTTP/HTTPS URL pointing to the OpenAPI document.
   * @returns An Observable emitting the raw JSON document content.
   */
  load(url: string): Observable<unknown> {
    return this.http.get<unknown>(url, { responseType: 'json' as const }).pipe(
      map((response) => {
        if (response === null || response === undefined || typeof response !== 'object') {
          throw new Error('O conteúdo retornado não é um documento JSON válido.');
        }
        return response;
      }),
      catchError((error: unknown) => {
        return throwError(() => this.formatError(error));
      })
    );
  }

  private formatError(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      // Status 0 occurs when CORS blocks the request or network is unreachable
      if (error.status === 0) {
        return new Error(
          'Falha de rede ou restrição de CORS. Verifique sua conexão e se o servidor da API permite requisições Cross-Origin (CORS).'
        );
      }

      // JSON syntax / parse error during HttpClient parsing
      if (
        error.error instanceof SyntaxError ||
        (typeof error.message === 'string' && error.message.includes('Http failure during parsing'))
      ) {
        return new Error('O conteúdo retornado não pôde ser interpretado como um documento JSON válido.');
      }

      if (error.status === 404) {
        return new Error('Documento OpenAPI não encontrado na URL informada (HTTP 404).');
      }

      if (error.status >= 400 && error.status < 500) {
        return new Error(
          `Erro na requisição ao obter OpenAPI (HTTP ${error.status}: ${error.statusText || 'Client Error'}).`
        );
      }

      if (error.status >= 500) {
        return new Error(
          `Servidor remoto falhou ao responder a especificação OpenAPI (HTTP ${error.status}: ${error.statusText || 'Server Error'}).`
        );
      }

      return new Error(`Erro de comunicação HTTP: ${error.message || error.statusText}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Ocorreu um erro desconhecido ao carregar a especificação OpenAPI.');
  }
}

