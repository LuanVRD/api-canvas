import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecordDetailsDrawerComponent } from './record-details-drawer.component';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiExecutorService } from '../../core/services/api-executor.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ApiOperation } from '../../core/models/api-operation.model';
import { ApiParameter } from '../../core/models/api-parameter.model';

describe('RecordDetailsDrawerComponent', () => {
  let component: RecordDetailsDrawerComponent;
  let fixture: ComponentFixture<RecordDetailsDrawerComponent>;
  let mockExecutor: { execute: ReturnType<typeof vi.fn> };
  let mockSession: { baseUrl: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  const sampleOp: ApiOperation = {
    id: 'get_pet_by_id',
    method: 'GET',
    path: '/pets/{petId}',
    type: 'details',
    parameters: [
      {
        name: 'petId',
        location: 'path',
        required: true,
        schema: { type: 'integer' }
      }
    ],
    responses: []
  };

  beforeEach(async () => {
    mockExecutor = {
      execute: vi.fn().mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          data: { id: 10, name: 'Doggie', status: 'available' },
          duration: 40,
          durationMs: 40,
          isSuccess: true
        })
      )
    };

    mockSession = {
      baseUrl: vi.fn().mockReturnValue('https://api.example.com')
    };

    mockRouter = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [RecordDetailsDrawerComponent],
      providers: [
        { provide: ApiExecutorService, useValue: mockExecutor },
        { provide: ApiSessionService, useValue: mockSession },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecordDetailsDrawerComponent);
    component = fixture.componentInstance;
    component.operation = sampleOp;
    component.initialParams = { petId: '10' };
    component.missingParams = [];
  });

  it('should create and auto-fetch details when no missing params', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      'https://api.example.com',
      sampleOp,
      { path: { petId: '10' } }
    );
    expect(component.executionResult()?.isSuccess).toBe(true);
  });

  it('should render missing params prompt when missingParams has items and not auto-fetch', () => {
    mockExecutor.execute.mockClear();
    const missing: ApiParameter[] = [
      {
        name: 'petId',
        location: 'path',
        required: true,
        schema: { type: 'string' }
      }
    ];

    component.missingParams = missing;
    component.initialParams = {};
    fixture.detectChanges();

    expect(component.hasMissingParams()).toBe(true);
    expect(mockExecutor.execute).not.toHaveBeenCalled();

    const banner = fixture.nativeElement.querySelector('.missing-params-banner');
    expect(banner).toBeTruthy();
  });

  it('should handle 404 error and display error message', () => {
    mockExecutor.execute.mockReturnValue(
      of({
        status: 404,
        statusText: 'Not Found',
        data: { message: 'Pet not found' },
        duration: 35,
        durationMs: 35,
        isSuccess: false,
        error: {
          message: 'The requested record was not found on the server (404 Not Found).',
          status: 404
        }
      })
    );

    fixture.detectChanges();

    expect(component.executionResult()?.isSuccess).toBe(false);
    expect(component.executionResult()?.status).toBe(404);

    const errorCard = fixture.nativeElement.querySelector('.error-card');
    expect(errorCard).toBeTruthy();
    expect(errorCard.textContent).toContain('404');
  });

  it('should switch between visual and raw view modes', () => {
    fixture.detectChanges();
    expect(component.viewMode()).toBe('visual');

    component.viewMode.set('raw');
    fixture.detectChanges();

    const rawContainer = fixture.nativeElement.querySelector('.raw-details-wrapper');
    expect(rawContainer).toBeTruthy();
  });

  it('should emit close event when close button is clicked', () => {
    fixture.detectChanges();
    const closeSpy = vi.spyOn(component.close, 'emit');

    const closeBtn = fixture.nativeElement.querySelector('.close-btn');
    closeBtn.click();

    expect(closeSpy).toHaveBeenCalled();
  });
});
