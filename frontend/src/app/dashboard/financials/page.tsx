'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, AlertTriangle, CheckCircle, FileText, TrendingUp, CreditCard, Receipt } from 'lucide-react';

const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: 'Rs', USD: '$', GBP: '£', EUR: '€', AED: 'AED', SAR: 'SAR', INR: '₹', CAD: 'C$', AUD: 'A$'
};

interface FinClient {
  id: string;
  companyName: string;
  currency?: string;
  monthlyRate?: number;
  installationCharge?: number;
  paymentStatus?: string;
  subscriptionEndDate?: string;
  amountCharged?: number;
  totalCollected?: number;
}

interface Payment {
  id: string;
  clientId: string;
  amount: number;
  periodLabel?: string;
  note?: string;
  paidAt: string;
  client?: { companyName?: string; currency?: string };
}

export default function FinancialsPage() {
  const [data, setData] = useState<{ clients: FinClient[]; invoices: any[]; payments: Payment[]; totalsByCurrency: Record<string, number> }>({
    clients: [], invoices: [], payments: [], totalsByCurrency: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancials();
  }, []);

  const fetchFinancials = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://2.24.212.209/api/financials', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch financials', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (clientId: string, currency: string) => {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    const amountStr = prompt(`Enter payment amount to record for this client (${symbol}):`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid amount');
      return;
    }

    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`http://2.24.212.209/api/clients/${clientId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount, note: 'Recorded via Financials Dashboard' })
      });
      if (res.ok) {
        alert('Payment recorded and subscription renewed!');
        fetchFinancials();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Payment error', error);
    }
  };

  const defaultedClients = data.clients.filter((c) => c.paymentStatus !== 'PAID');
  const currencyEntries = Object.entries(data.totalsByCurrency || {});

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-[#0a1142]">Financials & Billing</h2>
        <p className="text-gray-500 mt-1 font-medium">Manage cash flow, defaulted subscriptions, and per-client billing — broken down by each client&apos;s own currency.</p>
      </div>

      {/* Revenue by currency */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-gradient-to-br from-[#0a1142] to-[#1a2575] p-6 rounded-2xl shadow-xl shadow-blue-900/20 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-blue-200">Revenue Collected</h3>
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          {loading ? (
            <p className="text-blue-200 text-sm">Loading...</p>
          ) : currencyEntries.length === 0 ? (
            <p className="text-xl font-extrabold">No payments recorded yet</p>
          ) : (
            <div className="space-y-1">
              {currencyEntries.map(([code, total]) => (
                <p key={code} className="text-2xl font-extrabold">
                  {CURRENCY_SYMBOLS[code] || code} {total.toLocaleString()}
                  <span className="text-xs font-semibold text-blue-200 ml-2">{code}</span>
                </p>
              ))}
            </div>
          )}
          <p className="text-sm text-blue-200 mt-3 flex items-center">
            <CheckCircle className="w-4 h-4 mr-1 flex-shrink-0" /> Grouped by each client&apos;s currency — never mixed
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-500">Defaulted / Unpaid Clients</h3>
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <p className="text-4xl font-extrabold text-[#0a1142]">{defaultedClients.length}</p>
          <p className="text-sm text-gray-500 mt-2">Action required</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-500">Payments Recorded</h3>
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
              <Receipt className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-4xl font-extrabold text-[#0a1142]">{data.payments.length}</p>
          <p className="text-sm text-gray-500 mt-2">Across all clients</p>
        </div>
      </div>

      {/* Per-client billing overview */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-[#0a1142] flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-gray-500" /> Per-Client Billing Overview
          </h3>
          <p className="text-sm text-gray-500">Currency, monthly rate, installation charge, and total collected — per client.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-white">
                <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Client</th>
                <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Currency</th>
                <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Monthly Rate</th>
                <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Installation Charge</th>
                <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Total Collected</th>
                <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Loading...</td></tr>
              ) : data.clients.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No clients yet.</td></tr>
              ) : data.clients.map((c) => {
                const symbol = CURRENCY_SYMBOLS[c.currency || 'PKR'] || c.currency;
                return (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4 font-bold text-[#0a1142] text-sm">{c.companyName}</td>
                    <td className="p-4 text-sm font-semibold text-gray-600">{c.currency || 'PKR'}</td>
                    <td className="p-4 text-sm font-semibold text-gray-700">{c.monthlyRate != null ? `${symbol} ${c.monthlyRate.toLocaleString()}` : '—'}</td>
                    <td className="p-4 text-sm font-semibold text-gray-700">{c.installationCharge != null ? `${symbol} ${c.installationCharge.toLocaleString()}` : '—'}</td>
                    <td className="p-4 text-sm font-bold text-emerald-600">{symbol} {(c.totalCollected || 0).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
                        c.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {c.paymentStatus || 'UNPAID'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleRecordPayment(c.id, c.currency || 'PKR')}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-emerald-200 text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors font-bold text-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Record Payment</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Defaulted Customers List */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col h-[500px]">
          <div className="p-6 border-b border-gray-100 bg-red-50/30">
            <h3 className="text-lg font-bold text-[#0a1142] flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-500" /> Defaulted Customers
            </h3>
            <p className="text-sm text-gray-500">Clients pending payment or in grace period.</p>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-center text-gray-400 py-8">Loading...</p>
            ) : defaultedClients.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">All clients are fully paid up.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {defaultedClients.map((client) => (
                  <div key={client.id} className="p-4 border border-red-100 rounded-xl bg-red-50 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#0a1142]">{client.companyName}</p>
                      <p className="text-sm text-red-600 font-medium mt-1">Status: {client.paymentStatus}</p>
                    </div>
                    <button
                      onClick={() => handleRecordPayment(client.id, client.currency || 'PKR')}
                      className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-bold text-sm shadow-sm"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Record Payment</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment ledger */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col h-[500px]">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-bold text-[#0a1142] flex items-center">
              <FileText className="w-5 h-5 mr-2 text-gray-500" /> Payment Ledger
            </h3>
            <p className="text-sm text-gray-500">Every payment recorded, in the client&apos;s own currency.</p>
          </div>
          <div className="p-0 flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Client</th>
                  <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Amount</th>
                  <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Period</th>
                  <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-400">Loading...</td></tr>
                ) : data.payments.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">No payments yet.</td></tr>
                ) : data.payments.map((p) => {
                  const symbol = CURRENCY_SYMBOLS[p.client?.currency || 'PKR'] || p.client?.currency;
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="p-4 font-bold text-[#0a1142] text-sm">{p.client?.companyName}</td>
                      <td className="p-4 font-bold text-emerald-600 text-sm">{symbol} {p.amount.toLocaleString()}</td>
                      <td className="p-4 text-sm text-gray-500">{p.periodLabel || '—'}</td>
                      <td className="p-4 text-sm text-gray-500">{new Date(p.paidAt).toLocaleDateString('en-GB')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
