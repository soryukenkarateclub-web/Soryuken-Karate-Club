import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCsvString,
  calculateAge,
  computeMonthlyCashflowSeries,
  computeMonthlyFinancials,
  computeStudentAttendanceStats,
  computeStudentFeeStatus,
  formatCurrency,
  generateNextReceiptNumber,
  generateNextRollNumber,
  getPreviousMonth,
  validateBillForm,
  validatePaymentForm,
  validateStudentForm,
} from './dojoLogic';

test('calculateAge calculates exact age respecting month and day boundaries', () => {
  assert.equal(calculateAge('2012-11-24', '2026-11-25'), 14);
  assert.equal(calculateAge('2012-11-26', '2026-11-25'), 13);
  assert.equal(calculateAge('invalid', '2026-11-25'), null);
});

test('generateNextRollNumber and generateNextReceiptNumber increment sequentially', () => {
  const nextRoll = generateNextRollNumber(
    [{ rollNumber: 'SKC-2026-001' }, { rollNumber: 'SKC-2026-014' }],
    '2026'
  );
  assert.equal(nextRoll, 'SKC-2026-015');

  const nextReceipt = generateNextReceiptNumber(
    [{ receiptNumber: 'RCP-2026-0009' }],
    '2026'
  );
  assert.equal(nextReceipt, 'RCP-2026-0010');
});

test('computeMonthlyFinancials separates fee revenue, other income, paid/pending bills, and net income', () => {
  const payments = [
    { billingMonth: '2026-11', category: 'Monthly Fee' as const, netAmount: 120 },
    { billingMonth: '2026-11', category: 'Admission Fee' as const, netAmount: 50 },
    { billingMonth: '2026-11', category: 'Uniform & Gear' as const, netAmount: 80 },
    { billingMonth: '2026-10', category: 'Monthly Fee' as const, netAmount: 999 },
  ];
  const bills = [
    { billingMonth: '2026-11', amount: 150, status: 'Paid' as const },
    { billingMonth: '2026-11', amount: 40, status: 'Pending' as const },
    { billingMonth: '2026-10', amount: 500, status: 'Paid' as const },
  ];

  const summary = computeMonthlyFinancials(payments, bills, '2026-11');
  assert.equal(summary.feeRevenue, 170);
  assert.equal(summary.otherIncome, 80);
  assert.equal(summary.totalIncome, 250);
  assert.equal(summary.paidBills, 150);
  assert.equal(summary.pendingBills, 40);
  assert.equal(summary.totalBills, 190);
  assert.equal(summary.netIncome, 60);
});

test('computeStudentFeeStatus handles Paid, Partial, and Unpaid states with discounts', () => {
  const student = { id: 'stu-1', monthlyFee: 60 };
  const unpaid = computeStudentFeeStatus(student, [], '2026-11');
  assert.equal(unpaid.status, 'Unpaid');
  assert.equal(unpaid.balanceDue, 60);

  const partial = computeStudentFeeStatus(
    student,
    [
      {
        id: 'p1',
        receiptNumber: 'RCP-1',
        category: 'Monthly Fee',
        studentId: 'stu-1',
        studentName: 'A',
        billingMonth: '2026-11',
        amount: 30,
        discount: 0,
        netAmount: 30,
        method: 'Cash',
        paymentDate: '2026-11-05',
        status: 'Partial',
        notes: '',
        ownerId: 'u1',
      },
    ],
    '2026-11'
  );
  assert.equal(partial.status, 'Partial');
  assert.equal(partial.balanceDue, 30);

  const paidWithDiscount = computeStudentFeeStatus(
    student,
    [
      {
        id: 'p2',
        receiptNumber: 'RCP-2',
        category: 'Monthly Fee',
        studentId: 'stu-1',
        studentName: 'A',
        billingMonth: '2026-11',
        amount: 60,
        discount: 10,
        netAmount: 50,
        method: 'Card',
        paymentDate: '2026-11-05',
        status: 'Paid',
        notes: '',
        ownerId: 'u1',
      },
    ],
    '2026-11'
  );
  assert.equal(paidWithDiscount.status, 'Paid');
  assert.equal(paidWithDiscount.balanceDue, 0);
});

test('computeStudentAttendanceStats computes attendance percentage accurately', () => {
  const records = [
    { studentId: 's1', month: '2026-11', status: 'Present' as const },
    { studentId: 's1', month: '2026-11', status: 'Late' as const },
    { studentId: 's1', month: '2026-11', status: 'Absent' as const },
    { studentId: 's1', month: '2026-10', status: 'Absent' as const },
  ];
  const nov = computeStudentAttendanceStats('s1', records, '2026-11');
  assert.equal(nov.totalMarked, 3);
  assert.equal(nov.present, 1);
  assert.equal(nov.late, 1);
  assert.equal(nov.absent, 1);
  assert.equal(nov.attendanceRate, 67);
});

test('getPreviousMonth and cashflow series span year boundaries cleanly', () => {
  assert.equal(getPreviousMonth('2026-01', 1), '2025-12');
  const series = computeMonthlyCashflowSeries([], [], '2026-02', 4);
  assert.deepEqual(
    series.map((s) => s.month),
    ['2025-11', '2025-12', '2026-01', '2026-02']
  );
});

test('form validators reject empty or invalid required inputs', () => {
  const sErr = validateStudentForm({
    fullName: '',
    phone: '12',
    batchId: '',
    admissionDate: 'bad',
    admissionFee: -1,
    monthlyFee: -5,
  });
  assert.ok(sErr.fullName && sErr.phone && sErr.batchId && sErr.admissionDate);

  const pErr = validatePaymentForm({
    amount: 50,
    discount: 60,
    billingMonth: '2026-11',
    paymentDate: '2026-11-25',
  });
  assert.ok(pErr.discount);

  const bErr = validateBillForm({
    title: 'A',
    amount: 0,
    billingMonth: '2026-11',
    dueDate: '2026-11-30',
  });
  assert.ok(bErr.title && bErr.amount);
});

test('buildCsvString and formatCurrency behave deterministically', () => {
  assert.equal(formatCurrency(1250, '$'), '$1,250');
  const csv = buildCsvString(['Name', 'Note'], [['Ayaan, Jr.', 'Said "Oss"']]);
  assert.equal(csv, 'Name,Note\n"Ayaan, Jr.","Said ""Oss"""');
});
