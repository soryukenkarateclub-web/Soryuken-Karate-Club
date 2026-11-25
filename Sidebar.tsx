import {
  CalendarCheck,
  CreditCard,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { DojoProfile, NavSection } from '../types/dojo';
import { DEFAULT_DOJO_EMBLEM } from '../utils/seedData';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  profile: DojoProfile;
  pendingAdmissionsCount: number;
  isDemoMode: boolean;
  userEmail: string | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  onGoogleSignIn: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'admissions', label: 'Admissions', icon: UserPlus },
  { id: 'students', label: 'Student Database', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'fees', label: 'Fee Collection', icon: CreditCard },
  { id: 'finance', label: 'Bills & Income', icon: Receipt },
  { id: 'reports', label: 'Reports', icon: FileBarChart2 },
  { id: 'settings', label: 'Club Settings', icon: Settings },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  profile,
  pendingAdmissionsCount,
  isDemoMode,
  userEmail,
  mobileOpen,
  onCloseMobile,
  onLogout,
  onGoogleSignIn,
}: SidebarProps) {
  const logoSrc = profile.logoDataUrl || DEFAULT_DOJO_EMBLEM;

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="px-5 py-5 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={logoSrc}
            alt={`${profile.name} emblem`}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
          />
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-slate-900 truncate">
              {profile.name}
            </p>
            <p className="text-xs text-slate-500 truncate">{profile.senseiName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav aria-label="Main navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-red-50 text-red-800'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-red-700' : 'text-slate-400'
                  }`}
                />
                <span className="truncate whitespace-nowrap">{item.label}</span>
              </span>
              {item.id === 'admissions' && pendingAdmissionsCount > 0 && (
                <span className="text-xs font-mono tabular-nums font-semibold text-red-700">
                  {pendingAdmissionsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-3">
        <PWAInstallButton />
        <div className="text-xs text-slate-600">
          <p className="font-medium text-slate-900 truncate">
            {isDemoMode ? 'Local Demo Workspace' : userEmail || 'Cloud Synced'}
          </p>
          <p className="text-slate-500 mt-0.5 truncate">
            {isDemoMode ? 'Saved in browser storage' : 'Firestore connected'}
          </p>
        </div>

        {isDemoMode ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="w-full px-3 py-2 text-xs font-medium text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors cursor-pointer"
            >
              Connect Google Cloud Sync
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Demo</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 no-print">{navContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <button
            type="button"
            aria-label="Close menu backdrop"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/40"
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">{navContent}</aside>
        </div>
      )}
    </>
  );
}
