/**
 * @fileoverview Profile — Página de perfil del usuario.
 *
 * REFACTORIZACIÓN APLICADA (vs. versión original de 344 líneas):
 *
 *  ✅ SRP — Puramente presentacional:
 *     Sin ninguna llamada a `api` directa. Toda la carga de datos y mutaciones
 *     está en hooks dedicados:
 *       - `useUserProfile`       → perfil, alertas, acciones de seguridad
 *       - `useTransactionHistory` → historial paginado + filtrado
 *       - `usePortfolioMetrics`  → cálculos derivados del portfolio
 *
 *  ✅ Eliminado `any`:
 *     Tipos `UserProfile`, `PortfolioItem`, `PriceAlert`, `Transaction` de `src/types/user.ts`.
 *
 *  ✅ Skeleton loading states:
 *     `ProfileSkeleton` y `TransactionSkeleton` — UX superior al spinner genérico.
 *
 *  ✅ Historial de transacciones con paginación:
 *     El endpoint `/transactions` ahora se consume. Filtros buy/sell/all.
 *     Preparado para virtualización cuando el historial sea grande.
 *
 *  ✅ Métricas de portfolio:
 *     Valor total del portfolio y activo top calculados por `usePortfolioMetrics`.
 *
 *  ✅ Modales separados por responsabilidad:
 *     `EditProfileModal` y `ChangePasswordModal` — cada uno tiene su propio
 *     estado de formulario, en lugar de un handler monolítico `handleAction`.
 *
 *  ✅ Error Boundary:
 *     `CryptoTableErrorBoundary` usado para envolver el componente en App.tsx.
 *
 *  ✅ Accesibilidad:
 *     `aria-label`, `role`, `aria-current` en paginación y botones de acción.
 *
 * @module pages/Profile
 */

import React, { useState, useCallback, memo } from 'react';
import {
    User, Mail, Globe, Calendar, Phone, Shield, Edit3, Lock,
    AlertCircle, CheckCircle2, X, Wallet, TrendingUp, Bell,
    Trash2, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight,
    BarChart3,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Navigate } from 'react-router-dom';

import { cn } from '../lib/cn';
import { COUNTRIES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useTransactionHistory } from '../hooks/useTransactionHistory';
import { usePortfolioMetrics } from '../hooks/usePortfolioMetrics';
import type {
    UserProfile,
    PortfolioItem,
    PriceAlert,
    Transaction,
    EditProfileData,
} from '../types/user';

// ─── Skeleton Components ───────────────────────────────────────────────────────

/** Bloque de skeleton animado reutilizable */
const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={cn('bg-zinc-800 animate-pulse rounded-lg', className)} />
);

/**
 * Skeleton de la cabecera del perfil.
 * Tiene exactamente las mismas dimensiones que el componente real para
 * evitar layout shifts (CLS) al cargar.
 */
const ProfileHeaderSkeleton: React.FC = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center gap-8">
            <Skeleton className="w-32 h-32 rounded-full shrink-0" />
            <div className="flex-1 space-y-3 w-full">
                <Skeleton className="h-9 w-56" />
                <Skeleton className="h-5 w-40" />
                <div className="flex gap-3 mt-4">
                    <Skeleton className="h-6 w-36 rounded-full" />
                    <Skeleton className="h-6 w-28 rounded-full" />
                </div>
            </div>
        </div>
    </div>
);

/**
 * Skeleton del panel de portfolio.
 */
const PortfolioSkeleton: React.FC = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-5">
                    <Skeleton className="h-7 w-20 mb-4" />
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-5 w-3/4" />
                </div>
            ))}
        </div>
    </div>
);

/**
 * Skeleton de una fila del historial de transacciones.
 */
const TransactionRowSkeleton: React.FC = () => (
    <div className="flex items-center justify-between py-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-16" />
            </div>
        </div>
        <div className="text-right">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-3 w-14" />
        </div>
    </div>
);

