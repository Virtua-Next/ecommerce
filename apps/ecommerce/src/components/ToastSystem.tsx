'use client';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';


export type ToastType = 'success' | 'danger' | 'warning' | 'info';

interface ToastData {
    id: number;
    type: ToastType;
    message: string;
    onClose?: () => void;
}

interface ToastContextValue {
    showAlert: (type: ToastType, message: string, onClose?: () => void) => void;
}

const VARIANTS: Record<ToastType, { icon: typeof CheckCircle2; accent: string; bg: string; border: string; text: string; iconColor: string; }> = {
    success: {
        icon: CheckCircle2,
        accent: '#16a34a',
        bg: '#F0FDF4',
        border: '#BBF7D0',
        text: '#14532D',
        iconColor: '#16A34A',
    },
    danger: {
        icon: XCircle,
        accent: '#DC2626',
        bg: '#FEF2F2',
        border: '#FECACA',
        text: '#7F1D1D',
        iconColor: '#DC2626',
    },
    warning: {
        icon: AlertTriangle,
        accent: '#D97706',
        bg: '#FFFBEB',
        border: '#FDE68A',
        text: '#78350F',
        iconColor: '#D97706',
    },
    info: {
        icon: Info,
        accent: '#2563EB',
        bg: '#EFF6FF',
        border: '#BFDBFE',
        text: '#1E3A8A',
        iconColor: '#2563EB',
    },
};

const DURATION = 4000;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const idRef = useRef(0);
    const timersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => {
            const target = prev.find((t) => t.id === id);
            if (target?.onClose) {
                setTimeout(() => target.onClose?.(), 200);
            }
            return prev.filter((t) => t.id !== id);
        });
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
    }, []);

    const showAlert = useCallback((type: ToastType, message: string, onClose?: () => void) => {
        const id = ++idRef.current;
        const variant: ToastType = VARIANTS[type] ? type : 'info';

        setToasts((prev) => [...prev, { id, type: variant, message, onClose }]);

        timersRef.current[id] = setTimeout(() => {
            removeToast(id);
        }, DURATION);
    }, [removeToast]);

    const dismiss = useCallback((id: number) => removeToast(id), [removeToast]);

    return (
        <ToastContext.Provider value={{ showAlert }}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={dismiss} />
            <style jsx global>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-toast-in { animation: toast-in 220ms ease-out; }
      `}</style>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast precisa estar dentro de um <ToastProvider>');
    return ctx;
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: number) => void }) {
    return (
        <div
            className="fixed inset-x-0 bottom-0 z-[9999] flex flex-col-reverse pointer-events-none"
            aria-live="polite"
            aria-atomic="true"
        >
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
    const [leaving, setLeaving] = useState(false);
    const config = VARIANTS[toast.type];
    const Icon = config.icon;

    const handleDismiss = () => {
        setLeaving(true);
        setTimeout(() => onDismiss(toast.id), 180);
    };

    return (
        <div
            role="alert"
            className={`pointer-events-auto w-full border-t shadow-[0_-4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 ease-out
        ${leaving ? 'opacity-0 translate-y-full' : 'opacity-100 translate-y-0 animate-toast-in'}`}
            style={{ backgroundColor: config.bg, borderColor: config.border }}
        >
            <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-3 sm:px-6">
                <Icon size={20} style={{ color: config.iconColor }} className="shrink-0" />
                <p className="flex-1 text-sm leading-snug" style={{ color: config.text }}>
                    {toast.message}
                </p>
                <button
                    onClick={handleDismiss}
                    aria-label="Fechar"
                    className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: config.text }}
                >
                    <X size={16} />
                </button>
            </div>
            <div className="h-0.5 w-full bg-black/5">
                <div
                    className="h-full origin-left"
                    style={{
                        backgroundColor: config.accent,
                        animation: `toast-progress ${DURATION}ms linear forwards`,
                    }}
                />
            </div>
            <style jsx>{`
        @keyframes toast-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
        </div>
    );
}
