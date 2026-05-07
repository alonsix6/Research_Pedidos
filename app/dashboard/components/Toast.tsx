'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { slideInVariants } from '@/lib/animations';
import { Check, AlertCircle, Info, X, Bell } from 'lucide-react';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'notification';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const icons = {
    success: <Check size={16} />,
    error: <AlertCircle size={16} />,
    info: <Info size={16} />,
    notification: <Bell size={16} />,
  };

  const colors = {
    success: {
      bg: 'linear-gradient(180deg, #2A3D2A 0%, #1A2A1A 100%)',
      border: '#1AA167',
      icon: '#00C853',
    },
    error: {
      bg: 'linear-gradient(180deg, #3D2A2A 0%, #2A1A1A 100%)',
      border: '#CE2021',
      icon: '#E53935',
    },
    info: {
      bg: 'linear-gradient(180deg, #2A2A3D 0%, #1A1A2A 100%)',
      border: '#2196F3',
      icon: '#64B5F6',
    },
    notification: {
      bg: 'linear-gradient(180deg, #3D2A1A 0%, #2A1A0A 100%)',
      border: '#FF4500',
      icon: '#FF6B3D',
    },
  };

  const style = colors[toast.type];

  return (
    <motion.div
      layout
      variants={slideInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative min-w-[280px] max-w-[360px] rounded-md overflow-hidden"
      style={{
        background: style.bg,
        borderLeft: `3px solid ${style.border}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="flex-shrink-0 mt-0.5" style={{ color: style.icon }}>
          {icons[toast.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white">{toast.title}</p>
          {toast.message && <p className="text-[10px] text-gray-400 mt-0.5">{toast.message}</p>}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X size={12} className="text-gray-500" />
        </button>
      </div>
    </motion.div>
  );
}
