import { describe, it, expect } from 'vitest';
// CommonJS module sin tipos.
import * as mod from './_telegramMarkdown.js';

const { escapeMd } = mod as { escapeMd: (s: unknown) => string };

describe('_telegramMarkdown (CJS sibling de lib/telegramMarkdown.ts)', () => {
  it('null/undefined → ""', () => {
    expect(escapeMd(null)).toBe('');
    expect(escapeMd(undefined)).toBe('');
    expect(escapeMd('')).toBe('');
  });

  it('escapa _ * ` [', () => {
    expect(escapeMd('a_b')).toBe('a\\_b');
    expect(escapeMd('a*b')).toBe('a\\*b');
    expect(escapeMd('a`b')).toBe('a\\`b');
    expect(escapeMd('a[b')).toBe('a\\[b');
  });

  it('coerce a string para que numbers no rompan', () => {
    expect(escapeMd(123)).toBe('123');
  });

  it('preserva texto sin chars especiales', () => {
    expect(escapeMd('hola mundo 🚀')).toBe('hola mundo 🚀');
  });
});
