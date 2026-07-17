'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Plus, Trash2, UserCog, Mail } from 'lucide-react';

export default function TeamPage() {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'MANAGER' });

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/team', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeam(data);
      }
    } catch (error) {
      console.error('Failed to fetch team', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/team', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ email: '', password: '', role: 'MANAGER' });
        fetchTeam();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create');
      }
    } catch (error) {
      console.error('Create error', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`http://localhost:5000/api/team/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchTeam();
      }
    } catch (error) {
      console.error('Delete error', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0a1142]">Internal Team</h2>
          <p className="text-gray-500 mt-1 font-medium">Manage your agency staff and their access levels.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-[#0a1142] hover:bg-[#152066] text-white px-4 py-2.5 rounded-xl transition-all shadow-lg font-semibold"
        >
          <Plus className="w-5 h-5" />
          <span>Add Employee</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#0a1142]">Super Admin</h3>
            <p className="text-sm text-gray-500">Full system access</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <UserCog className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#0a1142]">Manager</h3>
            <p className="text-sm text-gray-500">Billing & Clients only</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#0a1142]">Support</h3>
            <p className="text-sm text-gray-500">KB & Leads only</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Staff Member</th>
              <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Role Access</th>
              <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">Joined Date</th>
              <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400">Loading team...</td>
              </tr>
            ) : team.map(member => (
              <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="p-4 font-bold text-[#0a1142]">{member.email}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                    member.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                    member.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {member.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-500">{new Date(member.createdAt).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  {member.role !== 'SUPER_ADMIN' && (
                    <button onClick={() => handleDelete(member.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-xl font-bold text-[#0a1142] mb-4">Add Employee</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#d51381]" placeholder="staff@adwise.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
                <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#d51381]" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Assign Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#d51381]">
                  <option value="MANAGER">Manager (Billing & Clients)</option>
                  <option value="SUPPORT">Support (KB & Leads)</option>
                  <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-semibold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 font-semibold bg-[#d51381] text-white rounded-xl shadow-lg hover:bg-[#b00e6a]">Create Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
