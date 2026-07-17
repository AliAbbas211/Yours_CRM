'use client';

import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, ShieldCheck, ShieldOff, UserCircle, CheckCircle2 } from 'lucide-react';

interface Contact {
  remoteJid: string;
  name: string;
  profilePicUrl: string | null;
  isWhitelisted: boolean;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'WHITELISTED' | 'NOT_WHITELISTED'>('ALL');
  const [error, setError] = useState('');
  const [togglingJid, setTogglingJid] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setError('');
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/contacts/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setContacts(await res.json());
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to load contacts. Make sure WhatsApp is connected first.');
      }
    } catch (err) {
      console.error('Failed to fetch contacts', err);
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchContacts();
  };

  const toggleWhitelist = async (contact: Contact) => {
    setTogglingJid(contact.remoteJid);
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/contacts/whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          remoteJid: contact.remoteJid,
          name: contact.name,
          profilePicUrl: contact.profilePicUrl,
          isWhitelisted: !contact.isWhitelisted
        })
      });
      if (res.ok) {
        setContacts(contacts.map((c) => c.remoteJid === contact.remoteJid ? { ...c, isWhitelisted: !c.isWhitelisted } : c));
      }
    } catch (err) {
      console.error('Failed to toggle whitelist', err);
    } finally {
      setTogglingJid(null);
    }
  };

  const filtered = contacts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.remoteJid.includes(search);
    const matchesFilter =
      filter === 'ALL' ? true :
      filter === 'WHITELISTED' ? c.isWhitelisted :
      !c.isWhitelisted;
    return matchesSearch && matchesFilter;
  });

  const whitelistedCount = contacts.filter((c) => c.isWhitelisted).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0a1142]">WhatsApp Contacts & Whitelist</h2>
          <p className="text-gray-500 mt-1 font-medium">
            Your AI bot only replies to whitelisted numbers. Connect WhatsApp first, then refresh to pull your contact list.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 bg-[#0a1142] hover:bg-[#131b54] text-white px-4 py-2.5 rounded-xl transition-all shadow-lg font-semibold disabled:opacity-60"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Contacts</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Total Contacts</p>
            <p className="text-2xl font-extrabold text-[#0a1142]">{contacts.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Whitelisted</p>
            <p className="text-2xl font-extrabold text-emerald-600">{whitelistedCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center">
            <ShieldOff className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Not Whitelisted</p>
            <p className="text-2xl font-extrabold text-gray-500">{contacts.length - whitelistedCount}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="flex items-center space-x-4">
        <div className="flex-1 bg-white p-3 rounded-xl border border-gray-100 flex items-center shadow-sm">
          <Search className="w-5 h-5 text-gray-400 ml-2 mr-3" />
          <input
            type="text"
            placeholder="Search by name or number..."
            className="w-full outline-none text-gray-700 font-medium bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-white border border-gray-100 rounded-xl p-3 font-bold text-[#0a1142] shadow-sm outline-none focus:border-[#d51381]"
        >
          <option value="ALL">All Contacts</option>
          <option value="WHITELISTED">Whitelisted Only</option>
          <option value="NOT_WHITELISTED">Not Whitelisted</option>
        </select>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400 font-medium">Loading contacts...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-bold">No contacts found.</p>
            <p className="text-sm mt-1">Make sure WhatsApp is connected (see WhatsApp Connect page), then click "Refresh Contacts".</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-5 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Contact</th>
                <th className="p-5 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Number</th>
                <th className="p-5 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Bot Access</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.remoteJid} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-5">
                    <div className="flex items-center space-x-3">
                      {c.profilePicUrl ? (
                        <img src={c.profilePicUrl} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                          <UserCircle className="w-6 h-6" />
                        </div>
                      )}
                      <p className="font-bold text-[#0a1142]">{c.name}</p>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="text-sm font-mono text-gray-500">{c.remoteJid.split('@')[0]}</span>
                  </td>
                  <td className="p-5">
                    <button
                      onClick={() => toggleWhitelist(c)}
                      disabled={togglingJid === c.remoteJid}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full border-2 transition-colors font-bold text-sm ${
                        c.isWhitelisted ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-500'
                      } ${togglingJid === c.remoteJid ? 'opacity-50' : 'hover:opacity-80'}`}
                    >
                      {c.isWhitelisted ? <CheckCircle2 className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                      <span>{c.isWhitelisted ? 'Whitelisted' : 'Blocked'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
