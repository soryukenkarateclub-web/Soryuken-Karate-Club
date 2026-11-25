import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import {
  BELT_RANKS,
  type AttendanceRecord,
  type DojoBatch,
  type DojoProfile,
  type MonthlyBill,
  type PaymentRecord,
  type Student,
} from '../types/dojo';
import {
  buildCsvString,
  computeMonthlyFinancials,
  computeStudentAttendanceStats,
  computeStudentFeeStatus,
  formatCurrency,
  formatMonthLabel,
} from '../utils/dojoLogic';
import { DEFAULT_DOJO_EMBLEM } from '../utils/seedData';
import { BeltSwatch } from './BeltSwatch';

interface ReportsViewProps {
  profile: DojoProfile;
  batches: DojoBatch[];
  students: Student[];
  attendance: AttendanceRecord[];
  payments: PaymentRecord[];
  bills: MonthlyBill[];
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  todayDate: string;
}

type ReportType = 'financial' | 'fees' | 'attendance' | 'roster';

export function ReportsView({
  profile,
  batches,
  students,
  attendance,
  payments,
  bills,
  selectedMonth,
  onChangeMonth,
  todayDate,
}: ReportsViewProps) {
  const [reportType, setReportType] = useState<ReportType>('financial');
  const [batchFilter, setBatchFilter] = useState('all');

  const activeStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          s.status === 'Active' &&
          (batchFilter === 'all' || s.batchId === batchFilter)
      ),
    [students, batchFilter]
  );

  const financials = useMemo(
    () => computeMonthlyFinancials(payments, bills, selectedMonth),
    [payments, bills, selectedMonth]
  );

  const monthPayments = useMemo(
    () => payments.filter((p) => p.billingMonth === selectedMonth),
    [payments, selectedMonth]
  );

  const monthBills = useMemo(
    () => bills.filter((b) => b.billingMonth === selectedMonth),
    [bills, selectedMonth]
  );

  const beltCounts = useMemo(
    () =>
      BELT_RANKS.map((rank) => ({
        rank,
        count: activeStudents.filter((s) => s.beltRank === rank).length,
      })).filter((b) => b.count > 0),
    [activeStudents]
  );

  const handleDownloadCsv = () => {
    let headers: string[] = [];
    let rows: (string | number | boolean)[][] = [];
    let filename = `soryuken-report-${reportType}-${selectedMonth}.csv`;

    if (reportType === 'financial') {
      headers = ['Type', 'Date', 'Title / Source', 'Category', 'Status', 'Amount'];
      rows = [
        ...monthPayments.map((p) => [
          'Income',
          p.paymentDate,
          p.studentName || 'Dojo Income',
          p.category,
          p.status,
          p.netAmount,
        ]),
        ...monthBills.map((b) => [
          'Bill/Expense',
          b.dueDate,
          b.title,
          b.category,
          b.status,
          -b.amount,
        ]),
      ];
    } else if (reportType === 'fees') {
      headers = ['Roll ID', 'Student', 'Batch', 'Monthly Fee', 'Paid', 'Balance Due', 'Status'];
      rows = activeStudents.map((s) => {
        const fs = computeStudentFeeStatus(s, payments, selectedMonth);
        return [
          s.rollNumber,
          s.fullName,
          s.batchName,
          fs.expectedFee,
          fs.paidAmount,
          fs.balanceDue,
          fs.status,
        ];
      });
    } else if (reportType === 'attendance') {
      headers = ['Roll ID', 'Student', 'Batch', 'Marked', 'Present', 'Late', 'Absent', 'Rate %'];
      rows = activeStudents.map((s) => {
        const st = computeStudentAttendanceStats(s.id, attendance, selectedMonth);
        return [
          s.rollNumber,
          s.fullName,
          s.batchName,
          st.totalMarked,
          st.present,
          st.late,
          st.absent,
          st.attendanceRate,
        ];
      });
    } else {
      headers = ['Roll ID', 'Student', 'Belt', 'Batch', 'Phone', 'Admission Date', 'Status'];
      rows = students
        .filter((s) => batchFilter === 'all' || s.batchId === batchFilter)
        .map((s) => [
          s.rollNumber,
          s.fullName,
          s.beltRank,
          s.batchName,
          s.phone,
          s.admissionDate,
          s.status,
        ]);
      filename = `soryuken-roster-${todayDate}.csv`;
    }

    const csv = buildCsvString(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Report Selector Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            {(
              [
                { id: 'financial', label: 'Financial P&L' },
                { id: 'fees', label: 'Fee Dues Report' },
                { id: 'attendance', label: 'Attendance Report' },
                { id: 'roster', label: 'Student & Belt Roster' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setReportType(item.id)}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
                  reportType === item.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {reportType !== 'roster' && (
            <input
              type="month"
              aria-label="Report month"
              value={selectedMonth}
              onChange={(e) => onChangeMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
            />
          )}

          {reportType !== 'financial' && (
            <select
              aria-label="Filter report by batch"
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
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Sheet */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 print-surface">
        {/* Letterhead */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <img
              src={profile.logoDataUrl || DEFAULT_DOJO_EMBLEM}
              alt={`${profile.name} emblem`}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-lg object-cover border border-slate-200"
            />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">{profile.name}</h2>
              <p className="text-xs text-slate-500">
                {profile.address} · {profile.phone}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm font-bold text-slate-900">
              {reportType === 'financial'
                ? `Monthly Financial Report — ${formatMonthLabel(selectedMonth)}`
                : reportType === 'fees'
                  ? `Fee Collection & Dues Report — ${formatMonthLabel(selectedMonth)}`
                  : reportType === 'attendance'
                    ? `Monthly Attendance Report — ${formatMonthLabel(selectedMonth)}`
                    : 'Complete Student & Belt Roster'}
            </p>
            <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
              Generated {todayDate} · {profile.senseiName}
            </p>
          </div>
        </div>

        {/* Report 1: Financial P&L */}
        {reportType === 'financial' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <p className="text-xs text-slate-500">Fee Revenue</p>
                <p className="font-mono tabular-nums text-base font-bold text-slate-900 mt-0.5">
                  {formatCurrency(financials.feeRevenue, profile.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Other Income</p>
                <p className="font-mono tabular-nums text-base font-bold text-slate-900 mt-0.5">
                  {formatCurrency(financials.otherIncome, profile.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Bills</p>
                <p className="font-mono tabular-nums text-base font-bold text-red-700 mt-0.5">
                  {formatCurrency(financials.totalBills, profile.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Net Surplus</p>
                <p
                  className={`font-mono tabular-nums text-base font-bold mt-0.5 ${
                    financials.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {formatCurrency(financials.netIncome, profile.currency)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold text-slate-700 mb-2">
                  Income Breakdown ({monthPayments.length} entries)
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Payer / Source</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthPayments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-mono tabular-nums text-slate-500">
                            {p.paymentDate}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">{p.studentName}</td>
                          <td className="py-2 px-3 text-slate-600">{p.category}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                            {formatCurrency(p.netAmount, profile.currency)}
                          </td>
                        </tr>
                      ))}
                      {monthPayments.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-500">
                            No income entries for this month.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 mb-2">
                  Monthly Bills Breakdown ({monthBills.length} entries)
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="py-2 px-3">Bill</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthBills.map((b) => (
                        <tr key={b.id}>
                          <td className="py-2 px-3 font-medium text-slate-900">{b.title}</td>
                          <td className="py-2 px-3 text-slate-600">{b.category}</td>
                          <td className="py-2 px-3 text-slate-600">{b.status}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-red-700">
                            {formatCurrency(b.amount, profile.currency)}
                          </td>
                        </tr>
                      ))}
                      {monthBills.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-500">
                            No bills recorded for this month.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report 2: Fee Collection & Dues */}
        {reportType === 'fees' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-2.5 px-3">Roll ID</th>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3 text-right">Expected Fee</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeStudents.map((s) => {
                  const fs = computeStudentFeeStatus(s, payments, selectedMonth);
                  return (
                    <tr key={s.id}>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                        {s.rollNumber}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{s.fullName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{s.batchName}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {formatCurrency(fs.expectedFee, profile.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                        {formatCurrency(fs.paidAmount, profile.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                        {formatCurrency(fs.balanceDue, profile.currency)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{fs.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 3: Attendance Report */}
        {reportType === 'attendance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-2.5 px-3">Roll ID</th>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3 text-right">Sessions</th>
                  <th className="py-2.5 px-3 text-right">Present</th>
                  <th className="py-2.5 px-3 text-right">Late</th>
                  <th className="py-2.5 px-3 text-right">Absent</th>
                  <th className="py-2.5 px-3 text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeStudents.map((s) => {
                  const st = computeStudentAttendanceStats(s.id, attendance, selectedMonth);
                  return (
                    <tr key={s.id}>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                        {s.rollNumber}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{s.fullName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{s.batchName}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {st.totalMarked}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                        {st.present}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700">
                        {st.late}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-700">
                        {st.absent}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                        {st.totalMarked > 0 ? `${st.attendanceRate}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 4: Student & Belt Roster */}
        {reportType === 'roster' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-5 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              {beltCounts.map((b) => (
                <div key={b.rank} className="flex items-center gap-2">
                  <BeltSwatch rank={b.rank} />
                  <span className="font-mono tabular-nums font-bold text-slate-900">{b.count}</span>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3">Roll ID</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Belt</th>
                    <th className="py-2.5 px-3">Batch</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Admitted</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter((s) => batchFilter === 'all' || s.batchId === batchFilter)
                    .map((s) => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                          {s.rollNumber}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{s.fullName}</td>
                        <td className="py-2.5 px-3">
                          <BeltSwatch rank={s.beltRank} />
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{s.batchName}</td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                          {s.phone}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                          {s.admissionDate}
                        </td>
                        <td className="py-2.5 px-3 font-medium">{s.status}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
