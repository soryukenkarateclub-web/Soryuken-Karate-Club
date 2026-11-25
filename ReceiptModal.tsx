import { Printer, X } from 'lucide-react';
import type { DojoProfile, PaymentRecord } from '../types/dojo';
import { formatCurrency, formatMonthLabel } from '../utils/dojoLogic';
import { DEFAULT_DOJO_EMBLEM } from '../utils/seedData';

interface ReceiptModalProps {
  profile: DojoProfile;
  payment: PaymentRecord;
  onClose: () => void;
}

export function ReceiptModal({ profile, payment, onClose }: ReceiptModalProps) {
  const logoSrc = profile.logoDataUrl || DEFAULT_DOJO_EMBLEM;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden print-surface">
        <div className="no-print px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="receipt-modal-title" className="font-display text-base font-bold text-slate-900">
            Official Fee Receipt
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close receipt modal"
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <img
                src={logoSrc}
                alt={`${profile.name} emblem`}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-lg object-cover border border-slate-200"
              />
              <div>
                <p className="font-display text-lg font-bold text-slate-900">{profile.name}</p>
                <p className="text-xs text-slate-500">{profile.address}</p>
                <p className="text-xs text-slate-500">{profile.phone}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Receipt No.</p>
              <p className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                {payment.receiptNumber}
              </p>
              <p className="text-xs font-mono tabular-nums text-slate-500 mt-1">
                {payment.paymentDate}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">Received From</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {payment.studentName || 'General Dojo Income'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Billing Period</p>
              <p className="font-medium text-slate-900 mt-0.5">
                {formatMonthLabel(payment.billingMonth)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Payment Category</p>
              <p className="font-medium text-slate-900 mt-0.5">{payment.category}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Method &amp; Status</p>
              <p className="font-medium text-slate-900 mt-0.5">
                {payment.method} · {payment.status}
              </p>
            </div>
          </div>

          <div className="border-t border-b border-slate-200 py-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Gross Fee Amount</span>
              <span className="font-mono tabular-nums text-slate-900">
                {formatCurrency(payment.amount, profile.currency)}
              </span>
            </div>
            {payment.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Discount Applied</span>
                <span className="font-mono tabular-nums text-emerald-700">
                  -{formatCurrency(payment.discount, profile.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-100 font-bold text-base">
              <span className="text-slate-900">Total Paid</span>
              <span className="font-mono tabular-nums text-slate-900">
                {formatCurrency(payment.netAmount, profile.currency)}
              </span>
            </div>
          </div>

          {payment.notes && (
            <p className="text-xs text-slate-600">
              <span className="font-medium text-slate-800">Note:</span> {payment.notes}
            </p>
          )}

          <div className="pt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Authorized by {profile.senseiName}</span>
            <span>Thank you for training at {profile.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
