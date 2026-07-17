'use client';

import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Users, MessageCircle, ArrowUpRight, ArrowDownRight, Activity, Zap, CheckCircle2 } from 'lucide-react';

const mockChartData = [
  { name: 'Mon', leads: 40, messages: 240 },
  { name: 'Tue', leads: 30, messages: 139 },
  { name: 'Wed', leads: 20, messages: 980 },
  { name: 'Thu', leads: 27, messages: 390 },
  { name: 'Fri', leads: 18, messages: 480 },
  { name: 'Sat', leads: 23, messages: 380 },
  { name: 'Sun', leads: 34, messages: 430 },
];

const mockRecentActivity = [
  { id: 1, type: 'client', message: 'New client "Acme Corp" registered', time: '2 mins ago', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 2, type: 'whatsapp', message: 'WhatsApp instance disconnected for "TechSolutions"', time: '1 hour ago', icon: Zap, color: 'text-red-500', bg: 'bg-red-50' },
  { id: 3, type: 'billing', message: 'Subscription renewed for "GlobalReach"', time: '3 hours ago', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 4, type: 'system', message: 'System automated backup completed successfully', time: '5 hours ago', icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50' },
];

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null; // Prevent hydration errors with Recharts

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-semibold tracking-wide">Total Clients</p>
              <h3 className="text-3xl font-black mt-1 text-[#0a1142]">1,284</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />
            <span className="text-emerald-500 font-medium">12%</span>
            <span className="text-gray-400 ml-2">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-semibold tracking-wide">Active Bots</p>
              <h3 className="text-3xl font-black mt-1 text-[#0a1142]">842</h3>
            </div>
            <div className="p-3 bg-pink-50 rounded-xl text-[#d51381] group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />
            <span className="text-emerald-500 font-medium">8%</span>
            <span className="text-gray-400 ml-2">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-semibold tracking-wide">Messages Sent</p>
              <h3 className="text-3xl font-black mt-1 text-[#0a1142]">45.2k</h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl text-purple-600 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
            <span className="text-red-500 font-medium">3%</span>
            <span className="text-gray-400 ml-2">from last week</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-semibold tracking-wide">System Health</p>
              <h3 className="text-3xl font-black mt-1 text-[#0a1142]">99.9%</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-emerald-500 font-medium">All systems operational</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#0a1142]">Lead Generation Overview</h3>
              <p className="text-sm text-gray-500">Number of leads captured via WhatsApp AI across all clients.</p>
            </div>
            <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-[#0a1142] focus:border-[#0a1142] p-2 outline-none">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>This Year</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d51381" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d51381" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0a1142', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="leads" stroke="#d51381" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-[#0a1142] mb-1">Recent Activity</h3>
          <p className="text-sm text-gray-500 mb-6">Latest events across your tenant network.</p>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            {mockRecentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-4 relative">
                  {/* Timeline line */}
                  {index !== mockRecentActivity.length - 1 && (
                    <div className="absolute top-10 left-[1.1rem] w-0.5 h-10 bg-gray-100 -z-10"></div>
                  )}
                  
                  <div className={`p-2.5 rounded-full flex-shrink-0 ${activity.bg} ${activity.color} ring-4 ring-white z-10`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium text-gray-800 leading-tight">{activity.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          <button className="w-full mt-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
}
