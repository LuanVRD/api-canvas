import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { apiSessionGuard } from './api-session.guard';
import { ApiSessionService } from '../services/api-session.service';
import { signal } from '@angular/core';

describe('apiSessionGuard', () => {
  let sessionServiceMock: { hasActiveApi: ReturnType<typeof vi.fn> };
  let routerMock: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    sessionServiceMock = {
      hasActiveApi: vi.fn()
    };

    routerMock = {
      createUrlTree: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiSessionService, useValue: sessionServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('should allow activation when active API exists in session', () => {
    sessionServiceMock.hasActiveApi.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      apiSessionGuard({} as any, {} as any)
    );

    expect(result).toBe(true);
    expect(routerMock.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect to /connect when no active API exists in session', () => {
    const mockUrlTree = {} as UrlTree;
    sessionServiceMock.hasActiveApi.mockReturnValue(false);
    routerMock.createUrlTree.mockReturnValue(mockUrlTree);

    const result = TestBed.runInInjectionContext(() =>
      apiSessionGuard({} as any, {} as any)
    );

    expect(result).toBe(mockUrlTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/connect']);
  });
});
