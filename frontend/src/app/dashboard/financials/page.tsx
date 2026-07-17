'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, AlertTriangle, CheckCircle, FileText, TrendingUp, CreditCard } from 'lucide-react';

export default function FinancialsPage() {
  const [data, setData] = useState({ clients: [], invoices: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancials();
  }, []);

  const fetchFinancials = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/financials', {
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

  const handleProcessPayment = async (clientId: string) => {
    const amountStr = prompt('Enter payment amount to process for this client:');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid amount');
      return;
    }

    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/financials/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ clientId, amount, notes: 'Processed manually via Admin Dashboard' })
      });
      if (res.ok) {
        alert('Payment processed and invoice generated!');
        fetchFinancials();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Payment error', error);
    }
  };

  const defaultedClients = data.clients.filter((c: any) => c.paymentStatus !== 'PAID');
  const totalRevenue = data.invoices.reduce((sum: number, inv: any) => sum + inv.amount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-[#0a1142]">Financials & Billing</h2>
        <p className="text-gray-500 mt-1 font-medium">Manage cash flow, defaulted subscriptions, and invoices.</p>
      </div>

      {/* Revenue Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-[#0a1142] to-[#1a2575] p-6 rounded-2xl shadow-xl shadow-blue-900/20 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-blue-200">Total Revenue Collected</h3>
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-4xl font-extrabold">${totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-blue-200 mt-2 flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" /> All-time collections
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
            <h3 className="font-bold text-gray-500">Invoices Generated</h3>
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-4xl font-extrabold text-[#0a1142]">{data.invoices.length}</p>
          <p className="text-sm text-gray-500 mt-2">Auto-generated pdf records</p>
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
                {defaultedClients.map((client: any) => (
                  <div key={client.id} className="p-4 border border-red-100 rounded-xl bg-red-50 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#0a1142]">{client.companyName}</p>
                      <p className="text-sm text-red-600 font-medium mt-1">Status: {client.paymentStatus}</p>
                    </div>
                    <button 
                      onClick={() => handleProcessPayment(client.id)}
                      className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-bold text-sm shadow-sm"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Process Payment</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col h-[500px]">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-bold text-[#0a1142] flex items-center">
              <FileText className="w-5 h-5 mr-2 text-gray-500" /> Payment Reports
            </h3>
            <p className="text-sm text-gray-500">History of all processed payments.</p>
          </div>
          <div className="p-0 flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Invoice</th>
                  <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Client</th>
                  <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Amount</th>
                  <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-400">Loading...</td></tr>
                ) : data.invoices.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">No invoices yet.</td></tr>
                ) : data.invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4 font-mono text-sm text-gray-600">{inv.invoiceNumber}</td>
                    <td className="p-4 font-bold text-[#0a1142]">{inv.client?.companyName}</td>
                    <td className="p-4 font-bold text-emerald-600">${inv.amount}</td>
                    <td className="p-4 text-sm text-gray-500">{new Date(inv.paymentDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
