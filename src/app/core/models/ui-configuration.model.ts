export type UiFieldControl =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'date'
  | 'datetime'
  | 'json'
  | string;

export interface UiFieldConfiguration {
  label?: string;
  control?: UiFieldControl;
  hidden?: boolean;
  description?: string;
  placeholder?: string;
}

export interface UiListConfiguration {
  /**
   * Ordered list of visible column keys to display in listings.
   */
  columns?: string[];
}

export interface UiResourceConfiguration {
  label?: string;
  icon?: string;
  hidden?: boolean;
  list?: UiListConfiguration;
  fields?: Record<string, UiFieldConfiguration>;
}

export interface UiConfiguration {
  title?: string;
  resources?: Record<string, UiResourceConfiguration>;
  fields?: Record<string, UiFieldConfiguration>;
}
