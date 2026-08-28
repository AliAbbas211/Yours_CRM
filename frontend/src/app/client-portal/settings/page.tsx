'use client';
import React, { useState, useEffect } from 'react';
import { Settings, Save, Building2, User, Phone, MapPin, Navigation, Loader2, CheckCircle2, ShoppingCart, Copy, RefreshCw, Lock, Bot, Briefcase } from 'lucide-react';
export default function SettingsPage() {
  const [formData, setFormData] = useState({
    companyName: '',
    ownerName: '',
    phoneNumber: '',
    address: '',
    botName: '',
    botDesignation: '',
    botRole: '',
    botJobDescription: ''
  });
  const [originAddress, setOriginAddress] = useState('');
  const [originLat, setOriginLat] = useState<number | null>(null);
  const [originLng, setOriginLng] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [ecommerceLoading, setEcommerceLoading] = useState(true);
  const [ecommerceEnabled, setEcommerceEnabled] = useState(false);
  const [ecommercePlatform, setEcommercePlatform] = useState('CUSTOM');
  const [ecommerceCallbackUrl, setEcommerceCallbackUrl] = useState('');
  const [ecommerceWebhookUrl, setEcommerceWebhookUrl] = useState<string | null>(null);
  const [ecommerceSaving, setEcommerceSaving] = useState(false);
  const [ecommerceRegenerating, setEcommerceRegenerating] = useState(false);
  const [ecommerceMessage, setEcommerceMessage] = useState('');
  const [webhookCopied, setWebhookCopied] = useState(false);
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('crm_token');
        const res = await fetch('http://2.24.212.209/api/clients/portal/settings', {
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
            address: data.address || '',
            botName: data.agentConfig?.botName || '',
            botDesignation: data.agentConfig?.botDesignation || '',
            botRole: data.agentConfig?.botRole || '',
            botJobDescription: data.agentConfig?.botJobDescription || ''
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
    const loadEcommerceConfig = async () => {
      try {
        const token = localStorage.getItem('crm_token');
        const res = await fetch('http://2.24.212.209/api/clients/portal/ecommerce-config', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          setEcommerceEnabled(!!data.moduleEnabled);
          setEcommercePlatform(data.platform || 'CUSTOM');
          setEcommerceCallbackUrl(data.callbackUrl || '');
          setEcommerceWebhookUrl(data.webhookUrl || null);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch e-commerce config', error);
      } finally {
        if (isMounted) {
          setEcommerceLoading(false);
        }
      }
    };
    void loadSettings();
    void loadEcommerceConfig();
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
      const res = await fetch('http://2.24.212.209/api/clients/portal/settings', {
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
      const res = await fetch('http://2.24.212.209/api/clients/portal/geocode-origin', {
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
  const handleSaveEcommerceConfig = async () => {
    setEcommerceSaving(true);
    setEcommerceMessage('');
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://2.24.212.209/api/clients/portal/ecommerce-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ platform: ecommercePlatform, callbackUrl: ecommerceCallbackUrl })
      });
      const data = await res.json();
      if (res.ok) {
        setEcommerceMessage('E-commerce settings saved!');
      } else {
        setEcommerceMessage(data.message || 'Failed to save.');
      }
    } catch (error) {
      console.error('Failed to save e-commerce config', error);
      setEcommerceMessage('An error occurred.');
    } finally {
      setEcommerceSaving(false);
      setTimeout(() => setEcommerceMessage(''), 4000);
    }
  };
  const handleRegenerateWebhookSecret = async () => {
    setEcommerceRegenerating(true);
    setEcommerceMessage('');
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://2.24.212.209/api/clients/portal/ecommerce-config/regenerate-secret', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setEcommerceWebhookUrl(data.webhookUrl);
        setEcommerceMessage('New webhook URL generated — update it on your site.');
      } else {
        setEcommerceMessage(data.message || 'Failed to regenerate.');
      }
    } catch (error) {
      console.error('Failed to regenerate webhook secret', error);
      setEcommerceMessage('An error occurred.');
    } finally {
      setEcommerceRegenerating(false);
      setTimeout(() => setEcommerceMessage(''), 4000);
    }
  };
  const handleCopyWebhookUrl = async () => {
    if (!ecommerceWebhookUrl) return;
    try {
      await navigator.clipboard.writeText(ecommerceWebhookUrl);
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed', error);
    }
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
        {/* Bot Behaviour */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-[#0a1142] mb-2 flex items-center">
            <Bot className="w-5 h-5 mr-2 text-[#d51381]" /> Bot Behaviour
          </h3>
          <p className="text-sm text-gray-500 font-medium mb-6">
            Customize who your AI assistant is on WhatsApp — its name, designation, and what it should (and
            shouldn&apos;t) handle. Leave blank to use the default assistant identity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bot Name</label>
              <div className="relative">
                <Bot className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="botName"
                  value={formData.botName}
                  onChange={handleChange}
                  placeholder="e.g. Sara"
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Designation</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="botDesignation"
                  value={formData.botDesignation}
                  onChange={handleChange}
                  placeholder="e.g. Customer Support Executive"
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none font-medium"
                />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Role &amp; Responsibilities</label>
              <textarea
                name="botRole"
                value={formData.botRole}
                onChange={handleChange}
                rows={3}
                placeholder="e.g. Answer product questions, quote prices, take orders, and share past work samples. Do not discuss competitors or make delivery-time promises."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none font-medium resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Job Description</label>
              <textarea
                name="botJobDescription"
                value={formData.botJobDescription}
                onChange={handleChange}
                rows={3}
                placeholder="e.g. First point of contact for new and existing customers on WhatsApp — qualifies interest, shares pricing and portfolio, and closes simple orders."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none font-medium resize-y"
              />
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
        {/* E-commerce Integration */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-[#0a1142] mb-2 flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2 text-[#d51381]" /> E-commerce Integration
          </h3>
          {ecommerceLoading ? (
            <p className="text-sm text-gray-400 font-medium">Loading...</p>
          ) : !ecommerceEnabled ? (
            <div className="flex items-start space-x-3 bg-gray-50 border border-gray-100 rounded-xl px-5 py-4">
              <Lock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-500 font-medium">
                This feature isn&apos;t enabled for your account yet. Contact support to turn it on, then a webhook
                URL will appear here for you to connect your store.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-gray-500 font-medium">
                Connect your own store (any platform) so new orders send the customer a WhatsApp message asking
                them to confirm — once they reply &quot;Yes&quot;, we&apos;ll notify your site so it can mark the order confirmed.
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your Order Webhook URL</label>
                <p className="text-xs text-gray-400 mb-2">
                  Point your store&apos;s order-created webhook here. Send a POST with JSON: customerName, customerPhone,
                  products, and optionally externalOrderId, address, total.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={ecommerceWebhookUrl || ''}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 font-mono text-xs text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={handleCopyWebhookUrl}
                    className="flex items-center space-x-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{webhookCopied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateWebhookSecret}
                    disabled={ecommerceRegenerating}
                    className="flex items-center space-x-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-60 whitespace-nowrap"
                    title="Generate a new webhook URL (the old one stops working)"
                  >
                    {ecommerceRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Platform</label>
                  <select
                    value={ecommercePlatform}
                    onChange={(e) => setEcommercePlatform(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none font-medium bg-white appearance-none"
                  >
                    <option value="CUSTOM">Custom / Other</option>
                    <option value="SHOPIFY">Shopify</option>
                    <option value="WOOCOMMERCE">WooCommerce</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Order-Confirmed Callback URL</label>
                  <input
                    type="url"
                    value={ecommerceCallbackUrl}
                    onChange={(e) => setEcommerceCallbackUrl(e.target.value)}
                    placeholder="https://yourstore.com/api/order-confirmed"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none font-mono text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-3">
                We&apos;ll POST {'{ orderId, externalOrderId, status: "CONFIRMED" }'} here once the customer confirms on WhatsApp.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-emerald-600 font-bold text-sm">{ecommerceMessage}</div>
                <button
                  type="button"
                  onClick={handleSaveEcommerceConfig}
                  disabled={ecommerceSaving}
                  className="flex items-center space-x-2 bg-[#0a1142] hover:bg-[#131b54] text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-70"
                >
                  <Save className="w-4 h-4" />
                  <span>{ecommerceSaving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
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
