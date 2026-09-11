import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardPage } from './dashboard.page';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiDefinition } from '../../core/models/api-definition.model';
import { Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let router: Router;

  const mockApiDefinition: ApiDefinition = {
    title: 'Orders API',
    version: '2.0.0',
    baseUrl: 'https://api.orders.com',
    resources: []
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideAnimationsAsync(),
        ApiSessionService,
        {
          provide: Router,
          useValue: {
            navigate: vi.fn()
          }
        }
      ]
    }).compileComponents();

    const sessionService = TestBed.inject(ApiSessionService);
    sessionService.setSession(mockApiDefinition);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render API context bar with API metadata', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.api-title')?.textContent?.trim()).toBe('Orders API');
    expect(el.querySelector('.api-version')?.textContent?.trim()).toBe('v2.0.0');
  });

  it('should render empty state placeholder', () => {
    const el: HTMLElement = fixture.nativeElement;
    const emptyState = el.querySelector('app-empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('should navigate to /connect when Change API is clicked', () => {
    component.onReconnect();
    expect(router.navigate).toHaveBeenCalledWith(['/connect']);
  });
});