// ─── Sub-componentes puros ─────────────────────────────────────────────────────

/**
 * Ítem de detalle de información personal.
 */
const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = memo(
    ({ icon, label, value }) => (
        <div className="flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-all shrink-0">
                {icon}
            </div>
            <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">{label}</p>
                <p className="text-white font-medium">{value}</p>
            </div>
        </div>
    )
);
DetailItem.displayName = 'DetailItem';

/**
 * Tarjeta de ítem del portfolio.
 */
const PortfolioCard: React.FC<{ item: PortfolioItem }> = memo(({ item }) => {
    const positionValue = item.amount * item.averagePrice;
    return (
        <div className="bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 p-5 rounded-2xl group hover:border-emerald-500/30 transition-all shadow-xl">
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
            <div className="pt-3 border-t border-zinc-800/50 space-y-1">
                <div className="flex justify-between text-xs">
                    <span className="text-zinc-600 uppercase font-black tracking-widest">Compra Prom.</span>
                    <span className="text-white font-mono">${item.averagePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-zinc-600 uppercase font-black tracking-widest">Valor Pos.</span>
                    <span className="text-zinc-400 font-mono">${positionValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        </div>
    );
});
PortfolioCard.displayName = 'PortfolioCard';

/**
 * Fila de transacción en el historial.
 * Memoizada — la lista puede tener muchos ítems.
 */
const TransactionRow: React.FC<{ tx: Transaction }> = memo(({ tx }) => {
    const isBuy  = tx.type === 'buy';
    const date   = parseISO(tx.createdAt);

    return (
        <div className="flex items-center justify-between py-4 border-b border-zinc-800/50 last:border-0 group hover:bg-zinc-800/20 transition-colors rounded-lg px-2 -mx-2">
            {/* Icono + info */}
            <div className="flex items-center gap-4">
                <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    isBuy ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                )}>
                    {isBuy
                        ? <ArrowUpRight className="text-emerald-400" size={18} />
                        : <ArrowDownRight className="text-rose-400" size={18} />}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{isBuy ? 'Compra' : 'Venta'}</span>
                        <span className="text-zinc-500 font-mono text-xs uppercase">{tx.symbol}</span>
                    </div>
                    <span className="text-zinc-600 text-xs">
                        {format(date, "dd MMM yyyy · HH:mm", { locale: es })}
                    </span>
                </div>
            </div>

            {/* Monto + precio */}
            <div className="text-right">
                <div className={cn(
                    'font-mono font-bold text-sm',
                    isBuy ? 'text-emerald-400' : 'text-rose-400'
                )}>
                    {isBuy ? '+' : '-'}{tx.amount.toFixed(6)} {tx.symbol}
                </div>
                <div className="text-zinc-500 font-mono text-xs">
                    ${tx.totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            </div>
        </div>
    );
});
TransactionRow.displayName = 'TransactionRow';

/**
 * Banner de alerta de precio.
 */
const AlertRow: React.FC<{
    alert: PriceAlert;
    onRemove: (id: string) => void;
}> = memo(({ alert, onRemove }) => (
    <div className="flex items-center justify-between bg-zinc-800/50 p-4 rounded-xl border border-zinc-700 group hover:border-zinc-600 transition-all">
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Bell className="text-amber-500" size={14} />
            </div>
            <div>
                <span className="font-bold text-white text-sm">{alert.symbol}</span>
                <p className="text-sm text-zinc-400">
                    {alert.condition === 'above' ? '↑ Sube por encima de' : '↓ Cae por debajo de'}{' '}
                    <span className="font-mono text-amber-400">${alert.targetPrice.toLocaleString()}</span>
                </p>
            </div>
        </div>
        <button
            onClick={() => onRemove(alert.id)}
            aria-label={`Eliminar alerta de ${alert.symbol}`}
            className="p-2 rounded-lg text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
        >
            <Trash2 size={16} />
        </button>
    </div>
));
AlertRow.displayName = 'AlertRow';

// ─── Modales ───────────────────────────────────────────────────────────────────

interface ModalShellProps {
    title:    string;
    icon:     React.ReactNode;
    onClose:  () => void;
    children: React.ReactNode;
}

/**
 * Shell del modal con overlay, animación y botón de cierre.
 */
const ModalShell: React.FC<ModalShellProps> = ({ title, icon, onClose, children }) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.target === e.currentTarget && onClose()}
    >
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
                onClick={onClose}
                aria-label="Cerrar modal"
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
            >
                <X size={20} />
            </button>

            <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center mb-4">
                    {icon}
                </div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <p className="text-zinc-500 text-sm mt-1 text-center">
                    Se requiere el PIN de seguridad para confirmar los cambios
                </p>
            </div>
            {children}
        </div>
    </div>
);

