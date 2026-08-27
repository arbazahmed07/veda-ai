"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, AlertTriangle, X } from "lucide-react";

type ToastVariant = "error" | "success" | "warning";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

let _nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "error") => {
    const id = ++_nextId;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const config = {
    error: {
      icon: AlertCircle,
      badgeBg: "bg-[#FEF2F2]",
      iconColor: "text-[#DC2626]",
      border: "border-[#FEE2E2]",
      accentBar: "bg-[#DC2626]",
    },
    success: {
      icon: CheckCircle2,
      badgeBg: "bg-[#F0FDF4]",
      iconColor: "text-[#16A34A]",
      border: "border-[#DCFCE7]",
      accentBar: "bg-[#16A34A]",
    },
    warning: {
      icon: AlertTriangle,
      badgeBg: "bg-[#FEF0E8]",
      iconColor: "text-[#E8611A]",
      border: "border-[#FDDAC7]",
      accentBar: "bg-[#E8611A]",
    },
  }[toast.variant];

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`pointer-events-auto relative overflow-hidden flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border ${config.border} shadow-[0_8px_24px_rgba(0,0,0,0.08)]`}
    >
      {/* Left subtle accent strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accentBar}`} />

      {/* Icon badge circle */}
      <div className={`w-8 h-8 rounded-xl ${config.badgeBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${config.iconColor}`} strokeWidth="2.2" />
      </div>

      {/* Message */}
      <p className="text-[13.5px] font-medium text-[#1A1A1A] flex-1 leading-snug">
        {toast.message}
      </p>

      {/* Close button */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#1A1A1A] hover:bg-[#F5F4F0] transition-colors cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
