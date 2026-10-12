'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Loader2, LogOut, Send, Smartphone } from 'lucide-react';
import CloudInbox from './CloudInbox';

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

// Meta app + Embedded Signup configuration (public identifiers, not secrets).
const META_APP_ID = '2124875408239522';
const META_CONFIG_ID = '1943343520495824';
const GRAPH_VERSION = 'v21.0';

type CloudStatus = {
  connected: boolean;
  phoneDisplay: string | null;
  verifiedName: string | null;
  connectedAt: string | null;
};

const authHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

export default function ConnectWhatsAppCloud() {
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState<CloudStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sessionRef = useRef<{ waba_id?: string; phone_number_id?: string; coex?: boolean } | null>(null);

  // Manual connect (WABA ID + phone number ID + token)
  const [mWaba, setMWaba] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mToken, setMToken] = useState('');

  // Test message box
  const [testTo, setTestTo] = useState('');
  const [testText, setTestText] = useState('Hello from Yours CRM!');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp-cloud/status', { headers: authHeaders() });
      if (res.ok) setStatus(await res.json());
    } catch (e) {
      console.error('status failed', e);
    }
  }, []);

  // Load the Facebook JS SDK once.
  useEffect(() => {
    loadStatus();
    if (window.FB) {
      setSdkReady(true);
      return;
    }
    window.fbAsyncInit = function () {
      window.FB.init({ appId: META_APP_ID, autoLogAppEvents: true, xfbml: true, version: GRAPH_VERSION });
      setSdkReady(true);
    };
    if (!document.getElementById('facebook-jssdk')) {
      const s = document.createElement('script');
      s.id = 'facebook-jssdk';
      s.src = 'https://connect.facebook.net/en_US/sdk.js';
      s.async = true;
      s.defer = true;
      s.crossOrigin = 'anonymous';
      document.body.appendChild(s);
    }
  }, [loadStatus]);

  // Embedded Signup posts the WABA id / phone number id via window messages.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event.origin || !event.origin.endsWith('facebook.com')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
        if (data.event === 'FINISH' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
          sessionRef.current = { ...(data.data || {}), coex: data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' };
        } else if (data.event === 'CANCEL') {
          setBusy(false);
          setError('Signup was cancelled before it finished.');
        }
      } catch {
        /* not a JSON message */
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const finishConnect = async (code: string) => {
    try {
      // The session info message may arrive just after the login callback: wait for it.
      for (let i = 0; i < 40 && !(sessionRef.current?.waba_id && sessionRef.current?.phone_number_id); i++) {
        await new Promise((r) => setTimeout(r, 500));
      }
      const info = sessionRef.current;
      if (!info?.waba_id || !info?.phone_number_id) {
        setError('Meta did not return the WhatsApp number details. Please try again.');
        return;
      }
      const res = await fetch('/api/whatsapp-cloud/connect', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ code, wabaId: info.waba_id, phoneNumberId: info.phone_number_id, coexistence: !!info.coex }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to connect WhatsApp.');
        return;
      }
      await loadStatus();
    } catch (e: any) {
      setError(e.message || 'Failed to connect WhatsApp.');
    } finally {
      setBusy(false);
    }
  };

  const launchSignup = (coex = false) => {
    setError('');
    setSendResult('');
    if (!window.FB) {
      setError('Facebook SDK is still loading (or blocked). Please open this page over HTTPS and retry.');
      return;
    }
    sessionRef.current = null;
    setBusy(true);
    window.FB.login(
      (response: any) => {
        if (response?.authResponse?.code) {
          finishConnect(response.authResponse.code);
        } else {
          setBusy(false);
          setError('Signup was cancelled or not authorised.');
        }
      },
      {
        config_id: META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: coex ? 'whatsapp_business_app_onboarding' : '', sessionInfoVersion: '3' },
      },
    );
  };

  const connectManual = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/whatsapp-cloud/connect', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ wabaId: mWaba.trim(), phoneNumberId: mPhone.trim(), accessToken: mToken.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to connect WhatsApp.');
        return;
      }
      setMToken('');
      await loadStatus();
    } catch (e: any) {
      setError(e.message || 'Failed to connect WhatsApp.');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect this WhatsApp number from Yours CRM?')) return;
    await fetch('/api/whatsapp-cloud/disconnect', { method: 'DELETE', headers: authHeaders() });
    setSendResult('');
    await loadStatus();
  };

  const sendTest = async () => {
    setSending(true);
    setSendResult('');
    try {
      const res = await fetch('/api/whatsapp-cloud/send', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ phoneNumber: testTo, text: testText }),
      });
      const data = await res.json().catch(() => ({}));
      setSendResult(res.ok ? 'Message sent.' : data.error || 'Failed to send.');
    } catch {
      setSendResult('Failed to send.');
    } finally {
      setSending(false);
    }
  };

  const connected = !!status?.connected;

  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm mt-2">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
            <Smartphone className="w-6 h-6 text-[#0a1142]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#0a1142]">WhatsApp Business (Official)</h3>
            <p className="text-sm text-gray-500">Connect your WhatsApp Business number through Meta&apos;s official Cloud API.</p>
          </div>
        </div>
        {connected && (
          <span className="flex items-center text-emerald-600 font-bold text-sm">
            <CheckCircle className="w-4 h-4 mr-1" /> Connected
          </span>
        )}
      </div>

      {!connected && (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            You will log in with Facebook, choose or create your WhatsApp Business Account and verify your phone number.
            Yours CRM only gets permission to send and receive WhatsApp messages for that number.
          </p>
          <button
            onClick={() => launchSignup(false)}
            disabled={busy || !sdkReady}
            className="bg-[#0a1142] hover:bg-[#131b54] text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-60 flex items-center"
          >
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {busy ? 'Connecting...' : 'Connect WhatsApp'}
          </button>
          <button onClick={() => launchSignup(true)} disabled={busy || !sdkReady} className="mt-3 border border-[#0a1142] text-[#0a1142] px-6 py-3 rounded-xl font-bold disabled:opacity-60">Connect existing WhatsApp Business app number</button>

          <details className="mt-6 border border-gray-100 rounded-2xl p-4">
            <summary className="cursor-pointer font-bold text-sm text-[#0a1142]">Advanced: connect with WABA ID, Phone number ID and access token</summary>
            <p className="text-xs text-gray-500 mt-3 mb-3">
              For a number already set up in Meta&apos;s WhatsApp Manager / API Setup. The token is checked with Meta and stored on the server only.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={mWaba} onChange={(e) => setMWaba(e.target.value)} placeholder="WhatsApp Business Account ID" className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
              <input value={mPhone} onChange={(e) => setMPhone(e.target.value)} placeholder="Phone number ID" className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
              <input value={mToken} onChange={(e) => setMToken(e.target.value)} type="password" placeholder="Access token" className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <button
              onClick={connectManual}
              disabled={busy || !mWaba || !mPhone || !mToken}
              className="mt-3 bg-[#0a1142] text-white px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-60"
            >
              {busy ? 'Connecting...' : 'Connect'}
            </button>
          </details>
        </div>
      )}

      {connected && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="text-gray-500">WhatsApp number</div>
              <div className="font-bold text-[#0a1142]">{status?.phoneDisplay || '-'}</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="text-gray-500">Business name</div>
              <div className="font-bold text-[#0a1142]">{status?.verifiedName || '-'}</div>
            </div>
          </div>

          <div className="border border-gray-100 rounded-2xl p-4">
            <div className="font-bold text-[#0a1142] mb-3 text-sm">Send a test message</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="Recipient, e.g. 923001234567"
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
              />
              <input
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Message"
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
              />
              <button
                onClick={sendTest}
                disabled={sending || !testTo || !testText}
                className="bg-[#d51381] hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-60 flex items-center justify-center"
              >
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send
              </button>
            </div>
            {sendResult && <div className="mt-2 text-sm font-bold text-[#0a1142]">{sendResult}</div>}
          </div>

          <CloudInbox />

          <button onClick={disconnect} className="text-red-500 hover:text-red-600 font-bold text-sm flex items-center">
            <LogOut className="w-4 h-4 mr-1" /> Disconnect
          </button>
        </div>
      )}

      {error && <div className="mt-4 text-sm font-bold text-red-500">{error}</div>}
    </div>
  );
}
