import { TestBed } from '@angular/core/testing';
import {
  CalculatedMetric,
  DEFAULT_MAX_METRICS_LIMIT,
  UiMetricEvaluatorService
} from './ui-metric-evaluator.service';
import { UiMetricConfiguration } from '../models/ui-configuration.model';

describe('UiMetricEvaluatorService', () => {
  let service: UiMetricEvaluatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UiMetricEvaluatorService]
    });
    service = TestBed.inject(UiMetricEvaluatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('evaluateMetrics - Casos Gerais e Densidade', () => {
    it('should return an empty array when configs is null, undefined, or empty', () => {
      expect(service.evaluateMetrics(null, [{ id: 1 }])).toEqual([]);
      expect(service.evaluateMetrics(undefined, [{ id: 1 }])).toEqual([]);
      expect(service.evaluateMetrics([], [{ id: 1 }])).toEqual([]);
    });

    it('should filter out metric configs with missing or empty label', () => {
      const configs: UiMetricConfiguration[] = [
        { label: '   ', type: 'count_all' },
        { label: 'Válido', type: 'count_all' },
        { label: '', type: 'count_all' }
      ];

      const result = service.evaluateMetrics(configs, [1, 2, 3]);
      expect(result.length).toBe(1);
      expect(result[0].label).toBe('Válido');
    });

    it('should limit the number of metrics according to maxLimit to preserve visual density', () => {
      const configs: UiMetricConfiguration[] = [
        { label: 'M1', type: 'count_all' },
        { label: 'M2', type: 'count_all' },
        { label: 'M3', type: 'count_all' },
        { label: 'M4', type: 'count_all' },
        { label: 'M5', type: 'count_all' },
        { label: 'M6', type: 'count_all' },
        { label: 'M7', type: 'count_all' },
        { label: 'M8', type: 'count_all' }
      ];

      const defaultLimitResult = service.evaluateMetrics(configs, []);
      expect(defaultLimitResult.length).toBe(DEFAULT_MAX_METRICS_LIMIT);
      expect(defaultLimitResult.length).toBe(6);

      const customLimitResult = service.evaluateMetrics(configs, [], undefined, 3);
      expect(customLimitResult.length).toBe(3);
      expect(customLimitResult.map((m) => m.label)).toEqual(['M1', 'M2', 'M3']);
    });
  });

  describe('count_all - Contagem Total', () => {
    it('should prioritize totalCount when provided', () => {
      const config: UiMetricConfiguration = {
        label: 'Total de Registros',
        type: 'count_all'
      };

      const result = service.evaluateMetric(config, [{ id: 1 }, { id: 2 }], 1500);
      expect(result.value).toBe(1500);
      expect(result.formattedValue).toBe('1500');
    });

    it('should use totalCount = 0 correctly without falling back to array length', () => {
      const config: UiMetricConfiguration = {
        label: 'Total',
        type: 'count_all'
      };

      const result = service.evaluateMetric(config, [{ id: 1 }], 0);
      expect(result.value).toBe(0);
      expect(result.formattedValue).toBe('0');
    });

    it('should fallback to items length when totalCount is undefined or null', () => {
      const config: UiMetricConfiguration = {
        label: 'Total',
        type: 'count_all'
      };

      const result = service.evaluateMetric(config, [{ id: 1 }, { id: 2 }, { id: 3 }]);
      expect(result.value).toBe(3);
      expect(result.formattedValue).toBe('3');
    });

    it('should return 0 when items is empty and totalCount is undefined', () => {
      const config: UiMetricConfiguration = {
        label: 'Total',
        type: 'count_all'
      };

      const result = service.evaluateMetric(config, []);
      expect(result.value).toBe(0);
    });
  });

  describe('count_matching - Contagem por Igualdade de Campo', () => {
    const testItems = [
      { id: 1, status: 'Pendente', priority: 'high', active: true, code: 100, custom: null },
      { id: 2, status: 'pendente', priority: 'low', active: false, code: 200, custom: 'special' },
      { id: 3, status: 'Concluído', priority: 'medium', active: true, code: 100 },
      { id: 4, status: 'Cancelado', priority: 'high', active: false, code: 300, custom: undefined },
      { id: 5, status: 'PENDENTE', priority: 'HIGH', active: 'true', code: '100', custom: null }
    ];

    it('should count case-insensitive string matches', () => {
      const config: UiMetricConfiguration = {
        label: 'Pendentes',
        type: 'count_matching',
        field: 'status',
        matchingValue: 'Pendente'
      };

      const result = service.evaluateMetric(config, testItems);
      expect(result.value).toBe(3); // 'Pendente', 'pendente', 'PENDENTE'
    });

    it('should count numeric equality matches including string-to-number', () => {
      const config: UiMetricConfiguration = {
        label: 'Código 100',
        type: 'count_matching',
        field: 'code',
        matchingValue: 100
      };

      const result = service.evaluateMetric(config, testItems);
      expect(result.value).toBe(3); // items 1, 3 and 5 ('100')
    });

    it('should count boolean matches correctly', () => {
      const configActive: UiMetricConfiguration = {
        label: 'Ativos',
        type: 'count_matching',
        field: 'active',
        matchingValue: true
      };

      const resultActive = service.evaluateMetric(configActive, testItems);
      expect(resultActive.value).toBe(3); // items 1 (true), 3 (true), 5 ('true')

      const configInactive: UiMetricConfiguration = {
        label: 'Inativos',
        type: 'count_matching',
        field: 'active',
        matchingValue: false
      };

      const resultInactive = service.evaluateMetric(configInactive, testItems);
      expect(resultInactive.value).toBe(2); // items 2 (false), 4 (false)
    });

    it('should handle null / undefined matching values safely', () => {
      const configNull: UiMetricConfiguration = {
        label: 'Nulos',
        type: 'count_matching',
        field: 'custom',
        matchingValue: null
      };

      const result = service.evaluateMetric(configNull, testItems);
      expect(result.value).toBe(4); // items 1 (null), 3 (ausente/undefined), 4 (undefined), 5 (null)
    });

    it('should return 0 when field is not defined in config', () => {
      const config: UiMetricConfiguration = {
        label: 'Sem Campo',
        type: 'count_matching',
        matchingValue: 'algo'
      };

      const result = service.evaluateMetric(config, testItems);
      expect(result.value).toBe(0);
    });

    it('should return 0 when items array is empty or null', () => {
      const config: UiMetricConfiguration = {
        label: 'Pendentes',
        type: 'count_matching',
        field: 'status',
        matchingValue: 'Pendente'
      };

      expect(service.evaluateMetric(config, []).value).toBe(0);
      expect(service.evaluateMetric(config, null).value).toBe(0);
    });

    it('should handle array items that are not objects gracefully', () => {
      const config: UiMetricConfiguration = {
        label: 'Teste',
        type: 'count_matching',
        field: 'status',
        matchingValue: 'ativo'
      };

      const mixedItems = ['string-item', null, undefined, 42, { status: 'ativo' }];
      const result = service.evaluateMetric(config, mixedItems);
      expect(result.value).toBe(1);
    });
  });

  describe('sum_field - Soma de Campos Numéricos', () => {
    const sumItems = [
      { id: 1, amount: 100.5, count: 2 },
      { id: 2, amount: 50.25, count: '3' },
      { id: 3, amount: '49.25', count: null },
      { id: 4, amount: null, count: undefined },
      { id: 5, amount: 'invalid-number', count: 5 }
    ];

    it('should sum valid numbers and numeric strings while ignoring invalid values', () => {
      const config: UiMetricConfiguration = {
        label: 'Valor Total',
        type: 'sum_field',
        field: 'amount'
      };

      const result = service.evaluateMetric(config, sumItems);
      // 100.5 + 50.25 + 49.25 = 200
      expect(result.value).toBe(200);
    });

    it('should sum integer field safely', () => {
      const config: UiMetricConfiguration = {
        label: 'Quantidade Total',
        type: 'sum_field',
        field: 'count'
      };

      const result = service.evaluateMetric(config, sumItems);
      // 2 + 3 + 5 = 10
      expect(result.value).toBe(10);
    });

    it('should return 0 when field is missing or items is empty', () => {
      const configNoField: UiMetricConfiguration = {
        label: 'Soma',
        type: 'sum_field'
      };
      expect(service.evaluateMetric(configNoField, sumItems).value).toBe(0);

      const configValid: UiMetricConfiguration = {
        label: 'Soma',
        type: 'sum_field',
        field: 'amount'
      };
      expect(service.evaluateMetric(configValid, []).value).toBe(0);
    });
  });

  describe('Formatação e Cores Semânticas', () => {
    it('should format currency values using BRL currency standard', () => {
      const config: UiMetricConfiguration = {
        label: 'Receita',
        type: 'sum_field',
        field: 'val',
        format: 'currency'
      };

      const result = service.evaluateMetric(config, [{ val: 1250.5 }]);
      expect(result.formattedValue).toContain('1.250,50');
      expect(result.formattedValue).toContain('R$');
    });

    it('should format percent values with % suffix', () => {
      const config: UiMetricConfiguration = {
        label: 'Taxa de Sucesso',
        type: 'count_all',
        format: 'percent'
      };

      const result = service.evaluateMetric(config, [], 98);
      expect(result.formattedValue).toBe('98%');
    });

    it('should map color schemes strictly to design system tokens', () => {
      const testSchemes: Array<[string, string]> = [
        ['default', 'color-default'],
        ['primary', 'color-primary'],
        ['warning', 'color-warning'],
        ['info', 'color-info'],
        ['success', 'color-success'],
        ['danger', 'color-danger'],
        ['desconhecido', 'color-default']
      ];

      for (const [scheme, expectedClass] of testSchemes) {
        const config: UiMetricConfiguration = {
          label: 'Métrica',
          type: 'count_all',
          colorScheme: scheme
        };

        const result = service.evaluateMetric(config, [1, 2]);
        expect(result.colorClass).toBe(expectedClass);
      }
    });
  });
});
