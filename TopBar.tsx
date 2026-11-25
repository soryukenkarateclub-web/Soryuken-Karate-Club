import { Menu, Plus } from 'lucide-react';
import type { DojoProfile, NavSection } from '../types/dojo';
import { PWAInstallButton } from './PWAInstallButton';

interface TopBarProps {
  profile: DojoProfile;
  activeSection: NavSection;
  onOpenMobileNav: () => void;
  onNewAdmission: () => void;
  onOpenSettings: () => void;
}

const SECTION_TITLES: Record<NavSection, string> = {
  overview: 'Dojo Overview',
  admissions: 'Admissions & Online Form',
  students: 'Student Database',
  attendance: 'Attendance Register',
  fees: 'Fee Collection & Receipts',
  finance: 'Monthly Bills & Income',
  reports: 'Reports & Exports',
  settings: 'Club & Batch Settings',
};

export function TopBar({
  profile,
  activeSection,
  onOpenMobileNav,
  onNewAdmission,
  onOpenSettings,
}: TopBarProps) {
  return (
    <header className="no-print bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <button
            type="button"
            onClick={onOpenSettings}
            className="hidden sm:inline font-medium text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap truncate max-w-[200px] cursor-pointer"
          >
            {profile.name}
          </button>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            /
          </span>
          <h1 className="font-display text-base font-bold text-slate-900 whitespace-nowrap truncate">
            {SECTION_TITLES[activeSection]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <PWAInstallButton compact />
        <button
          type="button"
          onClick={onNewAdmission}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-red-700 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-red-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>New Admission</span>
        </button>
      </div>
    </header>
  );
}
