import { useNavigate } from 'react-router-dom';
import { withBase } from '../lib/basePath';

export default function Landing() {
  const navigate = useNavigate();

  function handleSignIn() {
    // Full-page redirect to the Worker OAuth endpoint (outside the SPA).
    window.location.href = withBase('/api/auth/login');
  }

  return (
    <main className="flex min-h-full flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-sm ring-1 ring-stone-200">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-4xl">
          🐱
        </div>
        <h1 className="text-2xl font-semibold text-stone-800">Kuma</h1>
        <p className="mt-2 text-sm text-stone-500">
          Cat caretaker assistant. Ask anything about Kuma's care routine while
          the owner is away.
        </p>
        <button
          type="button"
          data-testid="sign-in"
          onClick={handleSignIn}
          className="mt-8 w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          Sign in with Google
        </button>
        <button
          type="button"
          onClick={() => navigate('/chat')}
          className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
        >
          Continue to chat
        </button>
      </div>
    </main>
  );
}
