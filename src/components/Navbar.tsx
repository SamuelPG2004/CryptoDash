import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Wallet, LogOut, Star, TrendingUp, User, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'es' : 'en');
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
                <span className="hidden sm:inline">{t('favorites')}</span>
              </Link>
              <Link to="/profile" className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                <User size={18} />
                <span className="hidden sm:inline">{t('profile')}</span>
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
                <span className="hidden md:inline text-sm font-medium">{t('logout')}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-all duration-200"
              >
                {t('login')}
              </Link>
              <Link
                to="/register"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200 shadow-lg shadow-emerald-900/20 active:scale-95"
              >
                {t('register')}
              </Link>
            </div>
          )}
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold text-white uppercase transition-colors"
          >
            <Globe className="text-emerald-500" size={14} />
            {i18n.language.startsWith('en') ? 'EN' : 'ES'}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
