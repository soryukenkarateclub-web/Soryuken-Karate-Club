import {
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  Menu,
  UserPlus,
} from 'lucide-react';
import type { NavSection } from '../types/dojo';

interface MobileBottomNavProps {
  activeSection: NavSection;
  pendingAdmissionsCount: number;
  onSelectSection: (section: NavSection) => void;
  onOpenMoreMenu: () => void;
}

export function MobileBottomNav({
  activeSection,
  pendingAdmissionsCount,
  onSelectSection,
  onOpenMoreMenu,
}: MobileBottomNavProps) {
  const isMoreActive =
    activeSection === 'students' ||
    activeSection === 'finance' ||
    activeSection === 'reports' ||
    activeSection === 'settings';

  const tabs: {
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'overview', label: 'Home', icon: LayoutDashboard },
    {
      id: 'admissions',
      label: 'Admit',
      icon: UserPlus,
      badge: pendingAdmissionsCount > 0 ? pendingAdmissionsCount : undefined,
    },
    { id: 'attendance', label: 'Attend', icon: CalendarCheck },
    { id: 'fees', label: 'Fees', icon: CreditCard },
  ];

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                active ? 'text-red-700 bg-red-50/70' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-red-700' : 'text-slate-500'}`} />
              <span className="mt-0.5 leading-none">{item.label}</span>
              {item.badge !== undefined && (
                <span className="absolute top-1 right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-700 text-white text-[10px] font-mono tabular-nums flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenMoreMenu}
          className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
            isMoreActive ? 'text-red-700 bg-red-50/70' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Menu className={`w-4 h-4 ${isMoreActive ? 'text-red-700' : 'text-slate-500'}`} />
          <span className="mt-0.5 leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}
