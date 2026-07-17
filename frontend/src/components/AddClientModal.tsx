'use client';

import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Loader2, Globe, Settings, Zap, Info, Link as LinkIcon, BookOpen } from 'lucide-react';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddClientModal({ isOpen, onClose, onSuccess }: AddClientModalProps) {
  const [step, setStep] = useState(1);
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
    // Step 2 Form State
    instanceName: '',
    evolutionApiUrl: 'https://evalution-2-evolution-api.a65iq4.easypanel.host',
    evolutionApiKey: 'EvoApiSecretKey2026!',
    n8nWebhookUrl: '',
    initialKnowledgeBase: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    if (!formData.ownerName || !formData.companyName || !formData.email || !formData.password) {
      setError('Please fill out all required fields.');
      return;
    }
    setError('');
    setStep(2);
  };

  const prevStep = () => setStep(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.instanceName) {
      setError('Instance name is required.');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('crm_token');
      const response = await fetch('http://localhost:5000/api/clients', {
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
      setStep(1);
      setFormData({
        ownerName: '', companyName: '', phoneNumber: '', address: '', email: '', password: '',
        instanceName: '', evolutionApiUrl: 'https://evalution-2-evolution-api.a65iq4.easypanel.host', evolutionApiKey: 'EvoApiSecretKey2026!', n8nWebhookUrl: '', initialKnowledgeBase: ''
      });
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
              Step {step} of 2: {step === 1 ? 'Client Information & Credentials' : 'Evolution API Setup'}
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

          {step === 1 && (
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

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <p className="text-gray-500 text-sm mb-4">
                Configure the connection between your instance and the automation engine.
              </p>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                
                {/* Instance Details Section */}
                <div className="flex items-start space-x-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-1">
                    <Globe className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[#0a1142] font-bold text-lg leading-tight">Instance Details</h3>
                    <p className="text-gray-500 text-sm mb-4">Your dedicated SaaS subdomain environment.</p>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
                        INSTANCE NAME <Info className="w-3.5 h-3.5 ml-1 text-gray-400" />
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Globe className="h-5 w-5 text-gray-400" />
                        </div>
                        <input 
                          type="text" 
                          name="instanceName" 
                          value={formData.instanceName} 
                          onChange={handleChange} 
                          required
                          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] transition-colors" 
                          placeholder="acme-corp-bot" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100 w-full my-6"></div>

                {/* API Credentials Section */}
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-1">
                    <Settings className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[#0a1142] font-bold text-lg leading-tight">API Credentials</h3>
                    <p className="text-gray-500 text-sm mb-4">Secure keys for backend service integration.</p>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
                        EVOLUTION API KEY <Info className="w-3.5 h-3.5 ml-1 text-gray-400" />
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Zap className="h-5 w-5 text-gray-400" />
                        </div>
                        <input 
                          type="password" 
                          name="evolutionApiKey" 
                          value={formData.evolutionApiKey} 
                          onChange={handleChange} 
                          required
                          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] transition-colors" 
                          placeholder="Enter your evolution api key" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
          {step === 1 ? (
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-600 font-semibold hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          ) : (
            <button type="button" onClick={prevStep} disabled={loading} className="px-6 py-2.5 rounded-xl text-gray-600 font-semibold hover:bg-gray-200 transition-colors flex items-center">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </button>
          )}

          {step === 1 ? (
            <button type="button" onClick={nextStep} className="px-6 py-2.5 rounded-xl bg-[#0a1142] text-white font-semibold hover:bg-[#152066] transition-colors flex items-center shadow-lg shadow-blue-900/20">
              Next Step <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading} className="px-8 py-2.5 rounded-xl bg-[#d51381] text-white font-semibold hover:bg-[#b00e6a] transition-all flex items-center shadow-lg shadow-pink-500/30 disabled:opacity-70">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
              {loading ? 'Provisioning...' : 'Create Client & Instance'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
