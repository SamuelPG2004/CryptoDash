/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import Navbar from './components/Navbar.tsx';
import Home from './pages/Home.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Favorites from './pages/Favorites.tsx';
import Profile from './pages/Profile.tsx';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </main>
          <footer className="border-t border-zinc-900 py-12 mt-20">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <p className="text-zinc-600 text-sm">
                &copy; 2024 CryptoDash MVP. Built for educational purposes.
              </p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
