import React, { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FilterOption {
  value: string | number;
  label: string;
  subtitle?: string;
  color?: string;
  icon?: ReactNode;
  [key: string]: any;
}

export interface FilterSelectProps {
  id?: string;
  value?: any;
  onChange: (val: any) => void;
  options?: FilterOption[];
  placeholder?: string;
  label?: string;
  icon?: any;
  allLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  width?: number;
  isMulti?: boolean;
}

export function FilterSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  label = '',
  icon: Icon,
  allLabel = 'All',
  searchable = false,
  searchPlaceholder = 'Search...',
  width = 240,
  isMulti = false,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Multi-select helpers
  const selectedValues = useMemo(() => {
    if (!isMulti) return [];
    if (!Array.isArray(value)) return [];
    return value.map(String);
  }, [isMulti, value]);

  // Single-select option
  const singleSelectedOption = useMemo(() => {
    if (isMulti) return null;
    if (!value || value === 'all') return null;
    return options.find((o) => String(o.value) === String(value));
  }, [isMulti, value, options]);

  const hasSelection = isMulti ? selectedValues.length > 0 : Boolean(singleSelectedOption);

  // Position calculation
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const popoverHeight = 320;
    let top = r.bottom + 6;
    if (spaceBelow < popoverHeight && r.top > popoverHeight) {
      top = Math.max(8, r.top - popoverHeight - 6);
    }
    let left = r.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(8, window.innerWidth - width - 12);
    }
    setPos({ top, left });
    setSearch('');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }, [open, width]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Filtered options by search
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) =>
      o.label.toLowerCase().includes(q) || (o.subtitle && o.subtitle.toLowerCase().includes(q))
    );
  }, [options, search]);

  const handleSingleSelect = (val: any) => {
    onChange(val);
    setOpen(false);
  };

  const handleMultiToggle = (val: any) => {
    const sVal = String(val);
    let next: string[];
    if (selectedValues.includes(sVal)) {
      next = selectedValues.filter((v) => v !== sVal);
    } else {
      next = [...selectedValues, sVal];
    }
    onChange(next);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMulti) {
      onChange([]);
    } else {
      onChange(null);
    }
  };

  return (
    <>
      <button
        ref={anchorRef}
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-all duration-150 select-none cursor-pointer',
          hasSelection
            ? 'border-[var(--accent)]/40 bg-[var(--accent-muted)] text-[var(--text-1)] hover:border-[var(--accent)]/60'
            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--border-hover)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]',
          open && 'ring-2 ring-[var(--accent)]/20 border-[var(--accent)]/60'
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-colors',
              hasSelection ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'
            )}
          />
        )}

        <span className="text-[var(--text-3)] font-normal">{label}:</span>

        {isMulti ? (
          selectedValues.length === 0 ? (
            <span className="text-[var(--text-2)]">{allLabel}</span>
          ) : selectedValues.length === 1 ? (
            <span className="font-semibold text-[var(--text-1)] max-w-[130px] truncate">
              {options.find((o) => String(o.value) === selectedValues[0])?.label || selectedValues[0]}
            </span>
          ) : (
            <span className="font-semibold text-[var(--text-1)] flex items-center gap-1">
              <span className="px-1.5 py-0.2 bg-[var(--accent)]/20 text-[var(--accent)] rounded font-bold text-[10px]">
                {selectedValues.length}
              </span>
              <span>selected</span>
            </span>
          )
        ) : hasSelection && singleSelectedOption ? (
          <span className="font-semibold text-[var(--text-1)] max-w-[140px] truncate flex items-center gap-1.5">
            {singleSelectedOption.icon ? (
              singleSelectedOption.icon
            ) : singleSelectedOption.color ? (
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: singleSelectedOption.color }}
              />
            ) : null}
            {singleSelectedOption.label}
          </span>
        ) : (
          <span className="text-[var(--text-2)]">{allLabel}</span>
        )}

        {hasSelection ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            className="ml-0.5 p-0.5 rounded-full hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            title="Clear filter"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown
            className={cn(
              'h-3 w-3 text-[var(--text-3)] transition-transform duration-150',
              open && 'rotate-180 text-[var(--text-1)]'
            )}
          />
        )}
      </button>

      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className="fixed z-50 animate-fade-in rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-modal)] overflow-hidden flex flex-col max-h-[340px]"
              style={{ top: pos.top, left: pos.left, width }}
            >
              {/* Optional Search bar */}
              {(searchable || options.length > 5) && (
                <div className="p-2 border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
                    <input
                      ref={searchInputRef}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="w-full h-7 pl-8 pr-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent)]/60"
                    />
                  </div>
                </div>
              )}

              {/* Multi-select Header Actions */}
              {isMulti && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--surface-2)]/60 border-b border-[var(--border)] text-[11px] text-[var(--text-3)]">
                  <span>{selectedValues.length} selected</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onChange(options.map((o) => String(o.value)))}
                      className="hover:text-[var(--text-1)] transition-colors cursor-pointer"
                    >
                      Select all
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => onChange([])}
                      className="hover:text-[var(--text-1)] transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Options list */}
              <div className="overflow-y-auto p-1 py-1.5 flex-1 divide-y divide-[var(--border)]/20">
                {/* Reset / All option for single select */}
                {!isMulti && !search && (
                  <button
                    type="button"
                    onClick={() => handleSingleSelect(null)}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
                      !value || value === 'all'
                        ? 'bg-[var(--accent-muted)] text-[var(--accent)] font-semibold'
                        : 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full border border-[var(--text-3)]" />
                      <span>{allLabel}</span>
                    </span>
                    {(!value || value === 'all') && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                  </button>
                )}

                {/* Filtered items */}
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-[var(--text-3)]">
                    No results found
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const active = isMulti
                      ? selectedValues.includes(String(opt.value))
                      : String(value) === String(opt.value);

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          if (isMulti) {
                            handleMultiToggle(opt.value);
                          } else {
                            handleSingleSelect(opt.value);
                          }
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left',
                          active
                            ? 'bg-[var(--accent-muted)] text-[var(--accent)] font-medium'
                            : 'text-[var(--text-1)] hover:bg-[var(--surface-2)]'
                        )}
                      >
                        <span className="flex items-center gap-2 min-w-0 pr-2">
                          {isMulti ? (
                            <span
                              className={cn(
                                'h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-colors',
                                active
                                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                                  : 'border-[var(--border)] bg-[var(--surface)] text-transparent'
                              )}
                            >
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          ) : null}

                          {opt.icon ? (
                            opt.icon
                          ) : opt.color ? (
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: opt.color }}
                            />
                          ) : null}

                          <div className="flex flex-col min-w-0 text-left">
                            <span className="truncate leading-tight font-medium">{opt.label}</span>
                            {opt.subtitle && (
                              <span className="text-[10px] text-[var(--text-3)] truncate leading-tight mt-0.5 max-w-[200px]">
                                {opt.subtitle}
                              </span>
                            )}
                          </div>
                        </span>
                        {!isMulti && active && (
                          <Check className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

export default FilterSelect;
