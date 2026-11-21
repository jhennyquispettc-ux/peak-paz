import { CircleCheck } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

const ToastContext = createContext<((message: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((next: string) => {
    window.clearTimeout(timer.current);
    setMessage(next);
    timer.current = window.setTimeout(() => setMessage(null), 4000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {message && (
          <div className="toast">
            <CircleCheck aria-hidden="true" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
