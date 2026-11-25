import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardCopy,
  Edit3,
  ExternalLink,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  BELT_RANKS,
  type BeltRank,
  type DojoBatch,
  type DojoProfile,
  type Gender,
  type OnlineAdmission,
  type PaymentMethod,
  type PaymentRecord,
  PAYMENT_METHODS,
  type Student,
} from '../types/dojo';
import {
  calculateAge,
  formatCurrency,
  generateNextReceiptNumber,
  generateNextRollNumber,
  validateStudentForm,
} from '../utils/dojoLogic';
import { DEFAULT_DOJO_EMBLEM } from '../utils/seedData';

interface AdmissionsViewProps {
  profile: DojoProfile;
  batches: DojoBatch[];
  students: Student[];
  admissions: OnlineAdmission[];
  payments: PaymentRecord[];
  todayDate: string;
  onSaveStudent: (student: Omit<Student, 'id' | 'ownerId'> & { id?: string }) => Promise<Student>;
  onSavePayment: (payment: Omit<PaymentRecord, 'id' | 'ownerId'> & { id?: string }) => Promise<PaymentRecord>;
  onSaveOnlineAdmission: (
    admission: Omit<OnlineAdmission, 'id' | 'ownerId'> & { id?: string }
  ) => Promise<OnlineAdmission>;
  onDeleteOnlineAdmission: (id: string) => Promise<void>;
  onOpenReceipt: (payment: PaymentRecord) => void;
  onOpenPublicFormMode: () => void;
}

type AdmissionTab = 'direct' | 'queue' | 'online-form';

