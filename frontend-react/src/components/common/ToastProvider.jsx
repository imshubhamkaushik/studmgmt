import { useCallback, useState, useMemo } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import ToastContext from "./ToastContext";

let sequence = 0;

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((message, type = "success") => {
    const id = ++sequence;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      4500,
    );
  }, []);
  const dismiss = useCallback(
    (id) => setToasts((current) => current.filter((toast) => toast.id !== id)),
    [],
  );
  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || ICONS.success;
          return (
            <output key={toast.id} className={`toast toast-${toast.type}`}>
              <Icon size={18} className="toast-icon" aria-hidden="true" />
              <span>{toast.message}</span>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
                <X size={14} />
              </button>
            </output>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
