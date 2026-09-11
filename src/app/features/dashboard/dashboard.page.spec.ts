import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardPage } from './dashboard.page';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ApiExecutorService } from '../../core/services/api-executor.service';
import { ApiDefinition } from '../../core/models/api-definition.model';
import { UiConfiguration } from '../../core/models/ui-configuration.model';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BehaviorSubject, of } from 'rxjs';
import { ResourcePageFacadeService } from './services/resource-page-facade.service';

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let sessionService: ApiSessionService;
  let apiExecutor: ApiExecutorService;
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
        operations: [
          {
            id: 'listOrders',
            operationId: 'listOrders',
            method: 'GET',
            path: '/orders',
            type: 'list',
            parameters: [],
            responses: []
          }
        ]
      },
      {
        id: 'customers',
        name: 'Customers',
        label: 'Clientes',
        operations: [
          {
            id: 'listCustomers',
            operationId: 'listCustomers',
            method: 'GET',
            path: '/customers',
            type: 'list',
            parameters: [],
            responses: []
          }
        ]
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

  const mockUiConfigWithDefault: UiConfiguration = {
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
        isDefault: true,
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
          provide: ApiExecutorService,
          useValue: {
            execute: vi.fn().mockReturnValue(
              of({
                status: 200,
                statusText: 'OK',
                data: [{ id: 'ORD-1' }, { id: 'ORD-2' }],
                duration: 15,
                durationMs: 15,
                isSuccess: true,
                timestamp: Date.now()
              })
            )
          }
        },
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
    apiExecutor = TestBed.inject(ApiExecutorService);
    router = TestBed.inject(Router);
    sessionService.setSession(mockApiDefinition);

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
  });

  it('should create the component and instantiate scoped feature facade', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.facade).toBeInstanceOf(ResourcePageFacadeService);
  });

  it('should render API context bar with connected API title and version', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.api-title')?.textContent?.trim()).toBe('OrderFlow API');
    expect(el.querySelector('.api-version')?.textContent?.trim()).toBe('v1.0.0');
  });

  describe('Ausência de páginas (Unconfigured State)', () => {
    it('should display unconfigured empty state when no pages are configured without redirecting', () => {
      sessionService.setUiConfiguration(null);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const unconfigured = el.querySelector('.unconfigured-state');
      expect(unconfigured).toBeTruthy();
      expect(unconfigured?.textContent).toContain('Nenhuma página configurada');
      expect(el.querySelector('.btn-primary-action')).toBeTruthy();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to /workspace when clicking on Explorar Recursos in unconfigured state', () => {
      sessionService.setUiConfiguration(null);
      fixture.detectChanges();

      component.onOpenExplorer();
      expect(router.navigate).toHaveBeenCalledWith(['/workspace']);
    });

    it('should generate pages from connected resources and navigate when clicking Criar primeira página', () => {
      sessionService.setUiConfiguration(null);
      fixture.detectChanges();

      component.onCreatePage();
      expect(component.pages().length).toBeGreaterThan(0);
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard', 'orders']);
    });
  });

  describe('Redirecionamento de rota padrão (/dashboard)', () => {
    it('should redirect /dashboard to the page marked as isDefault', () => {
      sessionService.setUiConfiguration(mockUiConfigWithDefault);
      fixture.detectChanges();

      expect(router.navigate).toHaveBeenCalledWith(['/dashboard', 'clientes'], { replaceUrl: true });
    });

    it('should redirect /dashboard to the first visible page when no page is marked as default', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      fixture.detectChanges();

      expect(router.navigate).toHaveBeenCalledWith(['/dashboard', 'pedidos'], { replaceUrl: true });
    });
  });

  describe('Resolução de slug válido e Facade Integration', () => {
    it('should resolve pageSlug from route params and delegate loading to facade', async () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      expect(component.requestedSlug()).toBe('pedidos');
      expect(component.selectedPage()?.title).toBe('Pedidos CRUD');
      expect(component.isInvalidSlug()).toBe(false);

      const el: HTMLElement = fixture.nativeElement;
      const headerTitle = el.querySelector('.page-title');
      expect(headerTitle?.textContent?.trim()).toBe('Pedidos CRUD');

      // Wait for facade async loading
      await new Promise((resolve) => setTimeout(resolve, 20));
      fixture.detectChanges();

      expect(component.facade.status()).toBe('success');
      expect(component.facade.totalCount()).toBe(2);
      expect(el.querySelector('app-resource-page-content')).toBeTruthy();
      expect(el.querySelector('.table-meta-footer')?.textContent).toContain('Total carregado: 2 de 2');
    });

    it('should delegate refresh button click to facade.refresh()', async () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      const refreshSpy = vi.spyOn(component.facade, 'refresh');
      component.onRefresh();

      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should delegate retry button click to facade.retry()', async () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      const retrySpy = vi.spyOn(component.facade, 'retry');
      component.onRetry();

      expect(retrySpy).toHaveBeenCalled();
    });
  });

  describe('Tratamento de slug inválido/inexistente', () => {
    it('should display not found empty state when requested slug does not exist in configuration', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'rota-inexistente' }));
      fixture.detectChanges();

      expect(component.isInvalidSlug()).toBe(true);
      expect(component.selectedPage()).toBeNull();

      const el: HTMLElement = fixture.nativeElement;
      const notFoundSection = el.querySelector('.not-found-state');
      expect(notFoundSection).toBeTruthy();
      expect(notFoundSection?.textContent).toContain('Página não encontrada');
      expect(notFoundSection?.textContent).toContain('rota-inexistente');
    });

    it('should provide recovery action to navigate to default page from invalid slug state', () => {
      sessionService.setUiConfiguration(mockUiConfigWithDefault);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'slug-invalido' }));
      fixture.detectChanges();

      component.onGoToDefaultPage();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard', 'clientes']);
    });
  });

  describe('Navegação e Sidebar', () => {
    it('should navigate to /dashboard/:pageSlug when selecting a page from sidebar', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      fixture.detectChanges();

      const pageToSelect = component.pages()[1];
      component.onSelectPage(pageToSelect);

      expect(router.navigate).toHaveBeenCalledWith(['/dashboard', 'clientes']);
      expect(component.requestedSlug()).toBe('clientes');
    });

    it('should navigate to /connect when Change API is triggered', () => {
      component.onReconnect();
      expect(router.navigate).toHaveBeenCalledWith(['/connect']);
    });
  });
});
