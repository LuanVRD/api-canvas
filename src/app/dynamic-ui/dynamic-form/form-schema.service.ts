import { Injectable, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ApiSchema } from '../../core/models/api-schema.model';
import {
  UiFieldConfiguration,
  UiResourceConfiguration
} from '../../core/models/ui-configuration.model';
import { UiConfigurationService } from '../../core/services/ui-configuration.service';
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

export const MAX_SCHEMA_DEPTH = 4;

@Injectable({
  providedIn: 'root'
})
export class FormSchemaService {
  private readonly uiConfigService = inject(UiConfigurationService);

  /**
   * Transforms an ApiSchema into an agnostic array of FormFieldDescriptor items.
   * Supports nested object properties, arrays of primitives, arrays of objects,
   * cycle detection, max depth capping, and optional UiConfiguration overrides.
   *
   * @param schema The OpenAPI ApiSchema representing the input model or request body.
   * @param depth Current recursion depth.
   * @param visited Set of visited ApiSchema objects to prevent infinite recursion.
   * @param resourceConfig Optional resource configuration or fields dictionary with UI overrides.
   * @param globalFields Optional global field overrides dictionary.
   */
  extractFields(
    schema?: ApiSchema | null,
    depth = 0,
    visited = new Set<ApiSchema>(),
    resourceConfig?: UiResourceConfiguration | Record<string, UiFieldConfiguration> | null,
    globalFields?: Record<string, UiFieldConfiguration> | null
  ): FormFieldDescriptor[] {
    if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
      return [];
    }

    const nextVisited = new Set(visited);
    nextVisited.add(schema);

