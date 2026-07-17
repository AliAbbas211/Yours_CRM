'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Database, Sparkles, Activity, PhoneCall, ArrowRight, MessageCircle } from 'lucide-react';

export default function ClientDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/clients/portal/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-[#0a1142] font-bold">Loading your dashboard...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl">
      {/* Top Welcome Section */}
      <div className="bg-gradient-to-r from-[#0a1142] to-[#1a2575] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold mb-2">Welcome to your Portal!</h2>
          <p className="text-blue-100 font-medium max-w-2xl">
            Here is an overview of how your AI Agent is performing today. Track new leads, monitor connections, and manage your AI's knowledge base.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Leads Card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Leads</p>
            <p className="text-3xl font-extrabold text-[#0a1142]">{stats?.totalLeads || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        {/* New Leads Card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">New Leads</p>
            <p className="text-3xl font-extrabold text-[#d51381]">{stats?.newLeads || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-[#d51381]" />
          </div>
        </div>

        {/* KB Docs Card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Knowledge Docs</p>
            <p className="text-3xl font-extrabold text-[#0a1142]">{stats?.totalKbDocs || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
            <Database className="w-6 h-6 text-purple-600" />
          </div>
        </div>

        {/* Bot Status Card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Engine Status</p>
            <p className="text-xl font-extrabold text-[#0a1142] mt-2">
              {stats?.botStatus === 'ONLINE' ? (
                <span className="text-emerald-500 flex items-center"><Activity className="w-5 h-5 mr-1" /> ONLINE</span>
              ) : (
                <span className="text-red-500 flex items-center">OFFLINE</span>
              )}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
            <MessageCircle className={`w-6 h-6 ${stats?.botStatus === 'ONLINE' ? 'text-emerald-600' : 'text-gray-400'}`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Leads Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0a1142] flex items-center">
              <PhoneCall className="w-5 h-5 mr-2 text-[#d51381]" /> Recent Leads
            </h3>
            <Link href="/client-portal/leads" className="text-sm font-bold text-[#d51381] hover:text-[#0a1142] flex items-center transition-colors">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="p-0">
            {stats?.recentLeads?.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-8 py-4">Name</th>
                    <th className="px-8 py-4">Contact</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.recentLeads.map((lead: any) => (
                    <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-4 font-bold text-[#0a1142]">{lead.name}</td>
                      <td className="px-8 py-4 text-gray-500 font-medium">{lead.phoneNumber}</td>
                      <td className="px-8 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          lead.status === 'NEW' ? 'bg-pink-100 text-pink-700' :
                          lead.status === 'CONVERTED' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-gray-400 font-medium text-sm">
                        {new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500 font-medium">
                No leads captured yet.
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:border-[#d51381]/30 transition-colors">
            <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center mb-4 text-[#d51381] group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-[#0a1142] mb-2">WhatsApp Engine</h4>
            <p className="text-sm text-gray-500 font-medium mb-4">
              Connect your business number and configure automated AI responses.
            </p>
            <Link href="/client-portal/whatsapp" className="inline-flex items-center text-sm font-bold text-[#d51381] hover:text-[#0a1142]">
              Configure Connection <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:border-purple-500/30 transition-colors">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-4 text-purple-600 group-hover:scale-110 transition-transform">
              <Database className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-[#0a1142] mb-2">Train your AI</h4>
            <p className="text-sm text-gray-500 font-medium mb-4">
              Upload FAQs and documents to make your AI Agent smarter.
            </p>
            <Link href="/client-portal/knowledge-base" className="inline-flex items-center text-sm font-bold text-purple-600 hover:text-[#0a1142]">
              Manage Knowledge Base <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
