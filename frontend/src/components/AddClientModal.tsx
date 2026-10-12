'use client';

import React, { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddClientModal({ isOpen, onClose, onSuccess }: AddClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 Form State
  const [formData, setFormData] = useState({
    ownerName: '',
    companyName: '',
    phoneNumber: '',
    address: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ownerName || !formData.companyName || !formData.email || !formData.password) {
      setError('Please fill out all required fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('crm_token');
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create client');
      }

      onSuccess();
      onClose();
      // Reset form
      setFormData({ ownerName: '', companyName: '', phoneNumber: '', address: '', email: '', password: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-bold text-[#0a1142]">Onboard New Client</h2>
            <p className="text-gray-500 text-sm mt-1">
              Client Information & Credentials
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-8 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-medium flex items-center">
              <X className="w-5 h-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {(
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Owner Name *</label>
                  <input type="text" name="ownerName" value={formData.ownerName} onChange={handleChange} required
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-0 transition-colors font-medium text-gray-800" placeholder="John Doe" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Company Name *</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} required
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-0 transition-colors font-medium text-gray-800" placeholder="Acme Corp" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone Number</label>
                  <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-0 transition-colors font-medium text-gray-800" placeholder="+1 234 567 890" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Address</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-0 transition-colors font-medium text-gray-800" placeholder="123 Main St" />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-bold text-[#0a1142] mb-4">Login Credentials</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address *</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-0 transition-colors font-medium text-gray-800" placeholder="client@example.com" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password *</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} required
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-0 transition-colors font-medium text-gray-800" placeholder="••••••••" />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <button type="button" onClick={onClose} disabled={loading} className="px-6 py-2.5 rounded-xl text-gray-600 font-semibold hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading} className="px-8 py-2.5 rounded-xl bg-[#d51381] text-white font-semibold hover:bg-[#b00e6a] transition-all flex items-center shadow-lg shadow-pink-500/30 disabled:opacity-70">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
            {loading ? 'Creating...' : 'Create Client'}
          </button>
        </div>

      </div>
    </div>
  );
}
