import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  parseNaturalDate,
  calculatePriority,
  getPriorityEmoji,
  getStatusEmoji,
  getStatusLabel,
  classifyByUrgency,
} from './utils';
import { Request } from './types';

describe('parseNaturalDate', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('parsea formato DD/MM', () => {
    const d = parseNaturalDate('25/12');
    expect(d).not.toBeNull();
    expect(d!.getMonth()).toBe(11); // Dec (0-indexed)
    expect(d!.getDate()).toBe(25);
    expect(d!.getFullYear()).toBe(2026);
  });

  it('parsea formato DD/MM/YYYY', () => {
    const d = parseNaturalDate('01/06/2027');
    expect(d!.getFullYear()).toBe(2027);
    expect(d!.getMonth()).toBe(5);
    expect(d!.getDate()).toBe(1);
  });

  it('reconoce "hoy"', () => {
    const d = parseNaturalDate('hoy');
    expect(d).not.toBeNull();
    expect(d!.toDateString()).toBe(new Date().toDateString());
  });

  it('reconoce "mañana" y "manana"', () => {
    expect(parseNaturalDate('mañana')).not.toBeNull();
    expect(parseNaturalDate('manana')).not.toBeNull();
  });

  it('reconoce "en N días"', () => {
    const d = parseNaturalDate('en 3 días');
    expect(d).not.toBeNull();
    const expected = new Date();
    expected.setDate(expected.getDate() + 3);
    expect(d!.toDateString()).toBe(expected.toDateString());
  });

  it('devuelve null para input inválido', () => {
    expect(parseNaturalDate('mañanita')).toBeNull();
    expect(parseNaturalDate('xx/yy')).toBeNull();
    expect(parseNaturalDate('')).toBeNull();
  });
});

describe('calculatePriority', () => {
  // Anclamos el reloj a medianoche UTC para que `parseISO('YYYY-MM-DD')`
  // (que retorna midnight UTC) y `new Date()` queden en el mismo punto.
  // Si testeamos con reloj a las 12:00 UTC, deadline mañana 00:00 UTC sería
  // sólo 12h después y differenceInDays daría 0 — eso es un comportamiento
  // existente de calculatePriority dependiente de la hora del día, no un
  // bug del test.
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T00:00:00Z'));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('vencido -> urgent', () => {
    expect(calculatePriority('2026-05-10')).toBe('urgent');
  });

  it('vence hoy -> urgent', () => {
    expect(calculatePriority('2026-05-15')).toBe('urgent');
  });

  it('mañana -> high', () => {
    expect(calculatePriority('2026-05-16')).toBe('high');
  });

  it('en 3 días -> high', () => {
    expect(calculatePriority('2026-05-18')).toBe('high');
  });

  it('en una semana -> normal', () => {
    expect(calculatePriority('2026-05-22')).toBe('normal');
  });

  it('en un mes -> low', () => {
    expect(calculatePriority('2026-06-15')).toBe('low');
  });
});

describe('getPriorityEmoji', () => {
  it('mapea cada prioridad a su emoji', () => {
    expect(getPriorityEmoji('urgent')).toBe('🔴');
    expect(getPriorityEmoji('high')).toBe('🟡');
    expect(getPriorityEmoji('normal')).toBe('🟢');
    expect(getPriorityEmoji('low')).toBe('⚪');
  });

  it('default ⚪ para valores desconocidos', () => {
    expect(getPriorityEmoji('xxx')).toBe('⚪');
  });
});

describe('getStatusEmoji + getStatusLabel', () => {
  it('mapea status conocidos', () => {
    expect(getStatusEmoji('completed')).toBe('✅');
    expect(getStatusEmoji('blocked')).toBe('🔴');
    expect(getStatusLabel('in_progress')).toBe('En Progreso');
    expect(getStatusLabel('needs_revision')).toBe('Necesita Revisión');
  });

  it('default para desconocidos', () => {
    expect(getStatusEmoji('foo')).toBe('❓');
    expect(getStatusLabel('foo')).toBe('foo');
  });
});

describe('classifyByUrgency', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  function fixture(deadline: string, priority: Request['priority'] = 'normal'): Request {
    return {
      id: deadline,
      client: 'X',
      description: 'X',
      requester_name: 'X',
      requester_role: '',
      assigned_to: null,
      deadline,
      status: 'pending',
      priority,
      completion_notes: null,
      blocked_reason: null,
      blocked_at: null,
      original_deadline: null,
      status_changed_at: null,
      status_changed_by: null,
      created_at: '',
      completed_at: null,
      created_by: '',
      updated_at: '',
      team_id: 't',
    };
  }

  it('separa urgent / thisWeek / later por días restantes', () => {
    const urgentByDate = fixture('2026-05-10');
    const today = fixture('2026-05-15');
    const inFiveDays = fixture('2026-05-20');
    const inTwoWeeks = fixture('2026-05-29');
    const r = classifyByUrgency([urgentByDate, today, inFiveDays, inTwoWeeks]);
    expect(r.urgent).toHaveLength(2);
    expect(r.thisWeek).toHaveLength(1);
    expect(r.later).toHaveLength(1);
  });

  it('clasifica como urgent por priority aunque la fecha esté lejos', () => {
    const farButUrgent = fixture('2027-01-01', 'urgent');
    const r = classifyByUrgency([farButUrgent]);
    expect(r.urgent).toHaveLength(1);
  });
});
