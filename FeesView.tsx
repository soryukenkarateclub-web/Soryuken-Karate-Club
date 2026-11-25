import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Plus,
  Printer,
  Trash2,
  X,
} from 'lucide-react';
import {
  PAYMENT_CATEGORIES,
  PAYMENT_METHODS,
  type DojoBatch,
  type DojoProfile,
  type PaymentCategory,
  type PaymentMethod,
  type PaymentRecord,
  type PaymentStatus,
  type Student,
} from '../types/dojo';
import {
  computeStudentFeeStatus,
  formatCurrency,
  formatMonthLabel,
  generateNextReceiptNumber,
  validatePaymentForm,
} from '../utils/dojoLogic';
import { BeltSwatch } from './BeltSwatch';

interface FeesViewProps {
  profile: DojoProfile;
  batches: DojoBatch[];
  students: Student[];
  payments: PaymentRecord[];
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  todayDate: string;
  onSavePayment: (
    payment: Omit<PaymentRecord, 'id' | 'ownerId'> & { id?: string }
  ) => Promise<PaymentRecord>;
  onDeletePayment: (id: string) => Promise<void>;
  onOpenReceipt: (payment: PaymentRecord) => void;
  preselectedStudentForFee: Student | null;
  onClearPreselectedStudent: () => void;
}

