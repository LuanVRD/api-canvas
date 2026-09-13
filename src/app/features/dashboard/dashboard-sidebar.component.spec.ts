import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardSidebarComponent } from './dashboard-sidebar.component';
import { UiPageConfiguration } from '../../core/models/ui-configuration.model';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

describe('DashboardSidebarComponent', () => {
  let component: DashboardSidebarComponent;
  let fixture: ComponentFixture<DashboardSidebarComponent>;

  const mockPages: UiPageConfiguration[] = [
    {
      id: 'orders-page',
      title: 'Pedidos',
      icon: 'receipt_long',
      slug: 'pedidos',
      order: 1
    },
    {
      id: 'customers-page',
      title: 'Clientes',
      icon: 'people',
      slug: 'clientes',
      order: 2
    },
    {
      id: 'products-page',
      title: 'Produtos',
      icon: 'inventory_2',
      slug: 'produtos',
      order: 3
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardSidebarComponent],
      providers: [provideAnimationsAsync()]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardSidebarComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render header with page count badge and new page button', () => {
    fixture.componentRef.setInput('pages', mockPages);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const badge = el.querySelector('.count-badge');
    expect(badge?.textContent?.trim()).toBe('3');

    const newBtn = el.querySelector('.new-page-btn');
    expect(newBtn).toBeTruthy();
    expect(newBtn?.textContent).toContain('Nova página');
  });

  it('should render list of pages with icons, labels, and count badge when provided', () => {
    fixture.componentRef.setInput('pages', mockPages);
    fixture.componentRef.setInput('pageCounts', { 'orders-page': 128 });
    fixture.componentRef.setInput('selectedPageId', 'orders-page');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const items = el.querySelectorAll('.page-item');
    expect(items.length).toBe(3);

    // First item is active
    expect(items[0].classList.contains('active')).toBe(true);
    expect(items[0].getAttribute('aria-current')).toBe('page');
    expect(items[0].querySelector('.page-name')?.textContent?.trim()).toBe('Pedidos');
    expect(items[0].querySelector('.page-icon')?.textContent?.trim()).toBe('receipt_long');

    // Count badge
    const countBadge = items[0].querySelector('.page-count');
    expect(countBadge?.textContent?.trim()).toBe('128');

    // Second item is not active
    expect(items[1].classList.contains('active')).toBe(false);
    expect(items[1].getAttribute('aria-current')).toBeNull();
  });

  it('should mark page as active when selectedPageSlug matches', () => {
    fixture.componentRef.setInput('pages', mockPages);
    fixture.componentRef.setInput('selectedPageSlug', 'clientes');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const items = el.querySelectorAll('.page-item');
    expect(items[1].classList.contains('active')).toBe(true);
    expect(items[1].getAttribute('aria-current')).toBe('page');
    expect(items[0].classList.contains('active')).toBe(false);
  });

  it('should not activate all sibling pages that share the same resourceId when first page is selected', () => {
    const pagesWithSameResource: UiPageConfiguration[] = [
      { id: 'orders-page', title: 'Orders', slug: 'orders', resourceId: 'orders', order: 1 },
      { id: 'orders-page-2', title: 'Orders (2)', slug: 'orders-2', resourceId: 'orders', order: 2 },
      { id: 'orders-page-3', title: 'Orders (3)', slug: 'orders-3', resourceId: 'orders', order: 3 }
    ];

    fixture.componentRef.setInput('pages', pagesWithSameResource);
    fixture.componentRef.setInput('selectedPageSlug', 'orders');
    fixture.componentRef.setInput('selectedPageId', 'orders-page');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const items = el.querySelectorAll('.page-item');
    expect(items.length).toBe(3);

    expect(items[0].classList.contains('active')).toBe(true);
    expect(items[1].classList.contains('active')).toBe(false);
    expect(items[2].classList.contains('active')).toBe(false);
  });

  it('should emit pageSelect event when a page item is clicked', () => {
    fixture.componentRef.setInput('pages', mockPages);
    fixture.detectChanges();

    let emittedPage: UiPageConfiguration | undefined;
    component.pageSelect.subscribe((page) => (emittedPage = page));

    const items = fixture.nativeElement.querySelectorAll('.page-item');
    items[1].click();

    expect(emittedPage).toEqual(mockPages[1]);
  });

  it('should emit pageSelect event on keyboard Enter and Space keys', () => {
    fixture.componentRef.setInput('pages', mockPages);
    fixture.detectChanges();

    let emittedPage: UiPageConfiguration | undefined;
    component.pageSelect.subscribe((page) => (emittedPage = page));

    const items = fixture.nativeElement.querySelectorAll('.page-item');

    // Enter key
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    items[0].dispatchEvent(enterEvent);
    expect(emittedPage).toEqual(mockPages[0]);

    // Space key
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
    items[2].dispatchEvent(spaceEvent);
    expect(emittedPage).toEqual(mockPages[2]);
  });

  it('should emit newPageClick when clicking + Nova página', () => {
    let clicked = false;
    component.newPageClick.subscribe(() => (clicked = true));

    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.new-page-btn');
    btn.click();

    expect(clicked).toBe(true);
  });

  it('should emit configurePagesClick when clicking Configurar páginas in footer', () => {
    let clicked = false;
    component.configurePagesClick.subscribe(() => (clicked = true));

    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.configure-pages-btn');
    btn.click();

    expect(clicked).toBe(true);
  });

  it('should display empty state inside list when no pages are configured', () => {
    fixture.componentRef.setInput('pages', []);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const emptyState = el.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.textContent).toContain('Nenhuma página configurada');
  });

  it('should filter pages and show search input when pages count > 5', () => {
    const manyPages: UiPageConfiguration[] = Array.from({ length: 6 }, (_, i) => ({
      id: `page-${i + 1}`,
      title: `Página ${i + 1}`,
      slug: `pagina-${i + 1}`
    }));

    fixture.componentRef.setInput('pages', manyPages);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const searchInput: HTMLInputElement | null = el.querySelector('.search-input');
    expect(searchInput).toBeTruthy();

    component.filterQuery.set('Página 2');
    fixture.detectChanges();

    const items = el.querySelectorAll('.page-item');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('.page-name')?.textContent?.trim()).toBe('Página 2');

    // Search with no results
    component.filterQuery.set('nonexistent');
    fixture.detectChanges();

    const emptyFilter = el.querySelector('.empty-state');
    expect(emptyFilter?.textContent).toContain('Nenhuma página encontrada');
  });
});
