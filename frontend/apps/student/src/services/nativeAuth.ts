import { Capacitor, registerPlugin } from '@capacitor/core';
import { api } from '@student-reward/shared';

interface NativeAuthPlugin {
  getSession(): Promise<{ sessionId?: string }>;
  saveSession(options: { sessionId: string }): Promise<void>;
  clearSession(): Promise<void>;
  savePassword(options: { username: string; password: string }): Promise<{ saved: boolean }>;
  getPassword(): Promise<{ found: boolean; username?: string; password?: string }>;
}

const NativeAuth = registerPlugin<NativeAuthPlugin>('NativeAuth');

export interface SavedPasswordCredential {
  username: string;
  password: string;
}

export function isAndroidApp(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export async function getSavedPassword(): Promise<SavedPasswordCredential | null> {
  if (!isAndroidApp()) return null;

  const result = await NativeAuth.getPassword();
  if (!result.found) return null;
  if (!result.username || !result.password) {
    throw new Error('Android password manager returned an incomplete credential.');
  }

  return { username: result.username, password: result.password };
}

export async function restoreNativeSession(): Promise<void> {
  if (!isAndroidApp()) return;
  const { sessionId } = await NativeAuth.getSession();
  if (sessionId) {
    api.setNativeSessionId(sessionId);
  }
}

export async function storeNativeSession(sessionId: string, rememberMe: boolean): Promise<void> {
  api.setNativeSessionId(sessionId);
  if (rememberMe) {
    await NativeAuth.saveSession({ sessionId });
  } else {
    await NativeAuth.clearSession();
  }
}

export async function clearNativeSession(): Promise<void> {
  try {
    if (isAndroidApp()) {
      await NativeAuth.clearSession();
    }
  } finally {
    api.clearSession();
  }
}

export async function offerPasswordSave(username: string, password: string): Promise<void> {
  if (!isAndroidApp()) return;
  await NativeAuth.savePassword({ username, password });
}
