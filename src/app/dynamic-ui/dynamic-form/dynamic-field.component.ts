import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
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
    <div [formGroup]="form" class="dynamic-field-container">
      @switch (field.type) {
        @case ('select') {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ field.label }}</mat-label>
            <mat-select [formControlName]="field.key">
              @for (opt of normalizedOptions; track getOptionValue(opt)) {
                <mat-option [value]="getOptionValue(opt)">{{ getOptionLabel(opt) }}</mat-option>
              }
            </mat-select>
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
          </mat-form-field>
        }
        @case ('date') {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ field.label }}</mat-label>
            <input matInput type="date" [formControlName]="field.key">
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
          </mat-form-field>
        }
        @case ('datetime') {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ field.label }}</mat-label>
            <input matInput type="datetime-local" [formControlName]="field.key">
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
          </mat-form-field>
        }
        @case ('number') {
          <mat-form-field appearance="outline" class="w-full">
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
          </mat-form-field>
        }
        @case ('boolean') {
          <div class="toggle-field">
            <mat-slide-toggle [formControlName]="field.key">
              {{ field.label }}
            </mat-slide-toggle>
            @if (field.description) {
              <div class="toggle-description">{{ field.description }}</div>
            }
          </div>
        }
        @case ('json') {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ field.label }}</mat-label>
            <textarea matInput [formControlName]="field.key" rows="3"></textarea>
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
          </mat-form-field>
        }
        @default {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ field.label }}</mat-label>
            <input matInput [formControlName]="field.key">
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
          </mat-form-field>
        }
      }
    </div>
  `,
  styles: [`
    .dynamic-field-container {
      margin-bottom: 12px;
    }
    .w-full {
      width: 100%;
    }
    .toggle-field {
      padding: 8px 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .toggle-description {
      font-size: 0.75rem;
      color: var(--mat-sys-on-surface-variant, #6b7280);
      margin-left: 8px;
    }
  `]
})
export class DynamicFieldComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) field!: FormFieldDescriptor;

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
}
