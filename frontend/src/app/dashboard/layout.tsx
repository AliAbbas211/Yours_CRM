'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    const userData = localStorage.getItem('crm_user');
    
    if (!token || !userData) {
      router.push('/');
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      if (!['SUPER_ADMIN', 'MANAGER', 'SUPPORT'].includes(parsed.role)) {
        router.push('/');
        return;
      }
      setUser(parsed);
    } catch (e) {
      router.push('/');
    }
  }, [router]);

  if (!user) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-[#0a1142] font-medium">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-gray-800 flex font-sans">
      <Sidebar role={user.role} />
      <div className="flex-1 ml-64 flex flex-col">
        {/* Top Navbar */}
        <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="text-xl font-bold text-[#0a1142] tracking-tight">Admin Portal</div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-500">Welcome, </span>
              <span className="font-semibold text-[#d51381]">{user.email}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0a1142] to-[#d51381] text-white flex items-center justify-center font-bold text-sm shadow-md">
              {user.email.charAt(0).toUpperCase()}
            </div>
          </div>
        </nav>
        
        {/* Page Content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
