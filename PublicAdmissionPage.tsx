import { useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { DojoBatch, DojoProfile, Gender, OnlineAdmission } from '../types/dojo';
import { formatCurrency } from '../utils/dojoLogic';
import { DEFAULT_DOJO_EMBLEM } from '../utils/seedData';

interface PublicAdmissionPageProps {
  profile: DojoProfile;
  batches: DojoBatch[];
  todayDate: string;
  onSubmitApplication: (
    admission: Omit<OnlineAdmission, 'id' | 'ownerId'>
  ) => Promise<OnlineAdmission>;
  onBackToDashboard: () => void;
}

export function PublicAdmissionPage({
  profile,
  batches,
  todayDate,
  onSubmitApplication,
  onBackToDashboard,
}: PublicAdmissionPageProps) {
  const [applicantName, setApplicantName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [guardianName, setGuardianName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [preferredBatchId, setPreferredBatchId] = useState(batches[0]?.id ?? '');
  const [previousExperience, setPreviousExperience] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedName, setSubmittedName] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (applicantName.trim().length < 2) errs.applicantName = 'Full name is required.';
    if (phone.trim().length < 5) errs.phone = 'Valid phone number is required.';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    const batchObj = batches.find((b) => b.id === preferredBatchId) || batches[0];
    await onSubmitApplication({
      applicantName: applicantName.trim(),
      dateOfBirth,
      gender,
      guardianName: guardianName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      emergencyContact: emergencyContact.trim(),
      preferredBatchId: batchObj?.id || '',
      preferredBatchName: batchObj?.name || 'General Batch',
      previousExperience: previousExperience.trim() || 'None',
      medicalNotes: medicalNotes.trim() || 'None',
      applicationStatus: 'Pending',
      submittedDate: todayDate,
    });
    setSubmittedName(applicantName.trim());
    setApplicantName('');
    setDateOfBirth('');
    setGuardianName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setEmergencyContact('');
    setPreviousExperience('');
    setMedicalNotes('');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Club Dashboard</span>
          </button>
          <span className="text-xs text-slate-500">Online Admission Kiosk</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-200">
            <img
              src={profile.logoDataUrl || DEFAULT_DOJO_EMBLEM}
              alt={`${profile.name} emblem`}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-xl object-cover border border-slate-200"
            />
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">
                {profile.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {profile.tagline} · {profile.senseiName}
              </p>
              <p className="text-xs text-slate-500">
                {profile.address} · {profile.phone}
              </p>
            </div>
          </div>

          {submittedName ? (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                Application Received for {submittedName}
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Your online admission form has been submitted to {profile.name}. Our club administration will confirm your training batch shortly.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSubmittedName(null)}
                  className="px-4 py-2 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer"
                >
                  Submit Another Application
                </button>
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="px-4 py-2 text-xs font-medium border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Student Enrollment Application
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Admission Fee: {formatCurrency(profile.defaultAdmissionFee, profile.currency)} · Starting tuition depends on selected batch.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {errors.applicantName && (
                    <p className="mt-1 text-xs text-red-700">{errors.applicantName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-700">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Parent / Guardian Name
                  </label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preferred Training Batch
                  </label>
                  <select
                    value={preferredBatchId}
                    onChange={(e) => setPreferredBatchId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — {b.schedule} ({formatCurrency(b.monthlyFee, profile.currency)}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Prior Martial Arts Experience
                  </label>
                  <input
                    type="text"
                    value={previousExperience}
                    onChange={(e) => setPreviousExperience(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Medical Notes / Allergies
                  </label>
                  <input
                    type="text"
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-800 cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
