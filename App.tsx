import { useMemo, useState } from 'react';
import { AdmissionsView } from './AdmissionsView';
import { AttendanceView } from './AttendanceView';
import { AuthGate } from './AuthGate';
import { BillsIncomeView } from './BillsIncomeView';
import { ClubSettingsView } from './ClubSettingsView';
import { ErrorBoundary } from './ErrorBoundary';
import { FeesView } from './FeesView';
import { MobileBottomNav } from './MobileBottomNav';
import { OfflineIndicator } from './OfflineIndicator';
import { OverviewView } from './OverviewView';
import { PublicAdmissionPage } from './PublicAdmissionPage';
import { ReceiptModal } from './ReceiptModal';
import { ReportsView } from './ReportsView';
import { Sidebar } from './Sidebar';
import { StudentsView } from './StudentsView';
import { TopBar } from './TopBar';
import { useDojoStore } from './services/dojoStore';
import type { NavSection, PaymentRecord, Student } from './types/dojo';

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function DojoWorkspace() {
  const store = useDojoStore();
  const todayDate = useMemo(() => getTodayIso(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => todayDate.slice(0, 7));
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<PaymentRecord | null>(null);
  const [preselectedStudentForFee, setPreselectedStudentForFee] = useState<Student | null>(null);
  const [publicFormMode, setPublicFormMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('apply') === '1';
  });

  if (!store.authReady && !store.isDemoMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 space-y-3 animate-pulse">
          <div className="h-5 w-44 bg-slate-200 rounded" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (!store.user && !store.isDemoMode) {
    return (
      <AuthGate
        profile={store.profile}
        authError={store.authError}
        onGoogleSignIn={store.loginWithGoogle}
        onEnterDemo={store.enterDemoMode}
      />
    );
  }

  if (publicFormMode) {
    return (
      <PublicAdmissionPage
        profile={store.profile}
        batches={store.batches}
        todayDate={todayDate}
        onSubmitApplication={(adm) => store.saveOnlineAdmission(adm)}
        onBackToDashboard={() => setPublicFormMode(false)}
      />
    );
  }

  const pendingAdmissionsCount = store.admissions.filter(
    (a) => a.applicationStatus === 'Pending'
  ).length;

  const isCloudEmpty =
    Boolean(store.user) &&
    !store.loadingData &&
    store.students.length === 0 &&
    store.payments.length === 0 &&
    store.bills.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        profile={store.profile}
        pendingAdmissionsCount={pendingAdmissionsCount}
        isDemoMode={store.isDemoMode}
        userEmail={store.user?.email ?? null}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onLogout={store.logout}
        onGoogleSignIn={store.loginWithGoogle}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          profile={store.profile}
          activeSection={activeSection}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onNewAdmission={() => setActiveSection('admissions')}
          onOpenSettings={() => setActiveSection('settings')}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-[1440px] w-full mx-auto">
          {store.loadingData && store.user ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-4">
              <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-24 w-full bg-slate-100 rounded animate-pulse" />
            </div>
          ) : (
            <>
              {activeSection === 'overview' && (
                <OverviewView
                  profile={store.profile}
                  batches={store.batches}
                  students={store.students}
                  admissions={store.admissions}
                  attendance={store.attendance}
                  payments={store.payments}
                  bills={store.bills}
                  selectedMonth={selectedMonth}
                  todayDate={todayDate}
                  onNavigate={setActiveSection}
                  onQuickCollectFee={(student) => {
                    setPreselectedStudentForFee(student);
                    setActiveSection('fees');
                  }}
                  onQuickPayBill={(bill) =>
                    store.saveBill({
                      ...bill,
                      status: 'Paid',
                      paidDate: todayDate,
                    })
                  }
                  onLoadStarterData={store.loadStarterDataIntoCloud}
                  isCloudEmpty={isCloudEmpty}
                />
              )}

              {activeSection === 'admissions' && (
                <AdmissionsView
                  profile={store.profile}
                  batches={store.batches}
                  students={store.students}
                  admissions={store.admissions}
                  payments={store.payments}
                  todayDate={todayDate}
                  onSaveStudent={store.saveStudent}
                  onSavePayment={store.savePayment}
                  onSaveOnlineAdmission={store.saveOnlineAdmission}
                  onDeleteOnlineAdmission={store.deleteOnlineAdmission}
                  onOpenReceipt={(p) => setActiveReceipt(p)}
                  onOpenPublicFormMode={() => setPublicFormMode(true)}
                />
              )}

              {activeSection === 'students' && (
                <StudentsView
                  profile={store.profile}
                  batches={store.batches}
                  students={store.students}
                  attendance={store.attendance}
                  payments={store.payments}
                  selectedMonth={selectedMonth}
                  todayDate={todayDate}
                  onSaveStudent={store.saveStudent}
                  onDeleteStudent={store.deleteStudent}
                  onCollectFee={(student) => {
                    setPreselectedStudentForFee(student);
                    setActiveSection('fees');
                  }}
                  onGoToAdmission={() => setActiveSection('admissions')}
                />
              )}

              {activeSection === 'attendance' && (
                <AttendanceView
                  batches={store.batches}
                  students={store.students}
                  attendance={store.attendance}
                  todayDate={todayDate}
                  selectedMonth={selectedMonth}
                  onSaveAttendanceBatch={store.saveAttendanceBatch}
                />
              )}

              {activeSection === 'fees' && (
                <FeesView
                  profile={store.profile}
                  batches={store.batches}
                  students={store.students}
                  payments={store.payments}
                  selectedMonth={selectedMonth}
                  onChangeMonth={setSelectedMonth}
                  todayDate={todayDate}
                  onSavePayment={store.savePayment}
                  onDeletePayment={store.deletePayment}
                  onOpenReceipt={(p) => setActiveReceipt(p)}
                  preselectedStudentForFee={preselectedStudentForFee}
                  onClearPreselectedStudent={() => setPreselectedStudentForFee(null)}
                />
              )}

              {activeSection === 'finance' && (
                <BillsIncomeView
                  profile={store.profile}
                  payments={store.payments}
                  bills={store.bills}
                  selectedMonth={selectedMonth}
                  onChangeMonth={setSelectedMonth}
                  todayDate={todayDate}
                  onSaveBill={store.saveBill}
                  onDeleteBill={store.deleteBill}
                  onSavePayment={store.savePayment}
                  onDeletePayment={store.deletePayment}
                />
              )}

              {activeSection === 'reports' && (
                <ReportsView
                  profile={store.profile}
                  batches={store.batches}
                  students={store.students}
                  attendance={store.attendance}
                  payments={store.payments}
                  bills={store.bills}
                  selectedMonth={selectedMonth}
                  onChangeMonth={setSelectedMonth}
                  todayDate={todayDate}
                />
              )}

              {activeSection === 'settings' && (
                <ClubSettingsView
                  profile={store.profile}
                  batches={store.batches}
                  isDemoMode={store.isDemoMode}
                  onUpdateProfile={store.updateProfile}
                  onSaveBatch={store.saveBatch}
                  onDeleteBatch={store.deleteBatch}
                  onResetDemoData={store.resetDemoData}
                />
              )}
            </>
          )}
        </main>
      </div>

      <MobileBottomNav
        activeSection={activeSection}
        pendingAdmissionsCount={pendingAdmissionsCount}
        onSelectSection={setActiveSection}
        onOpenMoreMenu={() => setMobileNavOpen(true)}
      />

      <OfflineIndicator />

      {activeReceipt && (
        <ReceiptModal
          profile={store.profile}
          payment={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DojoWorkspace />
    </ErrorBoundary>
  );
}
