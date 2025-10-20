import { describe, it, expect, vi } from 'vitest';
import { BrowserAutomatorController } from './index.js';

describe('BrowserAutomatorController', () => {
  it('should create controller with config', () => {
    const controller = new BrowserAutomatorController({
      token: 'test-token',
    });

    expect(controller).toBeDefined();
    expect(controller.isConnected()).toBe(false);
  });

  it('should connect and call onConnect callback', async () => {
    const onConnect = vi.fn();
    const controller = new BrowserAutomatorController({
      token: 'test-token',
      onConnect,
    });

    await controller.connect();

    expect(controller.isConnected()).toBe(true);
    expect(onConnect).toHaveBeenCalled();
  });

  it('should disconnect and call onDisconnect callback', async () => {
    const onDisconnect = vi.fn();
    const controller = new BrowserAutomatorController({
      token: 'test-token',
      onDisconnect,
    });

    await controller.connect();
    controller.disconnect();

    expect(controller.isConnected()).toBe(false);
    expect(onDisconnect).toHaveBeenCalled();
  });
});
