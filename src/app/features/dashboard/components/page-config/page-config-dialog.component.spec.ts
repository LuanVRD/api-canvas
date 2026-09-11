import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageConfigDialogComponent } from './page-config-dialog.component';
import { UiConfigurationValidatorService } from '../../../../core/services/ui-configuration-validator.service';
import { ResourceOperationMatcherService } from '../../../../core/services/resource-operation-matcher.service';
import { ApiDefinition } from '../../../../core/models/api-definition.model';
import { UiConfiguration } from '../../../../core/models/ui-configuration.model';

describe('PageConfigDialogComponent', () => {
  let component: PageConfigDialogComponent;
  let fixture: ComponentFixture<PageConfigDialogComponent>;

  const mockApiDefinition: ApiDefinition = {
    title: 'Store API',
    version: '1.0.0',
    baseUrl: 'https://api.store.com',
    resources: [
      {
        id: 'orders',
        name: 'orders',
        label: 'Pedidos',
        operations: [
          {
            id: 'listOrders',
            operationId: 'listOrders',
            method: 'GET',
            path: '/orders',
            summary: 'List orders',
            type: 'list',
            parameters: [],
            responses: [
              {
                statusCode: '200',
                description: 'Success',
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    amount: { type: 'number' },
                    status: { type: 'string', enum: ['pending', 'delivered'] }
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  };

  const initialConfig: UiConfiguration = {
    version: 1,
    pages: {
      'orders-page': {
        id: 'orders-page',
        resourceId: 'orders',
        title: 'Pedidos',
        slug: 'pedidos',
        order: 1,
        isDefault: true
      }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageConfigDialogComponent],
      providers: [
        UiConfigurationValidatorService,
        ResourceOperationMatcherService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PageConfigDialogComponent);
    component = fixture.componentInstance;
  });

  it('1. should create component and initialize in manage mode by default', () => {
    fixture.componentRef.setInput('initialMode', 'manage');
    fixture.componentRef.setInput('publishedConfiguration', initialConfig);
    fixture.componentRef.setInput('apiDefinition', mockApiDefinition);
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.draftService.activeMode()).toBe('manage');
    expect(component.draftService.draftPages().length).toBe(1);
    expect(component.getHeaderTitle()).toBe('Configurar Páginas');
  });

  it('2. should open directly in edit mode for specified page', () => {
    fixture.componentRef.setInput('initialMode', 'edit');
    fixture.componentRef.setInput('initialPageId', 'orders-page');
    fixture.componentRef.setInput('publishedConfiguration', initialConfig);
    fixture.componentRef.setInput('apiDefinition', mockApiDefinition);
    fixture.detectChanges();

    expect(component.draftService.activeMode()).toBe('edit');
    expect(component.draftService.editingPageId()).toBe('orders-page');
    expect(component.getHeaderTitle()).toContain('Editar Página: Pedidos');
  });

  it('3. should open directly in create mode with inferred page defaults', () => {
    fixture.componentRef.setInput('initialMode', 'create');
    fixture.componentRef.setInput('publishedConfiguration', null);
    fixture.componentRef.setInput('apiDefinition', mockApiDefinition);
    fixture.detectChanges();

    expect(component.draftService.activeMode()).toBe('create');
    expect(component.draftService.draftPages().length).toBe(1);
    expect(component.getHeaderTitle()).toBe('Nova Página do Dashboard');
    expect(component.draftService.isDirty()).toBe(true);
  });

  it('4. should prompt unsaved changes dialog when attempting to close with dirty state', () => {
    fixture.componentRef.setInput('initialMode', 'manage');
    fixture.componentRef.setInput('publishedConfiguration', initialConfig);
    fixture.componentRef.setInput('apiDefinition', mockApiDefinition);
    fixture.detectChanges();

    expect(component.isUnsavedDialogOpen()).toBe(false);

    // Make dirty
    component.draftService.updatePage('orders-page', { title: 'Modificado' });
    expect(component.draftService.isDirty()).toBe(true);

    // Attempt close
    component.onAttemptClose();
    expect(component.isUnsavedDialogOpen()).toBe(true);

    // Discarding closes modal
    let closed = false;
    component.close.subscribe(() => { closed = true; });
    component.onDiscardAndClose();
    expect(closed).toBe(true);
    expect(component.isUnsavedDialogOpen()).toBe(false);
  });

  it('5. should close directly without prompt when clean', () => {
    fixture.componentRef.setInput('initialMode', 'manage');
    fixture.componentRef.setInput('publishedConfiguration', initialConfig);
    fixture.componentRef.setInput('apiDefinition', mockApiDefinition);
    fixture.detectChanges();

    let closed = false;
    component.close.subscribe(() => { closed = true; });
    component.onAttemptClose();
    expect(closed).toBe(true);
  });

  it('6. should commit and emit saved configuration when onSaveAndPublish is called', () => {
    fixture.componentRef.setInput('initialMode', 'manage');
    fixture.componentRef.setInput('publishedConfiguration', initialConfig);
    fixture.componentRef.setInput('apiDefinition', mockApiDefinition);
    fixture.detectChanges();

    component.draftService.updatePage('orders-page', { title: 'Pedidos VIP' });

    let savedConfig: UiConfiguration | null = null;
    let closed = false;
    component.save.subscribe((cfg) => { savedConfig = cfg; });
    component.close.subscribe(() => { closed = true; });

    component.onSaveAndPublish();

    expect(savedConfig).not.toBeNull();
    expect((savedConfig as any)?.pages?.['orders-page']?.title).toBe('Pedidos VIP');
    expect(closed).toBe(true);
  });
});