export function FeesView({
  profile,
  batches,
  students,
  payments,
  selectedMonth,
  onChangeMonth,
  todayDate,
  onSavePayment,
  onDeletePayment,
  onOpenReceipt,
  preselectedStudentForFee,
  onClearPreselectedStudent,
}: FeesViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'Paid' | 'Partial' | 'Unpaid'>('all');
  const [batchFilter, setBatchFilter] = useState('all');

  const [collectTarget, setCollectTarget] = useState<Student | null>(preselectedStudentForFee);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Collect Modal State
  const activeStudents = useMemo(
    () => students.filter((s) => s.status === 'Active'),
    [students]
  );

  const [formStudentId, setFormStudentId] = useState<string>(
    preselectedStudentForFee?.id || activeStudents[0]?.id || ''
  );
  const [formCategory, setFormCategory] = useState<PaymentCategory>('Monthly Fee');
  const [formAmount, setFormAmount] = useState<number>(
    preselectedStudentForFee?.monthlyFee ?? profile.defaultMonthlyFee
  );
  const [formDiscount, setFormDiscount] = useState<number>(0);
  const [formMethod, setFormMethod] = useState<PaymentMethod>('Cash');
  const [formDate, setFormDate] = useState<string>(todayDate);
  const [formMonth, setFormMonth] = useState<string>(selectedMonth);
  const [formStatus, setFormStatus] = useState<PaymentStatus>('Paid');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const openCollectModalFor = (student: Student | null) => {
    const target = student || activeStudents[0] || null;
    if (target) {
      const feeInfo = computeStudentFeeStatus(target, payments, selectedMonth);
      setFormStudentId(target.id);
      setFormAmount(feeInfo.balanceDue > 0 ? feeInfo.balanceDue : target.monthlyFee);
    } else {
      setFormStudentId('');
      setFormAmount(profile.defaultMonthlyFee);
    }
    setFormCategory('Monthly Fee');
    setFormDiscount(0);
    setFormMethod('Cash');
    setFormDate(todayDate);
    setFormMonth(selectedMonth);
    setFormStatus('Paid');
    setFormNotes('');
    setFormErrors({});
    setCollectTarget(target || ({ id: '__manual__' } as Student));
  };

  // Sync if preselected student comes from Overview or Students drawer
  if (preselectedStudentForFee && collectTarget?.id !== preselectedStudentForFee.id) {
    openCollectModalFor(preselectedStudentForFee);
    onClearPreselectedStudent();
  }

  const studentFeeRows = useMemo(() => {
    return activeStudents
      .filter((s) => batchFilter === 'all' || s.batchId === batchFilter)
      .map((s) => ({
        student: s,
        feeStatus: computeStudentFeeStatus(s, payments, selectedMonth),
      }))
      .filter((row) => statusFilter === 'all' || row.feeStatus.status === statusFilter);
  }, [activeStudents, batchFilter, payments, selectedMonth, statusFilter]);

  const monthSummary = useMemo(() => {
    let expected = 0;
    let collected = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    for (const s of activeStudents) {
      const info = computeStudentFeeStatus(s, payments, selectedMonth);
      expected += info.expectedFee;
      collected += info.paidAmount;
      if (info.status === 'Paid') paidCount += 1;
      else unpaidCount += 1;
    }
    return {
      expected,
      collected,
      outstanding: Math.max(0, expected - collected),
      paidCount,
      unpaidCount,
    };
  }, [activeStudents, payments, selectedMonth]);

  const monthPayments = useMemo(
    () =>
      payments
        .filter((p) => p.billingMonth === selectedMonth)
        .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)),
    [payments, selectedMonth]
  );

  const handleSaveNewPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validatePaymentForm({
      amount: formAmount,
      discount: formDiscount,
      billingMonth: formMonth,
      paymentDate: formDate,
    });
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    const stu = students.find((s) => s.id === formStudentId);
    const saved = await onSavePayment({
      receiptNumber: generateNextReceiptNumber(payments, formDate.slice(0, 4) || '2026'),
      category: formCategory,
      studentId: stu?.id || '',
      studentName: stu?.fullName || 'Walk-in / General',
      billingMonth: formMonth,
      amount: Number(formAmount),
      discount: Number(formDiscount) || 0,
      netAmount: Math.max(0, Number(formAmount) - (Number(formDiscount) || 0)),
      method: formMethod,
      paymentDate: formDate,
      status: formStatus,
      notes: formNotes.trim(),
    });
    setCollectTarget(null);
    onOpenReceipt(saved);
  };

  const handleSaveEditedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    const errs = validatePaymentForm({
      amount: editingPayment.amount,
      discount: editingPayment.discount,
      billingMonth: editingPayment.billingMonth,
      paymentDate: editingPayment.paymentDate,
    });
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    await onSavePayment({
      ...editingPayment,
      netAmount: Math.max(0, Number(editingPayment.amount) - (Number(editingPayment.discount) || 0)),
    });
    setEditingPayment(null);
    setFormErrors({});
  };

  return (
    <div className="space-y-6">
      {/* Controls & KPI Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="fee-month" className="sr-only">
              Billing Month
            </label>
            <input
              id="fee-month"
              type="month"
              value={selectedMonth}
              onChange={(e) => onChangeMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
            />
          </div>

          <select
            aria-label="Filter fee roster by batch"
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            {(['all', 'Paid', 'Partial', 'Unpaid'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'All Students' : st}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => openCollectModalFor(null)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Record Fee Payment</span>
        </button>
      </div>

      {/* Month Tuition Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">
            Expected Monthly Tuition ({formatMonthLabel(selectedMonth)})
          </p>
          <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(monthSummary.expected, profile.currency)}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Tuition Collected</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-emerald-700 tabular-nums">
            {formatCurrency(monthSummary.collected, profile.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {monthSummary.paidCount} students cleared
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Remaining Balance Due</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-red-700 tabular-nums">
            {formatCurrency(monthSummary.outstanding, profile.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {monthSummary.unpaidCount} students pending
          </p>
        </div>
      </div>

      {/* Student Monthly Fee Status Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-sm font-bold text-slate-900">
            Monthly Tuition Roster — {formatMonthLabel(selectedMonth)}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Roll ID</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Belt &amp; Batch</th>
                <th className="py-3 px-4 text-right">Monthly Fee</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {studentFeeRows.map(({ student, feeStatus }) => (
                <tr key={student.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500">
                    {student.rollNumber}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{student.fullName}</td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <BeltSwatch rank={student.beltRank} />
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-[160px]">{student.batchName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                    {formatCurrency(feeStatus.expectedFee, profile.currency)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-emerald-700 font-semibold">
                    {formatCurrency(feeStatus.paidAmount, profile.currency)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-slate-900">
                    {formatCurrency(feeStatus.balanceDue, profile.currency)}
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold">
                    {feeStatus.status === 'Paid' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Paid</span>
                      </span>
                    ) : (
                      <span
                        className={
                          feeStatus.status === 'Partial' ? 'text-amber-700' : 'text-red-700'
                        }
                      >
                        {feeStatus.status}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {feeStatus.status === 'Paid' && feeStatus.payments[0] ? (
                      <button
                        type="button"
                        onClick={() => onOpenReceipt(feeStatus.payments[0])}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openCollectModalFor(student)}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 cursor-pointer"
                      >
                        Collect Fee
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Receipts Logged for Month (with Full Edit & Delete) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900">
              Payment Receipts ({formatMonthLabel(selectedMonth)})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit, print, or remove any recorded fee or income receipt
            </p>
          </div>
        </div>
        {monthPayments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No payments recorded for {formatMonthLabel(selectedMonth)}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Student / Source</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Net Paid</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {monthPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono tabular-nums text-xs font-medium text-slate-700">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600">
                      {p.paymentDate}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {p.studentName || 'General Income'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{p.category}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{p.method}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-slate-900">
                      {formatCurrency(p.netAmount, profile.currency)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(p)}
                          aria-label={`Print receipt ${p.receiptNumber}`}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormErrors({});
                            setEditingPayment(p);
                          }}
                          aria-label={`Edit receipt ${p.receiptNumber}`}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {confirmDeleteId === p.id ? (
                          <div className="inline-flex items-center gap-1 ml-1">
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeletePayment(p.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 text-[11px] font-medium bg-red-700 text-white rounded cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-[11px] text-slate-600 border border-slate-200 rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(p.id)}
                            aria-label={`Delete receipt ${p.receiptNumber}`}
                            className="p-1.5 text-slate-400 hover:text-red-700 rounded hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collect Fee Modal */}
      {collectTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="collect-fee-title"
        >
          <form
            onSubmit={handleSaveNewPayment}
            noValidate
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 id="collect-fee-title" className="font-display text-base font-bold text-slate-900">
                Collect Fee &amp; Issue Receipt
              </h3>
              <button
                type="button"
                onClick={() => setCollectTarget(null)}
                aria-label="Close collect fee modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Student</label>
                <select
                  value={formStudentId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setFormStudentId(id);
                    const s = students.find((st) => st.id === id);
                    if (s && formCategory === 'Monthly Fee') {
                      const info = computeStudentFeeStatus(s, payments, formMonth);
                      setFormAmount(info.balanceDue > 0 ? info.balanceDue : s.monthlyFee);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">General / Non-Student Income</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.rollNumber} — {s.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fee Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as PaymentCategory)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {PAYMENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Billing Month</label>
                <input
                  type="month"
                  value={formMonth}
                  onChange={(e) => setFormMonth(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Amount ({profile.currency}) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={formAmount}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
                {formErrors.amount && (
                  <p className="mt-1 text-xs text-red-700">{formErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Discount ({profile.currency})
                </label>
                <input
                  type="number"
                  min={0}
                  value={formDiscount}
                  onChange={(e) => setFormDiscount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
                {formErrors.discount && (
                  <p className="mt-1 text-xs text-red-700">{formErrors.discount}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional remark"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 font-mono tabular-nums">
                Net: {formatCurrency(Math.max(0, formAmount - formDiscount), profile.currency)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCollectTarget(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer"
                >
                  Save &amp; Print Receipt
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Edit Existing Payment Modal */}
      {editingPayment && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-payment-title"
        >
          <form
            onSubmit={handleSaveEditedPayment}
            noValidate
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 id="edit-payment-title" className="font-display text-base font-bold text-slate-900">
                Edit Receipt — {editingPayment.receiptNumber}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                aria-label="Close edit receipt modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Student / Payer Name</label>
                <input
                  type="text"
                  value={editingPayment.studentName}
                  onChange={(e) =>
                    setEditingPayment({ ...editingPayment, studentName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={editingPayment.category}
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      category: e.target.value as PaymentCategory,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {PAYMENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Amount</label>
                <input
                  type="number"
                  min={0}
                  value={editingPayment.amount}
                  onChange={(e) =>
                    setEditingPayment({ ...editingPayment, amount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Discount</label>
                <input
                  type="number"
                  min={0}
                  value={editingPayment.discount}
                  onChange={(e) =>
                    setEditingPayment({ ...editingPayment, discount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Billing Month</label>
                <input
                  type="month"
                  value={editingPayment.billingMonth}
                  onChange={(e) =>
                    setEditingPayment({ ...editingPayment, billingMonth: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={editingPayment.paymentDate}
                  onChange={(e) =>
                    setEditingPayment({ ...editingPayment, paymentDate: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Method</label>
                <select
                  value={editingPayment.method}
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      method: e.target.value as PaymentMethod,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editingPayment.status}
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      status: e.target.value as PaymentStatus,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={editingPayment.notes}
                  onChange={(e) =>
                    setEditingPayment({ ...editingPayment, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer"
              >
                Save Receipt Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
