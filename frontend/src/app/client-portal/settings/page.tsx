'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Building2, User, Phone, MapPin, Navigation, Loader2, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    companyName: '',
    ownerName: '',
    phoneNumber: '',
    address: ''
  });

  const [originAddress, setOriginAddress] = useState('');
  const [originLat, setOriginLat] = useState<number | null>(null);
  const [originLng, setOriginLng] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('crm_token');
        const res = await fetch('http://localhost:5000/api/clients/portal/settings', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          setFormData({
            companyName: data.companyName || '',
            ownerName: data.ownerName || '',
            phoneNumber: data.phoneNumber || '',
            address: data.address || ''
          });
          setOriginAddress(data.originAddress || '');
          setOriginLat(data.originLat ?? null);
          setOriginLng(data.originLng ?? null);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch settings', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/clients/portal/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (error) {
      console.error('Failed to save settings', error);
      setMessage('An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleDetectOrigin = async () => {
    if (!originAddress.trim()) {
      setGeocodeMessage('Enter your store/business address first.');
      setTimeout(() => setGeocodeMessage(''), 3000);
      return;
    }
    setGeocoding(true);
    setGeocodeMessage('');
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/clients/portal/geocode-origin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ address: originAddress })
      });
      const data = await res.json();
      if (res.ok) {
        setOriginLat(data.originLat);
        setOriginLng(data.originLng);
        setGeocodeMessage('Location detected and saved! Delivery charges will now be calculated from this point.');
      } else {
        setGeocodeMessage(data.message || 'Could not detect location for this address.');
      }
    } catch (error) {
      console.error('Geocode error', error);
      setGeocodeMessage('An error occurred while detecting location.');
    } finally {
      setGeocoding(false);
      setTimeout(() => setGeocodeMessage(''), 5000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (loading) {
    return <div className="p-10 text-center font-medium text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Details */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-[#0a1142] mb-6 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-[#d51381]" /> Business Profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Owner Name</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Origin Point */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-[#0a1142] mb-2 flex items-center">
            <Navigation className="w-5 h-5 mr-2 text-[#d51381]" /> Delivery Origin Point
          </h3>
          <p className="text-sm text-gray-500 font-medium mb-6">
            This is the exact point every customers delivery distance (and delivery charge) is measured from.
            Usually your store/kitchen/warehouse location — set it once here.
          </p>

          <div className="flex items-end gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Store / Business Address</label>
              <input
                type="text"
                value={originAddress}
                onChange={(e) => setOriginAddress(e.target.value)}
                placeholder="e.g. 12 High Street, Smallthorne, Stoke-on-Trent, UK"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none font-medium"
              />
            </div>
            <button
              type="button"
              onClick={handleDetectOrigin}
              disabled={geocoding}
              className="flex items-center space-x-2 bg-[#0a1142] hover:bg-[#131b54] text-white px-5 py-3 rounded-xl font-bold transition-all disabled:opacity-60 whitespace-nowrap"
            >
              {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              <span>{geocoding ? 'Detecting...' : 'Detect Location'}</span>
            </button>
          </div>

          {geocodeMessage && (
            <p className={`text-sm font-bold mb-4 ${geocodeMessage.includes('detected') ? 'text-emerald-600' : 'text-amber-600'}`}>
              {geocodeMessage}
            </p>
          )}

          {originLat !== null && originLng !== null && (
            <div className="flex items-center space-x-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Origin set: {originLat.toFixed(5)}, {originLng.toFixed(5)} — delivery charges will now be calculated automatically for every order.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="text-emerald-600 font-bold text-sm">
            {message}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-[#0a1142] hover:bg-[#131b54] text-white px-8 py-3.5 rounded-xl font-bold transition-all disabled:opacity-70 shadow-lg shadow-blue-900/20"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
