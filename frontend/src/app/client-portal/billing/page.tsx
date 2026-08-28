'use client';

import { useEffect, useState } from 'react';
import { Calendar, CreditCard, Clock, Receipt } from 'lucide-react';

const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: 'Rs', USD: '$', GBP: '£', EUR: '€', AED: 'AED', SAR: 'SAR', INR: '₹', CAD: 'C$', AUD: 'A$'
};

interface Payment {
  id: string;
  amount: number;
  periodLabel?: string | null;
  note?: string | null;
  paidAt: string;
}

interface BillingData {
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  monthsOnboard?: number | null;
  daysUntilExpiry?: number | null;
  amountCharged?: number;
  paymentStatus?: string;
  status?: string;
  currency?: string;
  payments: Payment[];
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    fetch('http://2.24.212.209/api/clients/portal/billing', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const symbol = data?.currency ? (CURRENCY_SYMBOLS[data.currency] || data.currency) : 'Rs';
  const daysLeft = data?.daysUntilExpiry ?? null;

  if (loading) {
    return <div className="text-gray-400 font-medium">Loading billing info...</div>;
  }

  if (!data) {
    return <div className="text-gray-400 font-medium">Could not load billing info.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-[#0a1142]">Billing</h2>
        <p className="text-gray-500 mt-1 font-medium">Your subscription, renewal date, and payment history.</p>
      </div>

      {daysLeft !== null && daysLeft <= 10 && (
        <div className={`rounded-2xl border p-5 font-bold text-sm ${daysLeft <= 3 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
          {daysLeft > 0
            ? `Your subscription ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Please renew soon to avoid interruption.`
            : 'Your subscription has expired. Please renew now to restore uninterrupted service.'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Onboarded Since</p>
          <p className="text-xl font-extrabold text-[#0a1142]">
            {data.subscriptionStartDate ? new Date(data.subscriptionStartDate).toLocaleDateString('en-GB') : 'N/A'}
          </p>
          <p className="text-sm text-gray-500 font-medium mt-2 flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
            {data.monthsOnboard !== null && data.monthsOnboard !== undefined
              ? `${data.monthsOnboard} month${data.monthsOnboard === 1 ? '' : 's'} with us`
              : '—'}
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Current Plan</p>
          <p className="text-xl font-extrabold text-[#0a1142]">
            {symbol} {data.amountCharged?.toLocaleString() ?? 0}
          </p>
          <p className="text-sm text-gray-500 font-medium mt-2 flex items-center">
            <CreditCard className="w-4 h-4 mr-1.5 text-gray-400" />
            {data.paymentStatus || 'UNPAID'}
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Next Renewal</p>
          <p className="text-xl font-extrabold text-[#0a1142]">
            {data.subscriptionEndDate ? new Date(data.subscriptionEndDate).toLocaleDateString('en-GB') : 'N/A'}
          </p>
          <p className="text-sm text-gray-500 font-medium mt-2 flex items-center">
            <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
            {data.status || 'ACTIVE'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center space-x-2">
          <Receipt className="w-5 h-5 text-[#d51381]" />
          <h3 className="text-lg font-bold text-[#0a1142]">Payment History</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Date</th>
              <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Period</th>
              <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Amount</th>
              <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Note</th>
            </tr>
          </thead>
          <tbody>
            {data.payments.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400 font-medium">No payment records yet.</td>
              </tr>
            ) : (
              data.payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="p-4 text-sm font-semibold text-gray-700">{new Date(p.paidAt).toLocaleDateString('en-GB')}</td>
                  <td className="p-4 text-sm text-gray-600">{p.periodLabel || '—'}</td>
                  <td className="p-4 text-sm font-bold text-[#0a1142]">{symbol} {p.amount.toLocaleString()}</td>
                  <td className="p-4 text-sm text-gray-500">{p.note || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
