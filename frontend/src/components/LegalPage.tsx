import React from 'react';

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <article className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 text-gray-800 leading-relaxed">
        <p className="text-sm font-semibold text-[#d51381] mb-2">YOURSTECHHUB · Yours CRM</p>
        <h1 className="text-3xl font-bold text-[#0a1142] mb-1">{title}</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {updated}</p>
        <div className="space-y-5 text-[15px]">{children}</div>
        <p className="mt-10 pt-6 border-t border-gray-100 text-sm text-gray-500">
          YOURSTECHHUB, Karachi, Pakistan · info@yourstechhub.com · https://yourstechhub.com
        </p>
      </article>
    </main>
  );
}

export const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold text-[#0a1142] pt-2">{children}</h2>
);
