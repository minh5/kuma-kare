import { lazy, Suspense, Fragment } from 'react';
import { detectYouTubeUrls } from '../lib/youtube';
import type { ChatMessage as ChatMessageType } from '../lib/api';

const VideoEmbed = lazy(() => import('./VideoEmbed'));

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  const matches = detectYouTubeUrls(message.content);

  // Split content into text segments and embed slots in order of appearance.
  const parts: Array<{ type: 'text'; value: string } | { type: 'video'; videoId: string }> = [];
  if (matches.length === 0) {
    parts.push({ type: 'text', value: message.content });
  } else {
    let cursor = 0;
    for (const m of matches) {
      const idx = message.content.indexOf(m.url, cursor);
      if (idx === -1) continue;
      if (idx > cursor) {
        parts.push({ type: 'text', value: message.content.slice(cursor, idx) });
      }
      parts.push({ type: 'video', videoId: m.videoId });
      cursor = idx + m.url.length;
    }
    if (cursor < message.content.length) {
      parts.push({ type: 'text', value: message.content.slice(cursor) });
    }
  }

  return (
    <div
      data-testid={isUser ? 'message-user' : 'message-assistant'}
      className={[
        'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ring-1',
        isUser
          ? 'self-end bg-stone-900 text-white ring-stone-900'
          : 'self-start bg-white text-stone-800 ring-stone-200',
      ].join(' ')}
    >
      {parts.map((part, i) =>
        part.type === 'text' ? (
          <Fragment key={i}>
            {part.value}
          </Fragment>
        ) : (
          <Suspense key={i} fallback={<div className="mt-3 h-32 rounded-xl bg-stone-100" />}>
            <VideoEmbed videoId={part.videoId} />
          </Suspense>
        ),
      )}
    </div>
  );
}
