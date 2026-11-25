import {
  AlertCircle,
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  Receipt,
  UserPlus,
  Users,
} from 'lucide-react';
import type {
  AttendanceRecord,
  DojoBatch,
  DojoProfile,
  MonthlyBill,
  NavSection,
  OnlineAdmission,
  PaymentRecord,
  Student,
} from '../types/dojo';
import {
  computeMonthlyCashflowSeries,
  computeMonthlyFinancials,
  computeStudentFeeStatus,
  formatCurrency,
  formatMonthLabel,
} from '../utils/dojoLogic';
import { BeltSwatch } from './BeltSwatch';

interface OverviewViewProps {
  profile: DojoProfile;
  batches: DojoBatch[];
  students: Student[];
  admissions: OnlineAdmission[];
  attendance: AttendanceRecord[];
  payments: PaymentRecord[];
  bills: MonthlyBill[];
  selectedMonth: string;
  todayDate: string;
  onNavigate: (section: NavSection) => void;
  onQuickCollectFee: (student: Student) => void;
  onQuickPayBill: (bill: MonthlyBill) => void;
  onLoadStarterData?: () => void;
  isCloudEmpty?: boolean;
}

export function OverviewView({
  profile,
  batches,
  students,
  admissions,
  attendance,
  payments,
  bills,
  selectedMonth,
  todayDate,
  onNavigate,
  onQuickCollectFee,
  onQuickPayBill,
  onLoadStarterData,
  isCloudEmpty,
}: OverviewViewProps) {
  const activeStudents = students.filter((s) => s.status === 'Active');
  const pendingAdmissions = admissions.filter((a) => a.applicationStatus === 'Pending');

  const todayRecords = attendance.filter((a) => a.date === todayDate);
  const todayPresentCount = todayRecords.filter(
    (a) => a.status === 'Present' || a.status === 'Late'
  ).length;
  const todayAttendanceRate =
    todayRecords.length > 0
      ? Math.round((todayPresentCount / todayRecords.length) * 100)
      : 0;

  const financials = computeMonthlyFinancials(payments, bills, selectedMonth);
  const cashflow = computeMonthlyCashflowSeries(payments, bills, selectedMonth, 6);
  const maxCashflowVal = Math.max(
    100,
    ...cashflow.map((c) => Math.max(c.income, c.bills))
  );

  const unpaidStudents = activeStudents
    .map((s) => ({
      student: s,
      feeStatus: computeStudentFeeStatus(s, payments, selectedMonth),
    }))
    .filter((item) => item.feeStatus.status !== 'Paid');

  const pendingBills = bills.filter((b) => b.status === 'Pending');

  return (
    <div className="space-y-6">
      {isCloudEmpty && onLoadStarterData && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Welcome to {profile.name}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Your cloud database is ready. Start adding your real students, or load sample starter records to explore how attendance, fees, and bills work together.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onLoadStarterData}
              className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              Load Sample Starter Data
            </button>
            <button
              type="button"
              onClick={() => onNavigate('admissions')}
              className="px-4 py-2 text-sm font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              Admit First Student
            </button>
          </div>
        </div>
      )}

      {pendingAdmissions.length > 0 && (
        <div className="bg-white border border-amber-300 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-slate-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong className="font-semibold tabular-nums">
                {pendingAdmissions.length} online admission{' '}
                {pendingAdmissions.length === 1 ? 'application' : 'applications'}
              </strong>{' '}
              waiting for review and enrollment.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('admissions')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-800 whitespace-nowrap cursor-pointer"
          >
            <span>Review Applications</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Active Students</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {activeStudents.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {students.length} total in database · {batches.length} batches
          </p>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Today&apos;s Attendance</span>
            <CalendarCheck className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {todayRecords.length > 0 ? `${todayAttendanceRate}%` : 'Not marked'}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {todayRecords.length > 0
              ? `${todayPresentCount} of ${todayRecords.length} marked on ${todayDate}`
              : `No roll call saved for ${todayDate}`}
          </p>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{formatMonthLabel(selectedMonth)} Income</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(financials.totalIncome, profile.currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Fees {formatCurrency(financials.feeRevenue, profile.currency)} · Other{' '}
            {formatCurrency(financials.otherIncome, profile.currency)}
          </p>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{formatMonthLabel(selectedMonth)} Net Surplus</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <p
            className={`mt-2 font-display text-2xl font-bold tabular-nums ${
              financials.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {formatCurrency(financials.netIncome, profile.currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Bills {formatCurrency(financials.totalBills, profile.currency)} ({pendingBills.length} unpaid)
          </p>
        </div>
      </div>

      {/* Main Split: 6-Month Cashflow Chart + Batches Roster */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                6-Month Income vs. Monthly Bills
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparing collected fees &amp; other dojo income against monthly operating bills
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-900" aria-hidden="true" />
                Income
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-red-600" aria-hidden="true" />
                Bills
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-6 gap-3 items-end h-52 pt-4 border-b border-slate-200">
            {cashflow.map((point) => {
              const incomePct = Math.max(4, Math.round((point.income / maxCashflowVal) * 100));
              const billPct = Math.max(4, Math.round((point.bills / maxCashflowVal) * 100));
              return (
                <div key={point.month} className="flex flex-col items-center h-full justify-end gap-2">
                  <div className="w-full flex items-end justify-center gap-1.5 flex-1">
                    <div
                      title={`Income ${point.label}: ${formatCurrency(point.income, profile.currency)}`}
                      className={`w-4 sm:w-5 rounded-t-sm transition-all ${
                        point.income === 0 ? 'bg-slate-200' : 'bg-slate-900'
                      }`}
                      style={{ height: point.income === 0 ? '2px' : `${incomePct}%` }}
                    />
                    <div
                      title={`Bills ${point.label}: ${formatCurrency(point.bills, profile.currency)}`}
                      className={`w-4 sm:w-5 rounded-t-sm transition-all ${
                        point.bills === 0 ? 'bg-slate-200' : 'bg-red-600'
                      }`}
                      style={{ height: point.bills === 0 ? '2px' : `${billPct}%` }}
                    />
                  </div>
                  <div className="text-center pb-2">
                    <p className="text-[11px] font-medium text-slate-700 whitespace-nowrap">
                      {point.label.split(' ')[0]}
                    </p>
                    <p className="text-[10px] font-mono tabular-nums text-slate-500">
                      {formatCurrency(point.income, profile.currency)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <span>
              Selected month net:{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {formatCurrency(financials.netIncome, profile.currency)}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="font-medium text-red-700 hover:text-red-800 cursor-pointer"
            >
              Open Financial Reports →
            </button>
          </div>
        </section>

        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900">
                Training Batches
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Edit Batches
              </button>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {batches.map((b) => {
                const count = activeStudents.filter((s) => s.batchId === b.id).length;
                return (
                  <div key={b.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{b.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{b.schedule}</p>
                      <p className="text-xs text-slate-500">{b.instructor}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-mono tabular-nums font-semibold text-slate-900">
                        {count}/{b.capacity} students
                      </p>
                      <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                        {formatCurrency(b.monthlyFee, profile.currency)}/mo
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs font-medium text-red-700 hover:text-red-800 cursor-pointer"
            >
              Mark Today&apos;s Attendance →
            </button>
            <button
              type="button"
              onClick={() => onNavigate('students')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              View All Students
            </button>
          </div>
        </section>
      </div>

      {/* Actionable Queues: Pending Fee Dues + Pending Monthly Bills */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900">
                Pending Student Fees ({formatMonthLabel(selectedMonth)})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {unpaidStudents.length} active {unpaidStudents.length === 1 ? 'student' : 'students'} with remaining balance
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('fees')}
              className="text-xs font-medium text-red-700 hover:text-red-800 whitespace-nowrap cursor-pointer"
            >
              View All Fees
            </button>
          </div>

          {unpaidStudents.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="mt-2 text-sm font-medium text-slate-900">
                All active students are paid for {formatMonthLabel(selectedMonth)}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {unpaidStudents.slice(0, 5).map(({ student, feeStatus }) => (
                <div
                  key={student.id}
                  className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {student.fullName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono tabular-nums">{student.rollNumber}</span>
                      <span aria-hidden="true">·</span>
                      <BeltSwatch rank={student.beltRank} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-mono tabular-nums font-semibold text-slate-900">
                        {formatCurrency(feeStatus.balanceDue, profile.currency)}
                      </p>
                      <p className="text-[11px] font-medium text-amber-700">
                        {feeStatus.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onQuickCollectFee(student)}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Collect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900">
                Upcoming &amp; Unpaid Monthly Bills
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {pendingBills.length} pending {pendingBills.length === 1 ? 'bill' : 'bills'} across dojo operations
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('finance')}
              className="text-xs font-medium text-red-700 hover:text-red-800 whitespace-nowrap cursor-pointer"
            >
              Manage Bills
            </button>
          </div>

          {pendingBills.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="mt-2 text-sm font-medium text-slate-900">
                All logged bills are marked paid
              </p>
              <button
                type="button"
                onClick={() => onNavigate('finance')}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Log Monthly Bill</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingBills.slice(0, 5).map((bill) => (
                <div
                  key={bill.id}
                  className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{bill.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {bill.category} · Due <span className="font-mono tabular-nums">{bill.dueDate}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(bill.amount, profile.currency)}
                    </p>
                    <button
                      type="button"
                      onClick={() => onQuickPayBill(bill)}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-800 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Mark Paid
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
