'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  CreditCard,
  Activity,
  BookOpen,
  PhoneCall,
  Settings,
  LogOut,
  ShoppingCart,
  Package
} from 'lucide-react';

interface SidebarProps {
  role: 'SUPER_ADMIN' | 'MANAGER' | 'SUPPORT' | 'CLIENT' | null;
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    router.push('/');
  };

  const superAdminLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Internal Team', href: '/dashboard/team', icon: Users },
    { name: 'Clients', href: '/dashboard/clients', icon: Users },
    { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
    { name: 'Financials & Billing', href: '/dashboard/financials', icon: CreditCard },
    { name: 'Config AI', href: '/dashboard/whatsapp', icon: MessageCircle },
    { name: 'Global Settings', href: '/dashboard/settings', icon: Settings },
    { name: 'Audit Logs', href: '/dashboard/logs', icon: Activity },
  ];

  const managerLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Clients', href: '/dashboard/clients', icon: Users },
    { name: 'Financials & Billing', href: '/dashboard/financials', icon: CreditCard },
  ];

  const supportLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: BookOpen },
    { name: 'Leads', href: '/dashboard/leads', icon: PhoneCall },
  ];

  // NEW: Products + Contacts & Whitelist added for clients — this is what
  // powers "client manages their own products / whitelist from their portal".
  const clientLinks = [
    { name: 'Dashboard', href: '/client-portal', icon: LayoutDashboard },
    { name: 'Products', href: '/client-portal/products', icon: Package },
    { name: 'Contacts & Whitelist', href: '/client-portal/contacts', icon: Users },
    { name: 'Knowledge Base', href: '/client-portal/knowledge-base', icon: BookOpen },
    { name: 'Leads', href: '/client-portal/leads', icon: PhoneCall },
    { name: 'WhatsApp Connect', href: '/client-portal/whatsapp', icon: MessageCircle },
    { name: 'Settings', href: '/client-portal/settings', icon: Settings },
  ];

  const getLinks = () => {
    switch (role) {
      case 'SUPER_ADMIN': return superAdminLinks;
      case 'MANAGER': return managerLinks;
      case 'SUPPORT': return supportLinks;
      case 'CLIENT': return clientLinks;
      default: return [];
    }
  };

  const links = getLinks();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed top-0 left-0 shadow-sm z-20">
      <div className="p-6 flex items-center justify-center border-b border-gray-100">
        <img src="/logo.jpeg" alt="Yourstechhub Logo" className="h-10 w-auto" />
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                isActive
                  ? 'bg-gradient-to-r from-[#0a1142] to-[#1a2575] text-white shadow-md shadow-blue-900/20'
                  : 'text-gray-600 hover:text-[#d51381] hover:bg-pink-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center w-full space-x-3 px-4 py-3 rounded-xl text-gray-600 font-medium hover:text-red-600 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
