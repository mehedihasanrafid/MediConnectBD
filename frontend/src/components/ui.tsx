/**
 * Minimal shared UI primitives. Kept dependency-free so the demo builds without a component
 * library; styling lives in index.css.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}

export function Button({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "primary",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function Alert({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  return <div className={`alert alert-${kind}`}>{children}</div>;
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return <div className="spinner">{label}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
  duration?: number;
}

export interface ToastOptions {
  kind?: ToastKind;
  duration?: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (message: string, options?: ToastOptions | ToastKind) => string;
  dismissToast: (id: string) => void;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  showToast: () => "",
  dismissToast: () => {},
  success: () => "",
  error: () => "",
  info: () => "",
});

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.kind === "error" ? "alert" : "status"}
          className={`toast toast-${toast.kind}`}
          data-testid={`toast-${toast.kind}`}
        >
          <div className="toast-content">{toast.message}</div>
          <button
            type="button"
            className="toast-close-btn"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options?: ToastOptions | ToastKind) => {
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const kind: ToastKind =
        typeof options === "string" ? options : options?.kind ?? "info";

      const duration =
        typeof options === "object" && typeof options?.duration === "number"
          ? options.duration
          : 5000;

      const item: ToastItem = { id, message, kind, duration };

      setToasts((prev) => [...prev, item]);

      if (duration > 0 && typeof setTimeout === "function") {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast],
  );

  const success = useCallback(
    (message: string, duration?: number) =>
      showToast(message, { kind: "success", duration }),
    [showToast],
  );

  const error = useCallback(
    (message: string, duration?: number) =>
      showToast(message, { kind: "error", duration }),
    [showToast],
  );

  const info = useCallback(
    (message: string, duration?: number) =>
      showToast(message, { kind: "info", duration }),
    [showToast],
  );

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, dismissToast, success, error, info }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
