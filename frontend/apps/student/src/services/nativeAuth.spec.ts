import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { getSavedPassword } from './nativeAuth';

const { getPassword } = vi.hoisted(() => ({
  getPassword: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(),
  },
  registerPlugin: vi.fn(() => ({ getPassword })),
}));

vi.mock('@student-reward/shared', () => ({
  api: {
    setNativeSessionId: vi.fn(),
    clearSession: vi.fn(),
  },
}));

describe('getSavedPassword', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.getPlatform).mockReset();
    getPassword.mockReset();
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
  });

  it('returns a selected Android password credential', async () => {
    getPassword.mockResolvedValue({
      found: true,
      username: '1234567890',
      password: 'student-password',
    });

    await expect(getSavedPassword()).resolves.toEqual({
      username: '1234567890',
      password: 'student-password',
    });
    expect(getPassword).toHaveBeenCalledOnce();
  });

  it('returns null when no credential is found or the picker is dismissed', async () => {
    getPassword.mockResolvedValue({ found: false });

    await expect(getSavedPassword()).resolves.toBeNull();
  });

  it('rejects unexpected native errors', async () => {
    const error = new Error('Credential provider unavailable');
    getPassword.mockRejectedValue(error);

    await expect(getSavedPassword()).rejects.toBe(error);
  });

  it('rejects an incomplete credential response', async () => {
    getPassword.mockResolvedValue({ found: true, username: '1234567890' });

    await expect(getSavedPassword()).rejects.toThrow('incomplete credential');
  });

  it('does not invoke the native plugin on web', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');

    await expect(getSavedPassword()).resolves.toBeNull();
    expect(getPassword).not.toHaveBeenCalled();
  });
});
