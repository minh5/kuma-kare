import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ChatInput from '../components/ChatInput';
import ChatMessage from '../components/ChatMessage';
import { sendChatMessage, AuthError, type ChatMessage as ChatMessageType } from '../lib/api';

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessageType = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const response = await sendChatMessage(nextMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else {
        setError(
          err instanceof Error ? err.message : 'Something went wrong.',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col" data-testid="chat-container">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐱</span>
          <span className="font-semibold text-stone-800">Kuma</span>
        </div>
        <Link
          to="/contacts"
          className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
        >
          Emergency Contacts
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.length === 0 && !loading && (
            <div className="rounded-2xl bg-white p-6 text-sm text-stone-500 ring-1 ring-stone-200">
              Ask me about feeding, the litter box, medication, or Kuma's
              quirks. Chat history is kept in memory only and clears on refresh.
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}

          {loading && (
            <div className="self-start rounded-2xl bg-white px-4 py-3 text-sm text-stone-400 ring-1 ring-stone-200">
              <span className="inline-flex gap-1">
                <span className="animate-bounce [animation-delay:-0.3s]">·</span>
                <span className="animate-bounce [animation-delay:-0.15s]">·</span>
                <span className="animate-bounce">·</span>
              </span>
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-stone-200 bg-white px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
