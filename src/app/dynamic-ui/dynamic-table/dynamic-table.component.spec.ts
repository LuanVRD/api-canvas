import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicTableComponent } from './dynamic-table.component';
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
});