export function AdmissionsView({
  profile,
  batches,
  students,
  admissions,
  payments,
  todayDate,
  onSaveStudent,
  onSavePayment,
  onSaveOnlineAdmission,
  onDeleteOnlineAdmission,
  onOpenReceipt,
  onOpenPublicFormMode,
}: AdmissionsViewProps) {
  const [tab, setTab] = useState<AdmissionTab>('direct');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Direct admission form state
  const defaultBatch = batches[0];
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [guardianName, setGuardianName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [batchId, setBatchId] = useState(defaultBatch?.id ?? '');
  const [beltRank, setBeltRank] = useState<BeltRank>('White');
  const [admissionDate, setAdmissionDate] = useState(todayDate);
  const [admissionFee, setAdmissionFee] = useState<number>(profile.defaultAdmissionFee);
  const [monthlyFee, setMonthlyFee] = useState<number>(
    defaultBatch?.monthlyFee ?? profile.defaultMonthlyFee
  );
  const [medicalNotes, setMedicalNotes] = useState('');
  const [collectInitialFee, setCollectInitialFee] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Online form state
  const [appName, setAppName] = useState('');
  const [appDob, setAppDob] = useState('');
  const [appGender, setAppGender] = useState<Gender>('Male');
  const [appGuardian, setAppGuardian] = useState('');
  const [appPhone, setAppPhone] = useState('');
  const [appEmail, setAppEmail] = useState('');
  const [appAddress, setAppAddress] = useState('');
  const [appEmergency, setAppEmergency] = useState('');
  const [appBatchId, setAppBatchId] = useState(defaultBatch?.id ?? '');
  const [appExperience, setAppExperience] = useState('');
  const [appMedical, setAppMedical] = useState('');
  const [appErrors, setAppErrors] = useState<Record<string, string>>({});

  // Edit Online Application Modal state
  const [editingApp, setEditingApp] = useState<OnlineAdmission | null>(null);

  const selectedBatch = batches.find((b) => b.id === batchId) || defaultBatch;
  const computedAge = calculateAge(dateOfBirth, todayDate);
  const pendingCount = admissions.filter((a) => a.applicationStatus === 'Pending').length;

  const handleBatchChange = (nextBatchId: string) => {
    setBatchId(nextBatchId);
    const b = batches.find((item) => item.id === nextBatchId);
    if (b) {
      setMonthlyFee(b.monthlyFee);
    }
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateStudentForm({
      fullName,
      phone,
      batchId: batchId || selectedBatch?.id || '',
      admissionDate,
      admissionFee,
      monthlyFee,
    });
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setFormErrors({});
    setSubmitting(true);
    try {
      const year = admissionDate.slice(0, 4) || '2026';
      const rollNumber = generateNextRollNumber(students, year);
      const batchObj = batches.find((b) => b.id === batchId) || selectedBatch;

      const createdStudent = await onSaveStudent({
        rollNumber,
        fullName: fullName.trim(),
        dateOfBirth,
        gender,
        guardianName: guardianName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        emergencyContact: emergencyContact.trim() || `${guardianName.trim() || fullName.trim()} · ${phone.trim()}`,
        batchId: batchObj?.id || 'batch-general',
        batchName: batchObj?.name || 'General Batch',
        beltRank,
        admissionDate,
        admissionFee: Number(admissionFee) || 0,
        monthlyFee: Number(monthlyFee) || 0,
        status: 'Active',
        medicalNotes: medicalNotes.trim() || 'None',
        lastPromotedDate: '',
      });

      let createdReceipt: PaymentRecord | null = null;
      const billingMonth = admissionDate.slice(0, 7);

      if (collectInitialFee && Number(admissionFee) > 0) {
        createdReceipt = await onSavePayment({
          receiptNumber: generateNextReceiptNumber(payments, year),
          category: 'Admission Fee',
          studentId: createdStudent.id,
          studentName: createdStudent.fullName,
          billingMonth,
          amount: Number(admissionFee),
          discount: 0,
          netAmount: Number(admissionFee),
          method: paymentMethod,
          paymentDate: admissionDate,
          status: 'Paid',
          notes: `Admission registration (${rollNumber})`,
        });
      }

      if (collectInitialFee && Number(monthlyFee) > 0) {
        const nextRcp = generateNextReceiptNumber(
          createdReceipt ? [...payments, createdReceipt] : payments,
          year
        );
        const monthlyReceipt = await onSavePayment({
          receiptNumber: nextRcp,
          category: 'Monthly Fee',
          studentId: createdStudent.id,
          studentName: createdStudent.fullName,
          billingMonth,
          amount: Number(monthlyFee),
          discount: 0,
          netAmount: Number(monthlyFee),
          method: paymentMethod,
          paymentDate: admissionDate,
          status: 'Paid',
          notes: `First month tuition upon admission`,
        });
        createdReceipt = monthlyReceipt;
      }

      setFullName('');
      setDateOfBirth('');
      setGuardianName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setEmergencyContact('');
      setMedicalNotes('');
      setStatusNotice(`Enrolled ${createdStudent.fullName} (${createdStudent.rollNumber}) into ${createdStudent.batchName}.`);

      if (createdReceipt) {
        onOpenReceipt(createdReceipt);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOnlineFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (appName.trim().length < 2) errs.appName = 'Applicant full name is required.';
    if (appPhone.trim().length < 5) errs.appPhone = 'Valid phone number is required.';
    if (Object.keys(errs).length > 0) {
      setAppErrors(errs);
      return;
    }
    setAppErrors({});
    const batchObj = batches.find((b) => b.id === appBatchId) || defaultBatch;
    await onSaveOnlineAdmission({
      applicantName: appName.trim(),
      dateOfBirth: appDob,
      gender: appGender,
      guardianName: appGuardian.trim(),
      phone: appPhone.trim(),
      email: appEmail.trim(),
      address: appAddress.trim(),
      emergencyContact: appEmergency.trim(),
      preferredBatchId: batchObj?.id || '',
      preferredBatchName: batchObj?.name || 'General Batch',
      previousExperience: appExperience.trim() || 'None',
      medicalNotes: appMedical.trim() || 'None',
      applicationStatus: 'Pending',
      submittedDate: todayDate,
    });
    setAppName('');
    setAppDob('');
    setAppGuardian('');
    setAppPhone('');
    setAppEmail('');
    setAppAddress('');
    setAppEmergency('');
    setAppExperience('');
    setAppMedical('');
    setStatusNotice('Online admission application submitted to the review queue.');
    setTab('queue');
  };

  const handleApproveAndEnroll = async (adm: OnlineAdmission) => {
    const batchObj =
      batches.find((b) => b.id === adm.preferredBatchId) || defaultBatch;
    const year = todayDate.slice(0, 4) || '2026';
    const rollNumber = generateNextRollNumber(students, year);

    await onSaveStudent({
      rollNumber,
      fullName: adm.applicantName,
      dateOfBirth: adm.dateOfBirth,
      gender: adm.gender,
      guardianName: adm.guardianName,
      phone: adm.phone,
      email: adm.email,
      address: adm.address,
      emergencyContact: adm.emergencyContact || `${adm.guardianName || adm.applicantName} · ${adm.phone}`,
      batchId: batchObj?.id || 'batch-kids-beginners',
      batchName: batchObj?.name || adm.preferredBatchName || 'Kids Beginners',
      beltRank: 'White',
      admissionDate: todayDate,
      admissionFee: profile.defaultAdmissionFee,
      monthlyFee: batchObj?.monthlyFee ?? profile.defaultMonthlyFee,
      status: 'Active',
      medicalNotes: adm.medicalNotes || 'None',
      lastPromotedDate: '',
    });

    await onSaveOnlineAdmission({
      ...adm,
      applicationStatus: 'Approved',
    });

    setStatusNotice(`Approved and enrolled ${adm.applicantName} as ${rollNumber}.`);
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?apply=1`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setTab('direct')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'direct'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            New Student Admission
          </button>
          <button
            type="button"
            onClick={() => setTab('queue')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'queue'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Online Applications ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('online-form')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'online-form'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Online Admission Form
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            <span>{copiedLink ? 'Form Link Copied' : 'Copy Public Form Link'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenPublicFormMode}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Kiosk View</span>
          </button>
        </div>
      </div>

      {statusNotice && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 flex items-center justify-between gap-4 text-sm"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{statusNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            aria-label="Dismiss notice"
            className="p-1 text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Direct Student Admission */}
      {tab === 'direct' && (
        <form
          onSubmit={handleDirectSubmit}
          noValidate
          className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Student Admission &amp; Enrollment
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Enroll a student directly into {profile.name} and optionally generate their initial fee receipt.
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-slate-500">Assigned Roll Number</p>
              <p className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                {generateNextRollNumber(students, admissionDate.slice(0, 4) || '2026')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label htmlFor="adm-fullname" className="block text-xs font-medium text-slate-700 mb-1.5">
                Student Full Name *
              </label>
              <input
                id="adm-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Tanvir Ahmed"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-700"
              />
              {formErrors.fullName && (
                <p className="mt-1 text-xs text-red-700">{formErrors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="adm-dob" className="block text-xs font-medium text-slate-700 mb-1.5">
                Date of Birth {computedAge !== null ? `(Age ${computedAge})` : ''}
              </label>
              <input
                id="adm-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:border-red-700"
              />
            </div>

            <div>
              <label htmlFor="adm-gender" className="block text-xs font-medium text-slate-700 mb-1.5">
                Gender
              </label>
              <select
                id="adm-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-red-700"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="adm-phone" className="block text-xs font-medium text-slate-700 mb-1.5">
                Primary Phone Number *
              </label>
              <input
                id="adm-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-700"
              />
              {formErrors.phone && (
                <p className="mt-1 text-xs text-red-700">{formErrors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="adm-guardian" className="block text-xs font-medium text-slate-700 mb-1.5">
                Parent / Guardian Name
              </label>
              <input
                id="adm-guardian"
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Required for junior students"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-700"
              />
            </div>

            <div>
              <label htmlFor="adm-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="adm-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-700"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="adm-address" className="block text-xs font-medium text-slate-700 mb-1.5">
                Home Address
              </label>
              <input
                id="adm-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, apartment, city"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-700"
              />
            </div>

            <div>
              <label htmlFor="adm-emergency" className="block text-xs font-medium text-slate-700 mb-1.5">
                Emergency Contact
              </label>
              <input
                id="adm-emergency"
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Name & phone"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-700"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label htmlFor="adm-batch" className="block text-xs font-medium text-slate-700 mb-1.5">
                Training Batch *
              </label>
              <select
                id="adm-batch"
                value={batchId}
                onChange={(e) => handleBatchChange(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-red-700"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {formErrors.batchId && (
                <p className="mt-1 text-xs text-red-700">{formErrors.batchId}</p>
              )}
            </div>

            <div>
              <label htmlFor="adm-belt" className="block text-xs font-medium text-slate-700 mb-1.5">
                Starting Belt Rank
              </label>
              <select
                id="adm-belt"
                value={beltRank}
                onChange={(e) => setBeltRank(e.target.value as BeltRank)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-red-700"
              >
                {BELT_RANKS.map((rank) => (
                  <option key={rank} value={rank}>
                    {rank} Belt
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="adm-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                Admission Date *
              </label>
              <input
                id="adm-date"
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:border-red-700"
              />
              {formErrors.admissionDate && (
                <p className="mt-1 text-xs text-red-700">{formErrors.admissionDate}</p>
              )}
            </div>

            <div>
              <label htmlFor="adm-medical" className="block text-xs font-medium text-slate-700 mb-1.5">
                Medical / Injury Notes
              </label>
              <input
                id="adm-medical"
                type="text"
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                placeholder="Allergies, asthma, or None"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-700"
              />
            </div>

            <div>
              <label htmlFor="adm-fee" className="block text-xs font-medium text-slate-700 mb-1.5">
                Admission Fee ({profile.currency})
              </label>
              <input
                id="adm-fee"
                type="number"
                min={0}
                value={admissionFee}
                onChange={(e) => setAdmissionFee(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:border-red-700"
              />
            </div>

            <div>
              <label htmlFor="adm-monthly" className="block text-xs font-medium text-slate-700 mb-1.5">
                Monthly Tuition Fee ({profile.currency})
              </label>
              <input
                id="adm-monthly"
                type="number"
                min={0}
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:border-red-700"
              />
            </div>

            <div className="md:col-span-2 flex flex-col justify-end">
              <div className="flex flex-wrap items-center gap-4 py-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={collectInitialFee}
                    onChange={(e) => setCollectInitialFee(e.target.checked)}
                    className="w-4 h-4 accent-red-700 rounded"
                  />
                  <span>Collect admission + first month fee now</span>
                </label>

                {collectInitialFee && (
                  <select
                    aria-label="Initial payment method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              {collectInitialFee
                ? `Total due at enrollment: ${formatCurrency((Number(admissionFee) || 0) + (Number(monthlyFee) || 0), profile.currency)}`
                : 'Student will be added with unpaid current month fee.'}
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Enrolling Student...' : 'Complete Admission'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Online Applications Review Queue */}
      {tab === 'queue' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Online Admission Applications
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Edit applicant details, approve to enroll directly into the student database, or reject.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTab('online-form')}
              className="px-3.5 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              Open Online Form
            </button>
          </div>

          {admissions.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-900">No online admission applications yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Share the public form link or submit a test entry from the Online Admission Form tab.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {admissions.map((adm) => (
                <div
                  key={adm.id}
                  className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{adm.applicantName}</h3>
                      <span className="text-xs text-slate-400" aria-hidden="true">·</span>
                      <span
                        className={`text-xs font-semibold ${
                          adm.applicationStatus === 'Approved'
                            ? 'text-emerald-700'
                            : adm.applicationStatus === 'Rejected'
                              ? 'text-red-700'
                              : 'text-amber-700'
                        }`}
                      >
                        {adm.applicationStatus}
                      </span>
                      <span className="text-xs text-slate-400" aria-hidden="true">·</span>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        Submitted {adm.submittedDate}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      Preferred Batch: <strong className="font-medium text-slate-900">{adm.preferredBatchName}</strong>
                      {' · '}Phone: <span className="font-mono tabular-nums">{adm.phone}</span>
                      {adm.guardianName ? ` · Guardian: ${adm.guardianName}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      Experience: {adm.previousExperience || 'None'} · Medical: {adm.medicalNotes || 'None'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingApp(adm)}
                      aria-label={`Edit application for ${adm.applicantName}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-white cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {adm.applicationStatus === 'Pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApproveAndEnroll(adm)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-700 text-white rounded-md hover:bg-emerald-800 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Approve &amp; Enroll</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onSaveOnlineAdmission({ ...adm, applicationStatus: 'Rejected' })
                          }
                          className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-md hover:bg-red-50 cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteOnlineAdmission(adm.id)}
                      aria-label={`Delete application for ${adm.applicantName}`}
                      className="p-1.5 text-slate-400 hover:text-red-700 rounded-md hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Online Admission Form Preview */}
      {tab === 'online-form' && (
        <form
          onSubmit={handleOnlineFormSubmit}
          noValidate
          className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center gap-4 pb-5 border-b border-slate-200">
            <img
              src={profile.logoDataUrl || DEFAULT_DOJO_EMBLEM}
              alt={`${profile.name} emblem`}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-lg object-cover border border-slate-200"
            />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                {profile.name} — Online Admission Form
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {profile.tagline} · {profile.address}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="online-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                Applicant Full Name *
              </label>
              <input
                id="online-name"
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Student full name"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-700"
              />
              {appErrors.appName && (
                <p className="mt-1 text-xs text-red-700">{appErrors.appName}</p>
              )}
            </div>

            <div>
              <label htmlFor="online-dob" className="block text-xs font-medium text-slate-700 mb-1.5">
                Date of Birth
              </label>
              <input
                id="online-dob"
                type="date"
                value={appDob}
                onChange={(e) => setAppDob(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums focus:outline-none focus:border-red-700"
              />
            </div>

            <div>
              <label htmlFor="online-gender" className="block text-xs font-medium text-slate-700 mb-1.5">
                Gender
              </label>
              <select
                id="online-gender"
                value={appGender}
                onChange={(e) => setAppGender(e.target.value as Gender)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="online-phone" className="block text-xs font-medium text-slate-700 mb-1.5">
                Phone Number *
              </label>
              <input
                id="online-phone"
                type="tel"
                value={appPhone}
                onChange={(e) => setAppPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
              {appErrors.appPhone && (
                <p className="mt-1 text-xs text-red-700">{appErrors.appPhone}</p>
              )}
            </div>

            <div>
              <label htmlFor="online-guardian" className="block text-xs font-medium text-slate-700 mb-1.5">
                Parent / Guardian Name
              </label>
              <input
                id="online-guardian"
                type="text"
                value={appGuardian}
                onChange={(e) => setAppGuardian(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="online-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="online-email"
                type="email"
                value={appEmail}
                onChange={(e) => setAppEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="online-batch" className="block text-xs font-medium text-slate-700 mb-1.5">
                Preferred Training Batch
              </label>
              <select
                id="online-batch"
                value={appBatchId}
                onChange={(e) => setAppBatchId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.schedule} ({formatCurrency(b.monthlyFee, profile.currency)}/mo)
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="online-address" className="block text-xs font-medium text-slate-700 mb-1.5">
                Address
              </label>
              <input
                id="online-address"
                type="text"
                value={appAddress}
                onChange={(e) => setAppAddress(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="online-experience" className="block text-xs font-medium text-slate-700 mb-1.5">
                Prior Martial Arts Experience
              </label>
              <input
                id="online-experience"
                type="text"
                value={appExperience}
                onChange={(e) => setAppExperience(e.target.value)}
                placeholder="Beginner or prior belt/style"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="online-emergency" className="block text-xs font-medium text-slate-700 mb-1.5">
                Emergency Contact
              </label>
              <input
                id="online-emergency"
                type="text"
                value={appEmergency}
                onChange={(e) => setAppEmergency(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="online-medical" className="block text-xs font-medium text-slate-700 mb-1.5">
                Medical Conditions / Allergies
              </label>
              <input
                id="online-medical"
                type="text"
                value={appMedical}
                onChange={(e) => setAppMedical(e.target.value)}
                placeholder="Optional medical notes for instructors"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-800 transition-colors cursor-pointer"
            >
              Submit Online Application
            </button>
          </div>
        </form>
      )}

      {/* Edit Online Application Modal */}
      {editingApp && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-app-title"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const batchObj = batches.find((b) => b.id === editingApp.preferredBatchId);
              await onSaveOnlineAdmission({
                ...editingApp,
                preferredBatchName: batchObj?.name || editingApp.preferredBatchName,
              });
              setEditingApp(null);
            }}
            className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 id="edit-app-title" className="font-display text-base font-bold text-slate-900">
                Edit Online Application
              </h3>
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                aria-label="Close edit application modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Applicant Name</label>
                <input
                  type="text"
                  required
                  value={editingApp.applicantName}
                  onChange={(e) => setEditingApp({ ...editingApp, applicantName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={editingApp.phone}
                  onChange={(e) => setEditingApp({ ...editingApp, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Guardian Name</label>
                <input
                  type="text"
                  value={editingApp.guardianName}
                  onChange={(e) => setEditingApp({ ...editingApp, guardianName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Preferred Batch</label>
                <select
                  value={editingApp.preferredBatchId}
                  onChange={(e) => setEditingApp({ ...editingApp, preferredBatchId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Application Status</label>
                <select
                  value={editingApp.applicationStatus}
                  onChange={(e) =>
                    setEditingApp({
                      ...editingApp,
                      applicationStatus: e.target.value as OnlineAdmission['applicationStatus'],
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Medical Notes</label>
                <input
                  type="text"
                  value={editingApp.medicalNotes}
                  onChange={(e) => setEditingApp({ ...editingApp, medicalNotes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
