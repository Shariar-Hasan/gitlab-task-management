import React, { useEffect } from 'react';
import { GitBranch, Settings as SettingsIcon } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import { ToastProvider, ConfirmProvider } from './components/ui/overlay';
import { Spinner } from './components/ui/index';
import useStore from './store/useStore';

// ── Loading Screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 bg-[var(--bg)]">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-emerald-800 flex items-center justify-center shadow-2xl shadow-[var(--accent)]/20">
          <GitBranch className="h-8 w-8 text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--text-1)]">GitLab Task Manager</p>
        <p className="text-xs text-[var(--text-3)] mt-0.5">Initializing...</p>
      </div>
    </div>
  );
}

// ── Welcome Screen ────────────────────────────────────────────────────────────
function WelcomeScreen({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center animate-fade-in bg-[var(--bg)]">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--accent)] opacity-10 rounded-full blur-3xl" />
      </div>

      <div className="relative h-24 w-24 rounded-3xl bg-gradient-to-br from-[var(--accent)] to-emerald-800 flex items-center justify-center shadow-2xl shadow-[var(--accent)]/25">
        <GitBranch className="h-12 w-12 text-white" />
        <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-emerald-400 border-2 border-[var(--bg)] animate-pulse-dot" />
      </div>

      <div className="relative">
        <h1 className="text-3xl font-bold text-[var(--text-1)] mb-3">GitLab Task Manager</h1>
        <p className="text-sm text-[var(--text-2)] max-w-sm leading-relaxed">
          Your unified command center for all GitLab projects and issues.
          Connect once, manage everything from a single beautiful dashboard.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs relative">
        <button
          id="connect-btn"
          onClick={onSetup}
          className="h-12 px-6 rounded-xl bg-gradient-to-r from-[var(--accent)] to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
        >
          <SettingsIcon className="h-4 w-4" />
          Connect GitLab Account
        </button>
      </div>

      <div className="flex items-center gap-6 text-xs text-[var(--text-3)] relative">
        {['All projects', 'Inline editing', 'Smart caching', 'Dark & light mode'].map((f) => (
          <div key={f} className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── App Content ───────────────────────────────────────────────────────────────
function AppContent() {
  const { isAuthenticated, activeView, setActiveView, loadSettings } = useStore();
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    loadSettings().finally(() => setLoading(false));
  }, [loadSettings]);

  if (loading) return <LoadingScreen />;

  if (activeView === 'settings') {
    return (
      <Settings onBack={isAuthenticated ? () => setActiveView('dashboard') : undefined} />
    );
  }

  if (!isAuthenticated) {
    return <WelcomeScreen onSetup={() => setActiveView('settings')} />;
  }

  return <Dashboard onSettings={() => setActiveView('settings')} />;
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppContent />
      </ConfirmProvider>
    </ToastProvider>
  );
}
