import { useState, type KeyboardEvent } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export default function ChatInput({ value, onChange, onSend, disabled }: Props) {
  const [focused, setFocused] = useState(false);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div
      className={[
        'flex items-end gap-2 rounded-2xl bg-white p-2 ring-1 transition',
        focused ? 'ring-stone-400' : 'ring-stone-200',
      ].join(' ')}
    >
      <textarea
        data-testid="chat-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={1}
        placeholder="Ask about Kuma's care…"
        disabled={disabled}
        className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none disabled:opacity-50"
      />
      <button
        type="button"
        data-testid="send-button"
        onClick={onSend}
        disabled={disabled || value.trim().length === 0}
        className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Send
      </button>
    </div>
  );
}
