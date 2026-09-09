import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiSchema } from '../../core/models/api-schema.model';
import { FormFieldDescriptor } from './form-field.model';
import { FormSchemaService } from './form-schema.service';
import { DynamicFieldComponent } from './dynamic-field.component';

import {
  UiFieldConfiguration,
  UiResourceConfiguration
} from '../../core/models/ui-configuration.model';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    DynamicFieldComponent
  ],
  template: `
    @if (form && fields.length > 0) {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="dynamic-form-layout" novalidate>
        <div class="fields-list">
          @for (field of fields; track field.key) {
            <app-dynamic-field [form]="form" [field]="field" />
          }
        </div>

        @if (showActions) {
          <div class="form-actions-bar">
            @if (showResetButton) {
              <button
                type="button"
                class="btn-reset"
                (click)="onReset()"
                [disabled]="disabled"
              >
                <mat-icon class="action-icon">restart_alt</mat-icon>
                <span>{{ resetLabel }}</span>
              </button>
            }

            <button
              type="submit"
              class="btn-submit"
              [disabled]="disabled || (disableWhenInvalid && form.invalid)"
            >
              <mat-icon class="action-icon">check</mat-icon>
              <span>{{ submitLabel }}</span>
            </button>
          </div>
        }
      </form>
    } @else {
      <div class="empty-form-note font-mono">
        <span>No fields defined for this form schema.</span>
      </div>
    }
  `,
  styles: [`
    .dynamic-form-layout {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
    }
    .fields-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .form-actions-bar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 8px;
      border-top: 1px solid var(--canvas-border-subtle, #21262d);
    }
    .btn-submit {
      height: 32px;
      padding: 0 14px;
      font-size: 12px;
      font-weight: 600;
      color: #ffffff;
      background: #238636;
      border: 1px solid rgba(240, 246, 252, 0.1);
      border-radius: var(--radius-sm, 4px);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.12s ease;
    }
    .btn-submit:hover:not(:disabled) {
      background: #2ea043;
    }
    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-reset {
      height: 32px;
      padding: 0 12px;
      font-size: 12px;
      font-weight: 500;
      color: var(--canvas-text-secondary, #8b949e);
      background: var(--canvas-surface, #161b22);
      border: 1px solid var(--canvas-border, #30363d);
      border-radius: var(--radius-sm, 4px);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.12s ease;
    }
    .btn-reset:hover:not(:disabled) {
      color: var(--canvas-text-primary, #e6edf3);
      background: var(--canvas-surface-elevated, #21262d);
    }
    .btn-reset:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .action-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }
    .empty-form-note {
      font-size: 12px;
      color: var(--canvas-text-muted, #6e7681);
      padding: 12px;
      text-align: center;
      background: var(--canvas-surface, #161b22);
      border: 1px dashed var(--canvas-border, #30363d);
      border-radius: var(--radius-sm, 4px);
    }
  `]
})
export class DynamicFormComponent implements OnChanges {
  private readonly formSchemaService = inject(FormSchemaService);

  @Input() schema?: ApiSchema | null;
  @Input() fields: FormFieldDescriptor[] = [];
  @Input() form?: FormGroup;
  @Input() initialValue?: Record<string, unknown> | null;
  @Input() resourceConfig?: UiResourceConfiguration | Record<string, UiFieldConfiguration> | null;
  @Input() globalFields?: Record<string, UiFieldConfiguration> | null;
  @Input() submitLabel = 'Submit';
  @Input() resetLabel = 'Reset';
  @Input() showActions = true;
  @Input() showResetButton = false;
  @Input() disableWhenInvalid = false;
  @Input() disabled = false;

  @Output() formSubmit = new EventEmitter<Record<string, unknown>>();
  @Output() formChange = new EventEmitter<Record<string, unknown>>();
  @Output() formReset = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['schema'] || changes['resourceConfig'] || changes['globalFields']) &&
      this.schema
    ) {
      this.initFromSchema(this.schema);
    } else if (changes['initialValue'] && this.initialValue && this.form) {
      this.formSchemaService.populateFormValues(this.form, this.initialValue, this.fields);
    }

    if (changes['disabled'] && this.form) {
      if (this.disabled) {
        this.form.disable();
      } else {
        this.form.enable();
      }
    }
  }

  private initFromSchema(schema: ApiSchema): void {
    const { form, fields } = this.formSchemaService.buildFormGroup(
      schema,
      this.initialValue,
      this.resourceConfig,
      this.globalFields
    );
    this.form = form;
    this.fields = fields;

    if (this.initialValue) {
      this.formSchemaService.populateFormValues(this.form, this.initialValue, this.fields);
    }

    this.form.valueChanges.subscribe(() => {
      this.formChange.emit(this.getPayload());
    });
  }

  onSubmit(): void {
    if (!this.form) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.getPayload();
    this.formSubmit.emit(payload);
  }

  onReset(): void {
    if (!this.form) return;
    this.form.reset();
    if (this.initialValue) {
      this.formSchemaService.populateFormValues(this.form, this.initialValue, this.fields);
    }
    this.formReset.emit();
  }

  /**
   * Returns a sanitized JSON payload formatted for OpenAPI request body.
   */
  getPayload(): Record<string, unknown> {
    if (!this.form) return {};
    return this.formSchemaService.toRequestBody(this.form.getRawValue(), this.fields);
  }

  get isValid(): boolean {
    return !!this.form && this.form.valid;
  }
}


