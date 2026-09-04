import React from 'react';
import CryptoTable from '../components/CryptoTable.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Navigate } from 'react-router-dom';
import { Star } from 'lucide-react';

const Favorites: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    // Skeleton en lugar de pantalla en blanco mientras se verifica la sesión
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-6 w-32 bg-zinc-800 rounded mb-6" />
        <div className="h-16 w-80 bg-zinc-800 rounded mb-12" />
        <div className="h-96 bg-zinc-900 border border-zinc-800 rounded-3xl" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-12">
        <div className="flex items-center gap-2 text-yellow-500 mb-4">
          <Star size={24} fill="currentColor" />
          <span className="font-bold tracking-widest uppercase text-sm">Watchlist</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter mb-6 leading-tight">
          YOUR SAVED <br />
          <span className="text-zinc-600">ASSETS.</span>
        </h1>
      </header>

      <section>
        <CryptoTable filterFavorites />
      </section>
    </div>
  );
};

export default Favorites;
