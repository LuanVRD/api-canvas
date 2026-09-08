import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkspacePage } from './workspace.page';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { ApiDefinition } from '../../core/models/api-definition.model';
import { ApiResource } from '../../core/models/api-resource.model';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

describe('WorkspacePage', () => {
  let component: WorkspacePage;
  let fixture: ComponentFixture<WorkspacePage>;
  let sessionService: ApiSessionService;
  let router: Router;

  const mockResources: ApiResource[] = [
    {
      id: 'products',
      name: 'products',
      label: 'Products',
      description: 'Product operations',
      operations: [
        {
          id: 'get_products',
          method: 'GET',
          path: '/api/products',
          summary: 'List products',
          parameters: [],
          responses: [],
          type: 'list'
        },
        {
          id: 'post_products',
          method: 'POST',
          path: '/api/products',
          summary: 'Create product',
          parameters: [],
          responses: [],
          type: 'create'
        }
      ]
    },
    {
      id: 'orders',
      name: 'orders',
      label: 'Orders',
      description: 'Order operations',
      operations: [
        {
          id: 'get_orders',
          method: 'GET',
          path: '/api/orders',
          summary: 'List orders',
          parameters: [],
          responses: [],
          type: 'list'
        }
      ]
    }
  ];

  const mockApiDefinition: ApiDefinition = {
    title: 'Test Store API',
    version: '1.2.3',
    baseUrl: 'https://api.test.com',
    resources: mockResources
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspacePage],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        ApiSessionService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => null
              }
            }
          }
        }
      ]
    }).compileComponents();

    sessionService = TestBed.inject(ApiSessionService);
    router = TestBed.inject(Router);
    sessionService.setSession(mockApiDefinition);

    fixture = TestBed.createComponent(WorkspacePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render API metadata from ApiSessionService', () => {
    const element: HTMLElement = fixture.nativeElement;
    const titleEl = element.querySelector('.api-title');
    const versionEl = element.querySelector('.api-version');
    const baseUrlEl = element.querySelector('.api-base-url');

    expect(titleEl?.textContent?.trim()).toBe('Test Store API');
    expect(versionEl?.textContent?.trim()).toBe('v1.2.3');
    expect(baseUrlEl?.textContent?.trim()).toBe('https://api.test.com');
  });

  it('should render resources in sidebar and auto-select the first resource', () => {
    const element: HTMLElement = fixture.nativeElement;
    const sidebarItems = element.querySelectorAll('.resource-item');

    expect(sidebarItems.length).toBe(2);
    expect(sidebarItems[0].textContent).toContain('Products');
    expect(sidebarItems[1].textContent).toContain('Orders');

    const resourceHeader = element.querySelector('.resource-header h2');
    expect(resourceHeader?.textContent?.trim()).toBe('Products');
  });

  it('should update selected resource when user selects a different resource', () => {
    component.onSelectResource(mockResources[1]);
    fixture.detectChanges();

    expect(sessionService.selectedResourceId()).toBe('orders');
    expect(sessionService.selectedResource()).toEqual(mockResources[1]);

    const element: HTMLElement = fixture.nativeElement;
    const resourceHeader = element.querySelector('.resource-header h2');
    expect(resourceHeader?.textContent?.trim()).toBe('Orders');
  });

  it('should navigate to /connect when Change API button is clicked', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.onReconnect();
    expect(navigateSpy).toHaveBeenCalledWith(['/connect']);
  });
});
