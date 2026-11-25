import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Edit3,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  BILL_CATEGORIES,
  PAYMENT_CATEGORIES,
  PAYMENT_METHODS,
  type BillCategory,
  type BillStatus,
  type DojoProfile,
  type MonthlyBill,
  type PaymentCategory,
  type PaymentMethod,
  type PaymentRecord,
} from '../types/dojo';
import {
  computeMonthlyFinancials,
  formatCurrency,
  formatMonthLabel,
  generateNextReceiptNumber,
  getPreviousMonth,
  validateBillForm,
  validatePaymentForm,
} from '../utils/dojoLogic';

interface BillsIncomeViewProps {
  profile: DojoProfile;
  payments: PaymentRecord[];
  bills: MonthlyBill[];
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  todayDate: string;
  onSaveBill: (bill: Omit<MonthlyBill, 'id' | 'ownerId'> & { id?: string }) => Promise<MonthlyBill>;
  onDeleteBill: (id: string) => Promise<void>;
  onSavePayment: (
    payment: Omit<PaymentRecord, 'id' | 'ownerId'> & { id?: string }
  ) => Promise<PaymentRecord>;
  onDeletePayment: (id: string) => Promise<void>;
}

export function BillsIncomeView({
  profile,
  payments,
  bills,
  selectedMonth,
  onChangeMonth,
  todayDate,
  onSaveBill,
  onDeleteBill,
  onSavePayment,
  onDeletePayment,
}: BillsIncomeViewProps) {
  const [tab, setTab] = useState<'bills' | 'income'>('bills');

  // Bill modal state (create or edit)
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | undefined>(undefined);
  const [billTitle, setBillTitle] = useState('');
  const [billCategory, setBillCategory] = useState<BillCategory>('Dojo Rent');
  const [billMonth, setBillMonth] = useState(selectedMonth);
  const [billAmount, setBillAmount] = useState<number>(0);
  const [billDueDate, setBillDueDate] = useState(todayDate);
  const [billStatus, setBillStatus] = useState<BillStatus>('Pending');
  const [billRecurring, setBillRecurring] = useState(true);
  const [billVendor, setBillVendor] = useState('');
  const [billNotes, setBillNotes] = useState('');
  const [billErrors, setBillErrors] = useState<Record<string, string>>({});

  // Other income modal state (create or edit)
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | undefined>(undefined);
  const [incReceipt, setIncReceipt] = useState('');
  const [incSource, setIncSource] = useState('');
  const [incCategory, setIncCategory] = useState<PaymentCategory>('Uniform & Gear');
  const [incAmount, setIncAmount] = useState<number>(0);
  const [incMonth, setIncMonth] = useState(selectedMonth);
  const [incDate, setIncDate] = useState(todayDate);
  const [incMethod, setIncMethod] = useState<PaymentMethod>('Cash');
  const [incNotes, setIncNotes] = useState('');
  const [incErrors, setIncErrors] = useState<Record<string, string>>({});

  const [confirmDeleteBillId, setConfirmDeleteBillId] = useState<string | null>(null);
  const [confirmDeleteIncId, setConfirmDeleteIncId] = useState<string | null>(null);

  const financials = useMemo(
    () => computeMonthlyFinancials(payments, bills, selectedMonth),
    [payments, bills, selectedMonth]
  );

  const monthBills = useMemo(
    () =>
      bills
        .filter((b) => b.billingMonth === selectedMonth)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [bills, selectedMonth]
  );

  const monthIncomes = useMemo(
    () =>
      payments
        .filter((p) => p.billingMonth === selectedMonth)
        .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)),
    [payments, selectedMonth]
  );

  const openAddBill = () => {
    setEditingBillId(undefined);
    setBillTitle('');
    setBillCategory('Dojo Rent');
    setBillMonth(selectedMonth);
    setBillAmount(0);
    setBillDueDate(`${selectedMonth}-05`);
    setBillStatus('Pending');
    setBillRecurring(true);
    setBillVendor('');
    setBillNotes('');
    setBillErrors({});
    setBillModalOpen(true);
  };

  const openEditBill = (b: MonthlyBill) => {
    setEditingBillId(b.id);
    setBillTitle(b.title);
    setBillCategory(b.category);
    setBillMonth(b.billingMonth);
    setBillAmount(b.amount);
    setBillDueDate(b.dueDate);
    setBillStatus(b.status);
    setBillRecurring(b.recurring);
    setBillVendor(b.vendor);
    setBillNotes(b.notes);
    setBillErrors({});
    setBillModalOpen(true);
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateBillForm({
      title: billTitle,
      amount: billAmount,
      billingMonth: billMonth,
      dueDate: billDueDate,
    });
    if (Object.keys(errs).length > 0) {
      setBillErrors(errs);
      return;
    }
    await onSaveBill({
      id: editingBillId,
      title: billTitle.trim(),
      category: billCategory,
      billingMonth: billMonth,
      amount: Number(billAmount),
      dueDate: billDueDate,
      paidDate: billStatus === 'Paid' ? todayDate : '',
      status: billStatus,
      recurring: billRecurring,
      vendor: billVendor.trim(),
      notes: billNotes.trim(),
    });
    setBillModalOpen(false);
  };

  const handleCopyRecurringBills = async () => {
    const prevMonth = getPreviousMonth(selectedMonth, 1);
    const prevRecurring = bills.filter(
      (b) => b.billingMonth === prevMonth && b.recurring
    );
    const existingTitles = new Set(monthBills.map((b) => b.title.toLowerCase()));
    for (const b of prevRecurring) {
      if (existingTitles.has(b.title.toLowerCase())) continue;
      const day = b.dueDate.slice(8, 10) || '05';
      await onSaveBill({
        title: b.title,
        category: b.category,
        billingMonth: selectedMonth,
        amount: b.amount,
        dueDate: `${selectedMonth}-${day}`,
        paidDate: '',
        status: 'Pending',
        recurring: true,
        vendor: b.vendor,
        notes: b.notes,
      });
    }
  };

  const openAddIncome = () => {
    setEditingIncomeId(undefined);
    setIncReceipt(generateNextReceiptNumber(payments, todayDate.slice(0, 4) || '2026'));
    setIncSource('');
    setIncCategory('Uniform & Gear');
    setIncAmount(0);
    setIncMonth(selectedMonth);
    setIncDate(todayDate);
    setIncMethod('Cash');
    setIncNotes('');
    setIncErrors({});
    setIncomeModalOpen(true);
  };

  const openEditIncome = (p: PaymentRecord) => {
    setEditingIncomeId(p.id);
    setIncReceipt(p.receiptNumber);
    setIncSource(p.studentName);
    setIncCategory(p.category);
    setIncAmount(p.amount);
    setIncMonth(p.billingMonth);
    setIncDate(p.paymentDate);
    setIncMethod(p.method);
    setIncNotes(p.notes);
    setIncErrors({});
    setIncomeModalOpen(true);
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validatePaymentForm({
      amount: incAmount,
      discount: 0,
      billingMonth: incMonth,
      paymentDate: incDate,
    });
    if (Object.keys(errs).length > 0) {
      setIncErrors(errs);
      return;
    }
    const existing = editingIncomeId
      ? payments.find((p) => p.id === editingIncomeId)
      : undefined;
    await onSavePayment({
      id: editingIncomeId,
      receiptNumber: incReceipt.trim() || generateNextReceiptNumber(payments),
      category: incCategory,
      studentId: existing?.studentId || '',
      studentName: incSource.trim() || 'Sōryuken Karate Club Income',
      billingMonth: incMonth,
      amount: Number(incAmount),
      discount: existing?.discount || 0,
      netAmount: Math.max(0, Number(incAmount) - (existing?.discount || 0)),
      method: incMethod,
      paymentDate: incDate,
      status: existing?.status || 'Paid',
      notes: incNotes.trim(),
    });
    setIncomeModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setTab('bills')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
                tab === 'bills'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Bills ({monthBills.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('income')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
                tab === 'income'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Income Ledger ({monthIncomes.length})
            </button>
          </div>

          <input
            type="month"
            aria-label="Select month for bills and income"
            value={selectedMonth}
            onChange={(e) => onChangeMonth(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tab === 'bills' ? (
            <>
              <button
                type="button"
                onClick={handleCopyRecurringBills}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Prev. Recurring Bills</span>
              </button>
              <button
                type="button"
                onClick={openAddBill}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Monthly Bill</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={openAddIncome}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Other Income</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-Column Financial Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Fee Revenue</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(financials.feeRevenue, profile.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Monthly &amp; admission fees</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Other Dojo Income</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(financials.otherIncome, profile.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Exams, gi/gear, tournaments</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Total Monthly Bills</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-red-700 tabular-nums">
            {formatCurrency(financials.totalBills, profile.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            Paid {formatCurrency(financials.paidBills, profile.currency)} · Pending{' '}
            {formatCurrency(financials.pendingBills, profile.currency)}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Net Profit / Surplus</p>
          <p
            className={`mt-1.5 font-display text-2xl font-bold tabular-nums ${
              financials.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {formatCurrency(financials.netIncome, profile.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatMonthLabel(selectedMonth)} balance
          </p>
        </div>
      </div>

      {/* Tab 1: Monthly Bills */}
      {tab === 'bills' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {monthBills.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No bills logged for {formatMonthLabel(selectedMonth)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Add rent, instructor salaries, utilities, or copy recurring bills from the previous month.
              </p>
              <button
                type="button"
                onClick={openAddBill}
                className="mt-4 px-4 py-2 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer"
              >
                Add First Monthly Bill
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4">Bill / Expense</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {monthBills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{b.title}</p>
                        {b.recurring && (
                          <p className="text-[11px] text-slate-500">Recurring monthly</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{b.category}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{b.vendor || '—'}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600">
                        {b.dueDate}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-slate-900">
                        {formatCurrency(b.amount, profile.currency)}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold">
                        {b.status === 'Paid' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Paid {b.paidDate ? `(${b.paidDate})` : ''}</span>
                          </span>
                        ) : (
                          <span className="text-amber-700">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onSaveBill({
                                ...b,
                                status: b.status === 'Paid' ? 'Pending' : 'Paid',
                                paidDate: b.status === 'Paid' ? '' : todayDate,
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-100 cursor-pointer"
                          >
                            {b.status === 'Paid' ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditBill(b)}
                            aria-label={`Edit bill ${b.title}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {confirmDeleteBillId === b.id ? (
                            <div className="inline-flex items-center gap-1 ml-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDeleteBill(b.id);
                                  setConfirmDeleteBillId(null);
                                }}
                                className="px-2 py-1 text-[11px] font-medium bg-red-700 text-white rounded cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteBillId(null)}
                                className="px-2 py-1 text-[11px] text-slate-600 border border-slate-200 rounded cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteBillId(b.id)}
                              aria-label={`Delete bill ${b.title}`}
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
      )}

      {/* Tab 2: Income Ledger */}
      {tab === 'income' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {monthIncomes.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No income recorded for {formatMonthLabel(selectedMonth)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Collected student fees and manual income entries appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Source / Student</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {monthIncomes.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600">
                        {p.receiptNumber}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600">
                        {p.paymentDate}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {p.studentName || 'Dojo Income'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">{p.category}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{p.method}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-emerald-700">
                        +{formatCurrency(p.netAmount, profile.currency)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditIncome(p)}
                            aria-label={`Edit income ${p.receiptNumber}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {confirmDeleteIncId === p.id ? (
                            <div className="inline-flex items-center gap-1 ml-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDeletePayment(p.id);
                                  setConfirmDeleteIncId(null);
                                }}
                                className="px-2 py-1 text-[11px] font-medium bg-red-700 text-white rounded cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteIncId(null)}
                                className="px-2 py-1 text-[11px] text-slate-600 border border-slate-200 rounded cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteIncId(p.id)}
                              aria-label={`Delete income ${p.receiptNumber}`}
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
      )}

      {/* Add / Edit Bill Modal */}
      {billModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bill-modal-title"
        >
          <form
            onSubmit={handleBillSubmit}
            noValidate
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 id="bill-modal-title" className="font-display text-base font-bold text-slate-900">
                {editingBillId ? 'Edit Monthly Bill' : 'Add Monthly Bill'}
              </h3>
              <button
                type="button"
                onClick={() => setBillModalOpen(false)}
                aria-label="Close bill modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Bill Title *</label>
                <input
                  type="text"
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  placeholder="e.g., Dojo Hall Monthly Rent"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                {billErrors.title && (
                  <p className="mt-1 text-xs text-red-700">{billErrors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={billCategory}
                  onChange={(e) => setBillCategory(e.target.value as BillCategory)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {BILL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Amount ({profile.currency}) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={billAmount}
                  onChange={(e) => setBillAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
                {billErrors.amount && (
                  <p className="mt-1 text-xs text-red-700">{billErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Billing Month</label>
                <input
                  type="month"
                  value={billMonth}
                  onChange={(e) => setBillMonth(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={billDueDate}
                  onChange={(e) => setBillDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Vendor / Payee</label>
                <input
                  type="text"
                  value={billVendor}
                  onChange={(e) => setBillVendor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={billStatus}
                  onChange={(e) => setBillStatus(e.target.value as BillStatus)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={billRecurring}
                    onChange={(e) => setBillRecurring(e.target.checked)}
                    className="w-4 h-4 accent-red-700 rounded"
                  />
                  <span>Recurring monthly bill</span>
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setBillModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer"
              >
                {editingBillId ? 'Save Bill Changes' : 'Save Monthly Bill'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Other Income Modal */}
      {incomeModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="income-modal-title"
        >
          <form
            onSubmit={handleIncomeSubmit}
            noValidate
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 id="income-modal-title" className="font-display text-base font-bold text-slate-900">
                {editingIncomeId ? 'Edit Income Entry' : 'Record Other Dojo Income'}
              </h3>
              <button
                type="button"
                onClick={() => setIncomeModalOpen(false)}
                aria-label="Close income modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Source / Student</label>
                <input
                  type="text"
                  value={incSource}
                  onChange={(e) => setIncSource(e.target.value)}
                  placeholder="e.g., Gi Sale or Event"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={incCategory}
                  onChange={(e) => setIncCategory(e.target.value as PaymentCategory)}
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
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Amount ({profile.currency}) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={incAmount}
                  onChange={(e) => setIncAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
                {incErrors.amount && (
                  <p className="mt-1 text-xs text-red-700">{incErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Method</label>
                <select
                  value={incMethod}
                  onChange={(e) => setIncMethod(e.target.value as PaymentMethod)}
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Billing Month</label>
                <input
                  type="month"
                  value={incMonth}
                  onChange={(e) => setIncMonth(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={incDate}
                  onChange={(e) => setIncDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={incNotes}
                  onChange={(e) => setIncNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIncomeModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer"
              >
                {editingIncomeId ? 'Save Changes' : 'Save Income'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
