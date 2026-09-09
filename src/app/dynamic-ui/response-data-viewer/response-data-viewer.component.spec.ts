import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResponseDataViewerComponent } from './response-data-viewer.component';
import { ApiExecutionResult } from '../../core/models/api-execution-result.model';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiOperation } from '../../core/models/api-operation.model';

describe('ResponseDataViewerComponent', () => {
  let component: ResponseDataViewerComponent;
  let fixture: ComponentFixture<ResponseDataViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResponseDataViewerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ResponseDataViewerComponent);
    component = fixture.componentInstance;
  });

  it('should detect array response and infer columns', () => {
    const res: ApiExecutionResult = {
      status: 200,
      statusText: 'OK',
      isSuccess: true,
      data: [
        { id: 1, name: 'Item A', active: true },
        { id: 2, name: 'Item B', active: false }
      ]
    };
    component.result = res;
    fixture.detectChanges();

    expect(component.detectedType()).toBe('array');
    expect(component.detectedTypeLabel()).toBe('Table');
    expect(component.inferredColumns().length).toBe(3);
  });

  it('should use provided schema to infer columns when available', () => {
    component.schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string', title: 'Product Code' },
          amount: { type: 'number' }
        }
      }
    };
    component.result = {
      status: 200,
      statusText: 'OK',
      isSuccess: true,
      data: [{ code: 'P01', amount: 100 }]
    };
    fixture.detectChanges();

    expect(component.inferredColumns().length).toBe(2);
    expect(component.inferredColumns()[0].label).toBe('Product Code');
  });

  it('should detect object response for single record (details)', () => {
    const res: ApiExecutionResult = {
      status: 200,
      statusText: 'OK',
      isSuccess: true,
      data: { id: 42, title: 'Single Detail', price: 99.9 }
    };
    component.result = res;
    fixture.detectChanges();

    expect(component.detectedType()).toBe('object');
    expect(component.detectedTypeLabel()).toBe('Details');
  });

  it('should detect primitive responses (string, number, boolean)', () => {
    component.result = {
      status: 200,
      statusText: 'OK',
      isSuccess: true,
      data: 'Plain text output'
    };
    fixture.detectChanges();
    expect(component.detectedType()).toBe('primitive');
    expect(component.detectedTypeLabel()).toBe('Value');

    component.result = {
      status: 200,
      statusText: 'OK',
      isSuccess: true,
      data: 12345
    };
    fixture.detectChanges();
    expect(component.detectedType()).toBe('primitive');

    component.result = {
      status: 200,
      statusText: 'OK',
      isSuccess: true,
      data: true
    };
    fixture.detectChanges();
    expect(component.detectedType()).toBe('primitive');
  });

  it('should detect empty response for 204 No Content, empty array, and empty object', () => {
    // 204 No Content
    component.result = {
      status: 204,
      statusText: 'No Content',
      isSuccess: true,
      data: null
    };
    fixture.detectChanges();
    expect(component.detectedType()).toBe('empty');
    expect(component.emptyStateTitle()).toBe('204 No Content');

    // Empty array []
    component.result = {
      status: 200,
      statusText: 'OK',
      isSuccess: true,
      data: []
    };
    fixture.detectChanges();
    expect(component.detectedType()).toBe('empty');
    expect(component.emptyStateTitle()).toBe('Empty Collection');

    // Empty object {}
    component.result = {
      status: 200,
      statusText: 'OK',
      isSuccess: true,
      data: {}
    };
    fixture.detectChanges();
    expect(component.detectedType()).toBe('empty');
    expect(component.emptyStateTitle()).toBe('Empty Object');
  });

  it('should support non-200 success statuses such as 201, 202, 206, 304', () => {
    component.result = {
      status: 201,
      statusText: 'Created',
      isSuccess: true,
      data: { id: 99, status: 'created' }
    };
    fixture.detectChanges();
    expect(component.detectedType()).toBe('object');

    component.result = {
      status: 304,
      statusText: 'Not Modified',
      isSuccess: true,
      data: null
    };
    fixture.detectChanges();
    expect(component.detectedType()).toBe('empty');
  });

  it('should switch between visual and raw JSON mode', () => {
    component.result = {
      status: 200,
      statusText: 'OK',
      isSuccess: true,
      data: { name: 'Raw Test' }
    };
    fixture.detectChanges();

    expect(component.activeMode()).toBe('visual');
    component.activeMode.set('raw');
    fixture.detectChanges();
    expect(component.activeMode()).toBe('raw');
    expect(component.rawFormattedText()).toContain('"name": "Raw Test"');
  });

  it('should parse stringified JSON data safely without error', () => {
    component.result = {
      status: 200,
      statusText: 'OK',
      isSuccess: true,
      data: '{"parsedKey": "parsedVal"}'
    };
    fixture.detectChanges();

    expect(component.detectedType()).toBe('object');
    expect(component.parsedData()).toEqual({ parsedKey: 'parsedVal' });
  });

  it('should emit inspectRecord event when row view is triggered', () => {
    const listOp: ApiOperation = {
      id: 'get_products',
      method: 'GET',
      path: '/products',
      type: 'list',
      parameters: [],
      responses: []
    };

    const detailsOp: ApiOperation = {
      id: 'get_product_by_id',
      method: 'GET',
      path: '/products/{id}',
      type: 'details',
      parameters: [
        {
          name: 'id',
          location: 'path',
          required: true,
          schema: { type: 'integer' }
        }
      ],
      responses: []
    };

    const sessionService = TestBed.inject(ApiSessionService);
    sessionService.setSession({
      title: 'Test Store',
      version: '1.0.0',
      baseUrl: 'https://store.test',
      resources: [
        {
          id: 'products',
          name: 'products',
          label: 'Products',
          operations: [listOp, detailsOp]
        }
      ]
    });

    component.sourceOperation = listOp;
    component.result = {
      status: 200,
      statusText: 'OK',
      isSuccess: true,
      data: [{ id: 456, name: 'Sample Item' }]
    };

    fixture.detectChanges();

    expect(component.hasDetailsOp()).toBe(true);

    const inspectSpy = vi.spyOn(component.inspectRecord, 'emit');
    component.onRowInspect({ id: 456, name: 'Sample Item' });

    expect(inspectSpy).toHaveBeenCalledWith({
      record: { id: 456, name: 'Sample Item' },
      detailsOp,
      params: { id: '456' },
      missingParams: []
    });
  });
});
