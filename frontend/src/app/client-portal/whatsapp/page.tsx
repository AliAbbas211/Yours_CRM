'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Shield, Wifi, WifiOff, Loader2, RefreshCw, CheckCircle, LogOut } from 'lucide-react';

export default function WhatsAppPage() {
  const [status, setStatus] = useState<string>('CHECKING');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState<boolean>(false);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'config' | 'scheduling'>('config');

  // Scheduling State
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState('');

  useEffect(() => {
    fetchSettings();
    checkStatus();
    // Poll status every 10 seconds if we are checking or offline
    const interval = setInterval(() => {
      checkStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const getClientId = () => {
    const userStr = localStorage.getItem('crm_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr).clientId;
    } catch (e) {
      return null;
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/clients/portal/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScheduleEnabled(data.agentConfig?.scheduleEnabled || false);
        setScheduleStartTime(data.agentConfig?.scheduleStartTime || '');
        setScheduleEndTime(data.agentConfig?.scheduleEndTime || '');
        setTimezone(data.agentConfig?.timezone || 'UTC');
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
    }
  };

  const saveSchedule = async () => {
    setSavingSchedule(true);
    setScheduleMessage('');
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/clients/portal/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          scheduleEnabled,
          scheduleStartTime,
          scheduleEndTime,
          timezone
        })
      });
      if (res.ok) {
        setScheduleMessage('Schedule saved!');
        setTimeout(() => setScheduleMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to save schedule', error);
      setScheduleMessage('Error saving schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  const checkStatus = async () => {
    const clientId = getClientId();
    if (!clientId) return;

    try {
      setCheckingStatus(true);
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`http://localhost:5000/api/evolution/status/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status); // ONLINE or OFFLINE
        if (data.status === 'ONLINE') {
          setQrCode(null);
        }
      }
    } catch (error) {
      console.error('Failed to check status', error);
      setStatus('ERROR');
    } finally {
      setCheckingStatus(false);
    }
  };

  const generateQr = async () => {
    const clientId = getClientId();
    if (!clientId) return;

    try {
      setLoadingQr(true);
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`http://localhost:5000/api/evolution/connect/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.base64) {
          setQrCode(data.base64);
        } else {
          // Sometimes if already connected, base64 might be empty. Check status again.
          checkStatus();
        }
      } else {
        alert('Failed to generate QR Code. Please check backend logs.');
      }
    } catch (error) {
      console.error('Failed to generate QR', error);
    } finally {
      setLoadingQr(false);
    }
  };

  const forceDisconnect = async () => {
    if (!confirm('Are you sure you want to force disconnect this device?')) return;
    const clientId = getClientId();
    if (!clientId) return;

    try {
      const token = localStorage.getItem('crm_token');
      await fetch(`http://localhost:5000/api/evolution/logout/${clientId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus('OFFLINE');
      setQrCode(null);
    } catch (error) {
      console.error('Failed to disconnect', error);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('config')}
          className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'config' ? 'bg-white text-[#0a1142] shadow-sm' : 'text-gray-500 hover:text-[#0a1142]'}`}
        >
          AI Config
        </button>
        <button 
          onClick={() => setActiveTab('scheduling')}
          className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'scheduling' ? 'bg-white text-[#0a1142] shadow-sm' : 'text-gray-500 hover:text-[#0a1142]'}`}
        >
          Scheduling
        </button>
      </div>

      {/* AI Agent Scheduling */}
      {activeTab === 'scheduling' && (
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm mt-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#0a1142] flex items-center">
            <Smartphone className="w-5 h-5 mr-2 text-[#d51381]" /> AI Agent Scheduling
          </h3>
          <div className="flex items-center space-x-4">
            <span className="text-emerald-600 font-bold text-sm">{scheduleMessage}</span>
            <button 
              onClick={saveSchedule}
              disabled={savingSchedule}
              className="bg-[#0a1142] hover:bg-[#131b54] text-white px-6 py-2 rounded-xl font-bold transition-all disabled:opacity-70 text-sm"
            >
              {savingSchedule ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>
        
        <div className="mb-6 flex items-center space-x-3">
          <input 
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(e) => setScheduleEnabled(e.target.checked)}
            className="w-5 h-5 accent-[#d51381] cursor-pointer"
            id="scheduleEnabled"
          />
          <label htmlFor="scheduleEnabled" className="text-sm font-bold text-gray-700 cursor-pointer">
            Enable Automated Scheduling
          </label>
        </div>

        {scheduleEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 border border-gray-100 rounded-xl">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Timezone</label>
              <select 
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] outline-none font-medium bg-white"
              >
                <option value="UTC">UTC (Default)</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Central European Time (CET)</option>
                <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
                <option value="Asia/Kolkata">India Standard Time (IST)</option>
                <option value="Asia/Singapore">Singapore (SGT)</option>
                <option value="Australia/Sydney">Australian Eastern (AET)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Time (24h)</label>
              <input 
                type="time" 
                value={scheduleStartTime}
                onChange={(e) => setScheduleStartTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] outline-none font-medium bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Time (24h)</label>
              <input 
                type="time" 
                value={scheduleEndTime}
                onChange={(e) => setScheduleEndTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] outline-none font-medium bg-white"
              />
            </div>
          </div>
        )}
      </div>
      )}

      {activeTab === 'config' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {/* Connection Status Card */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-gray-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                <Smartphone className="w-6 h-6 text-[#0a1142]" />
              </div>
              <div className="flex items-center space-x-2">
                {checkingStatus && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                  status === 'ONLINE' ? 'bg-emerald-50 text-emerald-600' :
                  status === 'OFFLINE' ? 'bg-red-50 text-red-600' :
                  'bg-yellow-50 text-yellow-600'
                }`}>
                  {status === 'ONLINE' && <Wifi className="w-3 h-3 mr-1.5" />}
                  {status === 'OFFLINE' && <WifiOff className="w-3 h-3 mr-1.5" />}
                  {status}
                </span>
              </div>
            </div>

            <h3 className="text-xl font-bold text-[#0a1142] mb-2">Connection Status</h3>
            <p className="text-gray-500 font-medium mb-6 text-sm">
              {status === 'ONLINE' 
                ? 'Your WhatsApp number is actively connected to the Evolution API and ready to handle customer leads via AI.'
                : 'Your WhatsApp number is currently disconnected. Generate a QR code to link your device.'}
            </p>
          </div>

          <div className="relative z-10">
            {status !== 'ONLINE' && (
              <button 
                onClick={generateQr}
                disabled={loadingQr}
                className="w-full bg-[#0a1142] hover:bg-[#131b54] text-white py-3.5 rounded-xl font-bold flex items-center justify-center transition-all disabled:opacity-70 shadow-lg shadow-blue-900/20"
              >
                {loadingQr ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating...
                  </>
                ) : 'Generate QR Code'}
              </button>
            )}
            
            {status === 'ONLINE' && (
              <div className="space-y-3">
                <div className="w-full bg-emerald-50 border border-emerald-100 text-emerald-700 py-3.5 rounded-xl font-bold flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 mr-2" /> Connected Successfully
                </div>
                <button 
                  onClick={forceDisconnect}
                  className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-xl font-bold flex items-center justify-center transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Force Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* QR Code Display Card */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center min-h-[400px]">
          {status === 'ONLINE' ? (
            <div className="flex flex-col items-center animate-in zoom-in duration-300">
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                <Shield className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-[#0a1142] mb-2">Device Synced</h3>
              <p className="text-gray-500 font-medium text-sm max-w-xs">
                Your mobile device is securely linked. You don't need to scan anything.
              </p>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center animate-in zoom-in duration-300">
              <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-xl mb-6">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
              </div>
              <h3 className="text-xl font-bold text-[#0a1142] mb-2">Scan with WhatsApp</h3>
              <p className="text-gray-500 font-medium text-sm max-w-xs">
                Open WhatsApp on your phone, go to Linked Devices, and scan this QR code.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center mb-6">
                <Smartphone className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 font-bold">No QR Code Generated</p>
              <p className="text-gray-400 font-medium text-sm mt-1">Click the button to generate.</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
