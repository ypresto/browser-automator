/**
 * AI SDK chat route with browser automation tools
 */

import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createBrowserTools } from '@browser-automator/ai-sdk';
import { createControllerSDK } from '@browser-automator/controller';

// Create a mock adapter for now
// In production, this would connect to actual WebSocket
const mockAdapter = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async send<T = any>(message: any): Promise<T> {
    console.log('Mock adapter send:', message);
    // Return mock responses
    if (message.type === 'connect') {
      return { sessionId: 'mock-session', createdAt: Date.now() } as T;
    }
    if (message.type === 'createTab') {
      return {
        id: 1,
        url: message.url,
        title: 'Mock Tab',
        sessionId: 'mock-session',
      } as T;
    }
    if (message.type === 'execute') {
      if (message.tool === 'snapshot') {
        return `- Page URL: ${message.args?.url || 'https://example.com'}
- Page Title: Example Page
- Page Snapshot:
  - button [ref=e1]: "Click me"
  - textbox [ref=e2]: "Username"` as T;
      }
      if (message.tool === 'navigate') {
        return {
          code: `navigate('${message.args.url}')`,
          pageState: '- Page URL: ' + message.args.url,
        } as T;
      }
      return { success: true } as T;
    }
    return {} as T;
  },
  onMessage() {},
  close() {},
};

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Create SDK with mock adapter
  const sdk = createControllerSDK({ adapter: mockAdapter, defaultTabId: 1 });

  // Connect to extension (mock for now)
  await sdk.connect('demo-token');

  // Create browser automation tools
  const tools = createBrowserTools(sdk);

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages,
    tools,
  });

  return result.toUIMessageStreamResponse();
}
