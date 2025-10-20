/**
 * Main DomCore implementation
 * Implements Playwright-MCP compatible automation tools
 */

import { buildAccessibilityTree, formatAsYAML } from './accessibility.js';
import type {
  DomCoreTools,
  NavigateParams,
  ClickParams,
  TypeParams,
  FillFormParams,
  SelectOptionParams,
  ElementTarget,
  DragParams,
  PressKeyParams,
  EvaluateParams,
  WaitParams,
  ConsoleMessagesParams,
  ScreenshotParams,
  ToolResponse,
  ConsoleMessage,
  NetworkRequest,
} from './types.js';

/**
 * Element reference registry
 * Maps ref (e.g., "e1") to actual HTMLElement
 */
class ElementRegistry {
  private elements = new Map<string, HTMLElement>();

  register(ref: string, element: HTMLElement): void {
    this.elements.set(ref, element);
  }

  get(ref: string): HTMLElement | undefined {
    return this.elements.get(ref);
  }

  clear(): void {
    this.elements.clear();
  }
}

export class DomCore implements DomCoreTools {
  private elementRegistry = new ElementRegistry();
  private consoleLog: ConsoleMessage[] = [];
  private networkLog: NetworkRequest[] = [];

  constructor() {
    this.interceptConsole();
    this.interceptNetwork();
  }

  async navigate(params: NavigateParams): Promise<ToolResponse> {
    // In a real browser extension, this would be handled by the extension
    // For now, we'll just create a mock response
    const code = `await page.goto('${params.url}')`;

    // Clear registry on navigate
    this.elementRegistry.clear();

    const tree = await buildAccessibilityTree();
    const pageState = formatAsYAML(tree);

    // Update element registry
    this.updateElementRegistry(tree.elements);

    return {
      code,
      pageState,
    };
  }

  async navigateBack(): Promise<ToolResponse> {
    const code = `await page.goBack()`;

    // In browser, this would be window.history.back()
    // For testing, we'll just rebuild the tree
    const tree = await buildAccessibilityTree();
    const pageState = formatAsYAML(tree);

    return {
      code,
      pageState,
    };
  }

  async snapshot(): Promise<string> {
    // Clear and rebuild element registry
    this.elementRegistry.clear();

    const tree = await buildAccessibilityTree();
    this.updateElementRegistry(tree.elements);

    return formatAsYAML(tree);
  }

  async click(params: ClickParams): Promise<void> {
    let element = this.elementRegistry.get(params.ref);

    // Auto-populate registry if element not found
    if (!element) {
      await this.snapshot();
      element = this.elementRegistry.get(params.ref);
      if (!element) {
        throw new Error(`Element not found: ${params.ref}`);
      }
    }

    if (params.doubleClick) {
      element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    } else {
      element.click();
    }
  }

