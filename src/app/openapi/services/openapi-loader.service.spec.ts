import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OpenApiLoaderService } from './openapi-loader.service';

describe('OpenApiLoaderService', () => {
  let service: OpenApiLoaderService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OpenApiLoaderService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(OpenApiLoaderService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should successfully load a valid OpenAPI JSON document and return it as raw unknown', () => {
    const mockUrl = 'https://api.example.com/openapi.json';
    const mockSpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: { summary: 'Get Users', responses: { '200': { description: 'Success' } } }
        }
      }
    };

    let result: unknown;
    service.load(mockUrl).subscribe((data) => {
      result = data;
    });

    const req = httpTesting.expectOne(mockUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockSpec);

    expect(result).toEqual(mockSpec);
    // Preserves structure as-is without internal transformation or path parsing
    expect((result as typeof mockSpec).paths['/users'].get.summary).toBe('Get Users');
  });

  it('should return CORS/Network guidance when request fails with status 0', () => {
    const mockUrl = 'https://api.example.com/blocked-cors.json';
    let caughtError: Error | undefined;

    service.load(mockUrl).subscribe({
      next: () => {
        throw new Error('Expected request to fail with CORS/network error');
      },
      error: (err: Error) => {
        caughtError = err;
      }
    });

    const req = httpTesting.expectOne(mockUrl);
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toContain('CORS');
    expect(caughtError?.message).toContain('Falha de rede ou restrição de CORS');
  });

  it('should return 404 specific error when OpenAPI document is not found', () => {
    const mockUrl = 'https://api.example.com/missing.json';
    let caughtError: Error | undefined;

    service.load(mockUrl).subscribe({
      next: () => {
        throw new Error('Expected request to fail with 404');
      },
      error: (err: Error) => {
        caughtError = err;
      }
    });

    const req = httpTesting.expectOne(mockUrl);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toContain('404');
    expect(caughtError?.message).toContain('Documento OpenAPI não encontrado');
  });

  it('should return server error when backend responds with 500 status', () => {
    const mockUrl = 'https://api.example.com/server-error.json';
    let caughtError: Error | undefined;

    service.load(mockUrl).subscribe({
      next: () => {
        throw new Error('Expected request to fail with 500');
      },
      error: (err: Error) => {
        caughtError = err;
      }
    });

    const req = httpTesting.expectOne(mockUrl);
    req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toContain('500');
    expect(caughtError?.message).toContain('Servidor remoto falhou');
  });

  it('should return client error message when request fails with 403 Forbidden', () => {
    const mockUrl = 'https://api.example.com/forbidden.json';
    let caughtError: Error | undefined;

    service.load(mockUrl).subscribe({
      next: () => {
        throw new Error('Expected request to fail with 403');
      },
      error: (err: Error) => {
        caughtError = err;
      }
    });

    const req = httpTesting.expectOne(mockUrl);
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toContain('403');
    expect(caughtError?.message).toContain('Erro na requisição ao obter OpenAPI');
  });

  it('should handle JSON syntax/parse errors when response cannot be parsed as JSON', () => {
    const mockUrl = 'https://api.example.com/invalid-syntax.json';
    let caughtError: Error | undefined;

    service.load(mockUrl).subscribe({
      next: () => {
        throw new Error('Expected request to fail parsing');
      },
      error: (err: Error) => {
        caughtError = err;
      }
    });

    const req = httpTesting.expectOne(mockUrl);
    req.error(new SyntaxError('Unexpected token < in JSON at position 0') as unknown as ProgressEvent, {
      status: 200,
      statusText: 'OK'
    });

    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toContain('não pôde ser interpretado como um documento JSON válido');
  });

  it('should reject non-object JSON responses (e.g. primitives or null)', () => {
    const mockUrl = 'https://api.example.com/primitive.json';
    let caughtError: Error | undefined;

    service.load(mockUrl).subscribe({
      next: () => {
        throw new Error('Expected request to reject non-object');
      },
      error: (err: Error) => {
        caughtError = err;
      }
    });

    const req = httpTesting.expectOne(mockUrl);
    req.flush('just a plain string');

    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toContain('não é um documento JSON válido');
  });

  it('should reject null response', () => {
    const mockUrl = 'https://api.example.com/null.json';
    let caughtError: Error | undefined;

    service.load(mockUrl).subscribe({
      next: () => {
        throw new Error('Expected request to reject null');
      },
      error: (err: Error) => {
        caughtError = err;
      }
    });

    const req = httpTesting.expectOne(mockUrl);
    req.flush(null);

    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toContain('não é um documento JSON válido');
  });

  it('should handle generic Error instances gracefully', () => {
    const mockUrl = 'https://api.example.com/generic-err.json';
    let caughtError: Error | undefined;

    service.load(mockUrl).subscribe({
      next: () => {
        throw new Error('Expected request to fail');
      },
      error: (err: Error) => {
        caughtError = err;
      }
    });

    const req = httpTesting.expectOne(mockUrl);
    req.error(new ErrorEvent('Network error', { message: 'Http failure during parsing for https://...' }));

    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toBeDefined();
  });
});
