'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';

const BROWSER_AUTOMATOR_UUID = 'ba-4a8f9c2d-e1b6-4d3a-9f7e-2c8b1a5d6e3f';

export default function ChatPage() {
  const { messages, status, sendMessage } = useChat();
  const [input, setInput] = useState('');
  const [extensionStatus, setExtensionStatus] = useState<'checking' | 'active' | 'inactive'>('checking');

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let responded = false;

    // Wake up extension on page load
    const wakeUpExtension = () => {
      // Send wake-up message to content script
      window.postMessage({
        type: 'browser-automator-wake-up',
        uuid: BROWSER_AUTOMATOR_UUID,
      }, '*');

      // Listen for response
      const handleResponse = (event: MessageEvent) => {
        if (event.data?.type === 'browser-automator-wake-up-response') {
          responded = true;
          clearTimeout(timeoutId);
          setExtensionStatus(event.data.success ? 'active' : 'inactive');
          window.removeEventListener('message', handleResponse);
        }
      };
      window.addEventListener('message', handleResponse);

      // Timeout after 2 seconds - only set inactive if no response
      timeoutId = setTimeout(() => {
        if (!responded) {
          setExtensionStatus('inactive');
        }
        window.removeEventListener('message', handleResponse);
      }, 2000);
    };

    // Small delay to ensure content script is loaded
    const initialDelay = setTimeout(wakeUpExtension, 100);

    // Cleanup on unmount
    return () => {
      clearTimeout(initialDelay);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Browser Automator Chat</h1>
        <p className="text-gray-600">
          Chat with AI to automate your browser. Try: &quot;Navigate to example.com and get the page snapshot&quot;
        </p>
        {extensionStatus === 'checking' && (
          <p className="text-xs text-gray-500 mt-1">🔄 Connecting to extension...</p>
        )}
        {extensionStatus === 'active' && (
          <p className="text-xs text-green-600 mt-1">✓ Extension connected</p>
        )}
        {extensionStatus === 'inactive' && (
          <p className="text-xs text-red-600 mt-1">✗ Extension not responding (reload extension at chrome://extensions/)</p>
        )}
      </header>

      <div className="flex-1 overflow-y-auto mb-4 border rounded-lg p-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-gray-400 text-center mt-8">
            Start a conversation to begin browser automation...
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 ${
              message.role === 'user' ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block p-3 rounded-lg max-w-[80%] ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border'
              }`}
            >
              <div className="font-semibold text-sm mb-1">
                {message.role === 'user' ? 'You' : 'AI'}
              </div>
              <div className="whitespace-pre-wrap">
                {message.parts.map((part, partIdx) => {
                  if (part.type === 'text') {
                    return <span key={partIdx}>{part.text}</span>;
                  }

                  // Check for tool errors (state: 'output-error')
                  if ('state' in part && part.state === 'output-error') {
                    return (
                      <div key={partIdx} className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                        <div className="font-semibold mb-1">❌ Tool Error</div>
                        <div className="whitespace-pre-wrap">{part.errorText}</div>
                      </div>
                    );
                  }

                  if (part.type.startsWith('tool-')) {
                    return (
                      <div key={partIdx} className="mt-1 font-mono text-xs text-blue-600">
                        🔧 Tool: {part.type}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        ))}

        {status === 'streaming' && (
          <div className="text-center text-gray-500">
            <div className="inline-block animate-pulse">AI is thinking...</div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message... (e.g., 'Navigate to google.com')"
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={status !== 'ready'}
        />
        <button
          type="submit"
          disabled={status !== 'ready'}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
