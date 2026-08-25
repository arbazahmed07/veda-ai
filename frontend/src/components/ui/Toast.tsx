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
    error: { icon: AlertCircle, bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", iconColor: "text-red-400" },
    success: { icon: CheckCircle2, bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", iconColor: "text-green-400" },
    warning: { icon: AlertTriangle, bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", iconColor: "text-amber-400" },
  }[toast.variant];

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border ${config.bg} ${config.border} backdrop-blur-md shadow-xl shadow-black/30`}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.iconColor}`} />
      <p className={`text-sm flex-1 ${config.text}`}>{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-0.5 rounded text-zinc-500 hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
