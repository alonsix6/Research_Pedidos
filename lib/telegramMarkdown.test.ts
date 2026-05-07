import { describe, it, expect } from 'vitest';
import { escapeMd } from './telegramMarkdown';

describe('escapeMd', () => {
  it('devuelve string vacío para null/undefined/empty', () => {
    expect(escapeMd(null)).toBe('');
    expect(escapeMd(undefined)).toBe('');
    expect(escapeMd('')).toBe('');
  });

  it('no toca texto sin caracteres especiales', () => {
    expect(escapeMd('hola mundo')).toBe('hola mundo');
    expect(escapeMd('Cliente Acme 2026')).toBe('Cliente Acme 2026');
  });

  it('escapa los 4 caracteres reservados de legacy Markdown', () => {
    expect(escapeMd('foo_bar')).toBe('foo\\_bar');
    expect(escapeMd('a*b')).toBe('a\\*b');
    expect(escapeMd('use `cmd`')).toBe('use \\`cmd\\`');
    expect(escapeMd('[draft]')).toBe('\\[draft]');
  });

  it('escapa múltiples caracteres en el mismo string', () => {
    expect(escapeMd('_foo*bar`baz[qux')).toBe('\\_foo\\*bar\\`baz\\[qux');
  });

  it('preserva caracteres no especiales y emojis', () => {
    expect(escapeMd('🔴 *URGENTE*')).toBe('🔴 \\*URGENTE\\*');
    expect(escapeMd('Sí: A_B')).toBe('Sí: A\\_B');
  });
});
