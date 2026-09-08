import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { FormFieldDescriptor } from './form-schema.service';
import { DynamicFieldComponent } from './dynamic-field.component';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    DynamicFieldComponent
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dynamic-form">
      <div class="fields-grid">
        @for (field of fields; track field.key) {
          <app-dynamic-field [form]="form" [field]="field" />
        }
      </div>

      <div class="actions">
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          {{ submitLabel || 'Submit' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .dynamic-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .fields-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 8px;
    }
  `]
})
export class DynamicFormComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) fields: FormFieldDescriptor[] = [];
  @Input() submitLabel = 'Submit';

  @Output() formSubmit = new EventEmitter<unknown>();

  onSubmit(): void {
    if (this.form.valid) {
      this.formSubmit.emit(this.form.value);
    }
  }
}
