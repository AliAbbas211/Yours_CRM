'use client';

import React, { useState, useEffect } from 'react';
import { Save, Megaphone } from 'lucide-react';

export default function GlobalSettingsPage() {
  const [marqueeText, setMarqueeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMarqueeText(data.COMPANY_MARQUEE || '');
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          key: 'COMPANY_MARQUEE',
          value: marqueeText
        })
      });

      if (res.ok) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (error) {
      console.error('Error saving settings', error);
      setMessage('Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-[#0a1142] font-bold">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-extrabold text-[#0a1142]">Global Settings</h2>
        <p className="text-gray-500 mt-1 font-medium">Manage system-wide configurations and announcements.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-4">
          <Megaphone className="w-6 h-6 text-[#d51381]" />
          <h3 className="text-xl font-bold text-[#0a1142]">Client Portal Announcements</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Scrolling Marquee Text</label>
            <p className="text-xs text-gray-500 font-medium mb-3">
              This text will continuously scroll at the top of every client's portal. Use this to advertise company services or make global announcements.
            </p>
            <textarea
              rows={4}
              value={marqueeText}
              onChange={(e) => setMarqueeText(e.target.value)}
              placeholder="e.g. Welcome to our CRM! Check out our new AI Lead Generation services starting at $99/mo..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] outline-none font-medium bg-gray-50"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <span className={`font-bold text-sm ${message.includes('success') ? 'text-emerald-600' : 'text-red-600'}`}>
              {message}
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#0a1142] hover:bg-[#131b54] text-white px-8 py-3 rounded-xl font-bold flex items-center transition-all disabled:opacity-70 shadow-lg shadow-blue-900/20"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
