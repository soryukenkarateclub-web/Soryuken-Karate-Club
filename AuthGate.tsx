import { ArrowRight, ShieldCheck } from 'lucide-react';
import { DEFAULT_DOJO_EMBLEM, DOJO_HERO_BANNER } from '../utils/seedData';
import type { DojoProfile } from '../types/dojo';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthGateProps {
  profile: DojoProfile;
  authError: string | null;
  onGoogleSignIn: () => void;
  onEnterDemo: () => void;
}

export function AuthGate({
  profile,
  authError,
  onGoogleSignIn,
  onEnterDemo,
}: AuthGateProps) {
  const logoSrc = profile.logoDataUrl || DEFAULT_DOJO_EMBLEM;

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-12">
      <div className="lg:col-span-6 flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoSrc}
              alt={`${profile.name} emblem`}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
            />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap truncate">
              {profile.name}
            </span>
          </div>
          <PWAInstallButton compact />
        </div>

        <div className="max-w-md my-12">
          <p className="text-xs font-medium text-red-700 tracking-wide">
            Dojo Administration &amp; Admissions
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
            Everything your karate club needs in one ledger.
          </h1>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            Manage online and in-house student admissions, daily attendance, monthly tuition fees, club bills, net income, and printable reports for {profile.name}.
          </p>

          {authError && (
            <div
              role="alert"
              className="mt-6 p-3.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800"
            >
              {authError}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-red-700 text-white font-medium text-sm rounded-lg hover:bg-red-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Sign in with Google (Cloud Sync)</span>
            </button>

            <button
              type="button"
              onClick={onEnterDemo}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white text-slate-800 border border-slate-300 font-medium text-sm rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer"
            >
              <span>Open Demo Dojo Workspace</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">Full Edit Control</p>
              <p className="mt-0.5">Edit club branding, batches, student records, fees, and bills anytime.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Online Admission &amp; Reports</p>
              <p className="mt-0.5">Shareable enrollment form, receipts, and CSV/print reports.</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          {profile.name} · {profile.senseiName}
        </p>
      </div>

      <div className="hidden lg:block lg:col-span-6 relative bg-slate-900">
        <img
          src={DOJO_HERO_BANNER}
          alt="Modern traditional Japanese karate dojo interior"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-12 text-white">
          <p className="text-sm font-medium text-slate-200">
            {profile.tagline}
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-white">
            {profile.name}
          </p>
          <p className="mt-2 text-xs text-slate-300">
            {profile.address} · {profile.phone}
          </p>
        </div>
      </div>
    </div>
  );
}
