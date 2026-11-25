export type BeltRank =
  | 'White'
  | 'Yellow'
  | 'Orange'
  | 'Green'
  | 'Blue'
  | 'Purple'
  | 'Brown'
  | 'Black';

export const BELT_RANKS: BeltRank[] = [
  'White',
  'Yellow',
  'Orange',
  'Green',
  'Blue',
  'Purple',
  'Brown',
  'Black',
];

export const BELT_SWATCH_CLASSES: Record<BeltRank, { bg: string; border: string; label: string }> = {
  White: { bg: 'bg-white', border: 'border-slate-300', label: 'White (10th Kyu)' },
  Yellow: { bg: 'bg-amber-300', border: 'border-amber-400', label: 'Yellow (9th Kyu)' },
  Orange: { bg: 'bg-orange-500', border: 'border-orange-600', label: 'Orange (8th Kyu)' },
  Green: { bg: 'bg-emerald-600', border: 'border-emerald-700', label: 'Green (6th Kyu)' },
  Blue: { bg: 'bg-blue-600', border: 'border-blue-700', label: 'Blue (5th Kyu)' },
  Purple: { bg: 'bg-purple-600', border: 'border-purple-700', label: 'Purple (4th Kyu)' },
  Brown: { bg: 'bg-amber-800', border: 'border-amber-900', label: 'Brown (3rd–1st Kyu)' },
  Black: { bg: 'bg-slate-950', border: 'border-slate-950', label: 'Black (Dan)' },
};

export type Gender = 'Male' | 'Female' | 'Other';
export type StudentStatus = 'Active' | 'On Leave' | 'Inactive';
export type ApplicationStatus = 'Pending' | 'Approved' | 'Rejected';
export type AttendanceStatus = 'Present' | 'Absent' | 'Late';

export type PaymentCategory =
  | 'Monthly Fee'
  | 'Admission Fee'
  | 'Belt Exam'
  | 'Uniform & Gear'
  | 'Tournament'
  | 'Private Coaching'
  | 'Other Income';

export const PAYMENT_CATEGORIES: PaymentCategory[] = [
  'Monthly Fee',
  'Admission Fee',
  'Belt Exam',
  'Uniform & Gear',
  'Tournament',
  'Private Coaching',
  'Other Income',
];

export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Mobile / UPI';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Card',
  'Bank Transfer',
  'Mobile / UPI',
];

export type PaymentStatus = 'Paid' | 'Partial';

export type BillCategory =
  | 'Dojo Rent'
  | 'Instructor Salary'
  | 'Utilities'
  | 'Equipment & Mats'
  | 'Marketing'
  | 'Maintenance'
  | 'Other';

export const BILL_CATEGORIES: BillCategory[] = [
  'Dojo Rent',
  'Instructor Salary',
  'Utilities',
  'Equipment & Mats',
  'Marketing',
  'Maintenance',
  'Other',
];

export type BillStatus = 'Paid' | 'Pending';

export interface DojoProfile {
  id: string;
  name: string;
  tagline: string;
  senseiName: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  defaultAdmissionFee: number;
  defaultMonthlyFee: number;
  logoDataUrl: string;
  ownerId: string;
}

export interface DojoBatch {
  id: string;
  name: string;
  schedule: string;
  instructor: string;
  monthlyFee: number;
  capacity: number;
  ownerId: string;
}

export interface Student {
  id: string;
  rollNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  guardianName: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  batchId: string;
  batchName: string;
  beltRank: BeltRank;
  admissionDate: string;
  admissionFee: number;
  monthlyFee: number;
  status: StudentStatus;
  medicalNotes: string;
  lastPromotedDate: string;
  ownerId: string;
}

export interface OnlineAdmission {
  id: string;
  applicantName: string;
  dateOfBirth: string;
  gender: Gender;
  guardianName: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  preferredBatchId: string;
  preferredBatchName: string;
  previousExperience: string;
  medicalNotes: string;
  applicationStatus: ApplicationStatus;
  submittedDate: string;
  ownerId: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  month: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  batchId: string;
  status: AttendanceStatus;
  note: string;
  ownerId: string;
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  category: PaymentCategory;
  studentId: string;
  studentName: string;
  billingMonth: string;
  amount: number;
  discount: number;
  netAmount: number;
  method: PaymentMethod;
  paymentDate: string;
  status: PaymentStatus;
  notes: string;
  ownerId: string;
}

export interface MonthlyBill {
  id: string;
  title: string;
  category: BillCategory;
  billingMonth: string;
  amount: number;
  dueDate: string;
  paidDate: string;
  status: BillStatus;
  recurring: boolean;
  vendor: string;
  notes: string;
  ownerId: string;
}

export type NavSection =
  | 'overview'
  | 'admissions'
  | 'students'
  | 'attendance'
  | 'fees'
  | 'finance'
  | 'reports'
  | 'settings';
