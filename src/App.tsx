import { Routes, Route, Link } from 'react-router-dom';

function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900">
      <h1 className="text-4xl font-bold mb-4">Kuma</h1>
      <p className="text-lg text-gray-600">Welcome to Kuma.</p>
      <Link to="/about" className="mt-6 text-blue-600 hover:underline">
        About
      </Link>
    </div>
  );
}

function About() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900">
      <h1 className="text-4xl font-bold mb-4">About</h1>
      <p className="text-lg text-gray-600">About Kuma.</p>
      <Link to="/" className="mt-6 text-blue-600 hover:underline">
        Home
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
}
