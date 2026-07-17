'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, Globe, Settings, Zap, Link as LinkIcon, User, Building2, Mail, Phone, MapPin } from 'lucide-react';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client: any | null;
}

export default function EditClientModal({ isOpen, onClose, onSuccess, client }: EditClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'config'>('profile');

  const [formData, setFormData] = useState({
    ownerName: '',
    companyName: '',
    phoneNumber: '',
    address: '',
    email: '',
    instanceName: '',
    evolutionApiUrl: '',
    evolutionApiKey: '',
    n8nWebhookUrl: '',
    status: 'ACTIVE',
    paymentStatus: 'UNPAID'
  });

  useEffect(() => {
    if (client) {
      setFormData({
        ownerName: client.ownerName || '',
        companyName: client.companyName || '',
        phoneNumber: client.phone || client.phoneNumber || '',
        address: client.address || '',
        email: client.email || '',
        instanceName: client.instanceName || '',
        evolutionApiUrl: client.evolutionApiUrl || '',
        evolutionApiKey: client.evolutionApiKey || '',
        n8nWebhookUrl: client.n8nWebhookUrl || '',
        status: client.status || 'ACTIVE',
        paymentStatus: client.paymentStatus || 'UNPAID'
      });
      setActiveTab('profile');
      setError('');
    }
  }, [client]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('crm_token');
      const response = await fetch(`http://localhost:5000/api/clients/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update client');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-bold text-[#0a1142]">Edit Client</h2>
            <p className="text-gray-500 text-sm mt-1">
              Update information for <span className="font-semibold">{client.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-200 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-8 bg-gray-50/30">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'profile' ? 'border-[#d51381] text-[#d51381]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Business Profile
          </button>
          <button 
            onClick={() => setActiveTab('config')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'config' ? 'border-[#d51381] text-[#d51381]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Technical Config
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-medium flex items-center">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
              {error}
            </div>
          )}

          <form id="edit-client-form" onSubmit={handleSubmit}>
            {activeTab === 'profile' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Owner Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" required name="ownerName" value={formData.ownerName} onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#0a1142] focus:ring-1 focus:ring-[#0a1142] outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Company Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" required name="companyName" value={formData.companyName} onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#0a1142] focus:ring-1 focus:ring-[#0a1142] outline-none"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                      <input 
                        type="email" required name="email" value={formData.email} onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#0a1142] focus:ring-1 focus:ring-[#0a1142] outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                      <input 
                        type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#0a1142] focus:ring-1 focus:ring-[#0a1142] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Business Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" name="address" value={formData.address} onChange={handleChange}
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#0a1142] focus:ring-1 focus:ring-[#0a1142] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Account Status</label>
                    <select 
                      name="status" value={formData.status} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#0a1142] focus:ring-1 focus:ring-[#0a1142] outline-none font-medium bg-white appearance-none"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="EXPIRED">EXPIRED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Status</label>
                    <select 
                      name="paymentStatus" value={formData.paymentStatus} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#0a1142] focus:ring-1 focus:ring-[#0a1142] outline-none font-medium bg-white appearance-none"
                    >
                      <option value="PAID">PAID</option>
                      <option value="UNPAID">UNPAID</option>
                      <option value="OVERDUE">OVERDUE</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-blue-50 p-4 rounded-xl flex items-start space-x-3 border border-blue-100">
                  <Settings className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">Evolution API Integration</h4>
                    <p className="text-xs text-blue-700 mt-1">Update connection parameters for the WhatsApp engine.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Instance Name</label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" required name="instanceName" value={formData.instanceName} onChange={handleChange}
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#0a1142] outline-none font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Evolution URL</label>
                    <input 
                      type="text" required name="evolutionApiUrl" value={formData.evolutionApiUrl} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#0a1142] outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Evolution Global API Key</label>
                    <input 
                      type="text" required name="evolutionApiKey" value={formData.evolutionApiKey} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#0a1142] outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">n8n Webhook URL</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                    <input 
                      type="url" name="n8nWebhookUrl" value={formData.n8nWebhookUrl} onChange={handleChange} placeholder="https://..."
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#0a1142] outline-none font-mono text-sm text-blue-600"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Where Evolution will send incoming WhatsApp messages.</p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="edit-client-form"
            disabled={loading}
            className="flex items-center px-8 py-2.5 bg-[#0a1142] hover:bg-[#131b54] text-white font-bold rounded-xl transition-colors disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Check className="w-5 h-5 mr-2" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
