import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicTableComponent, TableActionConfig } from './dynamic-table.component';
import { TableColumnDescriptor } from './table-schema.service';

describe('DynamicTableComponent', () => {
  let component: DynamicTableComponent;
  let fixture: ComponentFixture<DynamicTableComponent>;

  const mockColumns: TableColumnDescriptor[] = [
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'price', label: 'Price', type: 'number' },
    { key: 'active', label: 'Active', type: 'boolean' }
  ];

  const mockData = [
    { id: 1, name: 'Acoustic Guitar', price: 1200, active: true },
    { id: 2, name: 'Electric Bass', price: 1500, active: false }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicTableComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicTableComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render table headers with column labels and types', () => {
    component.columns = mockColumns;
    component.data = mockData;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const headers = compiled.querySelectorAll('th.table-header');
    expect(headers.length).toBe(4);

    expect(headers[0].textContent).toContain('ID');
    expect(headers[0].textContent).toContain('<number>');
    expect(headers[1].textContent).toContain('Name');
    expect(headers[1].textContent).toContain('<string>');
    expect(headers[3].textContent).toContain('Active');
    expect(headers[3].textContent).toContain('<boolean>');
  });

  it('should render table rows with data elements and meta count bar', () => {
    component.columns = mockColumns;
    component.data = mockData;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('2 records');
    expect(compiled.textContent).toContain('4 columns');
    expect(compiled.textContent).toContain('Acoustic Guitar');
    expect(compiled.textContent).toContain('Electric Bass');

    const rows = compiled.querySelectorAll('tr.table-row');
    expect(rows.length).toBe(2);
  });

  it('should render empty state when data is empty', () => {
    component.columns = mockColumns;
    component.data = [];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
    expect(compiled.textContent).toContain('No records found');
    expect(compiled.textContent).toContain('0 items');
    expect(compiled.querySelector('table')).toBeNull();
  });

  it('should render actions column and emit events when showActions is true', () => {
    component.columns = mockColumns;
    component.data = mockData;
    component.showActions = true;
    fixture.detectChanges();

    const viewSpy = vi.spyOn(component.rowView, 'emit');
    const editSpy = vi.spyOn(component.rowEdit, 'emit');
    const deleteSpy = vi.spyOn(component.rowDelete, 'emit');

    const compiled = fixture.nativeElement as HTMLElement;
    const actionButtons = compiled.querySelectorAll('button.action-icon-btn');
    expect(actionButtons.length).toBe(6); // 3 buttons * 2 rows

    // Click first view button
    (actionButtons[0] as HTMLButtonElement).click();
    expect(viewSpy).toHaveBeenCalledWith(mockData[0]);

    // Click first edit button
    (actionButtons[1] as HTMLButtonElement).click();
    expect(editSpy).toHaveBeenCalledWith(mockData[0]);

    // Click first delete button
    (actionButtons[2] as HTMLButtonElement).click();
    expect(deleteSpy).toHaveBeenCalledWith(mockData[0]);
  });

  describe('Layout Modes (compact vs full-height)', () => {
    it('should default to compact layout mode and apply compact class', () => {
      component.columns = mockColumns;
      component.data = mockData;
      fixture.detectChanges();

      expect(component.effectiveLayoutMode).toBe('compact');
      const container = fixture.nativeElement.querySelector('.table-container');
      expect(container.classList.contains('compact')).toBe(true);
      expect(container.classList.contains('full-height')).toBe(false);
    });

    it('should apply full-height class when layoutMode is set to full-height', () => {
      component.columns = mockColumns;
      component.data = mockData;
      component.layoutMode = 'full-height';
      fixture.detectChanges();

      expect(component.effectiveLayoutMode).toBe('full-height');
      const container = fixture.nativeElement.querySelector('.table-container');
      expect(container.classList.contains('full-height')).toBe(true);
      expect(container.classList.contains('compact')).toBe(false);
    });

    it('should support layout input setter as an alias for layoutMode', () => {
      component.columns = mockColumns;
      component.data = mockData;
      component.layout = 'full-height';
      fixture.detectChanges();

      expect(component.effectiveLayoutMode).toBe('full-height');
      const container = fixture.nativeElement.querySelector('.table-container');
      expect(container.classList.contains('full-height')).toBe(true);
    });
  });

  describe('Configuração Dinâmica e Ordem de Ações', () => {
    it('should reorder default actions when actionOrder is specified', () => {
      component.columns = mockColumns;
      component.data = [mockData[0]];
      component.showActions = true;
      component.actionOrder = ['delete', 'edit', 'view'];
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const actionButtons = compiled.querySelectorAll('button.action-icon-btn');
      expect(actionButtons.length).toBe(3);

      expect(actionButtons[0].classList.contains('delete-btn')).toBe(true);
      expect(actionButtons[1].classList.contains('edit-btn')).toBe(true);
      expect(actionButtons[2].classList.contains('view-btn')).toBe(true);
    });

    it('should support custom action array with custom icons, classes and generic rowAction output', () => {
      const customActions: TableActionConfig[] = [
        { id: 'download', label: 'Baixar', icon: 'download', tooltip: 'Baixar PDF' },
        { id: 'duplicate', label: 'Duplicar', icon: 'content_copy', tooltip: 'Duplicar item' }
      ];

      component.columns = mockColumns;
      component.data = [mockData[0]];
      component.actions = customActions;
      fixture.detectChanges();

      const genericActionSpy = vi.spyOn(component.rowAction, 'emit');

      const compiled = fixture.nativeElement as HTMLElement;
      const actionButtons = compiled.querySelectorAll('button.action-icon-btn');
      expect(actionButtons.length).toBe(2);
      expect(actionButtons[0].getAttribute('title')).toBe('Baixar PDF');
      expect(actionButtons[1].getAttribute('title')).toBe('Duplicar item');

      (actionButtons[0] as HTMLButtonElement).click();
      expect(genericActionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'download',
          row: mockData[0]
        })
      );
    });

    it('should respect dynamic action visibility predicate per row', () => {
      const actionsWithPredicate: TableActionConfig[] = [
        {
          id: 'view',
          icon: 'visibility',
          tooltip: 'Ver',
          visible: (item: any) => item.active === true
        }
      ];

      component.columns = mockColumns;
      component.data = mockData; // [ { active: true }, { active: false } ]
      component.actions = actionsWithPredicate;
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tr.table-row');
      expect(rows.length).toBe(2);

      const firstRowButtons = rows[0].querySelectorAll('button.action-icon-btn');
      const secondRowButtons = rows[1].querySelectorAll('button.action-icon-btn');

      expect(firstRowButtons.length).toBe(1);
      expect(secondRowButtons.length).toBe(0);
    });

    it('should respect disabled state on action buttons', () => {
      const actionsWithDisabled: TableActionConfig[] = [
        {
          id: 'edit',
          icon: 'edit',
          disabled: (item: any) => !item.active
        }
      ];

      component.columns = mockColumns;
      component.data = mockData; // [ { active: true }, { active: false } ]
      component.actions = actionsWithDisabled;
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('tr.table-row');
      const btn1 = rows[0].querySelector('button.action-icon-btn') as HTMLButtonElement;
      const btn2 = rows[1].querySelector('button.action-icon-btn') as HTMLButtonElement;

      expect(btn1.disabled).toBe(false);
      expect(btn2.disabled).toBe(true);
    });

    it('should apply sticky actions styling when stickyActions is true', () => {
      component.columns = mockColumns;
      component.data = mockData;
      component.showActions = true;
      component.stickyActions = true;
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const actionHeader = el.querySelector('th.actions-header');
      const actionCell = el.querySelector('td.actions-cell');

      expect(actionHeader?.classList.contains('sticky-action-header')).toBe(true);
      expect(actionCell?.classList.contains('sticky-action-cell')).toBe(true);
    });
  });

  describe('Loading Overlay, Total Count & Empty State Customization', () => {
    it('should render loading overlay when loading is true and data exists', () => {
      component.columns = mockColumns;
      component.data = mockData;
      component.loading = true;
      component.loadingMessage = 'Atualizando pedidos...';
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const overlay = el.querySelector('.table-loading-overlay');
      expect(overlay).toBeTruthy();
      expect(overlay?.textContent).toContain('Atualizando pedidos...');
      expect(el.querySelector('.meta-loading')?.textContent).toContain('Atualizando pedidos...');
    });

    it('should display total count in meta bar when totalCount is provided and differs from data length', () => {
      component.columns = mockColumns;
      component.data = mockData; // length = 2
      component.totalCount = 150;
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.meta-badge')?.textContent).toContain('2 records (de 150)');
    });

    it('should customize empty state with custom title, description and icon', () => {
      component.columns = mockColumns;
      component.data = [];
      component.emptyTitle = 'Nenhum resultado';
      component.emptyDescription = 'Tente alterar os filtros aplicados.';
      component.emptyIcon = 'filter_alt_off';
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.empty-title')?.textContent).toContain('Nenhum resultado');
      expect(el.querySelector('.empty-desc')?.textContent).toContain('Tente alterar os filtros aplicados.');
      expect(el.querySelector('.empty-icon')?.textContent).toContain('filter_alt_off');
    });
  });

  describe('Column Sorting', () => {
    it('should emit sortChange when clicking on a sortable column header', () => {
      component.columns = [
        { key: 'name', label: 'Name', type: 'string', sortable: true },
        { key: 'id', label: 'ID', type: 'number', sortable: false }
      ];
      component.data = mockData;
      fixture.detectChanges();

      const sortSpy = vi.spyOn(component.sortChange, 'emit');
      const el = fixture.nativeElement as HTMLElement;
      const headers = el.querySelectorAll('th.table-header');

      // Click on sortable header 'name'
      (headers[0] as HTMLElement).click();
      expect(sortSpy).toHaveBeenCalledWith({ field: 'name', order: 'asc' });

      // Simulate active sort asc and click again
      component.sortField = 'name';
      component.sortOrder = 'asc';
      fixture.detectChanges();

      (headers[0] as HTMLElement).click();
      expect(sortSpy).toHaveBeenCalledWith({ field: 'name', order: 'desc' });

      // Click on non-sortable header 'id'
      sortSpy.mockClear();
      (headers[1] as HTMLElement).click();
      expect(sortSpy).not.toHaveBeenCalled();
    });

    it('should display sort indicators according to sortField and sortOrder', () => {
      component.columns = mockColumns;
      component.data = mockData;
      component.sortField = 'price';
      component.sortOrder = 'desc';
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const activeIcon = el.querySelector('.sort-icon.active');
      expect(activeIcon).toBeTruthy();
      expect(activeIcon?.textContent?.trim()).toBe('arrow_downward');
    });
  });
});

