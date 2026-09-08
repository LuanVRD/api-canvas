import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-operation-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="operation-page">
      <h2>Operation: {{ operationId }}</h2>
    </div>
  `
})
export class OperationPage {
  @Input() operationId?: string;
}
