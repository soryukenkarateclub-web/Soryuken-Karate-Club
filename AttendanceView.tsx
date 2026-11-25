import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Save } from 'lucide-react';
import type {
  AttendanceRecord,
  AttendanceStatus,
  DojoBatch,
  Student,
} from '../types/dojo';
import {
  computeStudentAttendanceStats,
  formatMonthLabel,
} from '../utils/dojoLogic';
import { BeltSwatch } from './BeltSwatch';

interface AttendanceViewProps {
  batches: DojoBatch[];
  students: Student[];
  attendance: AttendanceRecord[];
  todayDate: string;
  selectedMonth: string;
  onSaveAttendanceBatch: (
    entries: Omit<AttendanceRecord, 'id' | 'ownerId'>[]
  ) => Promise<void>;
}

export function AttendanceView({
  batches,
  students,
  attendance,
  todayDate,
  selectedMonth,
  onSaveAttendanceBatch,
}: AttendanceViewProps) {
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily');
  const [date, setDate] = useState(todayDate);
  const [batchFilter, setBatchFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState(selectedMonth);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          s.status === 'Active' &&
          (batchFilter === 'all' || s.batchId === batchFilter)
      ),
    [students, batchFilter]
  );

  const [draftStatuses, setDraftStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  // Sync draft state when date, batch, or stored attendance changes
  useEffect(() => {
    const nextStatuses: Record<string, AttendanceStatus> = {};
    const nextNotes: Record<string, string> = {};
    for (const s of activeStudents) {
      const existing = attendance.find(
        (a) => a.date === date && a.studentId === s.id
      );
      if (existing) {
        nextStatuses[s.id] = existing.status;
        nextNotes[s.id] = existing.note;
      }
    }
    setDraftStatuses(nextStatuses);
    setDraftNotes(nextNotes);
  }, [date, activeStudents, attendance]);

  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let unmarked = 0;
    for (const s of activeStudents) {
      const st = draftStatuses[s.id];
      if (st === 'Present') present += 1;
      else if (st === 'Absent') absent += 1;
      else if (st === 'Late') late += 1;
      else unmarked += 1;
    }
    return { present, absent, late, unmarked };
  }, [activeStudents, draftStatuses]);

  const handleMarkAllPresent = () => {
    const next: Record<string, AttendanceStatus> = { ...draftStatuses };
    for (const s of activeStudents) {
      next[s.id] = 'Present';
    }
    setDraftStatuses(next);
  };

  const handleSave = async () => {
    const entries: Omit<AttendanceRecord, 'id' | 'ownerId'>[] = [];
    for (const s of activeStudents) {
      const st = draftStatuses[s.id];
      if (!st) continue;
      entries.push({
        date,
        month: date.slice(0, 7),
        studentId: s.id,
        studentName: s.fullName,
        rollNumber: s.rollNumber,
        batchId: s.batchId,
        status: st,
        note: draftNotes[s.id] || '',
      });
    }
    if (entries.length === 0) return;
    setSaving(true);
    try {
      await onSaveAttendanceBatch(entries);
      setSavedNotice(`Saved attendance for ${entries.length} students on ${date}.`);
      setTimeout(() => setSavedNotice(null), 3500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setTab('daily')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
              tab === 'daily'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Roll Call
          </button>
          <button
            type="button"
            onClick={() => setTab('monthly')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
              tab === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Attendance Sheet
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {tab === 'daily' ? (
            <div>
              <label htmlFor="att-date" className="sr-only">
                Attendance Date
              </label>
              <input
                id="att-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="att-month" className="sr-only">
                Attendance Month
              </label>
              <input
                id="att-month"
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
              />
            </div>
          )}

          <select
            aria-label="Filter attendance by batch"
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
        </div>
      </div>

      {savedNotice && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 flex items-center gap-2 text-sm"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {tab === 'daily' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 tabular-nums">
              <span>
                Roster: <strong className="text-slate-900">{activeStudents.length}</strong>
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-emerald-700">
                Present: <strong>{counts.present}</strong>
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-amber-700">
                Late: <strong>{counts.late}</strong>
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-red-700">
                Absent: <strong>{counts.absent}</strong>
              </span>
              {counts.unmarked > 0 && (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span>Unmarked: {counts.unmarked}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark All Present</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || activeStudents.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            </div>
          </div>

          {activeStudents.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No active students found in this batch.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeStudents.map((s) => {
                const currentStatus = draftStatuses[s.id];
                return (
                  <div
                    key={s.id}
                    className="px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/70"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono tabular-nums text-xs text-slate-500">
                          {s.rollNumber}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {s.fullName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <BeltSwatch rank={s.beltRank} />
                        <span aria-hidden="true">·</span>
                        <span>{s.batchName}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <input
                        type="text"
                        aria-label={`Attendance note for ${s.fullName}`}
                        value={draftNotes[s.id] ?? ''}
                        onChange={(e) =>
                          setDraftNotes((prev) => ({
                            ...prev,
                            [s.id]: e.target.value,
                          }))
                        }
                        placeholder="Optional note..."
                        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md w-44 focus:outline-none focus:border-slate-400"
                      />

                      <div
                        role="group"
                        aria-label={`Attendance status for ${s.fullName}`}
                        className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
                      >
                        {(['Present', 'Late', 'Absent'] as AttendanceStatus[]).map(
                          (st) => {
                            const selected = currentStatus === st;
                            const activeStyle =
                              st === 'Present'
                                ? 'bg-emerald-700 text-white'
                                : st === 'Late'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-red-700 text-white';
                            return (
                              <button
                                key={st}
                                type="button"
                                aria-pressed={selected}
                                onClick={() =>
                                  setDraftStatuses((prev) => ({
                                    ...prev,
                                    [s.id]: st,
                                  }))
                                }
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                                  selected
                                    ? activeStyle
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-display text-sm font-bold text-slate-900">
              {formatMonthLabel(monthFilter)} Attendance Consistency
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated training sessions marked during {formatMonthLabel(monthFilter)}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Roll ID</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4 text-right">Sessions Marked</th>
                  <th className="py-3 px-4 text-right">Present</th>
                  <th className="py-3 px-4 text-right">Late</th>
                  <th className="py-3 px-4 text-right">Absent</th>
                  <th className="py-3 px-4 text-right">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activeStudents.map((s) => {
                  const st = computeStudentAttendanceStats(s.id, attendance, monthFilter);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500">
                        {s.rollNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{s.fullName}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{s.batchName}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                        {st.totalMarked}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-emerald-700 font-semibold">
                        {st.present}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-amber-700">
                        {st.late}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-red-700">
                        {st.absent}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-bold text-slate-900">
                        {st.totalMarked > 0 ? `${st.attendanceRate}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
