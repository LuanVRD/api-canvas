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

  describe('Resolução de slug válido', () => {
    it('should resolve pageSlug from route params and render active page header', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'pedidos' }));
      fixture.detectChanges();

      expect(component.requestedSlug()).toBe('pedidos');
      expect(component.selectedPage()?.title).toBe('Pedidos CRUD');
      expect(component.isInvalidSlug()).toBe(false);

      const el: HTMLElement = fixture.nativeElement;
      const headerTitle = el.querySelector('.page-title');
      expect(headerTitle?.textContent?.trim()).toBe('Pedidos CRUD');
    });

    it('should resolve page by id if slug matches id for backward compatibility', () => {
      sessionService.setUiConfiguration(mockUiConfig);
      paramMapSubject.next(convertToParamMap({ pageSlug: 'customers-page' }));
      fixture.detectChanges();

      expect(component.selectedPage()?.slug).toBe('clientes');
      expect(component.selectedPage()?.title).toBe('Clientes');
      expect(component.isInvalidSlug()).toBe(false);
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
