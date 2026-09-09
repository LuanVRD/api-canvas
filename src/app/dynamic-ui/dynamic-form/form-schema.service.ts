import { Injectable } from '@angular/core';
import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { ApiSchema } from '../../core/models/api-schema.model';
import {
  FormFieldConstraints,
  FormFieldDescriptor,
  FormFieldOption,
  FormFieldType
} from './form-field.model';

export type {
  FormFieldConstraints,
  FormFieldDescriptor,
  FormFieldOption,
  FormFieldType
} from './form-field.model';

@Injectable({
  providedIn: 'root'
})
export class FormSchemaService {
  /**
   * Transforms an ApiSchema into an agnostic array of FormFieldDescriptor items.
   *
   * @param schema The OpenAPI ApiSchema representing the input model or request body.
   */
  extractFields(schema?: ApiSchema | null): FormFieldDescriptor[] {
    if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
      return [];
    }

    return Object.entries(schema.properties).map(([key, propSchema]) => {
      const isRequired = !!(
        propSchema.required ||
        (schema.requiredProperties && schema.requiredProperties.includes(key))
      );

      const fieldType = this.mapType(propSchema);
      const constraints: FormFieldConstraints = {
        required: isRequired || undefined,
        minLength: propSchema.minLength,
        maxLength: propSchema.maxLength,
        minimum: propSchema.minimum,
        maximum: propSchema.maximum,
        pattern: propSchema.pattern
      };

      const defaultValue =
        propSchema.default !== undefined
          ? propSchema.default
          : fieldType === 'boolean'
            ? false
            : null;

      const descriptor: FormFieldDescriptor = {
        key,
        label: propSchema.title?.trim() || this.formatLabel(key),
        type: fieldType,
        controlType: fieldType,
        required: isRequired,
        defaultValue,
        description: propSchema.description,
        format: propSchema.format,
        options: this.extractOptions(propSchema),
        constraints,
        readOnly: propSchema.readOnly,
        nullable: propSchema.nullable
      };

      return descriptor;
    });
  }

  /**
   * Constructs an Angular FormGroup and associated FormFieldDescriptor array
   * from an ApiSchema or an existing array of FormFieldDescriptor items.
   */
  buildFormGroup(
    input?: ApiSchema | FormFieldDescriptor[] | null
  ): { form: FormGroup; fields: FormFieldDescriptor[] } {
    const form = new FormGroup({});
    const fields = Array.isArray(input) ? input : this.extractFields(input);

    for (const field of fields) {
      const validators: ValidatorFn[] = [];
      const constraints = field.constraints;

      if (field.required || constraints?.required) {
        validators.push(Validators.required);
      }
      if (constraints?.minLength !== undefined) {
        validators.push(Validators.minLength(constraints.minLength));
      }
      if (constraints?.maxLength !== undefined) {
        validators.push(Validators.maxLength(constraints.maxLength));
      }
      if (constraints?.minimum !== undefined) {
        validators.push(Validators.min(constraints.minimum));
      }
      if (constraints?.maximum !== undefined) {
        validators.push(Validators.max(constraints.maximum));
      }
      if (constraints?.pattern) {
        validators.push(Validators.pattern(constraints.pattern));
      }

      const control = new FormControl(
        {
          value: field.defaultValue ?? (field.type === 'boolean' ? false : null),
          disabled: !!field.readOnly
        },
        validators
      );

      form.addControl(field.key, control);
    }

    return { form, fields };
  }

  /**
   * Maps an ApiSchema type and format into an agnostic FormFieldType.
   */
  mapType(schema: ApiSchema): FormFieldType {
    if (schema.enum && schema.enum.length > 0) {
      return 'select';
    }
    if (schema.format === 'date') {
      return 'date';
    }
    if (schema.format === 'date-time') {
      return 'datetime';
    }
    if (schema.type === 'integer' || schema.type === 'number') {
      return 'number';
    }
    if (schema.type === 'boolean') {
      return 'boolean';
    }
    if (schema.type === 'object' || schema.type === 'array') {
      return 'json';
    }
    return 'text';
  }

  /**
   * Normalizes enum choices into FormFieldOption structures or primitive values.
   */
  private extractOptions(schema: ApiSchema): FormFieldOption[] | undefined {
    if (!schema.enum || !Array.isArray(schema.enum)) {
      return undefined;
    }

    return schema.enum.map((opt) => {
      if (opt !== null && typeof opt === 'object' && 'label' in (opt as Record<string, unknown>)) {
        const optionObj = opt as { label: string; value: unknown };
        return {
          label: String(optionObj.label),
          value: optionObj.value
        };
      }
      return {
        label: String(opt),
        value: opt
      };
    });
  }

  /**
   * Generates a readable label from a property key string.
   */
  formatLabel(key: string): string {
    if (!key) return '';

    const acronyms = new Set([
      'id',
      'sku',
      'url',
      'uri',
      'ip',
      'api',
      'uuid',
      'guid',
      'http',
      'ssl',
      'tls'
    ]);

    if (acronyms.has(key.toLowerCase())) {
      return key.toUpperCase();
    }

    return key
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((word) => {
        const lower = word.toLowerCase();
        if (acronyms.has(lower)) {
          return lower.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ')
      .trim();
  }
}
