import React from 'react';
import type { Toast, ToastType } from '../context/ToastContext';

const typeStyles: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-zinc-800 text-white',
  warning: 'bg-yellow-500 text-black',
};

export const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => (
  <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`min-w-[220px] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${typeStyles[toast.type]}`}
        role="alert"
        aria-live="assertive"
        tabIndex={0}
        onClick={() => removeToast(toast.id)}
        style={{ cursor: 'pointer' }}
      >
        <span>{toast.message}</span>
      </div>
    ))}
  </div>
);
