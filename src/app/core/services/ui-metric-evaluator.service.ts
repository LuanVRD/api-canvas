import { Injectable } from '@angular/core';
import {
  UiColorScheme,
  UiMetricConfiguration,
  UiMetricFormat,
  UiMetricType
} from '../models/ui-configuration.model';

export interface CalculatedMetric {
  id?: string;
  label: string;
  icon?: string;
  value: number | string;
  formattedValue: string;
  colorClass: string;
  colorScheme: UiColorScheme;
  description?: string;
}

/**
 * Limite padrão de métricas renderizadas no cabeçalho para preservar
 * a densidade visual e o caráter técnico do produto.
 */
export const DEFAULT_MAX_METRICS_LIMIT = 6;

/**
 * Serviço puro responsável pelo cálculo, agregação e formatação de métricas operacionais
 * declaradas na configuração da página, sem regras fixas de negócio ou acoplamento a recursos.
 *
 * NOTA SOBRE PAGINAÇÃO SERVER-SIDE:
 * Métricas em memória ('count_matching', 'sum_field') operam exclusivamente sobre o array
 * de registros carregados no cliente. Em cenários com paginação server-side, a contagem
 * reflete os itens visíveis da página atual. Já 'count_all' prioriza o 'totalCount' informado
 * pelo backend.
 */
@Injectable({
  providedIn: 'root'
})
export class UiMetricEvaluatorService {
  /**
   * Avalia uma lista de descritores de métricas e retorna as métricas calculadas.
   */
  evaluateMetrics(
    configs?: UiMetricConfiguration[] | null,
    items?: unknown[] | null,
    totalCount?: number,
    maxLimit: number = DEFAULT_MAX_METRICS_LIMIT
  ): CalculatedMetric[] {
    if (!configs || !Array.isArray(configs) || configs.length === 0) {
      return [];
    }

    const safeItems = Array.isArray(items) ? items : [];
    const validConfigs = configs.filter((c) => Boolean(c && typeof c.label === 'string' && c.label.trim() !== ''));

    return validConfigs.slice(0, maxLimit).map((config) => {
      return this.evaluateMetric(config, safeItems, totalCount);
    });
  }

  /**
   * Avalia um único descritor de métrica contra a coleção de dados e total informado.
   */
  evaluateMetric(
    config: UiMetricConfiguration,
    items?: unknown[] | null,
    totalCount?: number
  ): CalculatedMetric {
    const safeItems = Array.isArray(items) ? items : [];
    const rawValue = this.calculateRawValue(config, safeItems, totalCount);
    const formattedValue = this.formatValue(rawValue, config.format);
    const colorScheme: UiColorScheme = config.colorScheme || 'default';
    const colorClass = this.resolveColorClass(colorScheme);

    return {
      id: config.id,
      label: config.label,
      icon: config.icon,
      value: rawValue,
      formattedValue,
      colorClass,
      colorScheme,
      description: config.description
    };
  }

  private calculateRawValue(
    config: UiMetricConfiguration,
    items: unknown[],
    totalCount?: number
  ): number {
    const type: UiMetricType = config.type || 'count_all';

    switch (type) {
      case 'count_all':
        if (typeof totalCount === 'number' && !isNaN(totalCount) && totalCount >= 0) {
          return totalCount;
        }
        return items.length;

      case 'count_matching':
        return this.calculateCountMatching(config, items);

      case 'sum_field':
        return this.calculateSumField(config, items);

      default:
        // Fallback para tipos desconhecidos: contagem total
        if (typeof totalCount === 'number' && !isNaN(totalCount) && totalCount >= 0) {
          return totalCount;
        }
        return items.length;
    }
  }

  private calculateCountMatching(
    config: UiMetricConfiguration,
    items: unknown[]
  ): number {
    const field = config.field;
    if (!field || items.length === 0) {
      return 0;
    }

    const expectedValue = config.matchingValue;

    return items.reduce<number>((count, item) => {
      if (!item || typeof item !== 'object') {
        return count;
      }

      const itemRecord = item as Record<string, unknown>;
      const actualValue = itemRecord[field];

      if (this.areValuesEqual(actualValue, expectedValue)) {
        return count + 1;
      }

      return count;
    }, 0);
  }

  private calculateSumField(
    config: UiMetricConfiguration,
    items: unknown[]
  ): number {
    const field = config.field;
    if (!field || items.length === 0) {
      return 0;
    }

    return items.reduce<number>((sum, item) => {
      if (!item || typeof item !== 'object') {
        return sum;
      }

      const itemRecord = item as Record<string, unknown>;
      const val = itemRecord[field];

      if (val === null || val === undefined || val === '') {
        return sum;
      }

      const num = typeof val === 'number' ? val : Number(val);
      if (!isNaN(num) && isFinite(num)) {
        return sum + num;
      }

      return sum;
    }, 0);
  }

  /**
   * Compara dois valores de forma flexível e robusta:
   * - Booleanos (inclusive string 'true' / 'false')
   * - Números (inclusive strings puramente numéricas)
   * - Strings com comparação insensível a maiúsculas/minúsculas
   * - Null e undefined
   */
  private areValuesEqual(actual: unknown, expected: unknown): boolean {
    if (actual === expected) {
      return true;
    }

    if (actual === null || actual === undefined) {
      return expected === null || expected === undefined;
    }

    if (expected === null || expected === undefined) {
      return false;
    }

    // Comparação booleana
    if (typeof expected === 'boolean' || typeof actual === 'boolean') {
      const actBool = typeof actual === 'boolean' ? actual : String(actual).toLowerCase() === 'true';
      const expBool = typeof expected === 'boolean' ? expected : String(expected).toLowerCase() === 'true';
      return actBool === expBool;
    }

    // Comparação numérica estrita se ambos forem números ou strings numéricas puras
    if (typeof expected === 'number') {
      const actNum = typeof actual === 'number' ? actual : Number(actual);
      if (!isNaN(actNum)) {
        return actNum === expected;
      }
    }

    // Comparação de string case-insensitive e com trim
    const strActual = String(actual).trim().toLowerCase();
    const strExpected = String(expected).trim().toLowerCase();

    return strActual === strExpected;
  }

  private formatValue(value: number, format?: UiMetricFormat): string {
    if (format === 'currency') {
      try {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      } catch {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
      }
    }

    if (format === 'percent') {
      return `${value}%`;
    }

    // Formato number padrão
    return String(value);
  }

  private resolveColorClass(scheme?: UiColorScheme): string {
    switch (scheme) {
      case 'primary':
        return 'color-primary';
      case 'warning':
        return 'color-warning';
      case 'info':
        return 'color-info';
      case 'success':
        return 'color-success';
      case 'danger':
        return 'color-danger';
      case 'default':
      default:
        return 'color-default';
    }
  }
}
