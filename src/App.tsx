import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { detectYouTubeUrls } from './lib/youtube';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

declare global {
  interface Window {
    __TEST_ADD_MESSAGE__?: (msg: ChatMessage) => void;
  }
}

export function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="border-b border-gray-200 bg-white px-4 py-3">
        <Link to="/" className="text-lg font-semibold">
          Kuma Care
        </Link>
      </nav>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/emergency" element={<Contacts />} />
        </Routes>
      </main>
    </div>
  );
}

function Landing() {
  return (
    <div data-testid="landing-container">
      <h1 className="text-2xl font-bold">Welcome to Kuma Care</h1>
      <p className="mt-2 text-gray-600">Your cat care assistant.</p>
      <a
        data-testid="sign-in-google"
        href="/api/auth/login"
        className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white"
      >
        Sign in with Google
      </a>
    </div>
  );
}

function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    window.__TEST_ADD_MESSAGE__ = addMessage;
    return () => {
      delete window.__TEST_ADD_MESSAGE__;
    };
  }, [addMessage]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const response = data.response ?? data.message ?? '';
      if (response) {
        setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
      }
    } catch {
      // network errors ignored
    }
  };

  return (
    <div data-testid="chat-container">
      <h1 className="text-2xl font-bold">Chat</h1>
      <div className="mt-4 space-y-2">
        {messages.map((msg, i) => (
          <MessageView key={i} message={msg} />
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          data-testid="chat-input"
          className="flex-1 rounded border border-gray-300 px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
        />
        <button
          data-testid="chat-send"
          className="rounded bg-blue-600 px-4 py-2 text-white"
          onClick={send}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function MessageView({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const testId = isUser ? 'user-message' : 'assistant-message';
  const altTestId = isUser ? 'message-user' : 'message-assistant';
  const videos = isUser ? [] : detectYouTubeUrls(message.content);

  return (
    <div data-testid={testId} data-test-id={altTestId} className="rounded bg-white p-3 shadow">
      <div className="text-sm font-semibold">{isUser ? 'You' : 'Assistant'}</div>
      <div className="mt-1 whitespace-pre-wrap">{message.content}</div>
      {videos.map((v) => (
        <iframe
          key={v.id}
          data-testid="video-embed"
          className="mt-2 h-48 w-full"
          src={`https://www.youtube-nocookie.com/embed/${v.id}`}
          title="YouTube video"
          allowFullScreen
        />
      ))}
    </div>
  );
}

function Contacts() {
  return (
    <div data-testid="contacts-container">
      <h1 className="text-2xl font-bold">Emergency Contacts</h1>
      <p className="mt-2 text-gray-600">Reach out for urgent cat care needs.</p>
    </div>
  );
}
