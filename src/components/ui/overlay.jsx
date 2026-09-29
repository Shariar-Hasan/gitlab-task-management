import * as React from 'react';
import { cn } from '../../lib/utils.js';

// ── Modal (Dialog) ────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, children, className, size = 'md' }) => {
  React.useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl', '2xl': 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-modal)]',
          'animate-slide-up overflow-hidden',
          sizes[size], className
        )}
      >
        {children}
      </div>
    </div>
  );
};

export const ModalHeader = ({ children, onClose, className }) => (
  <div className={cn('flex items-center justify-between px-6 py-4 border-b border-[var(--border)]', className)}>
    <div className="flex-1">{children}</div>
    {onClose && (
      <button
        onClick={onClose}
        className="ml-4 h-7 w-7 rounded-lg flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    )}
  </div>
);

export const ModalBody = ({ children, className }) => (
  <div className={cn('px-6 py-5 overflow-y-auto max-h-[70vh]', className)}>{children}</div>
);

export const ModalFooter = ({ children, className }) => (
  <div className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-2)]', className)}>
    {children}
  </div>
);

// ── Dropdown Menu ─────────────────────────────────────────────────────────────
export const DropdownMenu = ({ trigger, children, align = 'right', className }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative inline-flex" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1.5 min-w-[160px] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-modal)] py-1 animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0',
            'top-full', className
          )}
        >
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
};

export const DropdownItem = ({ children, onClick, danger, icon: Icon, disabled, className }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors focus:outline-none',
      'hover:bg-[var(--surface-2)]',
      danger ? 'text-red-500' : 'text-[var(--text-2)] hover:text-[var(--text-1)]',
      disabled && 'opacity-40 pointer-events-none',
      className
    )}
  >
    {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
    {children}
  </button>
);

export const DropdownSeparator = () => (
  <div className="my-1 h-px bg-[var(--border)]" />
);

// ── Confirm Popover ───────────────────────────────────────────────────────────
export const ConfirmPopover = ({
  trigger, title, description, confirmLabel = 'Confirm', onConfirm, danger = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative inline-flex w-full" ref={ref}>
      <div className="w-full" onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 z-50 w-60 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-modal)] p-4 animate-slide-up">
          <p className="text-sm font-medium text-[var(--text-1)] mb-1">{title}</p>
          {description && <p className="text-xs text-[var(--text-2)] mb-3">{description}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 h-8 rounded-lg text-xs border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { setOpen(false); onConfirm?.(); }}
              className={cn(
                'flex-1 h-8 rounded-lg text-xs font-medium transition-colors',
                danger
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30'
                  : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Toast ─────────────────────────────────────────────────────────────────────
const ToastContext = React.createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = React.useState([]);

  const addToast = React.useCallback(({ type = 'info', message, duration = 3500 }) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const remove = (id) => setToasts((p) => p.filter((t) => t.id !== id));

  const colors = {
    success: 'border-emerald-500/30 text-emerald-500',
    error:   'border-red-500/30 text-red-500',
    info:    'border-[var(--accent)]/30 text-[var(--accent)]',
    warning: 'border-amber-500/30 text-amber-500',
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[var(--surface)] border shadow-[var(--shadow-modal)]',
              'text-sm font-medium pointer-events-auto animate-slide-up',
              colors[t.type]
            )}
            onClick={() => remove(t.id)}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};

export { ConfirmProvider, useConfirm } from '../../context/ConfirmContext.jsx';

