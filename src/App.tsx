import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { detectYouTubeUrls } from './lib/youtube';

/* ------------------------------------------------------------------ */
/* Landing Page                                                        */
/* ------------------------------------------------------------------ */

function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900">
      <h1 className="text-4xl font-bold mb-4">Kuma</h1>
      <p className="text-lg text-gray-600 mb-8">
        Your AI cat care companion.
      </p>
      <a
        data-testid="sign-in-google"
        href="/api/auth/login"
        className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
      >
        Sign in with Google
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Message rendering with YouTube embed support                        */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function MessageContent({ content }: { content: string }) {
  const urls = detectYouTubeUrls(content);
  if (urls.length === 0) {
    return <span>{content}</span>;
  }

  // Render text with embedded YouTube iframes for each detected URL.
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const sorted = [...urls].sort((a, b) => content.indexOf(a.url) - content.indexOf(b.url));
  sorted.forEach((u, i) => {
    const idx = content.indexOf(u.url, lastIndex);
    if (idx > lastIndex) {
      parts.push(<span key={`text-${i}`}>{content.slice(lastIndex, idx)}</span>);
    }
    parts.push(
      <iframe
        key={`video-${i}`}
        src={`https://www.youtube-nocookie.com/embed/${u.id}`}
        title={`YouTube video ${u.id}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full max-w-md aspect-video rounded-lg my-2"
      />,
    );
    lastIndex = idx + u.url.length;
  });
  if (lastIndex < content.length) {
    parts.push(<span key="text-tail">{content.slice(lastIndex)}</span>);
  }
  return <span>{parts}</span>;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div
      data-testid={isUser ? 'message-user' : 'message-assistant'}
      className={`mb-3 max-w-[80%] px-4 py-2 rounded-2xl ${
        isUser ? 'self-end bg-blue-600 text-white' : 'self-start bg-gray-200 text-gray-900'
      }`}
    >
      <MessageContent content={message.content} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chat Page                                                           */
/* ------------------------------------------------------------------ */

function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messageAreaRef = useRef<HTMLDivElement>(null);

  // Support test injection of messages via CustomEvent.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { content: string } | undefined;
      if (detail && typeof detail.content === 'string') {
        setMessages((prev) => [...prev, { role: 'assistant', content: detail.content }]);
      }
    };
    window.addEventListener('test:inject-message', handler);
    return () => window.removeEventListener('test:inject-message', handler);
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMessage: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();
      const responseText: string =
        data.response ?? data.content ?? data.message ?? 'Sorry, something went wrong.';
      setMessages((prev) => [...prev, { role: 'assistant', content: responseText }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="chat-container" className="min-h-screen flex flex-col bg-gray-50">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <h2 className="text-xl font-semibold text-gray-900">Chat</h2>
        <Link
          data-testid="contacts-link"
          to="/contacts"
          className="text-blue-600 hover:underline"
        >
          Contacts
        </Link>
      </header>

      <div
        ref={messageAreaRef}
        data-testid="message-area"
        className="flex-1 overflow-y-auto p-4 flex flex-col"
      >
        {messages.length === 0 && (
          <p className="text-gray-400 text-center mt-8">
            Ask me anything about cat care.
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
      </div>

      <div className="p-4 bg-white border-t flex gap-2">
        <input
          data-testid="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage();
          }}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          data-testid="send-button"
          onClick={sendMessage}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contacts Page                                                       */
/* ------------------------------------------------------------------ */

function Contacts() {
  return (
    <div
      data-testid="contacts-container"
      className="min-h-screen flex flex-col bg-gray-50"
    >
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
        <Link
          data-testid="chat-link"
          to="/chat"
          className="text-blue-600 hover:underline"
        >
          Chat
        </Link>
      </header>
      <div className="p-4">
        <p className="text-gray-600">
          Emergency vet contacts and care resources.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/contacts" element={<Contacts />} />
    </Routes>
  );
}
