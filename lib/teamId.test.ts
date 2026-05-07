import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('getRequiredTeamId', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.TEAM_ID;
    delete process.env.NEXT_PUBLIC_TEAM_ID;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('en server: devuelve TEAM_ID si está', async () => {
    process.env.TEAM_ID = 'server-team-uuid';
    const { getRequiredTeamId } = await import('./teamId');
    expect(getRequiredTeamId()).toBe('server-team-uuid');
  });

  it('en server: usa NEXT_PUBLIC_TEAM_ID como fallback', async () => {
    process.env.NEXT_PUBLIC_TEAM_ID = 'public-team-uuid';
    const { getRequiredTeamId } = await import('./teamId');
    expect(getRequiredTeamId()).toBe('public-team-uuid');
  });

  it('en server: TEAM_ID tiene prioridad sobre NEXT_PUBLIC_TEAM_ID', async () => {
    process.env.TEAM_ID = 'server-uuid';
    process.env.NEXT_PUBLIC_TEAM_ID = 'public-uuid';
    const { getRequiredTeamId } = await import('./teamId');
    expect(getRequiredTeamId()).toBe('server-uuid');
  });

  it('lanza si no hay ninguna env configurada', async () => {
    const { getRequiredTeamId } = await import('./teamId');
    expect(() => getRequiredTeamId()).toThrow(/TEAM_ID/);
  });
});
