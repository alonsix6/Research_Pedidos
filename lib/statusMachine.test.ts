import { describe, it, expect } from 'vitest';
import {
  canTransition,
  getNextStatuses,
  getStatusConfig,
  isTerminalStatus,
  requiresBlockedReason,
  validTransitions,
  kanbanStatuses,
} from './statusMachine';

describe('statusMachine', () => {
  describe('canTransition', () => {
    it('permite transiciones declaradas', () => {
      expect(canTransition('pending', 'in_progress')).toBe(true);
      expect(canTransition('in_progress', 'blocked')).toBe(true);
      expect(canTransition('blocked', 'in_progress')).toBe(true);
      expect(canTransition('in_review', 'completed')).toBe(true);
      expect(canTransition('cancelled', 'pending')).toBe(true);
    });

    it('rechaza transiciones no declaradas', () => {
      expect(canTransition('pending', 'completed')).toBe(false);
      expect(canTransition('completed', 'pending')).toBe(false);
      expect(canTransition('in_progress', 'completed')).toBe(false);
      expect(canTransition('blocked', 'in_review')).toBe(false);
    });
  });

  describe('getNextStatuses', () => {
    it('lista las siguientes para un status válido', () => {
      expect(getNextStatuses('pending')).toEqual(['in_progress', 'cancelled']);
      expect(getNextStatuses('in_review')).toEqual(['completed', 'needs_revision']);
    });

    it('devuelve array vacío para terminal', () => {
      expect(getNextStatuses('completed')).toEqual([]);
    });
  });

  describe('isTerminalStatus', () => {
    it('completed es terminal', () => {
      expect(isTerminalStatus('completed')).toBe(true);
    });
    it('cancelled NO es terminal porque puede volver a pending', () => {
      expect(isTerminalStatus('cancelled')).toBe(false);
    });
    it('los demás no son terminales', () => {
      expect(isTerminalStatus('pending')).toBe(false);
      expect(isTerminalStatus('blocked')).toBe(false);
    });
  });

  describe('requiresBlockedReason', () => {
    it('blocked requiere motivo, los demás no', () => {
      expect(requiresBlockedReason('blocked')).toBe(true);
      expect(requiresBlockedReason('pending')).toBe(false);
      expect(requiresBlockedReason('completed')).toBe(false);
    });
  });

  describe('getStatusConfig', () => {
    it('devuelve config con label/emoji/color para cada status', () => {
      const cfg = getStatusConfig('pending');
      expect(cfg.label).toBe('Pendiente');
      expect(cfg.emoji).toBe('⏳');
      expect(cfg.color).toMatch(/^#/);
    });
  });

  describe('integridad del modelo', () => {
    it('cada destino válido en validTransitions es un status conocido', () => {
      const knownStatuses = Object.keys(validTransitions);
      for (const [, targets] of Object.entries(validTransitions)) {
        for (const target of targets) {
          expect(knownStatuses).toContain(target);
        }
      }
    });

    it('kanbanStatuses solo contiene statuses no terminales (excluyendo cancelled/completed)', () => {
      expect(kanbanStatuses).not.toContain('completed');
      expect(kanbanStatuses).not.toContain('cancelled');
    });
  });
});
