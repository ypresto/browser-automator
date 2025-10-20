import { describe, it, expect, beforeEach } from 'vitest';
import { DomCore } from './dom-core.js';

describe('DomCore', () => {
  let domCore: DomCore;

  beforeEach(() => {
    document.body.innerHTML = '';
    domCore = new DomCore();
  });

  describe('snapshot', () => {
    it('should return YAML formatted snapshot', async () => {
      document.body.innerHTML = `
        <button>Click me</button>
        <input type="text" placeholder="Username" />
      `;

      const snapshot = await domCore.snapshot();

      expect(snapshot).toContain('- Page URL:');
      expect(snapshot).toContain('- Page Title:');
      expect(snapshot).toContain('- Page Snapshot:');
      expect(snapshot).toContain('button');
      expect(snapshot).toContain('[ref=e');
    });
  });

  describe('click', () => {
    it('should click element by ref', async () => {
      document.body.innerHTML = `
        <button id="btn">Click me</button>
      `;

      let clicked = false;
      const button = document.getElementById('btn')!;
      button.addEventListener('click', () => {
        clicked = true;
      });

      const snapshot = await domCore.snapshot();
      const refMatch = snapshot.match(/\[ref=(e\d+)\]/);
      expect(refMatch).toBeDefined();
      const ref = refMatch![1]!;

      await domCore.click({ element: 'Click me', ref });

      expect(clicked).toBe(true);
    });
  });

  describe('type', () => {
    it('should type text into input', async () => {
      document.body.innerHTML = `
        <input id="input" type="text" />
      `;

      const snapshot = await domCore.snapshot();
      const refMatch = snapshot.match(/\[ref=(e\d+)\]/);
      const ref = refMatch![1]!;

      await domCore.type({ element: 'textbox', ref, text: 'Hello' });

      const input = document.getElementById('input') as HTMLInputElement;
      expect(input.value).toBe('Hello');
    });
  });

  describe('evaluate', () => {
    it('should evaluate JavaScript expression', async () => {
      const response = await domCore.evaluate({
        function: 'return 2 + 2',
      });

      expect(response.result).toBe(4);
    });

    it('should handle errors in evaluation', async () => {
      const response = await domCore.evaluate({
        function: 'throw new Error("Test error")',
      });

      expect(response.isError).toBe(true);
      expect(response.error).toContain('Test error');
    });
  });

  describe('waitFor', () => {
    it('should wait for specified time', async () => {
      const start = Date.now();
      await domCore.waitFor({ time: 0.1 });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('consoleMessages', () => {
    it('should capture console messages', async () => {
      console.log('Test message');

      const response = await domCore.consoleMessages();

      expect(response.result).toBeDefined();
      const hasTestMessage = response.result!.some((msg) =>
        msg.text.includes('Test message'),
      );
      expect(hasTestMessage).toBe(true);
    });
  });
});
