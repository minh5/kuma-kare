import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import { fetchContacts, AuthError } from '../lib/api';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; html: string };

export default function Contacts() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const md = await fetchContacts();
        const html = await marked.parse(md);
        if (!cancelled) setState({ status: 'ready', html });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof AuthError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to load contacts.';
        setState({ status: 'error', message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-full px-4 py-8" data-testid="contacts-container">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-stone-800">
            Emergency Contacts
          </h1>
          <Link
            to="/chat"
            className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
          >
            Back to chat
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 ring-1 ring-stone-200">
          {state.status === 'loading' && (
            <p className="text-sm text-stone-400">Loading…</p>
          )}
          {state.status === 'error' && (
            <p className="text-sm text-red-700">{state.message}</p>
          )}
          {state.status === 'ready' && (
            <div
              className="prose prose-sm max-w-none text-stone-800 [&_a]:text-stone-900 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: state.html }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
