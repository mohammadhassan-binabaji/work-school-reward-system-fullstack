import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { Router } from 'vue-router';
import { registerBackHandler, setupMobileNavigation } from './mobileNavigation';

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(),
    exitApp: vi.fn(),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

describe('setupMobileNavigation', () => {
  let backButtonHandler: ((event: unknown) => void | Promise<void>) | undefined;
  let router: Router;

  beforeEach(() => {
    vi.clearAllMocks();
    backButtonHandler = undefined;
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(App.addListener).mockImplementation((eventName, listener) => {
      if (eventName === 'backButton') {
        backButtonHandler = listener as (event: unknown) => void | Promise<void>;
      }
      return Promise.resolve({ remove: vi.fn() });
    });

    router = {
      currentRoute: { value: { path: '/' } },
      back: vi.fn(),
      replace: vi.fn(),
      push: vi.fn(),
    } as unknown as Router;

    vi.stubGlobal('window', { history: { state: null } });
  });

  it('requests confirmation instead of exiting at the root route', async () => {
    const requestConfirmation = vi.fn();
    setupMobileNavigation(router, {
      onExitConfirmationRequested: requestConfirmation,
    });

    await backButtonHandler?.({});

    expect(requestConfirmation).toHaveBeenCalledOnce();
    expect(App.exitApp).not.toHaveBeenCalled();
  });

  it('keeps mandatory-update exit immediate without requesting confirmation', async () => {
    const requestConfirmation = vi.fn();
    setupMobileNavigation(router, {
      isMandatoryUpdateActive: () => true,
      onExitConfirmationRequested: requestConfirmation,
    });

    await backButtonHandler?.({});

    expect(App.exitApp).toHaveBeenCalledOnce();
    expect(requestConfirmation).not.toHaveBeenCalled();
  });

  it('keeps normal back navigation on secondary routes', async () => {
    router.currentRoute.value = { path: '/rewards' } as Router['currentRoute']['value'];
    vi.stubGlobal('window', { history: { state: { back: '/' } } });
    const requestConfirmation = vi.fn();
    setupMobileNavigation(router, {
      onExitConfirmationRequested: requestConfirmation,
    });

    await backButtonHandler?.({});

    expect(router.back).toHaveBeenCalledOnce();
    expect(requestConfirmation).not.toHaveBeenCalled();
    expect(App.exitApp).not.toHaveBeenCalled();
  });

  it('uses the existing exit behavior when no confirmation callback is provided', async () => {
    setupMobileNavigation(router);

    await backButtonHandler?.({});

    expect(App.exitApp).toHaveBeenCalledOnce();
  });

  it('allows an open dialog to consume the back event before the root exit', async () => {
    setupMobileNavigation(router, {
      onExitConfirmationRequested: vi.fn(),
    });
    const closeDialog = vi.fn();
    const unregisterBack = registerBackHandler(() => {
      closeDialog();
      return true;
    });

    await backButtonHandler?.({});

    expect(closeDialog).toHaveBeenCalledOnce();
    expect(App.exitApp).not.toHaveBeenCalled();
    unregisterBack();
  });
});
