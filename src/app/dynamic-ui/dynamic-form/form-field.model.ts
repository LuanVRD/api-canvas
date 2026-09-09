export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'date'
  | 'datetime'
  | 'object'
  | 'array'
  | 'json'
  | 'unsupported';

export interface FormFieldOption {
  label: string;
  value: unknown;
}

export interface FormFieldConstraints {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

export interface FormFieldDescriptor {
  key: string;
  label: string;
  type: FormFieldType;
  controlType?: FormFieldType;
  required: boolean;
  defaultValue?: unknown;
  description?: string;
  format?: string;
  options?: FormFieldOption[] | unknown[];
  constraints?: FormFieldConstraints;
  readOnly?: boolean;
  nullable?: boolean;
  children?: FormFieldDescriptor[];
  itemDescriptor?: FormFieldDescriptor;
  isFallback?: boolean;
  fallbackReason?: string;
}
