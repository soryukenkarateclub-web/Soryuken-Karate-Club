import { useCallback, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../firebase';
import type {
  AttendanceRecord,
  DojoBatch,
  DojoProfile,
  MonthlyBill,
  OnlineAdmission,
  PaymentRecord,
  Student,
} from '../types/dojo';
import {
  createInitialAdmissions,
  createInitialAttendance,
  createInitialBatches,
  createInitialBills,
  createInitialDojoProfile,
  createInitialPayments,
  createInitialStudents,
} from '../utils/seedData';

const DEMO_STORAGE_KEY = 'soryuken_dojo_demo_v1';
const ensuringDojoByUid = new Map<string, Promise<void>>();

interface DemoState {
  profile: DojoProfile;
  batches: DojoBatch[];
  students: Student[];
  admissions: OnlineAdmission[];
  attendance: AttendanceRecord[];
  payments: PaymentRecord[];
  bills: MonthlyBill[];
}

function makeSafeId(prefix: string): string {
  const raw =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, '')
      : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${raw}`.slice(0, 120);
}

function clampStr(val: string | undefined, max: number): string {
  return String(val ?? '').trim().slice(0, max);
}

function createDefaultDemoState(): DemoState {
  return {
    profile: createInitialDojoProfile('demo-owner'),
    batches: createInitialBatches('demo-owner'),
    students: createInitialStudents('demo-owner'),
    admissions: createInitialAdmissions('demo-owner'),
    attendance: createInitialAttendance('demo-owner'),
    payments: createInitialPayments('demo-owner'),
    bills: createInitialBills('demo-owner'),
  };
}

function loadDemoState(): DemoState {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return createDefaultDemoState();
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    if (!parsed.profile || !Array.isArray(parsed.batches) || !Array.isArray(parsed.students)) {
      return createDefaultDemoState();
    }
    return {
      profile: parsed.profile,
      batches: parsed.batches,
      students: parsed.students,
      admissions: Array.isArray(parsed.admissions) ? parsed.admissions : [],
      attendance: Array.isArray(parsed.attendance) ? parsed.attendance : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      bills: Array.isArray(parsed.bills) ? parsed.bills : [],
    };
  } catch {
    return createDefaultDemoState();
  }
}

export function useDojoStore() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' || params.get('demo') === '1';
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const [demoState, setDemoState] = useState<DemoState>(() => loadDemoState());

  const [profile, setProfile] = useState<DojoProfile>(demoState.profile);
  const [batches, setBatches] = useState<DojoBatch[]>(demoState.batches);
  const [students, setStudents] = useState<Student[]>(demoState.students);
  const [admissions, setAdmissions] = useState<OnlineAdmission[]>(demoState.admissions);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(demoState.attendance);
  const [payments, setPayments] = useState<PaymentRecord[]>(demoState.payments);
  const [bills, setBills] = useState<MonthlyBill[]>(demoState.bills);

  // Sync demo state to localStorage & UI state when in demo mode
  const commitDemo = useCallback((updater: (prev: DemoState) => DemoState) => {
    setDemoState((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (isDemoMode && !user) {
      setProfile(demoState.profile);
      setBatches(demoState.batches);
      setStudents(demoState.students);
      setAdmissions(demoState.admissions);
      setAttendance(demoState.attendance);
      setPayments(demoState.payments);
      setBills(demoState.bills);
    }
  }, [demoState, isDemoMode, user]);

  // Firebase Auth listener + startup connection check
  useEffect(() => {
    testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (u) {
        setIsDemoMode(false);
      }
    });
    return () => unsub();
  }, []);

  // Initialize dojo document + attach Firestore listeners ONLY when authenticated
  useEffect(() => {
    if (!authReady || !user) return;
    const dojoId = user.uid;
    let active = true;
    setLoadingData(true);

    const ensureDojoDoc = async () => {
      const existingPromise = ensuringDojoByUid.get(dojoId);
      if (existingPromise) {
        await existingPromise;
        return;
      }

      const task = (async () => {
        const dojoPath = `dojos/${dojoId}`;
        try {
          const ref = doc(db, 'dojos', dojoId);
          const snap = await getDoc(ref);
          if (!snap.exists() && active) {
            const initial = createInitialDojoProfile(dojoId);
            const cleanDisplayName = (user.displayName ?? '').trim();
            const senseiName = clampStr(
              cleanDisplayName ? `Sensei ${cleanDisplayName}` : initial.senseiName,
              100
            );
            const email = clampStr(user.email || initial.email, 120);

            await setDoc(ref, {
              name: initial.name,
              tagline: initial.tagline,
              senseiName: senseiName.length >= 2 ? senseiName : initial.senseiName,
              phone: initial.phone,
              email,
              address: initial.address,
              currency: initial.currency,
              defaultAdmissionFee: initial.defaultAdmissionFee,
              defaultMonthlyFee: initial.defaultMonthlyFee,
              logoDataUrl: initial.logoDataUrl,
              ownerId: dojoId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          if (!active) return;
          const batchesCol = collection(db, 'dojos', dojoId, 'batches');
          const batchSnap = await getDocs(query(batchesCol, where('ownerId', '==', dojoId)));
          if (batchSnap.empty && active) {
            const batch = writeBatch(db);
            for (const b of createInitialBatches(dojoId)) {
              const bRef = doc(db, 'dojos', dojoId, 'batches', b.id);
              batch.set(bRef, {
                name: b.name,
                schedule: b.schedule,
                instructor: b.instructor,
                monthlyFee: b.monthlyFee,
                capacity: b.capacity,
                ownerId: dojoId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            await batch.commit();
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, dojoPath);
        }
      })();

      ensuringDojoByUid.set(dojoId, task);
      try {
        await task;
      } finally {
        ensuringDojoByUid.delete(dojoId);
      }
    };

    void ensureDojoDoc();

    const dojoDocRef = doc(db, 'dojos', dojoId);
    const unsubProfile = onSnapshot(
      dojoDocRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setProfile({
            id: snap.id,
            name: String(d.name ?? 'Sōryuken Karate Club'),
            tagline: String(d.tagline ?? ''),
            senseiName: String(d.senseiName ?? ''),
            phone: String(d.phone ?? ''),
            email: String(d.email ?? ''),
            address: String(d.address ?? ''),
            currency: String(d.currency ?? '$'),
            defaultAdmissionFee: Number(d.defaultAdmissionFee ?? 50),
            defaultMonthlyFee: Number(d.defaultMonthlyFee ?? 65),
            logoDataUrl: String(d.logoDataUrl ?? ''),
            ownerId: String(d.ownerId ?? dojoId),
          });
        }
        setLoadingData(false);
      },
      (error) => handleFirestoreError(error, OperationType.GET, `dojos/${dojoId}`)
    );

    const subscribeCol = <T,>(
      colName: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      mapDoc: (id: string, data: Record<string, unknown>) => T
    ) => {
      const path = `dojos/${dojoId}/${colName}`;
      const q = query(collection(db, path), where('ownerId', '==', dojoId));
      return onSnapshot(
        q,
        (snap) => {
          setter(snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>)));
        },
        (error) => handleFirestoreError(error, OperationType.LIST, path)
      );
    };

    const unsubBatches = subscribeCol<DojoBatch>('batches', setBatches, (id, d) => ({
      id,
      name: String(d.name ?? ''),
      schedule: String(d.schedule ?? ''),
      instructor: String(d.instructor ?? ''),
      monthlyFee: Number(d.monthlyFee ?? 0),
      capacity: Number(d.capacity ?? 20),
      ownerId: String(d.ownerId ?? dojoId),
    }));

    const unsubStudents = subscribeCol<Student>('students', setStudents, (id, d) => ({
      id,
      rollNumber: String(d.rollNumber ?? ''),
      fullName: String(d.fullName ?? ''),
      dateOfBirth: String(d.dateOfBirth ?? ''),
      gender: (d.gender as Student['gender']) ?? 'Male',
      guardianName: String(d.guardianName ?? ''),
      phone: String(d.phone ?? ''),
      email: String(d.email ?? ''),
      address: String(d.address ?? ''),
      emergencyContact: String(d.emergencyContact ?? ''),
      batchId: String(d.batchId ?? ''),
      batchName: String(d.batchName ?? ''),
      beltRank: (d.beltRank as Student['beltRank']) ?? 'White',
      admissionDate: String(d.admissionDate ?? ''),
      admissionFee: Number(d.admissionFee ?? 0),
      monthlyFee: Number(d.monthlyFee ?? 0),
      status: (d.status as Student['status']) ?? 'Active',
      medicalNotes: String(d.medicalNotes ?? ''),
      lastPromotedDate: String(d.lastPromotedDate ?? ''),
      ownerId: String(d.ownerId ?? dojoId),
    }));

    const unsubAdmissions = subscribeCol<OnlineAdmission>('admissions', setAdmissions, (id, d) => ({
      id,
      applicantName: String(d.applicantName ?? ''),
      dateOfBirth: String(d.dateOfBirth ?? ''),
      gender: (d.gender as OnlineAdmission['gender']) ?? 'Male',
      guardianName: String(d.guardianName ?? ''),
      phone: String(d.phone ?? ''),
      email: String(d.email ?? ''),
      address: String(d.address ?? ''),
      emergencyContact: String(d.emergencyContact ?? ''),
      preferredBatchId: String(d.preferredBatchId ?? ''),
      preferredBatchName: String(d.preferredBatchName ?? ''),
      previousExperience: String(d.previousExperience ?? ''),
      medicalNotes: String(d.medicalNotes ?? ''),
      applicationStatus: (d.applicationStatus as OnlineAdmission['applicationStatus']) ?? 'Pending',
      submittedDate: String(d.submittedDate ?? ''),
      ownerId: String(d.ownerId ?? dojoId),
    }));

    const unsubAttendance = subscribeCol<AttendanceRecord>('attendance', setAttendance, (id, d) => ({
      id,
      date: String(d.date ?? ''),
      month: String(d.month ?? ''),
      studentId: String(d.studentId ?? ''),
      studentName: String(d.studentName ?? ''),
      rollNumber: String(d.rollNumber ?? ''),
      batchId: String(d.batchId ?? ''),
      status: (d.status as AttendanceRecord['status']) ?? 'Present',
      note: String(d.note ?? ''),
      ownerId: String(d.ownerId ?? dojoId),
    }));

    const unsubPayments = subscribeCol<PaymentRecord>('payments', setPayments, (id, d) => ({
      id,
      receiptNumber: String(d.receiptNumber ?? ''),
      category: (d.category as PaymentRecord['category']) ?? 'Monthly Fee',
      studentId: String(d.studentId ?? ''),
      studentName: String(d.studentName ?? ''),
      billingMonth: String(d.billingMonth ?? ''),
      amount: Number(d.amount ?? 0),
      discount: Number(d.discount ?? 0),
      netAmount: Number(d.netAmount ?? 0),
      method: (d.method as PaymentRecord['method']) ?? 'Cash',
      paymentDate: String(d.paymentDate ?? ''),
      status: (d.status as PaymentRecord['status']) ?? 'Paid',
      notes: String(d.notes ?? ''),
      ownerId: String(d.ownerId ?? dojoId),
    }));

    const unsubBills = subscribeCol<MonthlyBill>('bills', setBills, (id, d) => ({
      id,
      title: String(d.title ?? ''),
      category: (d.category as MonthlyBill['category']) ?? 'Other',
      billingMonth: String(d.billingMonth ?? ''),
      amount: Number(d.amount ?? 0),
      dueDate: String(d.dueDate ?? ''),
      paidDate: String(d.paidDate ?? ''),
      status: (d.status as MonthlyBill['status']) ?? 'Pending',
      recurring: Boolean(d.recurring),
      vendor: String(d.vendor ?? ''),
      notes: String(d.notes ?? ''),
      ownerId: String(d.ownerId ?? dojoId),
    }));

    return () => {
      active = false;
      unsubProfile();
      unsubBatches();
      unsubStudents();
      unsubAdmissions();
      unsubAttendance();
      unsubPayments();
      unsubBills();
    };
  }, [authReady, user]);

  // --- Auth Actions ---
  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in was cancelled or blocked.');
    }
  };

  const logout = async () => {
    setIsDemoMode(false);
    if (user) {
      await signOut(auth);
    }
  };

  const enterDemoMode = () => {
    setAuthError(null);
    setIsDemoMode(true);
  };

  const resetDemoData = () => {
    const fresh = createDefaultDemoState();
    commitDemo(() => fresh);
  };

  const loadStarterDataIntoCloud = async () => {
    if (!user) return;
    const dojoId = user.uid;
    const existingStudentIds = new Set(students.map((s) => s.id));
    const existingAdmissionIds = new Set(admissions.map((a) => a.id));
    const existingPaymentIds = new Set(payments.map((p) => p.id));
    const existingBillIds = new Set(bills.map((b) => b.id));
    const existingAttendanceIds = new Set(attendance.map((a) => a.id));

    const batch = writeBatch(db);
    let writeCount = 0;

    for (const s of createInitialStudents(dojoId)) {
      if (existingStudentIds.has(s.id)) continue;
      writeCount += 1;
      batch.set(doc(db, 'dojos', dojoId, 'students', s.id), {
        rollNumber: s.rollNumber,
        fullName: s.fullName,
        dateOfBirth: s.dateOfBirth,
        gender: s.gender,
        guardianName: s.guardianName,
        phone: s.phone,
        email: s.email,
        address: s.address,
        emergencyContact: s.emergencyContact,
        batchId: s.batchId,
        batchName: s.batchName,
        beltRank: s.beltRank,
        admissionDate: s.admissionDate,
        admissionFee: s.admissionFee,
        monthlyFee: s.monthlyFee,
        status: s.status,
        medicalNotes: s.medicalNotes,
        lastPromotedDate: s.lastPromotedDate,
        ownerId: dojoId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const a of createInitialAdmissions(dojoId)) {
      if (existingAdmissionIds.has(a.id)) continue;
      writeCount += 1;
      batch.set(doc(db, 'dojos', dojoId, 'admissions', a.id), {
        applicantName: a.applicantName,
        dateOfBirth: a.dateOfBirth,
        gender: a.gender,
        guardianName: a.guardianName,
        phone: a.phone,
        email: a.email,
        address: a.address,
        emergencyContact: a.emergencyContact,
        preferredBatchId: a.preferredBatchId,
        preferredBatchName: a.preferredBatchName,
        previousExperience: a.previousExperience,
        medicalNotes: a.medicalNotes,
        applicationStatus: a.applicationStatus,
        submittedDate: a.submittedDate,
        ownerId: dojoId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const p of createInitialPayments(dojoId)) {
      if (existingPaymentIds.has(p.id)) continue;
      writeCount += 1;
      batch.set(doc(db, 'dojos', dojoId, 'payments', p.id), {
        receiptNumber: p.receiptNumber,
        category: p.category,
        studentId: p.studentId,
        studentName: p.studentName,
        billingMonth: p.billingMonth,
        amount: p.amount,
        discount: p.discount,
        netAmount: p.netAmount,
        method: p.method,
        paymentDate: p.paymentDate,
        status: p.status,
        notes: p.notes,
        ownerId: dojoId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const b of createInitialBills(dojoId)) {
      if (existingBillIds.has(b.id)) continue;
      writeCount += 1;
      batch.set(doc(db, 'dojos', dojoId, 'bills', b.id), {
        title: b.title,
        category: b.category,
        billingMonth: b.billingMonth,
        amount: b.amount,
        dueDate: b.dueDate,
        paidDate: b.paidDate,
        status: b.status,
        recurring: b.recurring,
        vendor: b.vendor,
        notes: b.notes,
        ownerId: dojoId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const att of createInitialAttendance(dojoId)) {
      if (existingAttendanceIds.has(att.id)) continue;
      writeCount += 1;
      batch.set(doc(db, 'dojos', dojoId, 'attendance', att.id), {
        date: att.date,
        month: att.month,
        studentId: att.studentId,
        studentName: att.studentName,
        rollNumber: att.rollNumber,
        batchId: att.batchId,
        status: att.status,
        note: att.note,
        ownerId: dojoId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    if (writeCount === 0) return;
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `dojos/${dojoId}`);
    }
  };

  // --- CRUD Operations (Edit Everything Support) ---
  const updateProfile = async (next: Omit<DojoProfile, 'id' | 'ownerId'>) => {
    const clean = {
      name: clampStr(next.name, 120),
      tagline: clampStr(next.tagline, 180),
      senseiName: clampStr(next.senseiName, 100),
      phone: clampStr(next.phone, 40),
      email: clampStr(next.email, 120),
      address: clampStr(next.address, 300),
      currency: clampStr(next.currency || '$', 10),
      defaultAdmissionFee: Math.max(0, Number(next.defaultAdmissionFee) || 0),
      defaultMonthlyFee: Math.max(0, Number(next.defaultMonthlyFee) || 0),
      logoDataUrl: clampStr(next.logoDataUrl, 300000),
    };
    if (!user) {
      commitDemo((prev) => ({
        ...prev,
        profile: { ...prev.profile, ...clean },
      }));
      return;
    }
    const path = `dojos/${user.uid}`;
    try {
      await updateDoc(doc(db, 'dojos', user.uid), {
        ...clean,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const saveBatch = async (batchInput: Omit<DojoBatch, 'id' | 'ownerId'> & { id?: string }) => {
    const id = batchInput.id || makeSafeId('batch');
    const clean = {
      name: clampStr(batchInput.name, 80),
      schedule: clampStr(batchInput.schedule, 100),
      instructor: clampStr(batchInput.instructor, 80),
      monthlyFee: Math.max(0, Number(batchInput.monthlyFee) || 0),
      capacity: Math.max(1, Number(batchInput.capacity) || 20),
    };
    if (!user) {
      commitDemo((prev) => {
        const exists = prev.batches.some((b) => b.id === id);
        const item: DojoBatch = { id, ...clean, ownerId: 'demo-owner' };
        return {
          ...prev,
          batches: exists
            ? prev.batches.map((b) => (b.id === id ? item : b))
            : [...prev.batches, item],
        };
      });
      return;
    }
    const path = `dojos/${user.uid}/batches/${id}`;
    const ref = doc(db, 'dojos', user.uid, 'batches', id);
    try {
      if (batchInput.id) {
        await updateDoc(ref, { ...clean, updatedAt: serverTimestamp() });
      } else {
        await setDoc(ref, {
          ...clean,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const deleteBatch = async (batchId: string) => {
    if (!user) {
      commitDemo((prev) => ({
        ...prev,
        batches: prev.batches.filter((b) => b.id !== batchId),
      }));
      return;
    }
    const path = `dojos/${user.uid}/batches/${batchId}`;
    try {
      await deleteDoc(doc(db, 'dojos', user.uid, 'batches', batchId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const saveStudent = async (
    input: Omit<Student, 'id' | 'ownerId'> & { id?: string }
  ): Promise<Student> => {
    const id = input.id || makeSafeId('stu');
    const clean: Omit<Student, 'id' | 'ownerId'> = {
      rollNumber: clampStr(input.rollNumber, 32),
      fullName: clampStr(input.fullName, 100),
      dateOfBirth: clampStr(input.dateOfBirth, 20),
      gender: input.gender,
      guardianName: clampStr(input.guardianName, 100),
      phone: clampStr(input.phone, 30),
      email: clampStr(input.email, 120),
      address: clampStr(input.address, 250),
      emergencyContact: clampStr(input.emergencyContact, 100),
      batchId: clampStr(input.batchId, 128),
      batchName: clampStr(input.batchName, 80),
      beltRank: input.beltRank,
      admissionDate: clampStr(input.admissionDate, 10),
      admissionFee: Math.max(0, Number(input.admissionFee) || 0),
      monthlyFee: Math.max(0, Number(input.monthlyFee) || 0),
      status: input.status,
      medicalNotes: clampStr(input.medicalNotes, 500),
      lastPromotedDate: clampStr(input.lastPromotedDate, 20),
    };
    const ownerId = user ? user.uid : 'demo-owner';
    const saved: Student = { id, ...clean, ownerId };

    if (!user) {
      commitDemo((prev) => {
        const exists = prev.students.some((s) => s.id === id);
        return {
          ...prev,
          students: exists
            ? prev.students.map((s) => (s.id === id ? saved : s))
            : [saved, ...prev.students],
        };
      });
      return saved;
    }

    const path = `dojos/${user.uid}/students/${id}`;
    const ref = doc(db, 'dojos', user.uid, 'students', id);
    try {
      if (input.id) {
        await updateDoc(ref, { ...clean, updatedAt: serverTimestamp() });
      } else {
        await setDoc(ref, {
          ...clean,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return saved;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!user) {
      commitDemo((prev) => ({
        ...prev,
        students: prev.students.filter((s) => s.id !== studentId),
      }));
      return;
    }
    const path = `dojos/${user.uid}/students/${studentId}`;
    try {
      await deleteDoc(doc(db, 'dojos', user.uid, 'students', studentId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const saveOnlineAdmission = async (
    input: Omit<OnlineAdmission, 'id' | 'ownerId'> & { id?: string }
  ): Promise<OnlineAdmission> => {
    const id = input.id || makeSafeId('adm');
    const clean: Omit<OnlineAdmission, 'id' | 'ownerId'> = {
      applicantName: clampStr(input.applicantName, 100),
      dateOfBirth: clampStr(input.dateOfBirth, 20),
      gender: input.gender,
      guardianName: clampStr(input.guardianName, 100),
      phone: clampStr(input.phone, 30),
      email: clampStr(input.email, 120),
      address: clampStr(input.address, 250),
      emergencyContact: clampStr(input.emergencyContact, 100),
      preferredBatchId: clampStr(input.preferredBatchId, 128),
      preferredBatchName: clampStr(input.preferredBatchName, 80),
      previousExperience: clampStr(input.previousExperience, 200),
      medicalNotes: clampStr(input.medicalNotes, 500),
      applicationStatus: input.applicationStatus,
      submittedDate: clampStr(input.submittedDate, 10),
    };
    const ownerId = user ? user.uid : 'demo-owner';
    const saved: OnlineAdmission = { id, ...clean, ownerId };

    if (!user) {
      commitDemo((prev) => {
        const exists = prev.admissions.some((a) => a.id === id);
        return {
          ...prev,
          admissions: exists
            ? prev.admissions.map((a) => (a.id === id ? saved : a))
            : [saved, ...prev.admissions],
        };
      });
      return saved;
    }

    const path = `dojos/${user.uid}/admissions/${id}`;
    const ref = doc(db, 'dojos', user.uid, 'admissions', id);
    try {
      if (input.id) {
        await updateDoc(ref, { ...clean, updatedAt: serverTimestamp() });
      } else {
        await setDoc(ref, {
          ...clean,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return saved;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const deleteOnlineAdmission = async (admissionId: string) => {
    if (!user) {
      commitDemo((prev) => ({
        ...prev,
        admissions: prev.admissions.filter((a) => a.id !== admissionId),
      }));
      return;
    }
    const path = `dojos/${user.uid}/admissions/${admissionId}`;
    try {
      await deleteDoc(doc(db, 'dojos', user.uid, 'admissions', admissionId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const saveAttendanceBatch = async (
    entries: Omit<AttendanceRecord, 'id' | 'ownerId'>[]
  ) => {
    if (entries.length === 0) return;
    if (!user) {
      commitDemo((prev) => {
        const map = new Map(prev.attendance.map((r) => [r.id, r]));
        for (const e of entries) {
          const id = `${e.date}_${e.studentId}`;
          map.set(id, {
            id,
            ...e,
            note: clampStr(e.note, 200),
            ownerId: 'demo-owner',
          });
        }
        return { ...prev, attendance: Array.from(map.values()) };
      });
      return;
    }

    const dojoId = user.uid;
    const existingIds = new Set(attendance.map((a) => a.id));
    const batch = writeBatch(db);
    for (const e of entries) {
      const id = `${e.date}_${e.studentId}`;
      const ref = doc(db, 'dojos', dojoId, 'attendance', id);
      const clean = {
        date: clampStr(e.date, 10),
        month: clampStr(e.month, 7),
        studentId: clampStr(e.studentId, 128),
        studentName: clampStr(e.studentName, 100),
        rollNumber: clampStr(e.rollNumber, 32),
        batchId: clampStr(e.batchId, 128),
        status: e.status,
        note: clampStr(e.note, 200),
      };
      if (existingIds.has(id)) {
        batch.update(ref, { ...clean, updatedAt: serverTimestamp() });
      } else {
        batch.set(ref, {
          ...clean,
          ownerId: dojoId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `dojos/${dojoId}/attendance`);
    }
  };

  const savePayment = async (
    input: Omit<PaymentRecord, 'id' | 'ownerId'> & { id?: string }
  ): Promise<PaymentRecord> => {
    const id = input.id || makeSafeId('pay');
    const amount = Math.max(0, Number(input.amount) || 0);
    const discount = Math.max(0, Math.min(amount, Number(input.discount) || 0));
    const netAmount = Math.max(0, amount - discount);
    const clean: Omit<PaymentRecord, 'id' | 'ownerId'> = {
      receiptNumber: clampStr(input.receiptNumber, 40),
      category: input.category,
      studentId: clampStr(input.studentId, 128),
      studentName: clampStr(input.studentName, 100),
      billingMonth: clampStr(input.billingMonth, 7),
      amount,
      discount,
      netAmount,
      method: input.method,
      paymentDate: clampStr(input.paymentDate, 10),
      status: input.status,
      notes: clampStr(input.notes, 300),
    };
    const ownerId = user ? user.uid : 'demo-owner';
    const saved: PaymentRecord = { id, ...clean, ownerId };

    if (!user) {
      commitDemo((prev) => {
        const exists = prev.payments.some((p) => p.id === id);
        return {
          ...prev,
          payments: exists
            ? prev.payments.map((p) => (p.id === id ? saved : p))
            : [saved, ...prev.payments],
        };
      });
      return saved;
    }

    const path = `dojos/${user.uid}/payments/${id}`;
    const ref = doc(db, 'dojos', user.uid, 'payments', id);
    try {
      if (input.id) {
        await updateDoc(ref, { ...clean, updatedAt: serverTimestamp() });
      } else {
        await setDoc(ref, {
          ...clean,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return saved;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!user) {
      commitDemo((prev) => ({
        ...prev,
        payments: prev.payments.filter((p) => p.id !== paymentId),
      }));
      return;
    }
    const path = `dojos/${user.uid}/payments/${paymentId}`;
    try {
      await deleteDoc(doc(db, 'dojos', user.uid, 'payments', paymentId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const saveBill = async (
    input: Omit<MonthlyBill, 'id' | 'ownerId'> & { id?: string }
  ): Promise<MonthlyBill> => {
    const id = input.id || makeSafeId('bill');
    const clean: Omit<MonthlyBill, 'id' | 'ownerId'> = {
      title: clampStr(input.title, 120),
      category: input.category,
      billingMonth: clampStr(input.billingMonth, 7),
      amount: Math.max(0, Number(input.amount) || 0),
      dueDate: clampStr(input.dueDate, 10),
      paidDate: clampStr(input.paidDate, 20),
      status: input.status,
      recurring: Boolean(input.recurring),
      vendor: clampStr(input.vendor, 100),
      notes: clampStr(input.notes, 300),
    };
    const ownerId = user ? user.uid : 'demo-owner';
    const saved: MonthlyBill = { id, ...clean, ownerId };

    if (!user) {
      commitDemo((prev) => {
        const exists = prev.bills.some((b) => b.id === id);
        return {
          ...prev,
          bills: exists
            ? prev.bills.map((b) => (b.id === id ? saved : b))
            : [saved, ...prev.bills],
        };
      });
      return saved;
    }

    const path = `dojos/${user.uid}/bills/${id}`;
    const ref = doc(db, 'dojos', user.uid, 'bills', id);
    try {
      if (input.id) {
        await updateDoc(ref, { ...clean, updatedAt: serverTimestamp() });
      } else {
        await setDoc(ref, {
          ...clean,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return saved;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const deleteBill = async (billId: string) => {
    if (!user) {
      commitDemo((prev) => ({
        ...prev,
        bills: prev.bills.filter((b) => b.id !== billId),
      }));
      return;
    }
    const path = `dojos/${user.uid}/bills/${billId}`;
    try {
      await deleteDoc(doc(db, 'dojos', user.uid, 'bills', billId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  return {
    user,
    authReady,
    isDemoMode,
    authError,
    loadingData,
    profile,
    batches,
    students,
    admissions,
    attendance,
    payments,
    bills,
    loginWithGoogle,
    logout,
    enterDemoMode,
    resetDemoData,
    loadStarterDataIntoCloud,
    updateProfile,
    saveBatch,
    deleteBatch,
    saveStudent,
    deleteStudent,
    saveOnlineAdmission,
    deleteOnlineAdmission,
    saveAttendanceBatch,
    savePayment,
    deletePayment,
    saveBill,
    deleteBill,
  };
}
