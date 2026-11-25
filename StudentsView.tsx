import { useMemo, useState } from 'react';
import {
  Award,
  Download,
  Edit3,
  Eye,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  BELT_RANKS,
  type AttendanceRecord,
  type BeltRank,
  type DojoBatch,
  type DojoProfile,
  type Gender,
  type PaymentRecord,
  type Student,
  type StudentStatus,
} from '../types/dojo';
import {
  buildCsvString,
  calculateAge,
  computeStudentAttendanceStats,
  computeStudentFeeStatus,
  formatCurrency,
  validateStudentForm,
} from '../utils/dojoLogic';
import { BeltSwatch } from './BeltSwatch';

interface StudentsViewProps {
  profile: DojoProfile;
  batches: DojoBatch[];
  students: Student[];
  attendance: AttendanceRecord[];
  payments: PaymentRecord[];
  selectedMonth: string;
  todayDate: string;
  onSaveStudent: (student: Omit<Student, 'id' | 'ownerId'> & { id?: string }) => Promise<Student>;
  onDeleteStudent: (id: string) => Promise<void>;
  onCollectFee: (student: Student) => void;
  onGoToAdmission: () => void;
}

export function StudentsView({
  profile,
  batches,
  students,
  attendance,
  payments,
  selectedMonth,
  todayDate,
  onSaveStudent,
  onDeleteStudent,
  onCollectFee,
  onGoToAdmission,
}: StudentsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [beltFilter, setBeltFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StudentStatus>('all');

  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (batchFilter !== 'all' && s.batchId !== batchFilter) return false;
      if (beltFilter !== 'all' && s.beltRank !== beltFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.guardianName.toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery, batchFilter, beltFilter, statusFilter]);

  const handleExportCsv = () => {
    const headers = [
      'Roll Number',
      'Full Name',
      'DOB',
      'Gender',
      'Guardian',
      'Phone',
      'Email',
      'Batch',
      'Belt Rank',
      'Admission Date',
      'Monthly Fee',
      'Status',
    ];
    const rows = filtered.map((s) => [
      s.rollNumber,
      s.fullName,
      s.dateOfBirth,
      s.gender,
      s.guardianName,
      s.phone,
      s.email,
      s.batchName,
      s.beltRank,
      s.admissionDate,
      s.monthlyFee,
      s.status,
    ]);
    const csv = buildCsvString(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soryuken-students-${todayDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePromoteBelt = async (student: Student) => {
    const idx = BELT_RANKS.indexOf(student.beltRank);
    if (idx < 0 || idx >= BELT_RANKS.length - 1) return;
    const nextBelt = BELT_RANKS[idx + 1];
    const updated = await onSaveStudent({
      ...student,
      beltRank: nextBelt,
      lastPromotedDate: todayDate,
    });
    setViewingStudent(updated);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const errs = validateStudentForm({
      fullName: editingStudent.fullName,
      phone: editingStudent.phone,
      batchId: editingStudent.batchId,
      admissionDate: editingStudent.admissionDate,
      admissionFee: editingStudent.admissionFee,
      monthlyFee: editingStudent.monthlyFee,
    });
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }
    setEditErrors({});
    const batchObj = batches.find((b) => b.id === editingStudent.batchId);
    const saved = await onSaveStudent({
      ...editingStudent,
      batchName: batchObj?.name || editingStudent.batchName,
    });
    if (viewingStudent?.id === saved.id) {
      setViewingStudent(saved);
    }
    setEditingStudent(null);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Search students by name, roll number, or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, roll ID, phone..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-red-700"
            />
          </div>

          <select
            aria-label="Filter by batch"
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

          <select
            aria-label="Filter by belt rank"
            value={beltFilter}
            onChange={(e) => setBeltFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Belts</option>
            {BELT_RANKS.map((r) => (
              <option key={r} value={r}>
                {r} Belt
              </option>
            ))}
          </select>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            {(['all', 'Active', 'On Leave', 'Inactive'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Student Database Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-900">
              {students.length === 0
                ? 'No students enrolled yet'
                : 'No students match your search or filters'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {students.length === 0
                ? 'Enroll your first student via the Admission form.'
                : 'Try clearing filters or searching another name or roll number.'}
            </p>
            {students.length === 0 && (
              <button
                type="button"
                onClick={onGoToAdmission}
                className="mt-4 px-4 py-2 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer"
              >
                Admit First Student
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Roll ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Belt Rank</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4 text-right">Monthly Fee</th>
                  <th className="py-3 px-4 text-right">Attendance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((student) => {
                  const attStats = computeStudentAttendanceStats(student.id, attendance);
                  const feeStatus = computeStudentFeeStatus(student, payments, selectedMonth);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums text-xs font-medium text-slate-600 whitespace-nowrap">
                        {student.rollNumber}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{student.fullName}</p>
                        {student.guardianName && (
                          <p className="text-xs text-slate-500">Guardian: {student.guardianName}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <BeltSwatch rank={student.beltRank} />
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-[190px] truncate">
                        {student.batchName}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                        {student.phone}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(student.monthlyFee, profile.currency)}
                        </span>
                        <span
                          className={`block text-[11px] ${
                            feeStatus.status === 'Paid'
                              ? 'text-emerald-700'
                              : feeStatus.status === 'Partial'
                                ? 'text-amber-700'
                                : 'text-red-700'
                          }`}
                        >
                          {feeStatus.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                        {attStats.totalMarked > 0 ? `${attStats.attendanceRate}%` : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            student.status === 'Active'
                              ? 'text-emerald-700'
                              : student.status === 'On Leave'
                                ? 'text-amber-700'
                                : 'text-slate-500'
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingStudent(student)}
                            aria-label={`View profile for ${student.fullName}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingStudent(student)}
                            aria-label={`Edit ${student.fullName}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {confirmDeleteId === student.id ? (
                            <div className="inline-flex items-center gap-1 ml-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDeleteStudent(student.id);
                                  setConfirmDeleteId(null);
                                  if (viewingStudent?.id === student.id) setViewingStudent(null);
                                }}
                                className="px-2 py-1 text-[11px] font-medium bg-red-700 text-white rounded hover:bg-red-800 cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-[11px] font-medium text-slate-600 border border-slate-200 rounded hover:bg-white cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(student.id)}
                              aria-label={`Delete ${student.fullName}`}
                              className="p-1.5 text-slate-400 hover:text-red-700 rounded-md hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Profile & Belt Promotion Drawer */}
      {viewingStudent && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-drawer-title"
        >
          <div className="bg-white w-full max-w-xl h-full overflow-y-auto border-l border-slate-200 p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <p className="text-xs font-mono tabular-nums text-slate-500">
                    {viewingStudent.rollNumber} · Admitted {viewingStudent.admissionDate}
                  </p>
                  <h2 id="student-drawer-title" className="mt-1 font-display text-xl font-bold text-slate-900">
                    {viewingStudent.fullName}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <BeltSwatch rank={viewingStudent.beltRank} showKyu />
                    <span aria-hidden="true">·</span>
                    <span>{viewingStudent.batchName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-slate-900">{viewingStudent.status}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingStudent(null)}
                  aria-label="Close student details"
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Strip */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(viewingStudent)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit All Details</span>
                </button>
                {BELT_RANKS.indexOf(viewingStudent.beltRank) < BELT_RANKS.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handlePromoteBelt(viewingStudent)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>
                      Promote to {BELT_RANKS[BELT_RANKS.indexOf(viewingStudent.beltRank) + 1]} Belt
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onCollectFee(viewingStudent)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Collect Fee
                </button>
              </div>

              {/* Personal & Contact Info */}
              <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-200 pt-5">
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="font-mono tabular-nums text-slate-900 mt-0.5">{viewingStudent.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-slate-900 mt-0.5 break-all">{viewingStudent.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date of Birth &amp; Gender</p>
                  <p className="text-slate-900 mt-0.5">
                    {viewingStudent.dateOfBirth || '—'}
                    {calculateAge(viewingStudent.dateOfBirth, todayDate) !== null
                      ? ` (Age ${calculateAge(viewingStudent.dateOfBirth, todayDate)})`
                      : ''}
                    {' · '}
                    {viewingStudent.gender}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Guardian</p>
                  <p className="text-slate-900 mt-0.5">{viewingStudent.guardianName || 'Self / Adult'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Address</p>
                  <p className="text-slate-900 mt-0.5">{viewingStudent.address || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Emergency Contact</p>
                  <p className="text-slate-900 mt-0.5">{viewingStudent.emergencyContact || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Last Belt Promotion</p>
                  <p className="font-mono tabular-nums text-slate-900 mt-0.5">
                    {viewingStudent.lastPromotedDate || 'Initial rank'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Medical Notes</p>
                  <p className="text-slate-900 mt-0.5">{viewingStudent.medicalNotes || 'None'}</p>
                </div>
              </div>

              {/* Payment History */}
              <div className="border-t border-slate-200 pt-5">
                <h3 className="text-xs font-semibold text-slate-700 mb-3">
                  Fee &amp; Payment History
                </h3>
                {payments.filter((p) => p.studentId === viewingStudent.id).length === 0 ? (
                  <p className="text-xs text-slate-500">No payments recorded for this student yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {payments
                      .filter((p) => p.studentId === viewingStudent.id)
                      .map((p) => (
                        <div key={p.id} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-medium text-slate-900">
                              {p.category} · {p.billingMonth}
                            </p>
                            <p className="text-slate-500 font-mono tabular-nums">
                              {p.receiptNumber} · {p.paymentDate} · {p.method}
                            </p>
                          </div>
                          <p className="font-mono tabular-nums font-semibold text-slate-900">
                            {formatCurrency(p.netAmount, profile.currency)}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Edit Student Modal */}
      {editingStudent && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-student-title"
        >
          <form
            onSubmit={handleSaveEdit}
            noValidate
            className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 space-y-5 my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 id="edit-student-title" className="font-display text-base font-bold text-slate-900">
                Edit Student Record — {editingStudent.rollNumber}
              </h3>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                aria-label="Close edit student modal"
                className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="edit-stu-roll" className="block text-xs font-medium text-slate-700 mb-1">Roll Number</label>
                <input
                  id="edit-stu-roll"
                  type="text"
                  value={editingStudent.rollNumber}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, rollNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="edit-stu-name" className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  id="edit-stu-name"
                  type="text"
                  value={editingStudent.fullName}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, fullName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                {editErrors.fullName && (
                  <p className="mt-1 text-xs text-red-700">{editErrors.fullName}</p>
                )}
              </div>

              <div>
                <label htmlFor="edit-stu-dob" className="block text-xs font-medium text-slate-700 mb-1">Date of Birth</label>
                <input
                  id="edit-stu-dob"
                  type="date"
                  value={editingStudent.dateOfBirth}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, dateOfBirth: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="edit-stu-gender" className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                <select
                  id="edit-stu-gender"
                  value={editingStudent.gender}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, gender: e.target.value as Gender })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-stu-phone" className="block text-xs font-medium text-slate-700 mb-1">Phone *</label>
                <input
                  id="edit-stu-phone"
                  type="tel"
                  value={editingStudent.phone}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                {editErrors.phone && (
                  <p className="mt-1 text-xs text-red-700">{editErrors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="edit-stu-guardian" className="block text-xs font-medium text-slate-700 mb-1">Guardian Name</label>
                <input
                  id="edit-stu-guardian"
                  type="text"
                  value={editingStudent.guardianName}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, guardianName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="edit-stu-email" className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input
                  id="edit-stu-email"
                  type="email"
                  value={editingStudent.email}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, email: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="edit-stu-address" className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                <input
                  id="edit-stu-address"
                  type="text"
                  value={editingStudent.address}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, address: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="edit-stu-batch" className="block text-xs font-medium text-slate-700 mb-1">Batch</label>
                <select
                  id="edit-stu-batch"
                  value={editingStudent.batchId}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, batchId: e.target.value })
                  }
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
                <label htmlFor="edit-stu-belt" className="block text-xs font-medium text-slate-700 mb-1">Belt Rank</label>
                <select
                  id="edit-stu-belt"
                  value={editingStudent.beltRank}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      beltRank: e.target.value as BeltRank,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {BELT_RANKS.map((r) => (
                    <option key={r} value={r}>
                      {r} Belt
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-stu-status" className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  id="edit-stu-status"
                  value={editingStudent.status}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      status: e.target.value as StudentStatus,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-stu-fee" className="block text-xs font-medium text-slate-700 mb-1">
                  Monthly Fee ({profile.currency})
                </label>
                <input
                  id="edit-stu-fee"
                  type="number"
                  min={0}
                  value={editingStudent.monthlyFee}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      monthlyFee: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="edit-stu-adm-date" className="block text-xs font-medium text-slate-700 mb-1">
                  Admission Date
                </label>
                <input
                  id="edit-stu-adm-date"
                  type="date"
                  value={editingStudent.admissionDate}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, admissionDate: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="edit-stu-emergency" className="block text-xs font-medium text-slate-700 mb-1">
                  Emergency Contact
                </label>
                <input
                  id="edit-stu-emergency"
                  type="text"
                  value={editingStudent.emergencyContact}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      emergencyContact: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="edit-stu-medical" className="block text-xs font-medium text-slate-700 mb-1">
                  Medical Notes
                </label>
                <input
                  id="edit-stu-medical"
                  type="text"
                  value={editingStudent.medicalNotes}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, medicalNotes: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 cursor-pointer"
              >
                Save Student Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
