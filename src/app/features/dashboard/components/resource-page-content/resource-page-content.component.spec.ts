import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResourcePageContentComponent } from './resource-page-content.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { UiPageConfiguration } from '../../../../core/models/ui-configuration.model';
import { TableColumnDescriptor } from '../../../../dynamic-ui/dynamic-table/table-schema.service';

describe('ResourcePageContentComponent', () => {
  let component: ResourcePageContentComponent;
  let fixture: ComponentFixture<ResourcePageContentComponent>;

  const mockPage: UiPageConfiguration = {
    id: 'orders-page',
    resourceId: 'orders',
    title: 'Pedidos',
    icon: 'receipt_long',
    description: 'Gerencie e acompanhe os pedidos da operação',
    actions: {
      primaryCreateLabel: 'Adicionar pedido',
      rowActions: {
        viewDetails: true,
        edit: true,
        delete: true
      }
    },
    metrics: [
      {
        id: 'total',
        label: 'Total de pedidos',
        icon: 'receipt',
        type: 'count_all',
        colorScheme: 'default'
      },
      {
        id: 'pending',
        label: 'Pendentes',
        icon: 'schedule',
        type: 'count_matching',
        field: 'status',
        matchingValue: 'Pendente',
        colorScheme: 'warning'
      }
    ]
  };

  const mockColumns: TableColumnDescriptor[] = [
    { key: 'id', label: 'Pedido', type: 'string' },
    { key: 'client', label: 'Cliente', type: 'string' },
    { key: 'status', label: 'Status', type: 'string' }
  ];

  const mockItems = [
    { id: '#1048', client: 'Luan Silva', status: 'Pendente' },
    { id: '#1047', client: 'Ana Costa', status: 'Concluído' }
  ];

  const mockResolvedPage = {
    resourceId: 'orders',
    resource: null,
    pageConfig: mockPage,
    list: { id: 'list_orders', operationId: 'listOrders', method: 'GET', path: '/api/v1/orders', type: 'list', parameters: [], responses: [] } as any,
    create: { id: 'create_order', operationId: 'createOrder', method: 'POST', path: '/api/v1/orders', type: 'create', parameters: [], responses: [] } as any,
    details: null,
    update: null,
    delete: null,
    updateOperations: [],
    customActions: [],
    warnings: [],
    explicitOverrides: {}
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourcePageContentComponent],
      providers: [provideAnimationsAsync()]
    }).compileComponents();

    fixture = TestBed.createComponent(ResourcePageContentComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.componentRef.setInput('page', mockPage);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Header e Ações', () => {
    it('should render title, description, resource badge and action buttons when canCreate is true', () => {
      fixture.componentRef.setInput('page', mockPage);
      fixture.componentRef.setInput('resolvedPage', mockResolvedPage);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.page-title')?.textContent?.trim()).toBe('Pedidos');
      expect(el.querySelector('.page-description')?.textContent?.trim()).toBe('Gerencie e acompanhe os pedidos da operação');
      expect(el.querySelector('.resource-badge')?.textContent?.trim()).toBe('orders');

      const buttons = el.querySelectorAll('button');
      const buttonTexts = Array.from(buttons).map((b) => b.querySelector('span')?.textContent?.trim() || b.textContent?.trim());
      expect(buttonTexts).toContain('Editar página');
      expect(buttonTexts).toContain('Recarregar');
      expect(buttonTexts).toContain('Adicionar pedido');
    });

    it('should hide create button when resolvedPage has no create operation', () => {
      fixture.componentRef.setInput('page', mockPage);
      fixture.componentRef.setInput('resolvedPage', { ...mockResolvedPage, create: null });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const buttons = el.querySelectorAll('button');
      const buttonTexts = Array.from(buttons).map((b) => b.querySelector('span')?.textContent?.trim() || b.textContent?.trim());
      expect(buttonTexts).not.toContain('Adicionar pedido');
    });

    it('should emit editPage, refresh and createItem events when buttons are clicked', () => {
      fixture.componentRef.setInput('page', mockPage);
      fixture.componentRef.setInput('resolvedPage', mockResolvedPage);
      fixture.detectChanges();

      const editSpy = vi.fn();
      const refreshSpy = vi.fn();
      const createSpy = vi.fn();

      component.editPage.subscribe(editSpy);
      component.refresh.subscribe(refreshSpy);
      component.createItem.subscribe(createSpy);

      const el: HTMLElement = fixture.nativeElement;
      const editBtn = el.querySelector('button[aria-label="Editar página"]') as HTMLButtonElement;
      const refreshBtn = el.querySelector('button[aria-label="Recarregar dados"]') as HTMLButtonElement;
      const createBtn = el.querySelector('.btn-action-primary') as HTMLButtonElement;

      editBtn.click();
      refreshBtn.click();
      createBtn.click();

      expect(editSpy).toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalled();
    });
  });

  describe('Métricas e Toolbar', () => {
    it('should calculate and display metrics based on data and totalCount', () => {
      fixture.componentRef.setInput('page', mockPage);
      fixture.componentRef.setInput('items', mockItems);
      fixture.componentRef.setInput('totalCount', 128);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const metricCards = el.querySelectorAll('.metric-card');
      expect(metricCards.length).toBe(2);

      const totalMetric = metricCards[0];
      expect(totalMetric.querySelector('.metric-label')?.textContent?.trim()).toBe('Total de pedidos');
      expect(totalMetric.querySelector('.metric-value')?.textContent?.trim()).toBe('128');

      const pendingMetric = metricCards[1];
      expect(pendingMetric.querySelector('.metric-label')?.textContent?.trim()).toBe('Pendentes');
      expect(pendingMetric.querySelector('.metric-value')?.textContent?.trim()).toBe('1');
    });

    it('should hide metrics grid completely when page has no metrics configured', () => {
      const pageWithoutMetrics: UiPageConfiguration = {
        id: 'no-metrics-page',
        resourceId: 'items',
        title: 'Sem Métricas'
      };

      fixture.componentRef.setInput('page', pageWithoutMetrics);
      fixture.componentRef.setInput('items', mockItems);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.metrics-grid')).toBeNull();
      expect(el.querySelectorAll('.metric-card').length).toBe(0);
    });

    it('should hide metrics grid completely when metrics array is empty', () => {
      const pageEmptyMetrics: UiPageConfiguration = {
        id: 'empty-metrics-page',
        resourceId: 'items',
        title: 'Métricas Vazias',
        metrics: []
      };

      fixture.componentRef.setInput('page', pageEmptyMetrics);
      fixture.componentRef.setInput('items', mockItems);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.metrics-grid')).toBeNull();
    });

    it('should render color classes and icons on metric cards', () => {
      fixture.componentRef.setInput('page', mockPage);
      fixture.componentRef.setInput('items', mockItems);
      fixture.componentRef.setInput('totalCount', 50);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const metricCards = el.querySelectorAll('.metric-card');
      expect(metricCards.length).toBe(2);

      const pendingCard = metricCards[1];
      const icon = pendingCard.querySelector('.metric-icon');
      const val = pendingCard.querySelector('.metric-value');

      expect(icon?.textContent?.trim()).toBe('schedule');
      expect(val?.classList.contains('color-warning')).toBe(true);
    });

    it('should emit searchChange on typing into the search input', () => {
      fixture.componentRef.setInput('page', mockPage);
      fixture.detectChanges();

      const searchSpy = vi.fn();
      component.searchChange.subscribe(searchSpy);

      component.onSearchInput('termo de busca');
      expect(searchSpy).toHaveBeenCalledWith('termo de busca');
    });
  });

  describe('Estados de Carregamento, Erro, Vazio e Sucesso', () => {
    it('should display LoadingIndicatorComponent when status is loading', () => {
      fixture.componentRef.setInput('page', mockPage);
      fixture.componentRef.setInput('status', 'loading');
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('app-loading-indicator')).toBeTruthy();
      expect(el.querySelector('app-dynamic-table')).toBeFalsy();
    });

    it('should display error card with retry and open in API Explorer actions when status is error', () => {
      fixture.componentRef.setInput('page', mockPage);
      fixture.componentRef.setInput('status', 'error');
      fixture.componentRef.setInput('error', {
        message: 'Falha 500 ao conectar no gateway',
        hint: 'Verifique se o backend está em execução.'
      });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const errorCard = el.querySelector('.error-state-card');
      expect(errorCard).toBeTruthy();
      expect(errorCard?.textContent).toContain('Falha 500 ao conectar no gateway');
      expect(errorCard?.textContent).toContain('Verifique se o backend está em execução.');

      const retrySpy = vi.fn();
      const explorerSpy = vi.fn();
      component.retry.subscribe(retrySpy);
      component.openExplorer.subscribe(explorerSpy);

      const retryBtn = el.querySelector('button[aria-label="Tentar novamente"]') as HTMLButtonElement;
      const explorerBtn = el.querySelector('button[aria-label="Abrir no API Explorer"]') as HTMLButtonElement;

      retryBtn.click();
      explorerBtn.click();

      expect(retrySpy).toHaveBeenCalled();
      expect(explorerSpy).toHaveBeenCalled();
    });

    it('should display empty state when status is idle (autoLoad: false)', () => {
      fixture.componentRef.setInput('page', mockPage);
      fixture.componentRef.setInput('status', 'idle');
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const emptyState = el.querySelector('app-empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState?.textContent).toContain('Carga de dados sob demanda');

      const refreshSpy = vi.fn();
      component.refresh.subscribe(refreshSpy);

      const loadBtn = el.querySelector('button[aria-label="Carregar dados agora"]') as HTMLButtonElement;
      loadBtn.click();
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should display EmptyStateComponent when status is empty or items are 0', () => {
      fixture.componentRef.setInput('page', mockPage);
      fixture.componentRef.setInput('status', 'empty');
      fixture.componentRef.setInput('items', []);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const emptyState = el.querySelector('app-empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState?.textContent).toContain('Nenhum registro encontrado');
    });

    it('should render DynamicTableComponent in full-height mode when status is success and items are present', () => {
      fixture.componentRef.setInput('page', mockPage);
      fixture.componentRef.setInput('status', 'success');
      fixture.componentRef.setInput('items', mockItems);
      fixture.componentRef.setInput('columns', mockColumns);
      fixture.componentRef.setInput('totalCount', 2);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const table = el.querySelector('app-dynamic-table');
      expect(table).toBeTruthy();
      expect(el.querySelector('.table-meta-footer')?.textContent).toContain('Total carregado: 2 de 2');
    });
  });
});
