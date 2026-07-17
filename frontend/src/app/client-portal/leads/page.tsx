'use client';

import React, { useState, useEffect } from 'react';
import { Search, Bot, Phone, Mail, Clock, ShieldAlert, CheckCircle, Activity, User, MessageCircle } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/leads', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (error) {
      console.error('Failed to fetch leads', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBot = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`http://localhost:5000/api/leads/${id}/bot`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ botEnabled: !currentStatus })
      });
      
      if (res.ok) {
        setLeads(leads.map(lead => lead.id === id ? { ...lead, botEnabled: !currentStatus } : lead));
      }
    } catch (error) {
      console.error('Failed to toggle bot', error);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(search.toLowerCase()) || 
                          lead.phoneNumber.includes(search);
    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0a1142]">Acquired Leads</h2>
          <p className="text-gray-500 mt-1 font-medium">Manage your potential customers interacting with your WhatsApp AI.</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1 bg-white p-3 rounded-xl border border-gray-100 flex items-center shadow-sm">
          <Search className="w-5 h-5 text-gray-400 ml-2 mr-3" />
          <input 
            type="text" 
            placeholder="Search leads by name or phone number..." 
            className="w-full outline-none text-gray-700 font-medium bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-gray-100 rounded-xl p-3 font-bold text-[#0a1142] shadow-sm outline-none focus:border-[#d51381]"
        >
          <option value="ALL">All Statuses</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="CONVERTED">Converted</option>
          <option value="LOST">Lost</option>
        </select>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="p-5 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Lead Identity</th>
              <th className="p-5 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Contact Info</th>
              <th className="p-5 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Interest & Summary</th>
              <th className="p-5 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Potential Value</th>
              <th className="p-5 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Status</th>
              <th className="p-5 font-bold text-[#899bb1] text-xs uppercase tracking-wider">AI Bot</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gray-400 font-medium">Loading leads...</td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-16 text-center text-gray-500">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-bold">No leads found.</p>
                  <p className="text-sm">Wait for users to message your WhatsApp instance.</p>
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-[#0a1142]">{lead.name}</p>
                        {lead.companyName ? (
                          <p className="text-xs text-gray-500 font-medium flex items-center mt-0.5">
                            <Activity className="w-3 h-3 mr-1" /> {lead.companyName}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-0.5">Source: {lead.source || 'WhatsApp'}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center text-sm font-medium text-gray-600">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" /> {lead.phoneNumber}
                      </div>
                      {lead.email && (
                        <div className="flex items-center text-sm font-medium text-gray-600">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" /> {lead.email}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="p-5 max-w-xs">
                    <div className="space-y-1">
                      {lead.interestedService ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-600">
                          {lead.interestedService}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No specific service</span>
                      )}
                      {lead.summary && (
                        <p className="text-xs text-gray-500 font-medium line-clamp-2 mt-1" title={lead.summary}>
                          {lead.summary}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="p-5">
                    <div className="font-bold text-[#0a1142]">
                      {lead.potentialValue ? `$${lead.potentialValue.toLocaleString()}` : '-'}
                    </div>
                  </td>

                  <td className="p-5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
                      lead.status === 'NEW' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      lead.status === 'QUALIFIED' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                      lead.status === 'CONVERTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {lead.status}
                    </span>
                  </td>

                  <td className="p-5">
                    <div className={`flex items-center space-x-3 px-3 py-1.5 rounded-full border-2 w-max transition-colors ${lead.botEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center space-x-1.5">
                        <Bot className={`w-4 h-4 ${lead.botEnabled ? 'text-emerald-500' : 'text-gray-400'}`} />
                      </div>
                      <button 
                        onClick={() => toggleBot(lead.id, lead.botEnabled)}
                        className={`w-10 h-5 rounded-full flex items-center transition-colors p-0.5 ${lead.botEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${lead.botEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
