import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { UserPlus, Mail, Lock, AlertCircle, User, Phone, Calendar, Globe, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { COUNTRIES } from '../constants.ts';

const calculateAge = (birthDateString: string) => {
  if (!birthDateString) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const Register: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    country: 'México',
    phoneNumber: '',
    birthDate: '',
    securityPin: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (formData.email && formData.password.length >= 6) {
        setStep(2);
        setError('');
      } else {
        setError('Please provide a valid email and password (min 6 chars)');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Final validations
    const ageNum = calculateAge(formData.birthDate);
    if (ageNum < 18) {
      return setError('Debes ser mayor de 18 años para usar CryptoDash');
    }

    if (formData.securityPin.length < 4 || formData.securityPin.length > 6) {
      return setError('Security PIN must be between 4 and 6 digits.');
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        ...formData,
        age: ageNum
      });
      login(data.token, data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6 bg-zinc-900">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-10 shadow-2xl">
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center mb-4">
            <UserPlus className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Crear Cuenta</h1>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
            <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
            <span className="text-zinc-500 text-xs uppercase tracking-widest ml-2">Paso {step} de 2</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-3 text-rose-500 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleNext} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                  placeholder="nombre@ejemplo.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 mt-6 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
            >
              Continuar al Perfil <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    name="fullName"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    placeholder="Juan Pérez"
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">País</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <select
                    name="country"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 appearance-none"
                    value={formData.country}
                    onChange={handleChange}
                  >
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Número de Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="tel"
                    name="phoneNumber"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    placeholder="+52 123 456 7890"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Fecha de Nacimiento</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="date"
                    name="birthDate"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    value={formData.birthDate}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">PIN de Seguridad (4-6 dígitos)</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="password"
                    name="securityPin"
                    required
                    pattern="[0-9]*"
                    inputMode="numeric"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    placeholder="••••"
                    value={formData.securityPin}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
              >
                <ArrowLeft size={18} /> Atrás
              </button>
              <button
                type="submit"
                disabled={loading || (step === 2 && formData.birthDate ? calculateAge(formData.birthDate) < 18 : false)}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95"
              >
                {loading ? 'Creando cuenta...' : 'Completar Registro'}
              </button>
            </div>
            {step === 2 && formData.birthDate && calculateAge(formData.birthDate) < 18 && (
              <p className="text-rose-500 text-xs font-medium mt-2 text-center">
                Debes ser mayor de 18 años para usar CryptoDash
              </p>
            )}
          </form>
        )}

        <p className="text-center text-zinc-500 text-sm mt-8">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="text-emerald-500 hover:text-emerald-400 font-medium">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