    const rawFields: FormFieldDescriptor[] = Object.entries(schema.properties).map(([key, propSchema]): FormFieldDescriptor => {
      const isRequired = !!(
        propSchema.required ||
        (schema.requiredProperties && schema.requiredProperties.includes(key))
      );

      const constraints: FormFieldConstraints = {
        required: isRequired || undefined,
        minLength: propSchema.minLength,
        maxLength: propSchema.maxLength,
        minimum: propSchema.minimum,
        maximum: propSchema.maximum,
        pattern: propSchema.pattern
      };

      const label = propSchema.title?.trim() || this.formatLabel(key);

      // Check recursion cycle or max depth limit
      if (visited.has(propSchema) || depth >= MAX_SCHEMA_DEPTH) {
        return {
          key,
          label,
          type: 'json',
          controlType: 'json',
          required: isRequired,
          defaultValue: propSchema.default !== undefined ? propSchema.default : null,
          description: propSchema.description,
          format: propSchema.format,
          constraints,
          readOnly: propSchema.readOnly,
          nullable: propSchema.nullable,
          isFallback: true,
          fallbackReason:
            depth >= MAX_SCHEMA_DEPTH
              ? 'Max recursion depth reached'
              : 'Cyclic schema reference detected'
        };
      }

      // Handle object type with properties
      if (propSchema.type === 'object') {
        if (propSchema.properties && Object.keys(propSchema.properties).length > 0) {
          const children = this.extractFields(propSchema, depth + 1, nextVisited);
          if (children.length > 0) {
            return {
              key,
              label,
              type: 'object',
              controlType: 'object',
              required: isRequired,
              defaultValue:
                propSchema.default !== undefined
                  ? propSchema.default
                  : propSchema.nullable
                    ? null
                    : {},
              description: propSchema.description,
              format: propSchema.format,
              constraints,
              readOnly: propSchema.readOnly,
              nullable: propSchema.nullable,
              children
            };
          }
        }

        // Object without known properties: fallback to raw JSON field
        return {
          key,
          label,
          type: 'json',
          controlType: 'json',
          required: isRequired,
          defaultValue: propSchema.default !== undefined ? propSchema.default : null,
          description: propSchema.description,
          format: propSchema.format,
          constraints,
          readOnly: propSchema.readOnly,
          nullable: propSchema.nullable
        };
      }

      // Handle array type
      if (propSchema.type === 'array') {
        if (propSchema.items) {
          const itemDescriptor = this.extractItemDescriptor(
            propSchema.items,
            `${key}_item`,
            depth + 1,
            nextVisited
          );

          return {
            key,
            label,
            type: 'array',
            controlType: 'array',
            required: isRequired,
            defaultValue:
              propSchema.default !== undefined
                ? propSchema.default
                : propSchema.nullable
                  ? null
                  : [],
            description: propSchema.description,
            format: propSchema.format,
            constraints,
            readOnly: propSchema.readOnly,
            nullable: propSchema.nullable,
            itemDescriptor
          };
        }

        // Array without items schema: fallback to JSON
        return {
          key,
          label,
          type: 'json',
          controlType: 'json',
          required: isRequired,
          defaultValue: propSchema.default !== undefined ? propSchema.default : null,
          description: propSchema.description,
          format: propSchema.format,
          constraints,
          readOnly: propSchema.readOnly,
          nullable: propSchema.nullable
        };
      }

      // Handle primitive types
      const fieldType = this.mapType(propSchema);
      const defaultValue =
        propSchema.default !== undefined
          ? propSchema.default
          : fieldType === 'boolean'
            ? false
            : null;

      const descriptor: FormFieldDescriptor = {
        key,
        label,
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

    if (depth === 0 && (resourceConfig || globalFields)) {
      const normalizedResourceConfig: UiResourceConfiguration | null =
        resourceConfig && 'fields' in resourceConfig
          ? (resourceConfig as UiResourceConfiguration)
          : resourceConfig
            ? { fields: resourceConfig as Record<string, UiFieldConfiguration> }
            : null;

      return this.uiConfigService.applyFieldOverrides(
        rawFields,
        normalizedResourceConfig,
        globalFields
      );
    }

    return rawFields;
  }

  /**
   * Extracts a descriptor for an array item schema.
   */
  private extractItemDescriptor(
    itemSchema: ApiSchema,
    key: string,
    depth: number,
    visited: Set<ApiSchema>
  ): FormFieldDescriptor {
    const isRequired = !!itemSchema.required;
    const label = itemSchema.title?.trim() || 'Item';

    if (visited.has(itemSchema) || depth >= MAX_SCHEMA_DEPTH) {
      return {
        key,
        label,
        type: 'json',
        controlType: 'json',
        required: isRequired,
        defaultValue: itemSchema.default !== undefined ? itemSchema.default : null,
        description: itemSchema.description,
        readOnly: itemSchema.readOnly,
        nullable: itemSchema.nullable,
        isFallback: true,
        fallbackReason:
          depth >= MAX_SCHEMA_DEPTH
            ? 'Max recursion depth reached'
            : 'Cyclic schema reference detected'
      };
    }

    if (itemSchema.type === 'object') {
      if (itemSchema.properties && Object.keys(itemSchema.properties).length > 0) {
        const nextVisited = new Set(visited);
        nextVisited.add(itemSchema);
        const children = this.extractFields(itemSchema, depth + 1, nextVisited);
        return {
          key,
          label,
          type: 'object',
          controlType: 'object',
          required: isRequired,
          defaultValue: itemSchema.default !== undefined ? itemSchema.default : {},
          description: itemSchema.description,
          readOnly: itemSchema.readOnly,
          nullable: itemSchema.nullable,
          children
        };
      }

      return {
        key,
        label,
        type: 'json',
        controlType: 'json',
        required: isRequired,
        defaultValue: itemSchema.default !== undefined ? itemSchema.default : null,
        description: itemSchema.description,
        readOnly: itemSchema.readOnly,
        nullable: itemSchema.nullable
      };
    }

    if (itemSchema.type === 'array') {
      if (itemSchema.items) {
        const nextVisited = new Set(visited);
        nextVisited.add(itemSchema);
        const innerItem = this.extractItemDescriptor(
          itemSchema.items,
          `${key}_inner`,
          depth + 1,
          nextVisited
        );
        return {
          key,
          label,
          type: 'array',
          controlType: 'array',
          required: isRequired,
          defaultValue: itemSchema.default !== undefined ? itemSchema.default : [],
          description: itemSchema.description,
          readOnly: itemSchema.readOnly,
          nullable: itemSchema.nullable,
          itemDescriptor: innerItem
        };
      }

      return {
        key,
        label,
        type: 'json',
        controlType: 'json',
        required: isRequired,
        defaultValue: itemSchema.default !== undefined ? itemSchema.default : null,
        description: itemSchema.description,
        readOnly: itemSchema.readOnly,
        nullable: itemSchema.nullable
      };
    }

    const fieldType = this.mapType(itemSchema);
    return {
      key,
      label,
      type: fieldType,
      controlType: fieldType,
      required: isRequired,
      defaultValue:
        itemSchema.default !== undefined
          ? itemSchema.default
          : fieldType === 'boolean'
            ? false
            : null,
      description: itemSchema.description,
      format: itemSchema.format,
      options: this.extractOptions(itemSchema),
      constraints: {
        required: isRequired || undefined,
        minLength: itemSchema.minLength,
        maxLength: itemSchema.maxLength,
        minimum: itemSchema.minimum,
        maximum: itemSchema.maximum,
        pattern: itemSchema.pattern
      },
      readOnly: itemSchema.readOnly,
      nullable: itemSchema.nullable
    };
  }

  /**
   * Constructs an Angular FormGroup and associated FormFieldDescriptor array
   * from an ApiSchema or an existing array of FormFieldDescriptor items.
   *
   * @param input Schema or array of field descriptors.
   * @param initialValue Optional initial values to populate controls (including FormArrays).
   * @param resourceConfig Optional resource configuration or fields dictionary with UI overrides.
   * @param globalFields Optional global field overrides dictionary.
   */
  buildFormGroup(
    input?: ApiSchema | FormFieldDescriptor[] | null,
    initialValue?: Record<string, unknown> | null,
    resourceConfig?: UiResourceConfiguration | Record<string, UiFieldConfiguration> | null,
    globalFields?: Record<string, UiFieldConfiguration> | null
  ): { form: FormGroup; fields: FormFieldDescriptor[] } {
    const form = new FormGroup({});
    const normalizedResourceConfig: UiResourceConfiguration | null =
      resourceConfig && 'fields' in resourceConfig
        ? (resourceConfig as UiResourceConfiguration)
        : resourceConfig
          ? { fields: resourceConfig as Record<string, UiFieldConfiguration> }
          : null;

    let fields: FormFieldDescriptor[];
    if (Array.isArray(input)) {
      fields =
        resourceConfig || globalFields
          ? this.uiConfigService.applyFieldOverrides(
              input,
              normalizedResourceConfig,
              globalFields
            )
          : input;
    } else {
      fields = this.extractFields(
        input,
        0,
        new Set(),
        normalizedResourceConfig,
        globalFields
      );
    }

    for (const field of fields) {
      const fieldVal =
        initialValue && typeof initialValue === 'object' && field.key in initialValue
          ? initialValue[field.key]
          : undefined;

      const control = this.buildControlForField(field, fieldVal);
      form.addControl(field.key, control);
    }

    return { form, fields };
  }

  /**
   * Creates an AbstractControl (FormControl, FormGroup, or FormArray)
   * tailored for a given FormFieldDescriptor and optional initial value.
   */
  buildControlForField(
    field: FormFieldDescriptor,
    initialValue?: unknown
  ): AbstractControl {
    if (field.type === 'object' && field.children && field.children.length > 0) {
      const childGroup = new FormGroup({});
      const childInit =
        initialValue && typeof initialValue === 'object' && !Array.isArray(initialValue)
          ? (initialValue as Record<string, unknown>)
          : (field.defaultValue as Record<string, unknown>) || {};

      for (const child of field.children) {
        const childVal =
          childInit && typeof childInit === 'object' && child.key in childInit
            ? childInit[child.key]
            : undefined;
        const childControl = this.buildControlForField(child, childVal);
        childGroup.addControl(child.key, childControl);
      }

      if (field.readOnly) {
        childGroup.disable();
      }

      return childGroup;
    }

    if (field.type === 'array' && field.itemDescriptor) {
      const formArray = new FormArray<AbstractControl>([]);
      const rawArr = Array.isArray(initialValue)
        ? (initialValue as unknown[])
        : Array.isArray(field.defaultValue)
          ? (field.defaultValue as unknown[])
          : [];

      for (const item of rawArr) {
        formArray.push(this.createArrayItemControl(field.itemDescriptor, item));
      }

      if (field.readOnly) {
        formArray.disable();
      }

      return formArray;
    }

    const validators = this.buildValidators(field);
    const value =
      initialValue !== undefined
        ? initialValue
        : field.defaultValue ?? (field.type === 'boolean' ? false : null);

    return new FormControl(
      {
        value,
        disabled: !!field.readOnly
      },
      validators
    );
  }

  /**
   * Creates a single item control (or nested group/array) for an array element.
   */
  createArrayItemControl(
    itemDescriptor: FormFieldDescriptor,
    initialValue?: unknown
  ): AbstractControl {
    return this.buildControlForField(itemDescriptor, initialValue);
  }

  /**
   * Populates an existing FormGroup hierarchy (including nested FormArrays) with values.
   */
  populateFormValues(
    form: FormGroup,
    values: Record<string, unknown>,
    fields: FormFieldDescriptor[] = []
  ): void {
    if (!form || !values || typeof values !== 'object') return;

    for (const field of fields) {
      if (!(field.key in values)) continue;
      const val = values[field.key];
      const ctrl = form.get(field.key);
      if (!ctrl) continue;

      if (field.type === 'array' && field.itemDescriptor && ctrl instanceof FormArray) {
        ctrl.clear();
        if (Array.isArray(val)) {
          for (const item of val) {
            ctrl.push(this.createArrayItemControl(field.itemDescriptor, item));
          }
        }
      } else if (field.type === 'object' && field.children && ctrl instanceof FormGroup) {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          this.populateFormValues(ctrl, val as Record<string, unknown>, field.children);
        }
      } else {
        ctrl.setValue(val, { emitEvent: false });
      }
    }
  }

  /**
   * Builds validators for a field descriptor.
   */
  private buildValidators(field: FormFieldDescriptor): ValidatorFn[] {
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

    if (field.type === 'json') {
      validators.push((control) => {
        if (!control.value) return null;
        if (typeof control.value === 'object') return null;
        try {
          JSON.parse(control.value);
          return null;
        } catch {
          return { invalidJson: true };
        }
      });
    }

    return validators;
  }

  /**
   * Transforms raw reactive form values into an agnostic JSON object
   * compatible with an OpenAPI HTTP request body.
   */
  toRequestBody(
    rawValues: Record<string, unknown>,
    fields: FormFieldDescriptor[] = []
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    const fieldMap = new Map(fields.map((f) => [f.key, f]));

    for (const [key, value] of Object.entries(rawValues)) {
      const field = fieldMap.get(key);

      if (!field) {
        if (value !== undefined && value !== '') {
          payload[key] = value;
        }
        continue;
      }

      if (field.type === 'object' && field.children) {
        if (value === null || value === undefined) {
          if (field.required) {
            payload[key] = value;
          } else if (field.nullable) {
            payload[key] = null;
          }
          continue;
        }

        if (typeof value === 'object' && !Array.isArray(value)) {
          const childPayload = this.toRequestBody(
            value as Record<string, unknown>,
            field.children
          );
          const hasKeys = Object.keys(childPayload).length > 0;

          if (hasKeys || field.required) {
            payload[key] = childPayload;
          } else if (field.nullable) {
            payload[key] = null;
          }
        }
        continue;
      }

      if (field.type === 'array' && field.itemDescriptor) {
        if (value === null || value === undefined) {
          if (field.required) {
            payload[key] = [];
          } else if (field.nullable) {
            payload[key] = null;
          }
          continue;
        }

        if (Array.isArray(value)) {
          const mappedArray = value.map((item) =>
            this.serializeArrayItem(item, field.itemDescriptor!)
          );
          payload[key] = mappedArray;
        }
        continue;
      }

      if (value === undefined || value === '') {
        if (field.required) {
          payload[key] = value;
        } else if (field.nullable) {
          payload[key] = null;
        }
        continue;
      }

      if (field.type === 'number') {
        if (value === null) {
          payload[key] = null;
        } else {
          const num = Number(value);
          payload[key] = isNaN(num) ? value : num;
        }
      } else if (field.type === 'boolean') {
        payload[key] = Boolean(value);
      } else if (field.type === 'json') {
        if (typeof value === 'string' && value.trim()) {
          try {
            payload[key] = JSON.parse(value);
          } catch {
            payload[key] = value;
          }
        } else {
          payload[key] = value;
        }
      } else {
        payload[key] = value;
      }
    }

    return payload;
  }

  /**
   * Serializes a single array item according to its itemDescriptor.
   */
  private serializeArrayItem(
    item: unknown,
    itemDescriptor: FormFieldDescriptor
  ): unknown {
    if (item === undefined || item === null) {
      return itemDescriptor.nullable ? null : item;
    }

    if (itemDescriptor.type === 'object' && itemDescriptor.children) {
      if (typeof item === 'object' && !Array.isArray(item)) {
        return this.toRequestBody(
          item as Record<string, unknown>,
          itemDescriptor.children
        );
      }
      return item;
    }

    if (itemDescriptor.type === 'array' && itemDescriptor.itemDescriptor) {
      if (Array.isArray(item)) {
        return item.map((inner) =>
          this.serializeArrayItem(inner, itemDescriptor.itemDescriptor!)
        );
      }
      return item;
    }

    if (itemDescriptor.type === 'number') {
      if (item === '') return itemDescriptor.nullable ? null : undefined;
      const num = Number(item);
      return isNaN(num) ? item : num;
    }

    if (itemDescriptor.type === 'boolean') {
      return Boolean(item);
    }

    if (itemDescriptor.type === 'json') {
      if (typeof item === 'string' && item.trim()) {
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      }
      return item;
    }

    return item;
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
    if (schema.type === 'object') {
      return 'object';
    }
    if (schema.type === 'array') {
      return 'array';
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