  async type(params: TypeParams): Promise<void> {
    let element = this.elementRegistry.get(params.ref);

    // Auto-populate registry if element not found
    if (!element) {
      await this.snapshot();
      element = this.elementRegistry.get(params.ref);
      if (!element) {
        throw new Error(`Element not found: ${params.ref}`);
      }
    }

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      // Focus the element first
      element.focus();

      // Clear existing value
      element.value = '';

      if (params.slowly) {
        // Type one character at a time with full event simulation
        for (const char of params.text) {
          element.value += char;

          // Dispatch all necessary events for React/modern frameworks
          element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
          element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));

          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } else {
        // Set value all at once but still trigger events
        element.value = params.text;

        // Dispatch input and change events for React/modern frameworks
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (params.submit) {
        // Submit with Enter key for better compatibility
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

        const form = element.closest('form');
        if (form) {
          form.requestSubmit();
        }
      }
    }
  }

  async fillForm(params: FillFormParams): Promise<void> {
    for (const field of params.fields) {
      await this.type({ element: field.element, ref: field.ref, text: field.value });
    }
  }

  async selectOption(params: SelectOptionParams): Promise<void> {
    const element = this.elementRegistry.get(params.ref);
    if (!element) {
      throw new Error(`Element not found: ${params.ref}`);
    }

    if (element instanceof HTMLSelectElement) {
      for (const option of Array.from(element.options)) {
        option.selected = params.values.includes(option.value);
      }
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  async hover(params: ElementTarget): Promise<void> {
    const element = this.elementRegistry.get(params.ref);
    if (!element) {
      throw new Error(`Element not found: ${params.ref}`);
    }

    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  }

  async drag(params: DragParams): Promise<void> {
    const startElement = this.elementRegistry.get(params.startRef);
    const endElement = this.elementRegistry.get(params.endRef);

    if (!startElement || !endElement) {
      throw new Error('Drag elements not found');
    }

    // Simplified drag implementation
    startElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    endElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  }

  async pressKey(params: PressKeyParams): Promise<void> {
    const event = new KeyboardEvent('keydown', {
      key: params.key,
      bubbles: true,
    });
    document.activeElement?.dispatchEvent(event);
  }

  async evaluate<T = any>(params: EvaluateParams): Promise<ToolResponse<T>> {
    try {
      let result: T;

      if (params.ref) {
        const element = this.elementRegistry.get(params.ref);
        if (!element) {
          throw new Error(`Element not found: ${params.ref}`);
        }

        // Evaluate in context of element
        const fn = new Function(params.function);
        result = fn.call(element) as T;
      } else {
        // Evaluate in global context
        const fn = new Function(params.function);
        result = fn() as T;
      }

      return {
        result,
      };
    } catch (error) {
      return {
        isError: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async waitFor(params: WaitParams): Promise<void> {
    if (params.time !== undefined) {
      await new Promise((resolve) => setTimeout(resolve, params.time! * 1000));
    }

    if (params.text !== undefined) {
      await this.waitForText(params.text, true);
    }

    if (params.textGone !== undefined) {
      await this.waitForText(params.textGone, false);
    }
  }

  async consoleMessages(
    params?: ConsoleMessagesParams,
  ): Promise<ToolResponse<ConsoleMessage[]>> {
    let messages = this.consoleLog;

    if (params?.onlyErrors) {
      messages = messages.filter((msg) => msg.type === 'error');
    }

    return {
      result: messages,
    };
  }

  async networkRequests(): Promise<ToolResponse<NetworkRequest[]>> {
    return {
      result: this.networkLog,
    };
  }

  async takeScreenshot(params?: ScreenshotParams): Promise<Blob> {
    // In a real implementation, this would use canvas to capture the page
    // For now, return empty blob
    return new Blob([], { type: `image/${params?.type || 'png'}` });
  }

  // Helper methods

  private updateElementRegistry(elements: any[], path: string[] = []): void {
    for (const element of elements) {
      // Find the actual DOM element
      const domElement = this.findDOMElementByRef(element.ref);
      if (domElement) {
        this.elementRegistry.register(element.ref, domElement);
      }

      if (element.children) {
        this.updateElementRegistry(element.children, [...path, element.ref]);
      }
    }
  }

  private findDOMElementByRef(ref: string): HTMLElement | null {
    // We need to find the element by position in the tree
    // This is a simplified implementation
    const refNum = parseInt(ref.substring(1), 10);
    const allElements = Array.from(document.querySelectorAll('*'));
    let counter = 0;

    for (const el of allElements) {
      if (!(el instanceof HTMLElement)) continue;

      if (this.isAccessibleElement(el)) {
        counter++;
        if (counter === refNum) {
          return el;
        }
      }
    }

    return null;
  }

  private isAccessibleElement(element: HTMLElement): boolean {
    if (element.hidden || element.style.display === 'none') {
      return false;
    }

    if (element.hasAttribute('role')) {
      return true;
    }

    const interactiveTags = [
      'A',
      'BUTTON',
      'INPUT',
      'SELECT',
      'TEXTAREA',
      'DETAILS',
      'DIALOG',
    ];
    if (interactiveTags.includes(element.tagName)) {
      return true;
    }

    const semanticTags = [
      'NAV',
      'HEADER',
      'FOOTER',
      'MAIN',
      'ASIDE',
      'SECTION',
      'ARTICLE',
    ];
    if (semanticTags.includes(element.tagName)) {
      return true;
    }

    if (
      element.hasAttribute('aria-label') ||
      element.hasAttribute('aria-labelledby')
    ) {
      return true;
    }

    return false;
  }

  private async waitForText(text: string, shouldExist: boolean): Promise<void> {
    const checkInterval = 100;
    const timeout = 30000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const exists = document.body.textContent?.includes(text) || false;

      if (exists === shouldExist) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    throw new Error(
      `Timeout waiting for text "${text}" to ${shouldExist ? 'appear' : 'disappear'}`,
    );
  }

  private interceptConsole(): void {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.log = (...args: any[]) => {
      this.consoleLog.push({
        type: 'log',
        text: args.join(' '),
        timestamp: Date.now(),
      });
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.consoleLog.push({
        type: 'error',
        text: args.join(' '),
        timestamp: Date.now(),
      });
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.consoleLog.push({
        type: 'warn',
        text: args.join(' '),
        timestamp: Date.now(),
      });
      originalWarn.apply(console, args);
    };

    console.info = (...args: any[]) => {
      this.consoleLog.push({
        type: 'info',
        text: args.join(' '),
        timestamp: Date.now(),
      });
      originalInfo.apply(console, args);
    };
  }

  private interceptNetwork(): void {
    // In a real implementation, this would use Performance API or Service Worker
    // For now, this is a placeholder
  }
}
