import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import api from '../services/api.ts';
import { User, Mail, Globe, Calendar, Phone, Shield, Edit3, Lock, AlertCircle, CheckCircle2, X, Wallet, TrendingUp, Bell, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { COUNTRIES } from '../constants.ts';

const Profile: React.FC = () => {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<'edit' | 'password' | null>(null);
  const [pin, setPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [editData, setEditData] = useState<any>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/users/profile');
      setProfile(data);
      setEditData(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (modalType === 'password') {
        await api.put('/users/password', { pin, newPassword });
        setSuccess('Password updated successfully');
      } else if (modalType === 'edit') {
        const { data } = await api.put('/users/profile', { ...editData, pin });
        setProfile(data);
        setSuccess('Profile updated successfully');
      }

      setTimeout(() => {
        setModalType(null);
        setPin('');
        setNewPassword('');
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const removeAlert = async (alertId: string) => {
    try {
      const { data } = await api.delete(`/users/alerts/${alertId}`);
      setProfile({ ...profile, alerts: data });
    } catch (err) {
      console.error('Error removing alert', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-zinc-950">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] p-4 sm:p-8 bg-zinc-950">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <User size={160} className="text-emerald-500" />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
            <div className="w-32 h-32 rounded-full bg-emerald-600/20 border-4 border-zinc-800 flex items-center justify-center text-emerald-500 text-4xl font-bold shadow-inner">
              {profile.fullName?.charAt(0) || profile.email.charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-white mb-1">{profile.fullName || 'User'}</h1>
              <p className="text-zinc-500 flex items-center justify-center sm:justify-start gap-2">
                <Mail size={16} /> {profile.email}
              </p>
              <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
                <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs rounded-full border border-zinc-700 uppercase tracking-widest font-medium">
                  Miembro desde: {format(new Date(profile.createdAt), 'MMMM yyyy')}
                </span>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs rounded-full border border-emerald-500/20 uppercase tracking-widest font-medium">
                  Cuenta Verificada
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <TrendingUp size={120} className="text-emerald-500" />
          </div>

          <div className="flex items-center justify-between mb-8 relative z-10">
            <h3 className="text-xl font-bold text-white flex items-center gap-3 uppercase tracking-tight">
              <Wallet className="text-emerald-500" size={20} /> Mi Portafolio
            </h3>
            <div className="text-right">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-black mb-1">Saldo Disponible</p>
              <p className="text-3xl font-black text-white font-mono">${profile.wallet?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
            {profile.portfolio?.length > 0 ? (
              profile.portfolio.map((item: any) => (
                <div key={item.coinId} className="bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 p-5 rounded-2xl group hover:border-emerald-500/30 transition-all shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-2xl font-black text-white leading-none uppercase">{item.symbol}</span>
                      <span className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-widest">{item.coinId}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-emerald-400 font-mono font-bold">{item.amount.toFixed(6)}</span>
                      <span className="text-[9px] text-zinc-600 uppercase font-black">Tokens</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-end">
                    <div>
                      <p className="text-zinc-600 text-[9px] uppercase font-black leading-none mb-1">Compra Promedio</p>
                      <p className="text-white font-mono text-sm">${item.averagePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="h-8 w-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <TrendingUp size={16} className="text-emerald-500" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-zinc-950/30 border-2 border-zinc-800 border-dashed rounded-3xl">
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No tienes activos aún</p>
                <p className="text-zinc-600 text-[10px] mt-2">Empieza a operar desde el Dashboard principal</p>
              </div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              <Shield size={14} className="text-emerald-500" /> Información Personal
            </h3>
            <div className="space-y-4">
              <DetailItem icon={<Globe size={18} />} label="País" value={profile.country} />
              <DetailItem icon={<Phone size={18} />} label="Teléfono" value={profile.phoneNumber} />
              <DetailItem icon={<Calendar size={18} />} label="Edad" value={`${profile.age} años`} />
              <DetailItem icon={<Calendar size={18} />} label="Fecha de Nacimiento" value={format(new Date(profile.birthDate), 'PPP')} />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-center gap-4">
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Acciones de Seguridad</h3>
            <button
              onClick={() => { setModalType('edit'); setError(''); setSuccess(''); }}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 border border-zinc-700"
            >
              <Edit3 size={18} /> Editar Detalles del Perfil
            </button>
            <button
              onClick={() => { setModalType('password'); setError(''); setSuccess(''); }}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 border border-zinc-700"
            >
              <Lock size={18} /> Cambiar Contraseña
            </button>
          </div>
        </div>

        {/* Alerts Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <h3 className="text-xl font-bold text-white flex items-center gap-3 uppercase tracking-tight mb-6">
            <Bell className="text-emerald-500" size={20} /> Mis Alertas de Precio
          </h3>
          <div className="space-y-3">
            {profile.alerts && profile.alerts.length > 0 ? (
              profile.alerts.map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                  <div className="flex items-center gap-4">
                    <div className="font-bold text-white">{alert.symbol}</div>
                    <div className="text-sm text-zinc-400">
                      {alert.condition === 'above' ? 'Sube por encima de' : 'Cae por debajo de'}{' '}
                      <span className="font-mono text-emerald-400">${alert.targetPrice}</span>
                    </div>
                  </div>
                  <button onClick={() => removeAlert(alert.id)} className="text-zinc-500 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-zinc-500 text-sm italic">No tienes alertas configuradas. Agrégalas desde la página principal.</div>
            )}
          </div>
        </div>

        {/* Modals */}
        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setModalType(null)}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center mb-4">
                  {modalType === 'edit' ? <Edit3 className="text-emerald-500" /> : <Lock className="text-emerald-500" />}
                </div>
                <h2 className="text-xl font-bold text-white">
                  {modalType === 'edit' ? 'Editar Perfil' : 'Cambiar Contraseña'}
                </h2>
                <p className="text-zinc-500 text-sm mt-1 text-center">
                  Se requiere el PIN de seguridad para confirmar los cambios
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-3 text-rose-500 text-xs">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3 text-emerald-500 text-xs">
                  <CheckCircle2 size={16} /> {success}
                </div>
              )}

              <form onSubmit={handleAction} className="space-y-4">
                {modalType === 'edit' && (
                  <div className="space-y-3 mb-6">
                    <input
                      type="text"
                      placeholder="Nombre Completo"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      value={editData.fullName}
                      onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                    />
                    <input
                      type="tel"
                      placeholder="Número de Teléfono"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      value={editData.phoneNumber}
                      onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                    />
                    <select
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                      value={editData.country}
                      onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                    >
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                {modalType === 'password' && (
                  <div className="mb-6">
                    <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Nueva Contraseña</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">PIN de Seguridad</label>
                  <input
                    type="password"
                    placeholder="••••"
                    required
                    pattern="[0-9]*"
                    inputMode="numeric"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 text-white text-center text-2xl tracking-[1em] focus:outline-none focus:border-emerald-500 transition-colors"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !!success}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all mt-4"
                >
                  {submitting ? 'Procesando...' : 'Confirmar Cambios'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-4 group">
    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-all">
      {icon}
    </div>
    <div>
      <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">{label}</p>
      <p className="text-white font-medium">{value}</p>
    </div>
  </div>
);

export default Profile;
