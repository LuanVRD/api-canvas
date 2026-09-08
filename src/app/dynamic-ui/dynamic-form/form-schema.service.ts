import { Injectable } from '@angular/core';
import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { ApiSchema } from '../../core/models/api-schema.model';

export interface FormFieldDescriptor {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'date' | 'json';
  required: boolean;
  options?: unknown[];
  defaultValue?: unknown;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormSchemaService {
  buildFormGroup(schema: ApiSchema): { form: FormGroup; fields: FormFieldDescriptor[] } {
    const form = new FormGroup({});
    const fields: FormFieldDescriptor[] = [];

    if (!schema.properties) {
      return { form, fields };
    }

    Object.entries(schema.properties).forEach(([key, propSchema]) => {
      const validators: ValidatorFn[] = [];
      const isRequired = propSchema.required || (schema.required && typeof schema.required === 'boolean');
      
      if (isRequired) {
        validators.push(Validators.required);
      }
      if (propSchema.minLength !== undefined) {
        validators.push(Validators.minLength(propSchema.minLength));
      }
      if (propSchema.maxLength !== undefined) {
        validators.push(Validators.maxLength(propSchema.maxLength));
      }
      if (propSchema.minimum !== undefined) {
        validators.push(Validators.min(propSchema.minimum));
      }
      if (propSchema.maximum !== undefined) {
        validators.push(Validators.max(propSchema.maximum));
      }
      if (propSchema.pattern) {
        validators.push(Validators.pattern(propSchema.pattern));
      }

      const control = new FormControl(propSchema.default ?? null, validators);
      form.addControl(key, control);

      fields.push({
        key,
        label: propSchema.title || key,
        type: this.mapType(propSchema),
        required: !!isRequired,
        options: propSchema.enum,
        defaultValue: propSchema.default,
        description: propSchema.description
      });
    });

    return { form, fields };
  }

  private mapType(schema: ApiSchema): FormFieldDescriptor['type'] {
    if (schema.enum && schema.enum.length > 0) return 'select';
    if (schema.type === 'integer' || schema.type === 'number') return 'number';
    if (schema.type === 'boolean') return 'boolean';
    if (schema.type === 'object' || schema.type === 'array') return 'json';
    return 'text';
  }
}
