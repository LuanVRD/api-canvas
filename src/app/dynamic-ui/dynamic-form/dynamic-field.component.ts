import { Component, Input, forwardRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  AbstractControl,
  FormControl
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormFieldDescriptor } from './form-field.model';
import { FormSchemaService } from './form-schema.service';

@Component({
  selector: 'app-dynamic-field',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatButtonModule,
    forwardRef(() => DynamicFieldComponent)
  ],
  template: `
    <div [formGroup]="form" class="dynamic-field-wrapper">
      @switch (field.type) {
        @case ('object') {
          <div class="nested-object-card">
            <div class="nested-header">
              <div class="nested-title-wrap">
                <span class="nested-title">{{ field.label }}</span>
                @if (field.required) {
                  <span class="req-star">*</span>
                }
                <span class="type-tag font-mono">object</span>
              </div>
              @if (field.description) {
                <span class="nested-desc">{{ field.description }}</span>
              }
            </div>

            @if (nestedGroupControl; as nestedGroup) {
              <div class="nested-fields-container">
                @for (child of field.children; track child.key) {
                  <app-dynamic-field [form]="nestedGroup" [field]="child" />
                }
              </div>
            }
          </div>
        }

        @case ('array') {
          <div class="nested-array-card">
            <div class="nested-header array-header">
              <div class="nested-title-wrap">
                <span class="nested-title">{{ field.label }}</span>
                @if (field.required) {
                  <span class="req-star">*</span>
                }
                <span class="type-tag font-mono">array</span>
                <span class="count-badge font-mono">[{{ arrayControl?.length || 0 }}]</span>
              </div>
              @if (field.description) {
                <span class="nested-desc">{{ field.description }}</span>
              }
              <div class="array-header-actions">
                <button
                  type="button"
                  class="btn-add-item font-mono"
                  (click)="onAddArrayItem()"
                  [disabled]="form.disabled || field.readOnly"
                >
                  <mat-icon class="icon-btn-sm">add</mat-icon>
                  <span>Add item</span>
                </button>
              </div>
            </div>

            @if (arrayControl; as arrCtrl) {
              @if (arrCtrl.length === 0) {
                <div class="array-empty-state font-mono">
                  <span>No items in array. Click "Add item" to insert.</span>
                </div>
              } @else {
                <div class="array-items-list">
                  @for (itemCtrl of arrCtrl.controls; let i = $index; track i) {
                    <div class="array-item-row">
                      <div class="item-index-badge font-mono">#{{ i + 1 }}</div>

                      <div class="item-content-wrapper">
                        @if (field.itemDescriptor?.type === 'object' && field.itemDescriptor?.children) {
                          <div class="item-object-group">
                            @for (child of field.itemDescriptor?.children; track child.key) {
                              <app-dynamic-field [form]="$any(itemCtrl)" [field]="child" />
                            }
                          </div>
                        } @else {
                          <div class="primitive-array-item">
                            @switch (field.itemDescriptor?.type) {
                              @case ('select') {
                                <mat-form-field appearance="outline" class="w-full form-field-compact">
                                  <mat-label>{{ field.itemDescriptor?.label || ('Item #' + (i + 1)) }}</mat-label>
                                  <mat-select [formControl]="$any(itemCtrl)">
                                    @for (opt of normalizedItemOptions; track getOptionValue(opt)) {
                                      <mat-option [value]="getOptionValue(opt)">{{ getOptionLabel(opt) }}</mat-option>
                                    }
                                  </mat-select>
                                </mat-form-field>
                              }
                              @case ('number') {
                                <mat-form-field appearance="outline" class="w-full form-field-compact">
                                  <mat-label>{{ field.itemDescriptor?.label || ('Item #' + (i + 1)) }}</mat-label>
                                  <input matInput type="number" [formControl]="$any(itemCtrl)">
                                </mat-form-field>
                              }
                              @case ('boolean') {
                                <div class="toggle-field-box">
                                  <mat-slide-toggle [formControl]="$any(itemCtrl)" class="compact-toggle">
                                    <span class="toggle-label">{{ field.itemDescriptor?.label || ('Item #' + (i + 1)) }}</span>
                                  </mat-slide-toggle>
                                </div>
                              }
                              @case ('date') {
                                <mat-form-field appearance="outline" class="w-full form-field-compact">
                                  <mat-label>{{ field.itemDescriptor?.label || ('Item #' + (i + 1)) }}</mat-label>
                                  <input matInput type="date" [formControl]="$any(itemCtrl)">
                                </mat-form-field>
                              }
                              @case ('datetime') {
                                <mat-form-field appearance="outline" class="w-full form-field-compact">
                                  <mat-label>{{ field.itemDescriptor?.label || ('Item #' + (i + 1)) }}</mat-label>
                                  <input matInput type="datetime-local" [formControl]="$any(itemCtrl)">
                                </mat-form-field>
                              }
                              @default {
                                <mat-form-field appearance="outline" class="w-full form-field-compact">
                                  <mat-label>{{ field.itemDescriptor?.label || ('Item #' + (i + 1)) }}</mat-label>
                                  <input matInput [formControl]="$any(itemCtrl)">
                                </mat-form-field>
                              }
                            }
                          </div>
                        }
                      </div>

                      <button
                        type="button"
                        class="btn-remove-item"
                        (click)="onRemoveArrayItem(i)"
                        [disabled]="form.disabled || field.readOnly"
                        title="Remove item"
                      >
                        <mat-icon class="icon-btn-sm">close</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              }
            }
          </div>
        }

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
          <div class="json-field-wrapper">
            @if (field.isFallback) {
              <div class="fallback-note font-mono">
                <mat-icon class="warn-icon-sm">info</mat-icon>
                <span>Fallback: {{ field.fallbackReason || 'Raw JSON representation' }}</span>
              </div>
            }
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
          </div>
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
    .req-star {
      color: #f85149;
      font-weight: bold;
    }

    // Nested Object & Array Styling (Developer Tool aesthetic)
    .nested-object-card, .nested-array-card {
      background: var(--canvas-surface, #161b22);
      border: 1px solid var(--canvas-border-subtle, #21262d);
      border-left: 3px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-sm, 4px);
      padding: 10px 12px;
      margin: 4px 0 8px 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .nested-header {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--canvas-border-subtle, #21262d);
    }

    .array-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    .nested-title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .nested-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--canvas-text-primary, #e6edf3);
      letter-spacing: 0.2px;
    }

    .type-tag {
      font-size: 10px;
      color: var(--canvas-text-muted, #6e7681);
      background: rgba(255, 255, 255, 0.04);
      padding: 1px 4px;
      border-radius: 2px;
    }

    .count-badge {
      font-size: 10px;
      color: var(--canvas-text-link, #58a6ff);
      background: rgba(88, 166, 255, 0.1);
      padding: 1px 5px;
      border-radius: 2px;
      font-weight: 600;
    }

    .nested-desc {
      font-size: 11px;
      color: var(--canvas-text-muted, #6e7681);
    }

    .nested-fields-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 4px;
    }

    .btn-add-item {
      height: 24px;
      padding: 0 8px;
      font-size: 11px;
      font-weight: 600;
      color: var(--canvas-text-link, #58a6ff);
      background: transparent;
      border: 1px solid rgba(88, 166, 255, 0.3);
      border-radius: var(--radius-sm, 4px);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.12s ease;
    }

    .btn-add-item:hover:not(:disabled) {
      background: rgba(88, 166, 255, 0.1);
      border-color: var(--canvas-text-link, #58a6ff);
    }

    .btn-add-item:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .array-empty-state {
      font-size: 11px;
      color: var(--canvas-text-muted, #6e7681);
      padding: 8px 10px;
      background: var(--canvas-bg, #0d1117);
      border: 1px dashed var(--canvas-border-subtle, #21262d);
      border-radius: var(--radius-sm, 4px);
      text-align: center;
    }

    .array-items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .array-item-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px;
      background: var(--canvas-bg, #0d1117);
      border: 1px solid var(--canvas-border-subtle, #21262d);
      border-radius: var(--radius-sm, 4px);
    }

    .item-index-badge {
      font-size: 10px;
      color: var(--canvas-text-muted, #6e7681);
      background: var(--canvas-surface-elevated, #21262d);
      padding: 2px 5px;
      border-radius: 2px;
      margin-top: 4px;
      flex-shrink: 0;
    }

    .item-content-wrapper {
      flex: 1;
      min-width: 0;
    }

    .item-object-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .primitive-array-item {
      width: 100%;
    }

    .btn-remove-item {
      height: 24px;
      width: 24px;
      padding: 0;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm, 4px);
      color: var(--canvas-text-muted, #6e7681);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 4px;
      flex-shrink: 0;
      transition: all 0.12s ease;
    }

    .btn-remove-item:hover:not(:disabled) {
      color: #f85149;
      background: rgba(248, 81, 73, 0.1);
      border-color: rgba(248, 81, 73, 0.3);
    }

    .btn-remove-item:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .icon-btn-sm {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .fallback-note {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #d29922;
      background: rgba(210, 153, 34, 0.1);
      border: 1px solid rgba(210, 153, 34, 0.25);
      border-radius: var(--radius-sm, 4px);
      padding: 4px 8px;
      margin-bottom: 6px;
    }

    .warn-icon-sm {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
  `]
})
export class DynamicFieldComponent {
  private readonly formSchemaService = inject(FormSchemaService);

  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) field!: FormFieldDescriptor;

  get control(): AbstractControl | null {
    return this.form?.get(this.field.key) ?? null;
  }

  get nestedGroupControl(): FormGroup | null {
    const ctrl = this.control;
    return ctrl instanceof FormGroup ? ctrl : null;
  }

  get arrayControl(): FormArray | null {
    const ctrl = this.control;
    return ctrl instanceof FormArray ? ctrl : null;
  }

  get normalizedOptions(): unknown[] {
    return this.field.options || [];
  }

  get normalizedItemOptions(): unknown[] {
    return this.field.itemDescriptor?.options || [];
  }

  onAddArrayItem(): void {
    const arr = this.arrayControl;
    if (!arr || !this.field.itemDescriptor) return;
    arr.push(this.formSchemaService.createArrayItemControl(this.field.itemDescriptor));
  }

  onRemoveArrayItem(index: number): void {
    const arr = this.arrayControl;
    if (!arr) return;
    arr.removeAt(index);
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

