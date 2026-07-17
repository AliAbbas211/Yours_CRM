'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Link as LinkIcon, FileText, Search, Image as ImageIcon, Video, UploadCloud, Edit2 } from 'lucide-react';

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Modal Form State
  const [activeTab, setActiveTab] = useState<'TEXT' | 'FILE' | 'URL'>('TEXT');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('FAQ');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/knowledge-bases', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Failed to fetch KB entries', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge base entry?')) return;
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`http://localhost:5000/api/knowledge-bases/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchEntries();
      }
    } catch (error) {
      console.error('Failed to delete KB entry', error);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content || '');
    setCategory(entry.category || '');
    setType(entry.type || 'FAQ');
    // If it's a file, we could show FILE tab, but to edit text/title of anything, TEXT is safest
    setActiveTab('TEXT');
    setIsModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('crm_token');
      
      let res;
      if (activeTab === 'FILE' && file) {
        const formData = new FormData();
        formData.append('file', file);
        if (title) formData.append('title', title);
        
        res = await fetch('http://localhost:5000/api/knowledge-bases', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
      } else {
        const payloadType = activeTab === 'URL' ? 'URL' : type;
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `http://localhost:5000/api/knowledge-bases/${editingId}` : 'http://localhost:5000/api/knowledge-bases';
        res = await fetch(url, {
          method,
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ title, type: payloadType, content, category })
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        setTitle(''); setContent(''); setCategory(''); setType('FAQ'); setFile(null); setActiveTab('TEXT'); setEditingId(null);
        fetchEntries();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to add entry');
      }
    } catch (error) {
      console.error('Failed to add KB entry', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEntries = entries.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) || 
    (e.content && e.content.toLowerCase().includes(search.toLowerCase())) ||
    (e.category && e.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0a1142]">Knowledge Base</h2>
          <p className="text-gray-500 mt-1 font-medium">Train your AI Agent with custom FAQs, website links, and documents.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => {
              setEditingId(null);
              setTitle(''); setContent(''); setCategory('');
              setActiveTab('URL');
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-white border border-gray-200 text-[#0a1142] hover:bg-gray-50 px-4 py-2.5 rounded-xl transition-all font-semibold shadow-sm"
          >
            <LinkIcon className="w-5 h-5 text-[#d51381]" />
            <span>Add Website</span>
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              setTitle(''); setContent(''); setCategory('');
              setActiveTab('TEXT');
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-[#d51381] hover:bg-[#b00e6a] text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-pink-500/30 font-semibold"
          >
            <Plus className="w-5 h-5" />
            <span>Add Source</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center space-x-4 shadow-sm">
        <Search className="w-5 h-5 text-gray-400 ml-2" />
        <input 
          type="text" 
          placeholder="Search knowledge base..." 
          className="flex-1 outline-none text-gray-700 font-medium bg-transparent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 font-medium">Loading knowledge base...</div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <BookOpen className="w-16 h-16 mx-auto text-gray-200 mb-4" />
          <h3 className="text-xl font-bold text-gray-800">No entries found</h3>
          <p className="text-gray-500 mt-2">Your AI has nothing to learn from yet. Add some data!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntries.map(entry => (
            <div key={entry.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group">
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                    entry.fileType === 'picture' ? 'bg-pink-50 text-pink-500 border border-pink-100' :
                    entry.fileType === 'video' ? 'bg-red-50 text-red-500 border border-red-100' :
                    entry.fileType === 'document' ? 'bg-indigo-50 text-indigo-500 border border-indigo-100' :
                    entry.type === 'FAQ' ? 'bg-orange-50 text-orange-500 border border-orange-100' :
                    entry.type === 'URL' ? 'bg-blue-50 text-blue-500 border border-blue-100' :
                    'bg-purple-50 text-purple-500 border border-purple-100'
                  }`}>
                    {entry.fileType === 'picture' ? <ImageIcon className="w-6 h-6" /> :
                     entry.fileType === 'video' ? <Video className="w-6 h-6" /> :
                     entry.type === 'URL' ? <LinkIcon className="w-6 h-6" /> : 
                     <FileText className="w-6 h-6" />}
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(entry)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-[#0a1142] mb-2">{entry.title}</h3>
                <p className="text-sm text-gray-500 font-medium line-clamp-3 mb-4 flex-1">
                  {entry.content}
                </p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold text-gray-600 bg-gray-100 uppercase tracking-wider">
                    {entry.fileType ? entry.fileType : entry.type}
                  </span>
                  {entry.category && (
                    <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">
                      {entry.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0a1142]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-[#0a1142] flex items-center">
                <BookOpen className="w-6 h-6 mr-2 text-[#0a1142]" /> {editingId ? 'Edit Knowledge Article' : 'Add Knowledge Article'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                ✕
              </button>
            </div>
            
            <div className="p-8">
              <div className="flex space-x-2 mb-6 bg-gray-50 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('TEXT')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'TEXT' ? 'bg-white text-[#0a1142] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Text / Mapping
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('URL')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'URL' ? 'bg-white text-[#0a1142] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Website Link
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('FILE')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'FILE' ? 'bg-white text-[#0a1142] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  File Upload
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-5">
                {activeTab === 'TEXT' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-[#445b76] uppercase tracking-wider mb-2">TOPIC / QUESTION</label>
                      <input 
                        type="text" 
                        required
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none transition-colors"
                        placeholder="e.g. Refund Policy"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#445b76] uppercase tracking-wider mb-2">
                        CONTENT / MAPPING
                      </label>
                      <textarea 
                        required
                        rows={5}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none transition-colors resize-none"
                        placeholder="e.g. We offer a 30-day money back guarantee..."
                      />
                    </div>
                  </>
                ) : activeTab === 'URL' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-[#445b76] uppercase tracking-wider mb-2">CUSTOM TITLE (OPTIONAL)</label>
                      <input 
                        type="text" 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none transition-colors"
                        placeholder="Leave blank to use Website Title"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#445b76] uppercase tracking-wider mb-2">
                        WEBSITE URL
                      </label>
                      <input 
                        type="url"
                        required
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none transition-colors"
                        placeholder="e.g. https://www.yourcompany.com/about"
                      />
                      <p className="text-xs text-gray-400 mt-2">
                        We will automatically visit this URL, extract the text, and save it to the Knowledge Base.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-[#445b76] uppercase tracking-wider mb-2">CUSTOM TITLE (OPTIONAL)</label>
                      <input 
                        type="text" 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none transition-colors"
                        placeholder="Leave blank to use filename"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#445b76] uppercase tracking-wider mb-2">
                        UPLOAD FILE (IMAGE, VIDEO, PDF, DOCX, XLSX)
                      </label>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
                        <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <input 
                          type="file" 
                          required
                          onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#d51381]/10 file:text-[#d51381] hover:file:bg-[#d51381]/20 cursor-pointer"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4 flex items-center justify-end space-x-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-[#0a1142] hover:bg-[#131b54] text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Knowledge'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
