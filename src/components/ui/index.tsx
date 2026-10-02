import * as React from 'react';
import { Moon, Sun, Laptop } from 'lucide-react';
import { cn, formatTime } from '../../lib/utils';
import useStore from '../../store/useStore';

// ── Button ─────────────────────────────────────────────────────────────────────
const buttonVariants: Record<string, string> = {
  default:   'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-md',
  secondary: 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-1)] border border-[var(--border)] hover:border-[var(--border-hover)]',
  ghost:     'hover:bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)]',
  danger:    'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/40',
  success:   'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20',
  outline:   'border border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]',
};

const buttonSizes: Record<string, string> = {
  sm:       'h-7 px-3 text-xs rounded-md gap-1.5',
  md:       'h-9 px-4 text-sm rounded-[10px] gap-2',
  lg:       'h-11 px-6 text-sm rounded-xl gap-2.5',
  icon:     'h-8 w-8 rounded-lg',
  'icon-sm':'h-7 w-7 rounded-md',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50',
        'disabled:opacity-40 disabled:pointer-events-none select-none cursor-pointer',
        buttonVariants[variant], buttonSizes[size], className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = 'Button';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

export const Badge = ({ children, className, style }: BadgeProps) => (
  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', className)} style={style}>
    {children}
  </span>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--text-1)]',
        'placeholder:text-[var(--text-3)] transition-colors duration-150',
        'focus:outline-none focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/15',
        'hover:border-[var(--border-hover)] disabled:opacity-40 disabled:pointer-events-none',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex w-full rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)]',
        'placeholder:text-[var(--text-3)] transition-colors duration-150 resize-none',
        'focus:outline-none focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/15',
        'hover:border-[var(--border-hover)]',
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export const Label = ({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('text-xs font-medium text-[var(--text-2)] block mb-1.5', className)} {...props}>
    {children}
  </label>
);

export const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]', className)} {...props}>
    {children}
  </div>
);

export const Spinner = ({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const sizes: Record<string, string> = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-8 w-8' };
  return (
    <div className={cn('animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]', sizes[size], className)} />
  );
};

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-shimmer rounded-lg bg-[var(--surface-2)]', className)} />
);

export const Separator = ({ className, orientation = 'horizontal' }: { className?: string; orientation?: 'horizontal' | 'vertical' }) => (
  <div className={cn('bg-[var(--border)] shrink-0', orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full', className)} />
);

export interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar = ({ src, name, size = 'sm', className }: AvatarProps) => {
  const [imgError, setImgError] = React.useState(false);
  const initials = name ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  const sizes: Record<string, string> = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' };
  const hue = (name ? name.charCodeAt(0) : 0) * 137.5 % 360;

  if (src && !imgError) {
    return (
      <img src={src} alt={name || 'Avatar'} onError={() => setImgError(true)}
        className={cn('rounded-full object-cover border border-[var(--border)]', sizes[size], className)} />
    );
  }
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-semibold text-white border border-[var(--border)]', sizes[size], className)}
      style={{ background: `hsl(${hue}, 55%, 35%)` }} title={name || ''}
    >
      {initials}
    </div>
  );
};

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip = ({ children, content, side = 'top' }: TooltipProps) => {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && content && (
        <div className={cn(
          'absolute z-50 px-2 py-1 text-xs text-[var(--text-1)] bg-[var(--surface-2)] border border-[var(--border)] rounded-md whitespace-nowrap shadow-xl pointer-events-none animate-fade-in',
          side === 'top'    && 'bottom-full mb-1.5 left-1/2 -translate-x-1/2',
          side === 'bottom' && 'top-full mt-1.5 left-1/2 -translate-x-1/2',
          side === 'left'   && 'right-full mr-1.5 top-1/2 -translate-y-1/2',
          side === 'right'  && 'left-full ml-1.5 top-1/2 -translate-y-1/2'
        )}>
          {content}
        </div>
      )}
    </div>
  );
};

export { PopoverSelect, type PopoverOption, type PopoverSelectProps } from './PopoverSelect';
import { PopoverSelect, type PopoverOption } from './PopoverSelect';