/** Componente de feedback de error/éxito dentro del modal */
const ModalFeedback: React.FC<{ error: string; success: string }> = ({ error, success }) => (
    <>
        {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-3 text-rose-500 text-xs" role="alert">
                <AlertCircle size={16} />
                {error}
            </div>
        )}
        {success && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3 text-emerald-500 text-xs" role="status">
                <CheckCircle2 size={16} />
                {success}
            </div>
        )}
    </>
);

/** Campo de PIN reutilizable */
const PinField: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
    <div>
        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
            PIN de Seguridad
        </label>
        <input
            type="password"
            placeholder="••••"
            required
            pattern="[0-9]*"
            inputMode="numeric"
            autoComplete="current-password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 text-white text-center text-2xl tracking-[1em] focus:outline-none focus:border-emerald-500 transition-colors"
        />
    </div>
);

interface EditProfileModalProps {
    profile:    UserProfile;
    onSave:     (data: EditProfileData, pin: string) => Promise<void>;
    onClose:    () => void;
}

/**
 * Modal de edición de datos personales.
 * Estado de formulario completamente local — no contamina el componente padre.
 */
const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, onSave, onClose }) => {
    const [formData,   setFormData]   = useState<EditProfileData>({
        fullName:    profile.fullName,
        phoneNumber: profile.phoneNumber,
        country:     profile.country,
    });
    const [pin,        setPin]        = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error,      setError]      = useState('');
    const [success,    setSuccess]    = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSubmitting(true);
        try {
            await onSave(formData, pin);
            setSuccess('Perfil actualizado correctamente');
            setTimeout(onClose, 1500);
        } catch (err: unknown) {
            setError(
                (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? 'Error al actualizar el perfil'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ModalShell title="Editar Perfil" icon={<Edit3 className="text-emerald-500" />} onClose={onClose}>
            <ModalFeedback error={error} success={success} />
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3 mb-6">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                            Nombre Completo
                        </label>
                        <input
                            type="text"
                            placeholder="Tu nombre completo"
                            value={formData.fullName}
                            onChange={(e) => setFormData(f => ({ ...f, fullName: e.target.value }))}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                            Teléfono
                        </label>
                        <input
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData(f => ({ ...f, phoneNumber: e.target.value }))}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                            País
                        </label>
                        <select
                            value={formData.country}
                            onChange={(e) => setFormData(f => ({ ...f, country: e.target.value }))}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                        >
                            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <PinField value={pin} onChange={setPin} />

                <button
                    type="submit"
                    disabled={submitting || !!success}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all mt-4"
                >
                    {submitting ? 'Guardando...' : 'Confirmar Cambios'}
                </button>
            </form>
        </ModalShell>
    );
};

interface ChangePasswordModalProps {
    onSave:  (newPassword: string, pin: string) => Promise<void>;
    onClose: () => void;
}

/**
 * Modal de cambio de contraseña.
 * Incluye confirmación de contraseña nueva para prevenir errores tipográficos.
 */
