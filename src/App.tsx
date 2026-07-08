import { Routes, Route, Link } from 'react-router-dom';

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
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/emergency" element={<Emergency />} />
        </Routes>
      </main>
    </div>
  );
}

function Home() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome to Kuma Care</h1>
      <p className="mt-2 text-gray-600">Your cat care assistant.</p>
    </div>
  );
}

function Chat() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Chat</h1>
    </div>
  );
}

function Emergency() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Emergency Contacts</h1>
    </div>
  );
}
