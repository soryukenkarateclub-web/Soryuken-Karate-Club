import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { DojoBatch, DojoProfile } from '../types/dojo';
import { formatCurrency } from '../utils/dojoLogic';
import { DEFAULT_DOJO_EMBLEM } from '../utils/seedData';
import { MobileAppInstallCard } from './PWAInstallButton';

interface ClubSettingsViewProps {
  profile: DojoProfile;
  batches: DojoBatch[];
  isDemoMode: boolean;
  onUpdateProfile: (next: Omit<DojoProfile, 'id' | 'ownerId'>) => Promise<void>;
  onSaveBatch: (batch: Omit<DojoBatch, 'id' | 'ownerId'> & { id?: string }) => Promise<void>;
  onDeleteBatch: (id: string) => Promise<void>;
  onResetDemoData?: () => void;
}

function compressImageToDataUrl(file: File, maxSize = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

export function ClubSettingsView({
  profile,
  batches,
  isDemoMode,
  onUpdateProfile,
  onSaveBatch,
  onDeleteBatch,
  onResetDemoData,
}: ClubSettingsViewProps) {
  const [name, setName] = useState(profile.name);
  const [tagline, setTagline] = useState(profile.tagline);
  const [senseiName, setSenseiName] = useState(profile.senseiName);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [address, setAddress] = useState(profile.address);
  const [currency, setCurrency] = useState(profile.currency);
  const [defaultAdmissionFee, setDefaultAdmissionFee] = useState(profile.defaultAdmissionFee);
  const [defaultMonthlyFee, setDefaultMonthlyFee] = useState(profile.defaultMonthlyFee);
  const [logoDataUrl, setLogoDataUrl] = useState(profile.logoDataUrl || DEFAULT_DOJO_EMBLEM);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setName(profile.name);
    setTagline(profile.tagline);
    setSenseiName(profile.senseiName);
    setPhone(profile.phone);
    setEmail(profile.email);
    setAddress(profile.address);
    setCurrency(profile.currency);
    setDefaultAdmissionFee(profile.defaultAdmissionFee);
    setDefaultMonthlyFee(profile.defaultMonthlyFee);
    setLogoDataUrl(profile.logoDataUrl || DEFAULT_DOJO_EMBLEM);
  }, [profile]);

  // Batch Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | undefined>(undefined);
  const [batchName, setBatchName] = useState('');
  const [batchSchedule, setBatchSchedule] = useState('');
  const [batchInstructor, setBatchInstructor] = useState('');
  const [batchFee, setBatchFee] = useState<number>(profile.defaultMonthlyFee);
  const [batchCapacity, setBatchCapacity] = useState<number>(25);

  const handleSaveClubProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || senseiName.trim().length < 2) return;
    await onUpdateProfile({
      name: name.trim(),
      tagline: tagline.trim(),
      senseiName: senseiName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      currency: currency.trim() || '$',
      defaultAdmissionFee: Number(defaultAdmissionFee) || 0,
      defaultMonthlyFee: Number(defaultMonthlyFee) || 0,
      logoDataUrl,
    });
    setSavedMsg('Club profile and defaults updated across the entire app.');
    setTimeout(() => setSavedMsg(null), 3500);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataUrl(file);
      setLogoDataUrl(compressed);
    } catch {
      // Ignore invalid upload
    }
  };

  const openAddBatch = () => {
    setEditingBatchId(undefined);
    setBatchName('');
    setBatchSchedule('');
    setBatchInstructor(senseiName);
    setBatchFee(defaultMonthlyFee);
    setBatchCapacity(24);
    setBatchModalOpen(true);
  };

  const openEditBatch = (b: DojoBatch) => {
    setEditingBatchId(b.id);
    setBatchName(b.name);
    setBatchSchedule(b.schedule);
    setBatchInstructor(b.instructor);
    setBatchFee(b.monthlyFee);
    setBatchCapacity(b.capacity);
    setBatchModalOpen(true);
  };

  const handleSaveBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (batchName.trim().length < 2 || batchSchedule.trim().length < 2) return;
    await onSaveBatch({
      id: editingBatchId,
      name: batchName.trim(),
      schedule: batchSchedule.trim(),
      instructor: batchInstructor.trim(),
      monthlyFee: Number(batchFee) || 0,
      capacity: Math.max(1, Number(batchCapacity) || 20),
    });
    setBatchModalOpen(false);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {savedMsg && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 flex items-center gap-2 text-sm"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Club Details & Branding Editor */}
      <form
        onSubmit={handleSaveClubProfile}
        className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
      >
        <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Institution Details &amp; Branding
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit your club name, emblem, contact information, currency, and default fee rates.
            </p>
          </div>
          {isDemoMode && onResetDemoData && (
            <button
              type="button"
              onClick={onResetDemoData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Data</span>
            </button>
          )}
        </div>

        {/* Emblem Upload Row */}
        <div className="flex flex-wrap items-center gap-5">
          <img
            src={logoDataUrl || DEFAULT_DOJO_EMBLEM}
            alt="Club emblem preview"
            referrerPolicy="no-referrer"
            className="w-20 h-20 rounded-xl object-cover border border-slate-200 bg-white"
          />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-800">Club Emblem / Logo</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Club Emblem</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={() => setLogoDataUrl(DEFAULT_DOJO_EMBLEM)}
                className="px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Use Default Crest
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Displayed on the sidebar, online admission form, official receipts, and printed reports.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          <div>
            <label htmlFor="set-name" className="block text-xs font-medium text-slate-700 mb-1">
              Institution Name *
            </label>
            <input
              id="set-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="set-tagline" className="block text-xs font-medium text-slate-700 mb-1">
              Tagline / Style Subtitle
            </label>
            <input
              id="set-tagline"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="set-sensei" className="block text-xs font-medium text-slate-700 mb-1">
              Head Instructor / Sensei *
            </label>
            <input
              id="set-sensei"
              type="text"
              required
              value={senseiName}
              onChange={(e) => setSenseiName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="set-phone" className="block text-xs font-medium text-slate-700 mb-1">
              Club Phone
            </label>
            <input
              id="set-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="set-email" className="block text-xs font-medium text-slate-700 mb-1">
              Club Email
            </label>
            <input
              id="set-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor="set-address" className="block text-xs font-medium text-slate-700 mb-1">
              Dojo Address
            </label>
            <input
              id="set-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="set-currency" className="block text-xs font-medium text-slate-700 mb-1">
              Currency Symbol
            </label>
            <select
              id="set-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="$">$ (USD / Dollar)</option>
              <option value="৳">৳ (BDT / Taka)</option>
              <option value="₹">₹ (INR / Rupee)</option>
              <option value="£">£ (GBP / Pound)</option>
              <option value="€">€ (EUR / Euro)</option>
              <option value="¥">¥ (JPY / Yen)</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-adm-fee" className="block text-xs font-medium text-slate-700 mb-1">
              Default Admission Fee ({currency})
            </label>
            <input
              id="set-adm-fee"
              type="number"
              min={0}
              value={defaultAdmissionFee}
              onChange={(e) => setDefaultAdmissionFee(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="set-mon-fee" className="block text-xs font-medium text-slate-700 mb-1">
              Default Monthly Fee ({currency})
            </label>
            <input
              id="set-mon-fee"
              type="number"
              min={0}
              value={defaultMonthlyFee}
              onChange={(e) => setDefaultMonthlyFee(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-800 cursor-pointer"
          >
            Save Club Settings
          </button>
        </div>
      </form>

      {/* Batches & Class Timings Editor */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Training Batches &amp; Fee Tiers
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add, edit, or remove training groups, schedules, instructors, and batch tuition rates.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddBatch}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Batch</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {batches.map((b) => (
            <div
              key={b.id}
              className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {b.schedule} · Instructor: {b.instructor}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right font-mono tabular-nums text-xs">
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(b.monthlyFee, currency)}/mo
                  </p>
                  <p className="text-slate-500">Cap: {b.capacity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditBatch(b)}
                    aria-label={`Edit batch ${b.name}`}
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {batches.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteBatch(b.id)}
                      aria-label={`Delete batch ${b.name}`}
                      className="p-1.5 text-slate-400 hover:text-red-700 rounded hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MobileAppInstallCard />

      {/* Add / Edit Batch Modal */}
      {batchModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-modal-title"
        >
          <form
            onSubmit={handleSaveBatchSubmit}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 id="batch-modal-title" className="font-display text-base font-bold text-slate-900">
                {editingBatchId ? 'Edit Training Batch' : 'Add Training Batch'}
              </h3>
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                aria-label="Close batch modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Batch Name *</label>
              <input
                type="text"
                required
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g., Weekend Kata Workshop"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Schedule *</label>
              <input
                type="text"
                required
                value={batchSchedule}
                onChange={(e) => setBatchSchedule(e.target.value)}
                placeholder="e.g., Sat / Sun · 10:00 AM – 11:30 AM"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Instructor</label>
              <input
                type="text"
                value={batchInstructor}
                onChange={(e) => setBatchInstructor(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Monthly Fee ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  value={batchFee}
                  onChange={(e) => setBatchFee(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Capacity</label>
                <input
                  type="number"
                  min={1}
                  value={batchCapacity}
                  onChange={(e) => setBatchCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer"
              >
                Save Batch
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
