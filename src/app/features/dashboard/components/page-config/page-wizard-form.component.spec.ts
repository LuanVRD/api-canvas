import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageWizardFormComponent } from './page-wizard-form.component';
import { PageDraftService } from '../../services/page-draft.service';
import { UiConfigurationValidatorService } from '../../../../core/services/ui-configuration-validator.service';
import { ResourceOperationMatcherService } from '../../../../core/services/resource-operation-matcher.service';
import { ApiDefinition } from '../../../../core/models/api-definition.model';
import { UiConfiguration } from '../../../../core/models/ui-configuration.model';

describe('PageWizardFormComponent', () => {
  let component: PageWizardFormComponent;
  let fixture: ComponentFixture<PageWizardFormComponent>;
  let draftService: PageDraftService;

  const mockApiDefinition: ApiDefinition = {
    title: 'Loja API',
    version: '1.0.0',
    baseUrl: 'https://api.exemplo.com',
    resources: [
      {
        id: 'orders',
        name: 'orders',
        label: 'Pedidos',
        description: 'Operações com pedidos de venda',
        operations: [
          {
            id: 'listOrders',
            operationId: 'listOrders',
            method: 'GET',
            path: '/orders',
            summary: 'Listar pedidos',
            type: 'list',
            parameters: [],
            responses: [
              {
                statusCode: '200',
                description: 'Lista de pedidos',
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    status: { type: 'string', enum: ['pending', 'completed'] },
                    total: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            ]
          }
        ]
      },
      {
        id: 'customers',
        name: 'customers',
        label: 'Clientes',
        description: 'Gestão de base de clientes',
        operations: [
          {
            id: 'listCustomers',
            operationId: 'listCustomers',
            method: 'GET',
            path: '/customers',
            summary: 'Listar clientes',
            type: 'list',
            parameters: [],
            responses: [
              {
                statusCode: '200',
                description: 'Lista de clientes',
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' }
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  };

  const initialPublishedConfig: UiConfiguration = {
    version: 1,
    pages: {
      'orders-page': {
        id: 'orders-page',
        resourceId: 'orders',
        title: 'Pedidos',
        slug: 'pedidos',
        icon: 'shopping_cart',
        order: 1,
        isDefault: true,
        hidden: false
      },
      'customers-page': {
        id: 'customers-page',
        resourceId: 'customers',
        title: 'Clientes',
        slug: 'clientes',
        icon: 'people',
        order: 2,
        isDefault: false,
        hidden: false
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageWizardFormComponent],
      providers: [
        PageDraftService,
        UiConfigurationValidatorService,
        ResourceOperationMatcherService
      ]
    }).compileComponents();

    draftService = TestBed.inject(PageDraftService);
    draftService.initDraft(initialPublishedConfig, mockApiDefinition, 'edit', 'orders-page');

    fixture = TestBed.createComponent(PageWizardFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('1. should create and populate form from active editing page', () => {
    expect(component).toBeTruthy();
    expect(component.form.get('title')?.value).toBe('Pedidos');
    expect(component.form.get('slug')?.value).toBe('pedidos');
    expect(component.form.get('icon')?.value).toBe('shopping_cart');
    expect(component.form.get('order')?.value).toBe(1);
    expect(component.form.get('isDefault')?.value).toBe(true);
    expect(component.form.get('hidden')?.value).toBe(false);
  });

  it('2. should suggest defaults when selecting a new resource', () => {
    // Switch to create mode
    draftService.startCreatePage('customers');
    fixture.detectChanges();

    component.form.get('resourceId')?.setValue('customers');
    component.onResourceChanged();
    fixture.detectChanges();

    expect(component.form.get('title')?.value).toBe('Clientes');
    expect(component.form.get('slug')?.value).toBe('clientes');
    expect(component.form.get('icon')?.value).toBe('people');
    expect(component.form.get('description')?.value).toContain('clientes');
  });

  it('3. should validate slug pattern and required errors', () => {
    const slugControl = component.form.get('slug');

    slugControl?.setValue('');
    expect(slugControl?.errors?.['required']).toBe(true);

    slugControl?.setValue('SLUG INVALIDO COM ESPACO!');
    expect(slugControl?.errors?.['pattern']).toBe(true);

    slugControl?.setValue('slug-valido-123');
    expect(slugControl?.errors).toBeNull();
  });

  it('4. should detect slug conflict in real time when editing page with duplicate slug', () => {
    const slugControl = component.form.get('slug');

    // orders-page editing, typing 'clientes' which belongs to customers-page
    slugControl?.setValue('clientes');
    component.onSlugInput();
    fixture.detectChanges();

    expect(slugControl?.errors?.['slugConflict']).toBeDefined();
    expect(slugControl?.errors?.['slugConflict']?.conflictingTitle).toBe('Clientes');

    // Typing own slug should not conflict
    slugControl?.setValue('pedidos');
    component.onSlugInput();
    fixture.detectChanges();
    expect(slugControl?.errors).toBeNull();
  });

  it('5. should update sidebar position and reorder pages through draft service', () => {
    expect(component.availablePositions()).toEqual([1, 2]);

    component.form.get('order')?.setValue(2);
    component.onOrderChanged();
    fixture.detectChanges();

    const pages = draftService.draftPages();
    expect(pages[0].id).toBe('customers-page');
    expect(pages[1].id).toBe('orders-page');
  });

  it('6. should render navigation item preview with title, route, icon, and badges', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const previewTitle = el.querySelector('.preview-page-title')?.textContent;
    expect(previewTitle).toContain('Pedidos');

    const previewRoute = el.querySelector('.preview-route-path')?.textContent;
    expect(previewRoute).toContain('/dashboard/pedidos');

    const defaultBadge = el.querySelector('.badge-default');
    expect(defaultBadge).toBeTruthy();

    // Toggle hidden and verify badge in preview
    component.form.get('hidden')?.setValue(true);
    fixture.detectChanges();

    const hiddenBadge = el.querySelector('.badge-hidden');
    expect(hiddenBadge).toBeTruthy();
    expect(el.querySelector('.nav-preview-row')?.classList.contains('is-hidden-item')).toBe(true);
  });
});
