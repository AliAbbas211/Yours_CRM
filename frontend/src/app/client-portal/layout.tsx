'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

interface User {
  email: string;
  role: string;
  [key: string]: unknown;
}

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [botEnabled, setBotEnabled] = useState<boolean>(true);
  const [botLockedBySuperAdmin, setBotLockedBySuperAdmin] = useState<boolean>(false);
  const [isUpdatingBot, setIsUpdatingBot] = useState(false);
  const [marqueeText, setMarqueeText] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');

  let pageTitle = 'Client Portal';
  let pageSubtitle = '';

  if (pathname === '/client-portal/whatsapp') {
    pageTitle = 'WhatsApp Engine';
    pageSubtitle = 'Connect your business WhatsApp number to the AI Agent.';
  } else if (pathname === '/client-portal/settings') {
    pageTitle = 'Portal Settings';
    pageSubtitle = 'Manage your company profile and global AI chatbot configurations.';
  } else if (pathname === '/client-portal/leads') {
    pageTitle = 'Lead Management';
    pageSubtitle = 'View and manage leads captured by your AI agent.';
  } else if (pathname === '/client-portal/knowledge-base') {
    pageTitle = 'Knowledge Base';
    pageSubtitle = 'Manage the data and documents your AI Agent uses to answer questions.';
  } else if (pathname === '/client-portal/products') {
    pageTitle = 'Products';
    pageSubtitle = 'Manage your catalog — images, videos, and prices your bot shows to customers.';
  } else if (pathname === '/client-portal/contacts') {
    pageTitle = 'Contacts & Whitelist';
    pageSubtitle = 'Control exactly which WhatsApp numbers your AI bot is allowed to reply to.';
  }

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    const userData = localStorage.getItem('crm_user');

    if (!token || !userData) {
      router.push('/');
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      if (parsed.role !== 'CLIENT') {
        router.push('/');
        return;
      }
      // Defer setting state to avoid synchronous setState inside effect
      // which can cause cascading renders. Using setTimeout 0 schedules
      // the state update after the current render frame.
      setTimeout(() => setUser(parsed), 0);

      fetch('http://localhost:5000/api/clients/portal/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.agentConfig) {
            setBotEnabled(data.agentConfig.isActive !== undefined ? data.agentConfig.isActive : true);
            setBotLockedBySuperAdmin(!!data.agentConfig.disabledBySuperAdmin);
          }
        })
        .catch(console.error);

      fetch('http://localhost:5000/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.COMPANY_MARQUEE) {
            setMarqueeText(data.COMPANY_MARQUEE);
          }
        })
        .catch(console.error);
    } catch (e) {
      router.push('/');
    }
  }, [router]);

  const toggleGlobalBot = async () => {
    if (botLockedBySuperAdmin) {
      setBannerMessage('Your AI agent was disabled by the administrator. Contact support to re-enable it.');
      setTimeout(() => setBannerMessage(''), 4000);
      return;
    }
    try {
      setIsUpdatingBot(true);
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/clients/portal/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !botEnabled })
      });
      if (res.ok) {
        setBotEnabled(!botEnabled);
      } else {
        const err = await res.json();
        setBannerMessage(err.message || 'Failed to update bot status.');
        setTimeout(() => setBannerMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingBot(false);
    }
  };

  if (!user) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-[#0a1142] font-medium">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-gray-800 flex font-sans">
      <Sidebar role="CLIENT" />
      <div className="flex-1 ml-64 flex flex-col">
        <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <div className="text-xl font-bold text-[#0a1142] tracking-tight">{pageTitle}</div>
            {pageSubtitle && <div className="text-sm text-gray-500 font-medium mt-0.5">{pageSubtitle}</div>}
          </div>
          <div className="flex items-center space-x-6">

            <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
              <span className="text-sm font-bold text-gray-700">
                AI Agent Status {botLockedBySuperAdmin && <span className="text-red-500">(Locked)</span>}
              </span>
              <button
                onClick={toggleGlobalBot}
                disabled={isUpdatingBot}
                title={botLockedBySuperAdmin ? 'Disabled by administrator' : botEnabled ? 'Agent is Active. Click to turn off globally.' : 'Agent is Disabled. Click to activate globally.'}
                className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 ${botEnabled ? 'bg-emerald-500' : 'bg-red-500'} ${isUpdatingBot ? 'opacity-50 cursor-wait' : botLockedBySuperAdmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${botEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>

            <div className="flex items-center space-x-4 border-l pl-6 border-gray-200">
              <div className="text-sm">
                <span className="text-gray-500">Welcome, </span>
                <span className="font-semibold text-[#d51381]">{user.email}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0a1142] to-[#d51381] text-white flex items-center justify-center font-bold text-sm shadow-md">
                {user.email.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </nav>

        {bannerMessage && (
          <div className="bg-red-50 border-b border-red-100 text-red-700 text-sm font-bold px-8 py-2.5">
            {bannerMessage}
          </div>
        )}

        {marqueeText && (
          <div className="bg-[#d51381] text-white py-2 overflow-hidden flex items-center shadow-inner relative">
            <style>
              {`
                @keyframes marquee {
                  0% { transform: translateX(100vw); }
                  100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                  display: inline-block;
                  white-space: nowrap;
                  animation: marquee 30s linear infinite;
                  padding-left: 100%;
                }
              `}
            </style>
            <div className="animate-marquee font-bold text-sm tracking-wide">
              {marqueeText}
            </div>
          </div>
        )}

        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
