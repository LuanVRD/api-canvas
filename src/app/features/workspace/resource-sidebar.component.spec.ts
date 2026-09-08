import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResourceSidebarComponent } from './resource-sidebar.component';
import { ApiResource } from '../../core/models/api-resource.model';

describe('ResourceSidebarComponent', () => {
  let component: ResourceSidebarComponent;
  let fixture: ComponentFixture<ResourceSidebarComponent>;

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
        },
        {
          id: 'post_orders',
          method: 'POST',
          path: '/api/orders',
          summary: 'Create order',
          parameters: [],
          responses: [],
          type: 'create'
        }
      ]
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceSidebarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ResourceSidebarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('resources', mockResources);
    fixture.detectChanges();
  });

  it('should create the sidebar component', () => {
    expect(component).toBeTruthy();
  });

  it('should render all resource items with their labels and operation counts', () => {
    const element: HTMLElement = fixture.nativeElement;
    const items = element.querySelectorAll('.resource-item');
    expect(items.length).toBe(2);

    expect(items[0].querySelector('.resource-name')?.textContent?.trim()).toBe('Products');
    expect(items[0].querySelector('.ops-count')?.textContent?.trim()).toBe('1');

    expect(items[1].querySelector('.resource-name')?.textContent?.trim()).toBe('Orders');
    expect(items[1].querySelector('.ops-count')?.textContent?.trim()).toBe('2');
  });

  it('should highlight the active resource matching selectedResourceId', () => {
    fixture.componentRef.setInput('selectedResourceId', 'orders');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const activeItem = element.querySelector('.resource-item.active');
    expect(activeItem).toBeTruthy();
    expect(activeItem?.querySelector('.resource-name')?.textContent?.trim()).toBe('Orders');
  });

  it('should emit resourceSelect event when a resource is clicked', () => {
    const emitSpy = vi.spyOn(component.resourceSelect, 'emit');
    const element: HTMLElement = fixture.nativeElement;
    const firstButton = element.querySelector('.resource-item') as HTMLButtonElement;
    firstButton.click();

    expect(emitSpy).toHaveBeenCalledWith(mockResources[0]);
  });

  it('should filter resources when filterQuery is set', () => {
    component.filterQuery.set('ord');
    fixture.detectChanges();

    expect(component.filteredResources().length).toBe(1);
    expect(component.filteredResources()[0].id).toBe('orders');

    const element: HTMLElement = fixture.nativeElement;
    const items = element.querySelectorAll('.resource-item');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('.resource-name')?.textContent?.trim()).toBe('Orders');
  });

  it('should show empty state when no resources are provided', () => {
    fixture.componentRef.setInput('resources', []);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const emptyState = element.querySelector('.empty-state');
    expect(emptyState?.textContent?.trim()).toBe('No resources discovered');
  });
});
