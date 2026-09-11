import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync()
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have ApiCanvas as title', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.title()).toBe('ApiCanvas');
  });

  it('should render brand name in header', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('ApiCanvas');
  });

  describe('Navigation links', () => {
    it('should render three navigation links: Connect, API Explorer, Dashboard', () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const navItems = fixture.nativeElement.querySelectorAll('.nav-item');

      expect(navItems.length).toBe(3);
      expect(navItems[0].textContent).toContain('Connect');
      expect(navItems[1].textContent).toContain('API Explorer');
      expect(navItems[2].textContent).toContain('Dashboard');
    });

    it('should have correct routerLink targets', () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const navItems = fixture.nativeElement.querySelectorAll('.nav-item');

      expect(navItems[0].getAttribute('href')).toBe('/connect');
      expect(navItems[1].getAttribute('href')).toBe('/workspace');
      expect(navItems[2].getAttribute('href')).toBe('/dashboard');
    });

    it('should highlight Connect as active on /connect route', async () => {
      const router = TestBed.inject(Router);
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      await router.navigate(['/connect']);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const navItems = fixture.nativeElement.querySelectorAll('.nav-item');
      expect(navItems[0].classList.contains('active')).toBe(true);
      expect(navItems[1].classList.contains('active')).toBe(false);
      expect(navItems[2].classList.contains('active')).toBe(false);
    });
  });
});
