import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';
import { cn } from '../lib/utils.js';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [config, setConfig] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      const isDanger = options?.danger !== undefined 
        ? options.danger 
        : /delete|remove|destroy|erase/i.test(`${options?.title || ''} ${options?.confirmButtonText || ''} ${options?.confirButtinText || ''}`);

      setConfig({
        title: options?.title || 'Are you sure?',
        description: options?.description || '',
        confirmButtonText: options?.confirmButtonText || options?.confirButtinText || options?.confirmLabel || 'Confirm',
        cancelButtonText: options?.cancelButtonText || options?.cancelLabel || 'Cancel',
        danger: isDanger,
        icon: options?.icon,
      });
    });
  }, []);

  const handleResolve = useCallback((resultValue) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setConfig(null);
    if (resolve) {
      resolve({ result: Boolean(resultValue) });
    }
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!config) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleResolve(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config, handleResolve]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {config && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => handleResolve(false)}
          />

          {/* Dialog Card */}
          <div
            className={cn(
              'relative w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-slide-up z-10'
            )}
            role="dialog"
            aria-modal="true"
          >
            {/* Top color bar */}
            <div className={cn('h-1 w-full', config.danger ? 'bg-red-500' : 'bg-[var(--accent)]')} />

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'p-3 rounded-2xl shrink-0 border',
                    config.danger
                      ? 'bg-red-500/10 text-red-500 border-red-500/20'
                      : 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
                  )}
                >
                  {config.danger ? (
                    <AlertTriangle className="h-6 w-6" />
                  ) : (
                    <HelpCircle className="h-6 w-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="text-base font-semibold text-[var(--text-1)]">
                    {config.title}
                  </h3>
                  {config.description && (
                    <p className="mt-2 text-xs text-[var(--text-2)] leading-relaxed">
                      {config.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleResolve(false)}
                  className="absolute top-5 right-5 text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => handleResolve(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                >
                  {config.cancelButtonText}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => handleResolve(true)}
                  className={cn(
                    'px-4 py-2 text-xs font-semibold rounded-xl text-white transition-all cursor-pointer shadow-md',
                    config.danger
                      ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-red-500/20'
                      : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-[var(--accent)]/20'
                  )}
                >
                  {config.confirmButtonText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
