/**
 * @browser-automator/controller
 * Web controller component for browser automation
 */

export const BROWSER_AUTOMATOR_UUID = 'ba-4a8f9c2d-e1b6-4d3a-9f7e-2c8b1a5d6e3f';

export interface BrowserAutomatorConfig {
  endpoint?: string;
  token: string;
  autoConnect?: boolean;
  onConnect?: (session: any) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  showPermissionPrompts?: boolean;
}

export class BrowserAutomatorController {
  private config: BrowserAutomatorConfig;
  private connected = false;

  constructor(config: BrowserAutomatorConfig) {
    this.config = config;
  }

  async connect(): Promise<any> {
    // In real implementation, this would use Comlink to communicate with content script
    this.connected = true;
    const session = {
      sessionId: 'mock-session',
      createdAt: Date.now(),
      tabIds: [],
      permissions: [],
    };
    this.config.onConnect?.(session);
    return session;
  }

  disconnect(): void {
    this.connected = false;
    this.config.onDisconnect?.();
  }

  isConnected(): boolean {
    return this.connected;
  }
}
