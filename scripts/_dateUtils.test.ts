import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
// CJS interop: scripts/_dateUtils.js usa module.exports y no expone tipos.
import * as dateUtils from './_dateUtils.js';

const { todayLima, daysUntilLimaDate, daysSinceLimaTimestamp } = dateUtils as {
  todayLima: () => Date;
  daysUntilLimaDate: (s: string | null | undefined) => number;
  daysSinceLimaTimestamp: (s: string | null | undefined) => number;
};

describe('_dateUtils (Lima TZ helpers)', () => {
  describe('14:00 UTC = 09:00 Lima del 7 de mayo', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-07T14:00:00Z'));
    });
    afterAll(() => vi.useRealTimers());

    it('todayLima ancla a 2026-05-07', () => {
      expect(todayLima().toISOString().slice(0, 10)).toBe('2026-05-07');
    });

    it('mismo día = 0', () => {
      expect(daysUntilLimaDate('2026-05-07')).toBe(0);
    });

    it('día siguiente = 1', () => {
      expect(daysUntilLimaDate('2026-05-08')).toBe(1);
    });

    it('día anterior = -1', () => {
      expect(daysUntilLimaDate('2026-05-06')).toBe(-1);
    });
  });

  describe('04:00 UTC = 23:00 Lima del 6 de mayo (caso off-by-one que F1.2 arregla)', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-07T04:00:00Z'));
    });
    afterAll(() => vi.useRealTimers());

    it('todayLima reconoce que en Lima sigue siendo 2026-05-06', () => {
      expect(todayLima().toISOString().slice(0, 10)).toBe('2026-05-06');
    });

    it('deadline 2026-05-06 = 0 (no -1) en hora Lima', () => {
      expect(daysUntilLimaDate('2026-05-06')).toBe(0);
    });
  });

  describe('daysSinceLimaTimestamp', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-05-07T14:00:00Z'));
    });
    afterAll(() => vi.useRealTimers());

    it('hace 3 días Lima = 3', () => {
      expect(daysSinceLimaTimestamp('2026-05-04T18:00:00Z')).toBe(3);
    });

    it('mismo día Lima = 0', () => {
      expect(daysSinceLimaTimestamp('2026-05-07T08:00:00Z')).toBe(0);
    });
  });

  describe('input validation', () => {
    it('null/undefined retornan 0', () => {
      expect(daysUntilLimaDate(null)).toBe(0);
      expect(daysUntilLimaDate(undefined)).toBe(0);
      expect(daysSinceLimaTimestamp(null)).toBe(0);
    });
  });
});
