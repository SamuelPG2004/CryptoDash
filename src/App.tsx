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
import ForgotPassword from './pages/ForgotPassword.tsx';
import ResetPassword from './pages/ResetPassword.tsx';
import Favorites from './pages/Favorites.tsx';
import Profile from './pages/Profile.tsx';
import { useSocketNotifications } from './services/socket.ts';
import { ToastProvider, useToast } from './context/ToastContext.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import CryptoTableErrorBoundary from './components/CryptoTableErrorBoundary.tsx';
import { useNotificationToasts } from './services/useNotificationToasts.ts';

/**
 * Hoja aislada que consume ToastContext: cada toast solo re-renderiza este
 * componente, no el árbol completo de rutas (Navbar, páginas, gráficos...).
 */
function ToastHost() {
  useNotificationToasts();
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} removeToast={removeToast} />;
}

function AppContent() {
  useSocketNotifications();
  return (
    <Router>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
        <nav role="navigation" aria-label="Principal">
          <Navbar />
        </nav>
        <main role="main" tabIndex={-1}>
          {/* Error boundary global: un crash de render en una página muestra
              un fallback recuperable en lugar de una pantalla en blanco */}
          <CryptoTableErrorBoundary>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </CryptoTableErrorBoundary>
        </main>
        <footer className="border-t border-zinc-900 py-12 mt-20" role="contentinfo">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-zinc-600 text-sm">
              &copy; 2024 CryptoDash MVP. Built for educational purposes.
            </p>
          </div>
        </footer>
        <ToastHost />
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
