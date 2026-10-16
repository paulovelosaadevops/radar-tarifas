import { useEffect, useRef, type ReactNode } from 'react';

/** Folha no estilo iOS: sobe de baixo no celular, centralizada no computador */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    document.documentElement.classList.add('has-sheet');
    return () => {
      dialog?.close();
      document.documentElement.classList.remove('has-sheet');
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="sheet"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
    >
      <div className="sheet-panel">
        <span className="sheet-grabber" aria-hidden="true" />
        <header className="sheet-header">
          <button type="button" className="text-btn" onClick={onClose}>
            Cancelar
          </button>
          <h2>{title}</h2>
          <span />
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </dialog>
  );
}
