'use client';

import React, { useState, useEffect } from 'react';
import { Power, Zap, Smartphone, RefreshCw } from 'lucide-react';

export default function ConfigAIPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [status, setStatus] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isAgentOnline, setIsAgentOnline] = useState(false);
  const [activeTab, setActiveTab] = useState('whatsapp');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/clients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await res.json();
          setClients(data);
          if (data.length > 0) {
            setSelectedClientId(data[0].id);
          }
        } else {
          console.error("Received non-JSON response");
        }
      }
    } catch (error) {
      console.error('Failed to fetch clients', error);
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      checkStatus();
      const interval = setInterval(() => {
        checkStatus();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedClientId]);

  const checkStatus = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`http://localhost:5000/api/evolution/status/${selectedClientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await res.json();
          setStatus(data);
          if (data.instance?.state === 'open') {
            setQrCode('');
          }
        }
      }
    } catch (error) {
      console.error('Failed to get status', error);
    }
  };

  const generateQR = async () => {
    setLoading(true);
    setQrCode('');
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`http://localhost:5000/api/evolution/connect/${selectedClientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (data.base64) {
          setQrCode(data.base64);
        }
      }
    } catch (error) {
      console.error('Failed to generate QR', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const isConnected = status?.instance?.state === 'open';

  return (
    <div className="space-y-6">
      
      {/* Top Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0a1142]">Agent Config & Security</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Overview <span className="mx-1">&gt;</span> <span className="text-emerald-500">Real-time Stats</span>
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Client Selector (Kept for functionality) */}
          <select 
            value={selectedClientId} 
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="border-2 border-gray-200 rounded-lg p-2 font-medium text-gray-700 outline-none focus:border-[#0a1142]"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.companyName} ({c.instanceName})</option>
            ))}
          </select>

          {/* Toggle Switch */}
          <div className={`flex items-center space-x-3 px-4 py-2 rounded-full border-2 transition-colors ${isAgentOnline ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Agent Status</span>
              <span className={`text-sm font-extrabold ${isAgentOnline ? 'text-emerald-600' : 'text-red-500'}`}>{isAgentOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            <button 
              onClick={() => setIsAgentOnline(!isAgentOnline)}
              className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 ${isAgentOnline ? 'bg-emerald-500' : 'bg-red-200'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isAgentOnline ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>
        </div>
      </div>

      {/* Dark Banner */}
      <div className="bg-[#1a2035] rounded-xl p-6 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center border border-white/5">
            <Zap className="w-6 h-6 text-pink-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">
              Agent Engine — <span className="text-gray-300 font-medium">{selectedClient?.name || 'Loading...'}</span>
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Last sync: {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div>
          {isConnected ? (
            <span className="inline-flex items-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span> ONLINE
            </span>
          ) : (
            <span className="inline-flex items-center bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> OFFLINE
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          <button 
            onClick={() => setActiveTab('scheduling')}
            className={`pb-4 text-sm font-bold transition-colors ${activeTab === 'scheduling' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Agent Scheduling
          </button>
          <button 
            onClick={() => setActiveTab('whatsapp')}
            className={`pb-4 text-sm font-bold transition-colors ${activeTab === 'whatsapp' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            WhatsApp Engine Sync
          </button>
          <button 
            onClick={() => setActiveTab('instructions')}
            className={`pb-4 text-sm font-bold transition-colors ${activeTab === 'instructions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Agent Instructions
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'whatsapp' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#0a1142]">WhatsApp Engine Sync</h3>
                <p className="text-gray-500 text-sm font-medium">Connect your WhatsApp instance</p>
              </div>
            </div>
            
            {!isConnected && (
              <button 
                onClick={generateQR}
                disabled={loading}
                className="bg-[#f97316] hover:bg-[#ea580c] text-white px-6 py-2.5 rounded-lg font-bold shadow-md shadow-orange-500/20 transition-all flex items-center"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Connect'}
              </button>
            )}
          </div>

          <div className="bg-[#f8fafc] border-2 border-dashed border-gray-200 rounded-2xl p-16 flex flex-col items-center justify-center min-h-[300px]">
            {isConnected ? (
              <div className="text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-50">
                  <Smartphone className="w-10 h-10 text-emerald-600" />
                </div>
                <h4 className="text-xl font-extrabold text-emerald-700 mb-2">Successfully Connected!</h4>
                <p className="text-gray-500 font-medium">WhatsApp Engine is actively syncing.</p>
              </div>
            ) : qrCode ? (
              <div className="text-center animate-in fade-in duration-300">
                <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 inline-block mb-4">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                </div>
                <p className="text-gray-500 font-medium animate-pulse">Waiting for scan...</p>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-100">
                  <Smartphone className="w-8 h-8 text-orange-400" />
                </div>
                <p className="font-medium text-gray-500">Click <span className="font-bold text-gray-700">'Connect'</span> to generate a fresh pairing QR code.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'scheduling' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-500 py-24">
          <p className="font-medium">Agent Scheduling settings will appear here.</p>
        </div>
      )}

      {activeTab === 'instructions' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-500 py-24">
          <p className="font-medium">Agent Instructions module will appear here.</p>
        </div>
      )}

    </div>
  );
}
