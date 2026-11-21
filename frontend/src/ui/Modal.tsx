import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export default function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="modal-head">
        <h2 id="modal-title" className="h3">
          {title}
        </h2>
        <button
          type="button"
          className="icon-btn"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </header>
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-foot">{footer}</footer>}
    </dialog>
  );
}
