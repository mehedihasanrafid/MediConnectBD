import clsx from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import styles from "./Toast.module.css";

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
      className={clsx(styles.container, "toast-container")}
      data-testid="toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.kind === "error" ? "alert" : "status"}
          data-kind={toast.kind}
          data-testid={`toast-${toast.kind}`}
          className={clsx(styles.toast, `toast toast-${toast.kind}`)}
        >
          <div className={clsx(styles.content, "toast-content")}>{toast.message}</div>
          <button
            type="button"
            className={clsx(styles.closeBtn, "toast-close-btn")}
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
