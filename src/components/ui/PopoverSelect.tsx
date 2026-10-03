import React, { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PopoverOption {
  value: string | number;
  label: ReactNode;
  icon?: ReactNode;
  color?: string;
  disabled?: boolean;
}

export interface PopoverSelectProps {
  id?: string;
  name?: string;
  value?: string | number;
  onChange?: (e: any) => void;
  options?: PopoverOption[];
  children?: ReactNode;
  placeholder?: string;
  className?: string;
  popoverWidth?: number | string;
  disabled?: boolean;
  align?: 'left' | 'right';
  icon?: any;
}

/**
 * Modern Popover-based Select component.
 * Supports both props.options and <option> children for 100% drop-in compatibility.
 * Always renders floating portal popover so it never clips under overflow/modal containers.
 */
export function PopoverSelect({
  id,
  name,
  value,
  onChange,
  options: explicitOptions,
  children,
  placeholder = 'Select an option...',
  className,
  popoverWidth,
  disabled = false,
  align = 'left',
  icon: TriggerIcon,
}: PopoverSelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200, openUp: false });
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Extract options from either props.options or <option> children
  const parsedOptions = useMemo<PopoverOption[]>(() => {
    if (explicitOptions && explicitOptions.length > 0) {
      return explicitOptions;
    }
    const extracted: PopoverOption[] = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.props) {
        const p = child.props as any;
        extracted.push({
          value: p.value !== undefined ? p.value : p.children,
          label: p.children || p.label || String(p.value),
          disabled: Boolean(p.disabled),
        });
      }
    });
    return extracted;
  }, [explicitOptions, children]);

  // Current selected option
  const selectedOption = useMemo(() => {
    return parsedOptions.find((o) => String(o.value) === String(value));
  }, [parsedOptions, value]);

  // Recalculate popover floating position
  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const width = typeof popoverWidth === 'number' ? popoverWidth : Math.max(r.width, 180);
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const popoverMaxHeight = 260;
    const openUp = spaceBelow < popoverMaxHeight && spaceAbove > spaceBelow;

    let top = openUp ? r.top - 6 : r.bottom + 6;
    let left = align === 'right' ? r.right - width : r.left;

    // Boundary check
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    if (left < 8) left = 8;

    setPos({ top, left, width, openUp });
  }, [popoverWidth, align]);

  // Open & position
  const handleToggle = () => {
    if (disabled) return;
    if (!open) {
      updatePosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  // Outside click & Escape listener
  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      if (anchorRef.current && anchorRef.current.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick, true);
    document.addEventListener('touchstart', handleOutsideClick, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('touchstart', handleOutsideClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Handle selecting an option
  const handleSelect = (opt: PopoverOption) => {
    if (opt.disabled) return;
    setOpen(false);

    // Call onChange with synthetic event object for standard <select> compatibility
    const syntheticEvent = {
      target: {
        id,
        name,
        value: opt.value,
      },
      currentTarget: {
        id,
        name,
        value: opt.value,
      },
    };

    onChange?.(syntheticEvent);
    // Also support direct value callbacks
    if (typeof onChange === 'function' && onChange.length <= 1) {
      try {
        (onChange as any)(opt.value);
      } catch {}
    }
  };

  return (
    <>
      <button
        ref={anchorRef}
        id={id}
        name={name}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-1)] transition-all cursor-pointer',
          'hover:border-[var(--border-hover)] focus:outline-none focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/15',
          open && 'border-[var(--accent)] ring-2 ring-[var(--accent)]/15 shadow-xs',
          disabled && 'opacity-40 cursor-not-allowed',
          className
        )}
      >
        <span className="flex items-center gap-2 truncate text-left">
          {TriggerIcon && <TriggerIcon className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          {selectedOption?.color && (
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span className={cn('truncate', !selectedOption && 'text-[var(--text-3)]')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-[var(--text-3)] transition-transform duration-200 shrink-0 ml-1.5',
            open && 'rotate-180 text-[var(--accent)]'
          )}
        />
      </button>

      {/* Floating Portal Popover */}
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
              left: pos.left,
              width: pos.width,
              zIndex: 9999,
            }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-1.5 max-h-64 overflow-y-auto animate-scale-in"
          >
            <div className="space-y-0.5">
              {parsedOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-[var(--text-3)] text-center italic">
                  No options
                </div>
              ) : (
                parsedOptions.map((opt, idx) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <button
                      key={String(opt.value) || idx}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt)}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer select-none',
                        isSelected
                          ? 'bg-[var(--accent-muted)] font-medium text-[var(--accent)]'
                          : 'text-[var(--text-1)] hover:bg-[var(--surface-2)]',
                        opt.disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        {opt.color && (
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: opt.color }}
                          />
                        )}
                        <span className="truncate">{opt.label}</span>
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[var(--accent)] shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default PopoverSelect;
