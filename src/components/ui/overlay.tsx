import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

// ── Modal (Dialog) ────────────────────────────────────────────────────────────
export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal = ({ open, onClose, children, className, size = 'md' }: ModalProps) => {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes: Record<string, string> = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl', '2xl': 'max-w-4xl' };

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

export const ModalHeader = ({ children, onClose, className }: { children: React.ReactNode; onClose?: () => void; className?: string }) => (
  <div className={cn('flex items-center justify-between px-6 py-4 border-b border-[var(--border)]', className)}>
    <div className="flex-1">{children}</div>
    {onClose && (
      <button
        onClick={onClose}
        className="ml-4 h-7 w-7 rounded-lg flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    )}
  </div>
);

export const ModalBody = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('px-6 py-5 overflow-y-auto max-h-[70vh]', className)}>{children}</div>
);

export const ModalFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-2)]', className)}>
    {children}
  </div>
);

// ── Dropdown Menu — portal-based so it doesn't hide under overflowing containers ──
export interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export const DropdownMenu = ({ trigger, children, align = 'right', className }: DropdownMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0, openUp: false });
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const calcPosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const menuWidth = 180;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openUp = spaceBelow < 220 && spaceAbove > 150;

    let top = openUp ? r.top - 8 : r.bottom + 6;
    let left = align === 'right' ? r.right - menuWidth : r.left;
    if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
    if (left < 8) left = 8;

    setPos({ top, left, openUp });
  }, [align]);

  React.useEffect(() => {
    if (!open) return;
    calcPosition();
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler, true);
    document.addEventListener('touchstart', handler, true);
    return () => {
      document.removeEventListener('mousedown', handler, true);
      document.removeEventListener('touchstart', handler, true);
    };
  }, [open, calcPosition]);

  const menuWidth = 180;

  return (
    <div className="relative inline-flex" ref={triggerRef}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[9990]" onMouseDown={() => setOpen(false)} />
          <div
            ref={menuRef}
            className={cn(
              'fixed z-[9995] min-w-[160px] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-modal)] py-1 animate-fade-in',
              className
            )}
            style={{
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
              left: pos.left,
              width: menuWidth,
            }}
          >
            <div onClick={() => setOpen(false)}>{children}</div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  danger?: boolean;
  icon?: any;
  disabled?: boolean;
  className?: string;
}

export const DropdownItem = ({ children, onClick, danger, icon: Icon, disabled, className }: DropdownItemProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors focus:outline-none cursor-pointer',
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
export interface ConfirmPopoverProps {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  danger?: boolean;
}

export const ConfirmPopover = ({
  trigger, title, description, confirmLabel = 'Confirm', onConfirm, danger = false,
}: ConfirmPopoverProps) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
              className="flex-1 h-8 rounded-lg text-xs border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => { setOpen(false); onConfirm?.(); }}
              className={cn(
                'flex-1 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer',
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
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  type?: ToastType;
  message: string;
  duration?: number;
}

export type ToastFn = (options: ToastOptions) => void;

const ToastContext = React.createContext<ToastFn | null>(null);

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const addToast: ToastFn = React.useCallback(({ type = 'info', message, duration = 3500 }) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const remove = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));

  const colors: Record<ToastType, string> = {
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
              'text-sm font-medium pointer-events-auto animate-slide-up cursor-pointer',
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

export const useToast = (): ToastFn => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};

export { ConfirmProvider, useConfirm } from '../../context/ConfirmContext';
