'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';

type Conversation = { waId: string; name: string | null; lastText: string | null; lastDirection: string; lastAt: string };
type Msg = { id: string; direction: 'IN' | 'OUT'; text: string | null; createdAt: string };

const authHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

export default function CloudInbox() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp-cloud/conversations', { headers: authHeaders() });
      if (res.ok) setConvs((await res.json()).conversations || []);
    } catch {
      /* keep old list */
    }
  }, []);

  const loadMsgs = useCallback(async (waId: string) => {
    try {
      const res = await fetch(`/api/whatsapp-cloud/messages?waId=${encodeURIComponent(waId)}`, { headers: authHeaders() });
      if (res.ok) setMsgs((await res.json()).messages || []);
    } catch {
      /* keep old messages */
    }
  }, []);

  // Refresh the conversation list and the open thread every 5 seconds.
  useEffect(() => {
    loadConvs();
    const t = setInterval(() => {
      loadConvs();
      if (active) loadMsgs(active);
    }, 5000);
    return () => clearInterval(t);
  }, [active, loadConvs, loadMsgs]);

  useEffect(() => {
    if (active) loadMsgs(active);
  }, [active, loadMsgs]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async () => {
    if (!active || !text.trim()) return;
    setSending(true);
    setErr('');
    try {
      const res = await fetch('/api/whatsapp-cloud/send', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ phoneNumber: active, text: text.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setErr(data.error || 'Failed to send.');
      else {
        setText('');
        await loadMsgs(active);
        loadConvs();
      }
    } catch {
      setErr('Failed to send.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-bold text-[#0a1142] text-sm">Inbox</div>
      <div className="grid grid-cols-1 md:grid-cols-3 min-h-[320px]">
        <div className="md:border-r border-gray-100 max-h-[420px] overflow-y-auto">
          {convs.length === 0 && (
            <div className="p-4 text-sm text-gray-500">No conversations yet. Messages sent to your WhatsApp number will appear here.</div>
          )}
          {convs.map((c) => (
            <button
              key={c.waId}
              onClick={() => setActive(c.waId)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${active === c.waId ? 'bg-pink-50' : ''}`}
            >
              <div className="font-bold text-sm text-[#0a1142]">{c.name || `+${c.waId}`}</div>
              <div className="text-xs text-gray-500 truncate">
                {c.lastDirection === 'OUT' ? 'You: ' : ''}
                {c.lastText}
              </div>
            </button>
          ))}
        </div>
        <div className="md:col-span-2 flex flex-col max-h-[420px]">
          {!active ? (
            <div className="p-6 text-sm text-gray-500">Select a conversation to read and reply.</div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f7f7f9]">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        m.direction === 'OUT' ? 'bg-[#0a1142] text-white' : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      {m.text}
                      <div className={`text-[10px] mt-1 ${m.direction === 'OUT' ? 'text-blue-200' : 'text-gray-400'}`}>
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="p-3 border-t border-gray-100 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Type a reply..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                />
                <button
                  onClick={send}
                  disabled={sending || !text.trim()}
                  className="bg-[#d51381] text-white px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-60 flex items-center"
                >
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Send
                </button>
              </div>
              {err && <div className="px-4 pb-3 text-sm font-bold text-red-500">{err}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
