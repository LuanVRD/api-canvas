import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormFieldDescriptor } from './form-field.model';

@Component({
  selector: 'app-dynamic-field',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  template: `
    <div [formGroup]="form" class="dynamic-field-wrapper">
      @switch (field.type) {
        @case ('select') {
          <mat-form-field appearance="outline" class="w-full form-field-compact">
            <mat-label>{{ field.label }}</mat-label>
            <mat-select [formControlName]="field.key">
              @for (opt of normalizedOptions; track getOptionValue(opt)) {
                <mat-option [value]="getOptionValue(opt)">{{ getOptionLabel(opt) }}</mat-option>
              }
            </mat-select>
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
            <mat-error *ngIf="control?.invalid && (control?.touched || control?.dirty)">
              {{ getErrorMessage() }}
            </mat-error>
          </mat-form-field>
        }

        @case ('date') {
          <mat-form-field appearance="outline" class="w-full form-field-compact">
            <mat-label>{{ field.label }}</mat-label>
            <input matInput type="date" [formControlName]="field.key">
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
            <mat-error *ngIf="control?.invalid && (control?.touched || control?.dirty)">
              {{ getErrorMessage() }}
            </mat-error>
          </mat-form-field>
        }

        @case ('datetime') {
          <mat-form-field appearance="outline" class="w-full form-field-compact">
            <mat-label>{{ field.label }}</mat-label>
            <input matInput type="datetime-local" [formControlName]="field.key">
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
            <mat-error *ngIf="control?.invalid && (control?.touched || control?.dirty)">
              {{ getErrorMessage() }}
            </mat-error>
          </mat-form-field>
        }

        @case ('number') {
          <mat-form-field appearance="outline" class="w-full form-field-compact">
            <mat-label>{{ field.label }}</mat-label>
            <input
              matInput
              type="number"
              [formControlName]="field.key"
              [min]="field.constraints?.minimum ?? null"
              [max]="field.constraints?.maximum ?? null"
            >
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
            <mat-error *ngIf="control?.invalid && (control?.touched || control?.dirty)">
              {{ getErrorMessage() }}
            </mat-error>
          </mat-form-field>
        }

        @case ('boolean') {
          <div class="toggle-field-box">
            <mat-slide-toggle [formControlName]="field.key" class="compact-toggle">
              <span class="toggle-label">{{ field.label }}</span>
            </mat-slide-toggle>
            @if (field.description) {
              <div class="toggle-hint">{{ field.description }}</div>
            }
          </div>
        }

        @case ('json') {
          <mat-form-field appearance="outline" class="w-full form-field-compact">
            <mat-label>{{ field.label }}</mat-label>
            <textarea
              matInput
              [formControlName]="field.key"
              rows="4"
              class="font-mono text-xs"
              placeholder="{ &quot;key&quot;: &quot;value&quot; }"
            ></textarea>
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
            <mat-error *ngIf="control?.invalid && (control?.touched || control?.dirty)">
              {{ getErrorMessage() }}
            </mat-error>
          </mat-form-field>
        }

        @default {
          <mat-form-field appearance="outline" class="w-full form-field-compact">
            <mat-label>{{ field.label }}</mat-label>
            <input matInput [formControlName]="field.key">
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
            <mat-error *ngIf="control?.invalid && (control?.touched || control?.dirty)">
              {{ getErrorMessage() }}
            </mat-error>
          </mat-form-field>
        }
      }
    </div>
  `,
  styles: [`
    .dynamic-field-wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
    .w-full {
      width: 100%;
    }
    .form-field-compact {
      font-size: 13px;
    }
    .toggle-field-box {
      padding: 6px 0 10px 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .toggle-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--canvas-text-primary, #e6edf3);
    }
    .toggle-hint {
      font-size: 11px;
      color: var(--canvas-text-muted, #6e7681);
      margin-left: 2px;
    }
    .text-xs {
      font-size: 12px;
    }
    mat-hint {
      font-size: 11px;
      color: var(--canvas-text-muted, #6e7681);
    }
    mat-error {
      font-size: 11px;
    }
  `]
})
export class DynamicFieldComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) field!: FormFieldDescriptor;

  get control(): AbstractControl | null {
    return this.form?.get(this.field.key) ?? null;
  }

  get normalizedOptions(): unknown[] {
    return this.field.options || [];
  }

  getOptionValue(opt: unknown): unknown {
    if (opt !== null && typeof opt === 'object' && 'value' in (opt as Record<string, unknown>)) {
      return (opt as { value: unknown }).value;
    }
    return opt;
  }

  getOptionLabel(opt: unknown): string {
    if (opt !== null && typeof opt === 'object' && 'label' in (opt as Record<string, unknown>)) {
      return (opt as { label: string }).label;
    }
    return String(opt);
  }

  getErrorMessage(): string {
    const ctrl = this.control;
    if (!ctrl || !ctrl.errors) return '';

    if (ctrl.hasError('required')) {
      return `${this.field.label || this.field.key} is required.`;
    }
    if (ctrl.hasError('minlength')) {
      const requiredLength = ctrl.errors['minlength']?.requiredLength ?? this.field.constraints?.minLength;
      return `Minimum length is ${requiredLength} characters.`;
    }
    if (ctrl.hasError('maxlength')) {
      const requiredLength = ctrl.errors['maxlength']?.requiredLength ?? this.field.constraints?.maxLength;
      return `Maximum length is ${requiredLength} characters.`;
    }
    if (ctrl.hasError('min')) {
      const min = ctrl.errors['min']?.min ?? this.field.constraints?.minimum;
      return `Minimum value is ${min}.`;
    }
    if (ctrl.hasError('max')) {
      const max = ctrl.errors['max']?.max ?? this.field.constraints?.maximum;
      return `Maximum value is ${max}.`;
    }
    if (ctrl.hasError('pattern')) {
      return 'Invalid format or pattern.';
    }
    if (ctrl.hasError('invalidJson')) {
      return 'Invalid JSON syntax.';
    }

    return 'Invalid field value.';
  }
}
