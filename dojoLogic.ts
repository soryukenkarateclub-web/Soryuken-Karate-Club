import type {
  AttendanceRecord,
  MonthlyBill,
  PaymentRecord,
  Student,
} from '../types/dojo';

export function formatCurrency(amount: number, currency = '$'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safe));
  return `${safe < 0 ? '-' : ''}${currency}${formatted}`;
}

export function formatMonthLabel(monthStr: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthStr)) return monthStr;
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function getPreviousMonth(monthStr: string, offset = 1): string {
  if (!/^\d{4}-\d{2}$/.test(monthStr)) return monthStr;
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 - offset, 1));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}

export function calculateAge(dateOfBirth: string, referenceDate = '2026-11-25'): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
    return null;
  }
  const [by, bm, bd] = dateOfBirth.split('-').map(Number);
  const [ry, rm, rd] = referenceDate.split('-').map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) {
    age -= 1;
  }
  return age >= 0 && age <= 120 ? age : null;
}

export function generateNextRollNumber(students: Pick<Student, 'rollNumber'>[], year = '2026'): string {
  const prefix = `SKC-${year}-`;
  let maxSeq = 0;
  for (const s of students) {
    const match = s.rollNumber.match(/(\d+)$/);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

export function generateNextReceiptNumber(payments: Pick<PaymentRecord, 'receiptNumber'>[], year = '2026'): string {
  const prefix = `RCP-${year}-`;
  let maxSeq = 0;
  for (const p of payments) {
    const match = p.receiptNumber.match(/(\d+)$/);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

export interface MonthlyFinancialSummary {
  feeRevenue: number;
  otherIncome: number;
  totalIncome: number;
  totalBills: number;
  paidBills: number;
  pendingBills: number;
  netIncome: number;
}

export function computeMonthlyFinancials(
  payments: Pick<PaymentRecord, 'billingMonth' | 'category' | 'netAmount'>[],
  bills: Pick<MonthlyBill, 'billingMonth' | 'amount' | 'status'>[],
  month: string
): MonthlyFinancialSummary {
  let feeRevenue = 0;
  let otherIncome = 0;

  for (const p of payments) {
    if (p.billingMonth !== month) continue;
    const val = Math.max(0, Number(p.netAmount) || 0);
    if (p.category === 'Monthly Fee' || p.category === 'Admission Fee') {
      feeRevenue += val;
    } else {
      otherIncome += val;
    }
  }

  let paidBills = 0;
  let pendingBills = 0;
  for (const b of bills) {
    if (b.billingMonth !== month) continue;
    const val = Math.max(0, Number(b.amount) || 0);
    if (b.status === 'Paid') {
      paidBills += val;
    } else {
      pendingBills += val;
    }
  }

  const totalIncome = feeRevenue + otherIncome;
  const totalBills = paidBills + pendingBills;
  const netIncome = totalIncome - totalBills;

  return {
    feeRevenue,
    otherIncome,
    totalIncome,
    totalBills,
    paidBills,
    pendingBills,
    netIncome,
  };
}

export interface StudentFeeStatus {
  expectedFee: number;
  paidAmount: number;
  balanceDue: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
  payments: PaymentRecord[];
}

export function computeStudentFeeStatus(
  student: Pick<Student, 'id' | 'monthlyFee'>,
  payments: PaymentRecord[],
  month: string
): StudentFeeStatus {
  const matching = payments.filter(
    (p) =>
      p.studentId === student.id &&
      p.billingMonth === month &&
      p.category === 'Monthly Fee'
  );
  const paidAmount = matching.reduce((sum, p) => sum + Math.max(0, Number(p.netAmount) || 0), 0);
  const discountGiven = matching.reduce((sum, p) => sum + Math.max(0, Number(p.discount) || 0), 0);
  const expectedFee = Math.max(0, Number(student.monthlyFee) || 0);
  const effectiveCovered = paidAmount + discountGiven;
  const balanceDue = Math.max(0, expectedFee - effectiveCovered);

  let status: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
  if (expectedFee === 0 || balanceDue === 0) {
    status = matching.length > 0 || expectedFee === 0 ? 'Paid' : 'Unpaid';
  } else if (effectiveCovered > 0) {
    status = 'Partial';
  }

  return {
    expectedFee,
    paidAmount,
    balanceDue,
    status,
    payments: matching,
  };
}

export interface AttendanceStats {
  totalMarked: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

export function computeStudentAttendanceStats(
  studentId: string,
  records: Pick<AttendanceRecord, 'studentId' | 'month' | 'status'>[],
  month?: string
): AttendanceStats {
  const filtered = records.filter(
    (r) => r.studentId === studentId && (!month || r.month === month)
  );
  let present = 0;
  let absent = 0;
  let late = 0;
  for (const r of filtered) {
    if (r.status === 'Present') present += 1;
    else if (r.status === 'Late') late += 1;
    else if (r.status === 'Absent') absent += 1;
  }
  const totalMarked = filtered.length;
  const attendanceRate =
    totalMarked === 0 ? 0 : Math.round(((present + late) / totalMarked) * 100);

  return {
    totalMarked,
    present,
    absent,
    late,
    attendanceRate,
  };
}

export interface MonthlyCashflowPoint {
  month: string;
  label: string;
  income: number;
  bills: number;
  net: number;
}

export function computeMonthlyCashflowSeries(
  payments: Pick<PaymentRecord, 'billingMonth' | 'category' | 'netAmount'>[],
  bills: Pick<MonthlyBill, 'billingMonth' | 'amount' | 'status'>[],
  endMonth: string,
  monthsCount = 6
): MonthlyCashflowPoint[] {
  const points: MonthlyCashflowPoint[] = [];
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const m = getPreviousMonth(endMonth, i);
    const fin = computeMonthlyFinancials(payments, bills, m);
    points.push({
      month: m,
      label: formatMonthLabel(m),
      income: fin.totalIncome,
      bills: fin.totalBills,
      net: fin.netIncome,
    });
  }
  return points;
}

export interface StudentFormInput {
  fullName: string;
  phone: string;
  batchId: string;
  admissionDate: string;
  admissionFee: number;
  monthlyFee: number;
}

export function validateStudentForm(input: StudentFormInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.fullName || input.fullName.trim().length < 2) {
    errors.fullName = 'Student full name must be at least 2 characters.';
  }
  if (!input.phone || input.phone.trim().length < 5) {
    errors.phone = 'Valid phone number (min 5 characters) is required.';
  }
  if (!input.batchId || input.batchId.trim().length === 0) {
    errors.batchId = 'Please select a training batch.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.admissionDate)) {
    errors.admissionDate = 'Valid admission date (YYYY-MM-DD) is required.';
  }
  if (!Number.isFinite(input.admissionFee) || input.admissionFee < 0) {
    errors.admissionFee = 'Admission fee must be 0 or greater.';
  }
  if (!Number.isFinite(input.monthlyFee) || input.monthlyFee < 0) {
    errors.monthlyFee = 'Monthly fee must be 0 or greater.';
  }
  return errors;
}

export interface PaymentFormInput {
  amount: number;
  discount: number;
  billingMonth: string;
  paymentDate: string;
}

export function validatePaymentForm(input: PaymentFormInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.amount = 'Amount must be greater than 0.';
  }
  if (!Number.isFinite(input.discount) || input.discount < 0) {
    errors.discount = 'Discount cannot be negative.';
  }
  if (input.discount > input.amount) {
    errors.discount = 'Discount cannot exceed the base amount.';
  }
  if (!/^\d{4}-\d{2}$/.test(input.billingMonth)) {
    errors.billingMonth = 'Billing month must be in YYYY-MM format.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paymentDate)) {
    errors.paymentDate = 'Payment date must be in YYYY-MM-DD format.';
  }
  return errors;
}

export interface BillFormInput {
  title: string;
  amount: number;
  billingMonth: string;
  dueDate: string;
}

export function validateBillForm(input: BillFormInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.title || input.title.trim().length < 2) {
    errors.title = 'Bill title must be at least 2 characters.';
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.amount = 'Bill amount must be greater than 0.';
  }
  if (!/^\d{4}-\d{2}$/.test(input.billingMonth)) {
    errors.billingMonth = 'Billing month must be in YYYY-MM format.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    errors.dueDate = 'Due date must be in YYYY-MM-DD format.';
  }
  return errors;
}

export function buildCsvString(headers: string[], rows: (string | number | boolean)[][]): string {
  const escapeCell = (value: string | number | boolean): string => {
    const str = String(value ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  return [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
}