export interface SelectProps {
  id?: string;
  name?: string;
  value?: any;
  onChange?: (e: any) => void;
  options?: PopoverOption[];
  children?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  popoverWidth?: number | string;
  align?: 'left' | 'right';
  icon?: any;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (props, _ref) => <PopoverSelect {...props} />
);
Select.displayName = 'Select';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Switch = ({ checked, onCheckedChange, disabled }: SwitchProps) => (
  <button
    type="button"
    role="switch" aria-checked={checked}
    onClick={() => !disabled && onCheckedChange(!checked)}
    className={cn(
      'inline-flex h-5 w-9 cursor-pointer items-center rounded-full border-2 border-transparent',
      'transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50',
      checked ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]',
      disabled && 'opacity-40 pointer-events-none'
    )}
    disabled={disabled}
  >
    <span className={cn('pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform duration-200', checked ? 'translate-x-4' : 'translate-x-0')} />
  </button>
);

export const ProgressBar = ({ value, className }: { value: number; className?: string }) => (
  <div className={cn('h-1.5 w-full bg-[var(--surface-2)] rounded-full overflow-hidden', className)}>
    <div
      className="h-full bg-gradient-to-r from-[var(--accent)] to-emerald-400 rounded-full transition-all duration-500"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

// ── Theme Toggle ────────────────────────────────────────────────────────────────
const THEME_OPTIONS = [
  { value: 'dark',   icon: Moon,   label: 'Dark' },
  { value: 'light',  icon: Sun,    label: 'Light' },
  { value: 'system', icon: Laptop, label: 'System' },
];

export function ThemeToggle() {
  const theme    = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const idx      = THEME_OPTIONS.findIndex((o) => o.value === theme);
  const current  = THEME_OPTIONS[idx] || THEME_OPTIONS[0];
  const next     = THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length];
  const CurrentIcon = current.icon;

  return (
    <Tooltip content={`Theme: ${current.label} (Click for ${next.label})`} side="bottom">
      <Button
        variant="ghost" size="icon-sm"
        onClick={() => setTheme(next.value)}
        aria-label="Toggle theme"
        className="transition-transform active:scale-90"
      >
        <CurrentIcon className="h-4 w-4 text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors animate-pop" />
      </Button>
    </Tooltip>
  );
}

// ── Cache Status ────────────────────────────────────────────────────────────────
export function CacheStatus({ lastFetchedAt }: { lastFetchedAt?: number | null }) {
  const { appSettings } = useStore();
  const [ago, setAgo] = React.useState('');

  React.useEffect(() => {
    if (!lastFetchedAt) return;
    const update = () => {
      const s = Math.floor((Date.now() - lastFetchedAt) / 1000);
      if (s < 60)        setAgo(`${s}s ago`);
      else if (s < 3600) setAgo(`${Math.floor(s / 60)}m ago`);
      else               setAgo(`${Math.floor(s / 3600)}h ago`);
    };
    update();
    const id = setInterval(update, 15_000);
    return () => clearInterval(id);
  }, [lastFetchedAt]);

  if (!lastFetchedAt) return null;
  const clock = formatTime(lastFetchedAt, appSettings?.clockFormat || '12h');
  return (
    <span
      className="text-[10px] text-[var(--text-3)] cursor-help select-none"
      title={`Data fetched at ${clock} (${ago})`}
    >
      ↻ {ago} {clock && <span className="opacity-60 hidden sm:inline">({clock})</span>}
    </span>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
export interface EmptyStateProps {
  icon?: any;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in">
    {Icon && (
      <div className="mb-4 p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
        <Icon className="h-8 w-8 text-[var(--text-3)]" />
      </div>
    )}
    <h3 className="text-base font-semibold text-[var(--text-1)] mb-1">{title}</h3>
    {description && <p className="text-sm text-[var(--text-2)] mb-4 max-w-sm">{description}</p>}
    {action}
  </div>
);

export { FilterSelect } from './FilterSelect';
