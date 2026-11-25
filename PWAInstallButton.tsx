import { useState } from 'react';
import { Check, ClipboardCopy, Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
          compact
            ? 'px-3 py-1.5 text-xs bg-slate-900 text-white hover:bg-slate-800'
            : 'w-full justify-center px-3 py-2 text-xs bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-1.5 font-medium rounded-lg border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer ${
            compact ? 'px-3 py-1.5 text-xs' : 'w-full justify-center px-3 py-2 text-xs'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>Install on iPhone</span>
        </button>

        {showIOSGuide && (
          <IOSInstallModal onClose={() => setShowIOSGuide(false)} />
        )}
      </>
    );
  }

  return null;
}

function IOSInstallModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h3 id="ios-install-title" className="font-display text-base font-bold text-slate-900">
            Install on iPhone / iPad
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close install instructions"
            className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-red-50 text-red-700 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <span>
              Open this page in <strong>Safari</strong> and tap the{' '}
              <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                <Share className="w-3.5 h-3.5" /> Share
              </span>{' '}
              button in the Safari toolbar.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-red-50 text-red-700 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <span>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-red-50 text-red-700 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <span>
              Tap <strong>Add</strong> — Sōryuken Karate Club will launch full-screen like a native app.
            </span>
          </li>
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export function MobileAppInstallCard() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyAppUrl = () => {
    const url = window.location.origin;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-red-50 text-red-700 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Install on Phone (Android &amp; Apple iOS)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Install Sōryuken Karate Club on your phone home screen for full-screen mobile use and offline access.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isInstalled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Check className="w-3.5 h-3.5" />
              <span>Installed on Device</span>
            </span>
          ) : (
            isInstallable && (
              <button
                type="button"
                onClick={() => void install()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App Now</span>
              </button>
            )
          )}
          <button
            type="button"
            onClick={handleCopyAppUrl}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            <span>{copiedUrl ? 'App Link Copied' : 'Copy Phone Install Link'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="border border-slate-200 rounded-lg p-4 space-y-1.5 bg-slate-50/60">
          <p className="font-semibold text-slate-900">Android (Chrome / Edge)</p>
          <p className="text-slate-600 leading-relaxed">
            Open the app link in <strong>Chrome</strong> on your Android phone, then tap{' '}
            <strong>Install App</strong> above or open the Chrome <strong>⋮ menu → Install app / Add to Home screen</strong>.
          </p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 space-y-1.5 bg-slate-50/60">
          <p className="font-semibold text-slate-900">Apple (iPhone &amp; iPad Safari)</p>
          <p className="text-slate-600 leading-relaxed">
            Open the app link in <strong>Safari</strong> on your iPhone or iPad, tap the{' '}
            <strong>Share</strong> button, and choose <strong>Add to Home Screen</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
