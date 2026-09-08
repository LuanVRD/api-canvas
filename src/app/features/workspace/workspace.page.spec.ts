import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkspacePage } from './workspace.page';
import { ApiSessionService } from '../../core/services/api-session.service';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { ApiDefinition } from '../../core/models/api-definition.model';
import { ApiResource } from '../../core/models/api-resource.model';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BehaviorSubject } from 'rxjs';

describe('WorkspacePage', () => {
  let component: WorkspacePage;
  let fixture: ComponentFixture<WorkspacePage>;
  let sessionService: ApiSessionService;
  let router: Router;
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const mockResources: ApiResource[] = [
    {
      id: 'products',
      name: 'products',
      label: 'Products',
      description: 'Operations related to product catalog',
      operations: [
        {
          id: 'get_products',
          method: 'GET',
          path: '/api/products',
          summary: 'List all products in catalog',
          parameters: [
            {
              name: 'limit',
              location: 'query',
              required: false,
              schema: { type: 'integer' }
            }
          ],
          responses: [],
          type: 'list'
        },
        {
          id: 'post_products',
          method: 'POST',
          path: '/api/products',
          summary: 'Create a new product',
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
      description: 'Customer order management',
      operations: [
        {
          id: 'get_orders',
          method: 'GET',
          path: '/api/orders',
          summary: 'List user orders',
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
    baseUrl: 'https://api.test.com/v1',
    resources: mockResources
  };

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [WorkspacePage],
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
            paramMap: paramMapSubject.asObservable(),
            snapshot: {
              paramMap: convertToParamMap({})
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

  it('should render API metadata in topbar', () => {
    const element: HTMLElement = fixture.nativeElement;
    const titleEl = element.querySelector('.api-title');
    const versionEl = element.querySelector('.api-version');
    const baseUrlEl = element.querySelector('.endpoint-value');

    expect(titleEl?.textContent?.trim()).toBe('Test Store API');
    expect(versionEl?.textContent?.trim()).toBe('v1.2.3');
    expect(baseUrlEl?.textContent?.trim()).toBe('https://api.test.com/v1');
  });

  it('should render resources in sidebar and display selected resource details', () => {
    const element: HTMLElement = fixture.nativeElement;
    const sidebarItems = element.querySelectorAll('.resource-item');

    expect(sidebarItems.length).toBe(2);
    expect(sidebarItems[0].textContent).toContain('Products');
    expect(sidebarItems[1].textContent).toContain('Orders');

    const resourceTitle = element.querySelector('.resource-title');
    const resourceDesc = element.querySelector('.resource-description');
    expect(resourceTitle?.textContent?.trim()).toBe('Products');
    expect(resourceDesc?.textContent?.trim()).toBe('Operations related to product catalog');
  });

  it('should render operations for the selected resource with HTTP badges and paths', () => {
    const element: HTMLElement = fixture.nativeElement;
    const operationRows = element.querySelectorAll('.operation-row');

    expect(operationRows.length).toBe(2);

    const firstOp = operationRows[0];
    expect(firstOp.querySelector('.http-badge')?.textContent?.trim()).toBe('GET');
    expect(firstOp.querySelector('.op-path')?.textContent?.trim()).toBe('/api/products');
    expect(firstOp.querySelector('.op-summary')?.textContent?.trim()).toBe('List all products in catalog');
    expect(firstOp.querySelector('.param-count')?.textContent?.trim()).toBe('1 param');

    const secondOp = operationRows[1];
    expect(secondOp.querySelector('.http-badge')?.textContent?.trim()).toBe('POST');
    expect(secondOp.querySelector('.op-path')?.textContent?.trim()).toBe('/api/products');
    expect(secondOp.querySelector('.op-summary')?.textContent?.trim()).toBe('Create a new product');
  });

  it('should navigate to /workspace/:resourceId when a new resource is selected', () => {
    component.onSelectResource(mockResources[1]);
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/workspace', 'orders']);
    expect(sessionService.selectedResourceId()).toBe('orders');
  });

  it('should select resource when route paramMap changes', () => {
    paramMapSubject.next(convertToParamMap({ resourceId: 'orders' }));
    fixture.detectChanges();

    expect(sessionService.selectedResourceId()).toBe('orders');
    const resourceTitle = fixture.nativeElement.querySelector('.resource-title');
    expect(resourceTitle?.textContent?.trim()).toBe('Orders');
  });

  it('should navigate to /operation/:operationId when an operation row is clicked', () => {
    const element: HTMLElement = fixture.nativeElement;
    const operationRows = element.querySelectorAll<HTMLElement>('.operation-row');
    expect(operationRows.length).toBeGreaterThan(0);

    operationRows[0].click();

    expect(router.navigate).toHaveBeenCalledWith(['/operation', 'get_products']);
  });

  it('should navigate to /connect when Change API button is clicked', () => {
    component.onReconnect();
    expect(router.navigate).toHaveBeenCalledWith(['/connect']);
  });
});
