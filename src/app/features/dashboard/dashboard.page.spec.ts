import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardPage } from './dashboard.page';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiDefinition } from '../../core/models/api-definition.model';
import { UiConfiguration } from '../../core/models/ui-configuration.model';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BehaviorSubject } from 'rxjs';

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let sessionService: ApiSessionService;
  let router: Router;
  let paramMapSubject: BehaviorSubject<any>;

  const mockApiDefinition: ApiDefinition = {
    title: 'OrderFlow API',
    version: '1.0.0',
    baseUrl: 'https://api.orders.example.com',
    resources: [
      {
        id: 'orders',
        name: 'Orders',
        label: 'Pedidos',
        operations: []
      },
      {
        id: 'customers',
        name: 'Customers',
        label: 'Clientes',
        operations: []
      }
    ]
  };

  const mockUiConfig: UiConfiguration = {
    pages: {
      'orders-page': {
        id: 'orders-page',
        resourceId: 'orders',
        title: 'Pedidos CRUD',
        icon: 'receipt_long',
        slug: 'pedidos',
        order: 1,
        description: 'Painel operacional de pedidos'
      },
      'customers-page': {
        id: 'customers-page',
        resourceId: 'customers',
        title: 'Clientes',
        icon: 'people',
        slug: 'clientes',
        order: 2
      }
    }
  };

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({}));

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
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMapSubject.asObservable()
          }
        }
      ]
    }).compileComponents();

    sessionService = TestBed.inject(ApiSessionService);
    router = TestBed.inject(Router);
    sessionService.setSession(mockApiDefinition);

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render API context bar with connected API title and version', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.api-title')?.textContent?.trim()).toBe('OrderFlow API');
    expect(el.querySelector('.api-version')?.textContent?.trim()).toBe('v1.0.0');
  });

  it('should display unconfigured empty state when no pages are configured', () => {
    sessionService.setUiConfiguration(null);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const unconfigured = el.querySelector('.unconfigured-state');
    expect(unconfigured).toBeTruthy();
    expect(unconfigured?.textContent).toContain('Nenhuma página configurada');
    expect(el.querySelector('.btn-primary-action')).toBeTruthy();
  });

  it('should render custom pages in sidebar and active page header when configured', () => {
    sessionService.setUiConfiguration(mockUiConfig);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const sidebarItems = el.querySelectorAll('.page-item');
    expect(sidebarItems.length).toBe(2);

    // First page should be selected by default
    expect(component.selectedPageId()).toBe('orders-page');
    expect(component.selectedPage()?.title).toBe('Pedidos CRUD');

    const headerTitle = el.querySelector('.page-title');
    expect(headerTitle?.textContent?.trim()).toBe('Pedidos CRUD');
  });

  it('should select specific page according to route paramMap', () => {
    sessionService.setUiConfiguration(mockUiConfig);
    paramMapSubject.next(convertToParamMap({ pageId: 'customers-page' }));
    fixture.detectChanges();

    expect(component.selectedPageId()).toBe('customers-page');
    expect(component.selectedPage()?.title).toBe('Clientes');
  });

  it('should navigate to /dashboard/:pageId when selecting a page from sidebar', () => {
    sessionService.setUiConfiguration(mockUiConfig);
    fixture.detectChanges();

    const pageToSelect = component.pages()[1];
    component.onSelectPage(pageToSelect);

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard', 'customers-page']);
  });

  it('should navigate to /workspace when clicking on Explorar Recursos in unconfigured state', () => {
    sessionService.setUiConfiguration(null);
    fixture.detectChanges();

    component.onOpenExplorer();
    expect(router.navigate).toHaveBeenCalledWith(['/workspace']);
  });

  it('should navigate to /connect when Change API is triggered', () => {
    component.onReconnect();
    expect(router.navigate).toHaveBeenCalledWith(['/connect']);
  });
});
