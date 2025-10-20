/**
 * AI SDK chat route with browser automation tools
 */

import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';
import { createBrowserTools } from '@browser-automator/ai-sdk';
import { createControllerSDK } from '@browser-automator/controller';

// Mock adapter - replace with real WebSocket adapter when Chrome extension is installed
const mockAdapter = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async send<T = any>(message: any): Promise<T> {
    console.log('Mock adapter send:', message);

    // Allow connect to succeed so AI can respond
    if (message.type === 'connect') {
      return { sessionId: 'mock-session', createdAt: Date.now() } as T;
    }

    // For all other operations, throw clear error
    throw new Error(
      '⚠️ Chrome Extension Not Installed\n\n' +
        'Browser automation requires the Chrome extension to be installed and running.\n\n' +
        'To use real browser automation:\n' +
        '1. Install @browser-automator/extension-chrome\n' +
        '2. Connect it via WebSocket\n' +
        '3. Replace this mock adapter with a real WebSocket adapter\n\n' +
        `Attempted action: ${message.type}${message.tool ? ` (${message.tool})` : ''}`
    );
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

  // Convert UIMessage format (from useChat) to ModelMessage format if needed
  const modelMessages =
    messages[0]?.parts !== undefined
      ? convertToModelMessages(messages)
      : messages;

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages: modelMessages,
    tools,
  });

  return result.toUIMessageStreamResponse();
}
