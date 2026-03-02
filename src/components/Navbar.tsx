import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Wallet, LogOut, Star, TrendingUp, User } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-zinc-950 border-b border-zinc-800 text-white p-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tighter">
          <TrendingUp className="text-emerald-500" />
          <span>CRYPTO<span className="text-emerald-500">DASH</span></span>
        </Link>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link to="/favorites" className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                <Star size={18} />
                <span className="hidden sm:inline">Favoritos</span>
              </Link>
              <Link to="/profile" className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                <User size={18} />
                <span className="hidden sm:inline">Perfil</span>
              </Link>
              <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                <Wallet size={16} className="text-emerald-500" />
                <span className="text-sm font-mono">${user.wallet.toLocaleString()}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-900 rounded-lg transition-colors text-zinc-400 hover:text-white"
              >
                <LogOut size={18} />
                <span className="hidden md:inline text-sm font-medium">Cerrar Sesión</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link 
                to="/login" 
                className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-all duration-200"
              >
                Iniciar Sesión
              </Link>
              <Link 
                to="/register" 
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200 shadow-lg shadow-emerald-900/20 active:scale-95"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