const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onSave, onClose }) => {
    const [newPassword,     setNewPassword]     = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pin,             setPin]             = useState('');
    const [submitting,      setSubmitting]      = useState(false);
    const [error,           setError]           = useState('');
    const [success,         setSuccess]         = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setSubmitting(true);
        try {
            await onSave(newPassword, pin);
            setSuccess('Contraseña actualizada correctamente');
            setTimeout(onClose, 1500);
        } catch (err: unknown) {
            setError(
                (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? 'Error al cambiar la contraseña'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ModalShell title="Cambiar Contraseña" icon={<Lock className="text-emerald-500" />} onClose={onClose}>
            <ModalFeedback error={error} success={success} />
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3 mb-2">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                            Nueva Contraseña
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            required
                            minLength={6}
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                            Confirmar Contraseña
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            required
                            minLength={6}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                </div>

                <PinField value={pin} onChange={setPin} />

                <button
                    type="submit"
                    disabled={submitting || !!success}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all mt-4"
                >
                    {submitting ? 'Actualizando...' : 'Confirmar Cambio'}
                </button>
            </form>
        </ModalShell>
    );
};

// ─── Sección de Historial de Transacciones ─────────────────────────────────────

const TransactionHistorySection: React.FC = () => {
    const {
        visibleTransactions,
        totalFiltered,
        totalAll,
        page,
        totalPages,
        loading,
        error,
        filter,
        setFilter,
        setPage,
    } = useTransactionHistory();

    const filterLabels: Record<string, string> = {
        all:  `Todas (${totalAll})`,
        buy:  'Compras',
        sell: 'Ventas',
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-3 uppercase tracking-tight">
                    <BarChart3 className="text-emerald-500" size={20} />
                    Historial de Operaciones
                </h3>

                {/* Filtros */}
                <div className="flex gap-2" role="group" aria-label="Filtrar operaciones">
                    {(['all', 'buy', 'sell'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            aria-current={filter === f ? 'page' : undefined}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all',
                                filter === f
                                    ? f === 'buy'  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : f === 'sell' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                   : 'bg-zinc-700 text-white border border-zinc-600'
                                    : 'bg-zinc-800/50 text-zinc-500 border border-transparent hover:border-zinc-700'
                            )}
                        >
                            {filterLabels[f]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Contenido */}
            {loading ? (
                <div className="space-y-0">
                    {Array.from({ length: 5 }).map((_, i) => <TransactionRowSkeleton key={i} />)}
                </div>
            ) : error ? (
                <div className="py-10 text-center text-rose-400 text-sm flex flex-col items-center gap-2">
                    <AlertCircle size={24} />
                    <span>{error}</span>
                </div>
            ) : visibleTransactions.length === 0 ? (
                <div className="py-16 text-center bg-zinc-950/30 border-2 border-zinc-800 border-dashed rounded-2xl">
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Sin operaciones</p>
                    <p className="text-zinc-600 text-[10px] mt-2">
                        {filter === 'all'
                            ? 'Aún no has realizado ninguna operación'
                            : `No hay ${filter === 'buy' ? 'compras' : 'ventas'} registradas`}
                    </p>
                </div>
            ) : (
                <div>
                    {visibleTransactions.map(tx => (
                        <TransactionRow key={tx._id} tx={tx} />
                    ))}
                </div>
            )}

            {/* Paginación */}
            {!loading && totalFiltered > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500 font-mono">
                        Página {page} de {totalPages} · {totalFiltered} operaciones
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            aria-label="Página anterior"
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={page === totalPages}
                            aria-label="Página siguiente"
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Componente Principal ──────────────────────────────────────────────────────

/** Tipo del modal activo */
type ModalType = 'edit' | 'password' | null;

/**
 * Página de perfil del usuario.
 *
 * Orquesta los hooks de datos y renderiza las secciones:
 *  - Cabecera del perfil
 *  - Portfolio con métricas
 *  - Información personal
 *  - Alertas de precio activas
 *  - Historial de transacciones paginado
 *  - Modales de acciones de seguridad
 */
/**
 * Array vacío estable a nivel de módulo: pasar `?? []` inline crearía un array
 * nuevo por render e invalidaría el useMemo interno de usePortfolioMetrics.
 */
const EMPTY_PORTFOLIO: PortfolioItem[] = [];

const Profile: React.FC = () => {
    // ── Datos ─────────────────────────────────────────────────────────────────
    const { user, loading: authLoading } = useAuth();
    const {
        profile,
        loading,
        fetchError,
        updateProfile,
        updatePassword,
        removeAlert,
    } = useUserProfile();

    const metrics = usePortfolioMetrics(profile?.portfolio ?? EMPTY_PORTFOLIO);

    // Alertas visibles: el guard de "sin alertas" debe evaluarse sobre las
    // activas — con solo alertas inactivas antes se renderizaba una caja vacía.
    const activeAlerts = profile?.alerts?.filter(a => a.active) ?? [];

    // ── Estado local de UI ────────────────────────────────────────────────────
    const [activeModal, setActiveModal] = useState<ModalType>(null);

    const openModal  = useCallback((type: NonNullable<ModalType>) => setActiveModal(type), []);
    const closeModal = useCallback(() => setActiveModal(null), []);

    // ── Guard de ruta: visitantes anónimos van directo a /login ──────────────
    if (!authLoading && !user) return <Navigate to="/login" replace />;

    // ── Estados de carga/error ────────────────────────────────────────────────

    if (authLoading || loading) {
        return (
            <div className="min-h-[calc(100vh-64px)] p-4 sm:p-8 bg-zinc-950">
                <div className="max-w-4xl mx-auto space-y-8">
                    <ProfileHeaderSkeleton />
                    <PortfolioSkeleton />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <Skeleton className="h-5 w-40 mb-6" />
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex gap-4 mb-4">
                                    <Skeleton className="w-10 h-10 rounded-lg" />
                                    <div className="flex-1">
                                        <Skeleton className="h-3 w-20 mb-2" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
                            <Skeleton className="h-5 w-40 mb-2" />
                            <Skeleton className="h-12 w-full rounded-xl" />
                            <Skeleton className="h-12 w-full rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (fetchError || !profile) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-zinc-950 gap-4">
                <AlertCircle className="text-rose-400" size={40} />
                <p className="text-rose-400 font-medium">{fetchError ?? 'No se pudo cargar el perfil'}</p>
                <p className="text-zinc-600 text-sm">Recarga la página o intenta más tarde</p>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-[calc(100vh-64px)] p-4 sm:p-8 bg-zinc-950">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* ── Sección: Cabecera del Perfil ─────────────────────────── */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    {/* Icono decorativo de fondo */}
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <User size={160} className="text-emerald-500" />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                        {/* Avatar */}
                        <div className="w-32 h-32 rounded-full bg-emerald-600/20 border-4 border-zinc-800 flex items-center justify-center text-emerald-500 text-4xl font-bold shadow-inner shrink-0 select-none">
                            {profile.fullName?.charAt(0)?.toUpperCase() || profile.email.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="text-center sm:text-left">
                            <h1 className="text-3xl font-bold text-white mb-1">{profile.fullName || 'Usuario'}</h1>
                            <p className="text-zinc-500 flex items-center justify-center sm:justify-start gap-2">
                                <Mail size={16} /> {profile.email}
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
                                <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs rounded-full border border-zinc-700 uppercase tracking-widest font-medium">
                                    Miembro desde:{' '}
                                    {format(parseISO(profile.createdAt), 'MMMM yyyy', { locale: es })}
                                </span>
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs rounded-full border border-emerald-500/20 uppercase tracking-widest font-medium">
                                    ✓ Cuenta Verificada
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Sección: Portfolio + Métricas ────────────────────────── */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <TrendingUp size={120} className="text-emerald-500" />
                    </div>

                    {/* Header con métricas */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 relative z-10">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3 uppercase tracking-tight">
                            <Wallet className="text-emerald-500" size={20} /> Mi Portafolio
                        </h3>

                        {/* Métricas del portfolio — flex-wrap: en móvil los dos montos no caben en una fila */}
                        <div className="flex flex-wrap gap-4 sm:gap-6">
                            <div className="text-right">
                                <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-black mb-1">Saldo Disponible</p>
                                <p className="text-2xl font-black text-white font-mono">
                                    ${profile.wallet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            {metrics.totalValue > 0 && (
                                <>
                                    <div className="w-px bg-zinc-800" />
                                    <div className="text-right">
                                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-black mb-1">Valor Portfolio</p>
                                        <p className="text-2xl font-black text-emerald-400 font-mono">
                                            ${metrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Tarjetas de activos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                        {(profile.portfolio ?? []).length > 0 ? (
                            (profile.portfolio ?? []).map(item => (
                                <PortfolioCard key={item.coinId} item={item} />
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center bg-zinc-950/30 border-2 border-zinc-800 border-dashed rounded-3xl">
                                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
                                    No tienes activos aún
                                </p>
                                <p className="text-zinc-600 text-[10px] mt-2">
                                    Empieza a operar desde el Dashboard principal
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Sección: Información Personal + Seguridad ─────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Información personal */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Shield size={14} className="text-emerald-500" /> Información Personal
                        </h3>
                        <div className="space-y-4">
                            <DetailItem icon={<Globe size={18} />}    label="País"               value={profile.country} />
                            <DetailItem icon={<Phone size={18} />}    label="Teléfono"           value={profile.phoneNumber} />
                            <DetailItem icon={<Calendar size={18} />} label="Edad"               value={`${profile.age} años`} />
                            <DetailItem
                                icon={<Calendar size={18} />}
                                label="Fecha de Nacimiento"
                                value={format(parseISO(profile.birthDate), 'PPP', { locale: es })}
                            />
                        </div>
                    </div>

                    {/* Acciones de seguridad */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-center gap-4">
                        <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">
                            Acciones de Seguridad
                        </h3>
                        <button
                            id="btn-edit-profile"
                            onClick={() => openModal('edit')}
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 border border-zinc-700 hover:border-zinc-600"
                        >
                            <Edit3 size={18} /> Editar Detalles del Perfil
                        </button>
                        <button
                            id="btn-change-password"
                            onClick={() => openModal('password')}
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 border border-zinc-700 hover:border-zinc-600"
                        >
                            <Lock size={18} /> Cambiar Contraseña
                        </button>
                    </div>
                </div>

                {/* ── Sección: Alertas de Precio ─────────────────────────────── */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3 uppercase tracking-tight mb-6">
                        <Bell className="text-emerald-500" size={20} /> Mis Alertas de Precio
                    </h3>
                    <div className="space-y-3">
                        {activeAlerts.length > 0 ? (
                            activeAlerts.map(alert => (
                                <AlertRow key={alert.id} alert={alert} onRemove={removeAlert} />
                            ))
                        ) : (
                            <div className="py-10 text-center bg-zinc-950/30 border-2 border-zinc-800 border-dashed rounded-2xl">
                                <p className="text-zinc-500 text-sm italic">
                                    No tienes alertas configuradas. Agrégalas desde la página principal.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Sección: Historial de Transacciones ─────────────────────── */}
                <TransactionHistorySection />

            </div>

            {/* ── Modales ──────────────────────────────────────────────────── */}
            {activeModal === 'edit' && (
                <EditProfileModal
                    profile={profile}
                    onSave={updateProfile}
                    onClose={closeModal}
                />
            )}
            {activeModal === 'password' && (
                <ChangePasswordModal
                    onSave={updatePassword}
                    onClose={closeModal}
                />
            )}
        </div>
    );
};

export default Profile;
