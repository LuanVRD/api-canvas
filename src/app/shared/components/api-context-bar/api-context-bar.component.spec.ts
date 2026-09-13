import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiContextBarComponent } from './api-context-bar.component';
import { ApiSessionService } from '../../../core/services/api-session.service';
import { ApiDefinition } from '../../../core/models/api-definition.model';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

describe('ApiContextBarComponent', () => {
  let component: ApiContextBarComponent;
  let fixture: ComponentFixture<ApiContextBarComponent>;
  let sessionService: ApiSessionService;

  const mockApiDefinition: ApiDefinition = {
    title: 'Test Store API',
    version: '1.2.3',
    baseUrl: 'https://api.test.com/v1',
    resources: []
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiContextBarComponent],
      providers: [
        provideAnimationsAsync(),
        ApiSessionService
      ]
    }).compileComponents();

    sessionService = TestBed.inject(ApiSessionService);
    sessionService.setSession(mockApiDefinition);

    fixture = TestBed.createComponent(ApiContextBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render API title', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.api-title')?.textContent?.trim()).toBe('Test Store API');
  });

  it('should render API version', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.api-version')?.textContent?.trim()).toBe('v1.2.3');
  });

  it('should render base URL', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.endpoint-value')?.textContent?.trim()).toBe('https://api.test.com/v1');
  });

  it('should emit authClick when Auth button is clicked', () => {
    const spy = vi.fn();
    component.authClick.subscribe(spy);

    const authBtn = fixture.nativeElement.querySelector('.auth-btn') as HTMLButtonElement;
    authBtn.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should emit changeApiClick when Change API button is clicked', () => {
    const spy = vi.fn();
    component.changeApiClick.subscribe(spy);

    const changeBtn = fixture.nativeElement.querySelector('.disconnect-btn') as HTMLButtonElement;
    changeBtn.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
