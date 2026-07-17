'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@yourscrm.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token
      localStorage.setItem('crm_token', data.token);
      localStorage.setItem('crm_user', JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === 'CLIENT') {
        router.push('/client-portal');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-[450px] flex flex-col p-8 md:p-12 shadow-2xl z-10 relative">
        {/* Logo Area */}
        <div className="flex items-center space-x-2 mb-16">
          <img src="/logo.jpeg" alt="Yourstechhub Logo" className="h-12 w-auto" />
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-[#0a1142] rounded-full flex items-center justify-center shadow-lg">
              <User className="w-12 h-12 text-white" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autoComplete="email" 
                  required 
                  className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-full text-black placeholder-gray-400 focus:outline-none focus:border-[#0a1142] focus:ring-0 transition-colors font-medium" 
                  placeholder="USERNAME" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  autoComplete="current-password" 
                  required 
                  className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-full text-black placeholder-gray-400 focus:outline-none focus:border-[#0a1142] focus:ring-0 transition-colors font-medium" 
                  placeholder="PASSWORD" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-[#0a1142] focus:ring-[#0a1142] border-gray-300 rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-xs font-medium text-gray-600">
                  Remember me
                </label>
              </div>
              <div className="text-xs">
                <a href="#" className="font-medium text-gray-500 hover:text-[#0a1142]">
                  Forgot your password?
                </a>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-md text-sm font-bold text-white bg-[#0a1142] hover:bg-[#131b54] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0a1142] transition-colors disabled:opacity-70 uppercase tracking-widest mt-4"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-12 flex justify-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gray-800"></div>
            <div className="w-2 h-2 rounded-full bg-gray-800"></div>
            <div className="w-2 h-2 rounded-full bg-gray-800"></div>
          </div>
        </div>
      </div>

      {/* Right Panel - Abstract Gradient Background */}
      <div className="hidden lg:flex flex-1 relative bg-[#0a1142] overflow-hidden items-end justify-end p-16">
        {/* Abstract Fluid Shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-[#d51381] mix-blend-screen filter blur-[120px] opacity-60 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] rounded-full bg-[#3b82f6] mix-blend-screen filter blur-[150px] opacity-50"></div>
        <div className="absolute top-[20%] right-[10%] w-[50%] h-[50%] rounded-full bg-[#fde047] mix-blend-screen filter blur-[100px] opacity-30"></div>

        {/* Navbar-style links on the top right */}
        <div className="absolute top-8 right-12 flex items-center space-x-8 text-white/80 text-sm font-medium tracking-wide">
          <a href="#" className="hover:text-white transition-colors">ABOUT</a>
          <a href="#" className="hover:text-white transition-colors">DOWNLOAD</a>
          <a href="#" className="hover:text-white transition-colors">PRICING</a>
          <a href="#" className="hover:text-white transition-colors">CONTACT</a>
          <button className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full text-white border border-white/20 backdrop-blur-sm transition-all">
            SIGN IN
          </button>
        </div>

        {/* Welcome Text */}
        <div className="relative z-10 w-full max-w-2xl text-right">
          <h1 className="text-7xl font-black text-white mb-6 tracking-tight drop-shadow-lg">
            Welcome.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed ml-auto max-w-md drop-shadow-md">
            Empowering your business with intelligent CRM solutions and automated WhatsApp connectivity.
          </p>
          <div className="mt-8 text-white/60 text-sm">
            Not a member? <a href="#" className="text-white font-semibold hover:underline">Sign up now</a>
          </div>
        </div>
      </div>
    </div>
  );
}
