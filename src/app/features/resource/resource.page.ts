import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-resource-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="resource-page">
      <h2>Resource: {{ resourceId }}</h2>
    </div>
  `
})
export class ResourcePage {
  @Input() resourceId?: string;
}
