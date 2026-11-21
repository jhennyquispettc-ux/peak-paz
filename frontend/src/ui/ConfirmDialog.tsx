import { useState, type ReactNode } from "react";
import { errorMessage } from "../hooks/useResource";
import ErrorState from "./ErrorState";
import Modal from "./Modal";

export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = "Volver",
  destructive = false,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  }
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${destructive ? "btn-danger" : "btn-primary"}`}
            disabled={busy}
            onClick={() => void confirm()}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {children}
      {error && <ErrorState message={error} />}
    </Modal>
  );
}
