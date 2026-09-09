import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectDetailsComponent } from './object-details.component';

describe('ObjectDetailsComponent', () => {
  let component: ObjectDetailsComponent;
  let fixture: ComponentFixture<ObjectDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObjectDetailsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ObjectDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create and render properties of an object', () => {
    component.data = {
      id: 101,
      title: 'Ergonomic Keyboard',
      price: 149.99,
      inStock: true,
      tags: ['office', 'hardware']
    };
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.allProperties().length).toBe(5);

    const keys = component.allProperties().map((p) => p.key);
    expect(keys).toEqual(['id', 'title', 'price', 'inStock', 'tags']);
  });

  it('should filter properties based on filterQuery', () => {
    component.data = {
      id: 101,
      title: 'Ergonomic Keyboard',
      category: 'Electronics',
      sku: 'KB-101'
    };
    fixture.detectChanges();

    component.filterQuery.set('cat');
    fixture.detectChanges();

    expect(component.filteredProperties().length).toBe(1);
    expect(component.filteredProperties()[0].key).toBe('category');
  });

  it('should toggle expansion for expandable properties', () => {
    component.data = {
      user: { name: 'Alice', email: 'alice@example.com' },
      items: [1, 2, 3]
    };
    fixture.detectChanges();

    expect(component.expandedKeys().has('user')).toBe(false);
    component.toggleExpand('user');
    expect(component.expandedKeys().has('user')).toBe(true);

    component.toggleExpand('user');
    expect(component.expandedKeys().has('user')).toBe(false);
  });

  it('should handle non-object data gracefully', () => {
    component.data = null;
    fixture.detectChanges();
    expect(component.allProperties().length).toBe(0);

    component.data = 'invalid string';
    fixture.detectChanges();
    expect(component.allProperties().length).toBe(0);
  });
});
