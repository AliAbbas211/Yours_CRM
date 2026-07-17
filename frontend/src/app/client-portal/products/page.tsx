'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Edit2, Search, Image as ImageIcon, Video, UploadCloud, X, Loader2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  images: string[];
  videos: string[];
  isActive: boolean;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [existingMedia, setExistingMedia] = useState<{ images: string[]; videos: string[] }>({ images: [], videos: [] });
  const [removeExisting, setRemoveExisting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch('http://localhost:5000/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setProducts(await res.json());
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(''); setDescription(''); setPrice(''); setCategory('');
    setFiles([]); setExistingMedia({ images: [], videos: [] });
    setRemoveExisting(false); setEditingId(null); setError('');
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description || '');
    setPrice(String(p.price));
    setCategory(p.category || '');
    setExistingMedia({ images: p.images || [], videos: p.videos || [] });
    setFiles([]);
    setRemoveExisting(false);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This also removes its images/videos from storage.')) return;
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchProducts();
    } catch (err) {
      console.error('Failed to delete product', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !price) {
      setError('Name and price are required.');
      return;
    }
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('crm_token');
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', category);
      if (removeExisting) formData.append('removeExistingMedia', 'true');
      files.forEach((f) => formData.append('media', f));

      const url = editingId ? `http://localhost:5000/api/products/${editingId}` : 'http://localhost:5000/api/products';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchProducts();
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to save product');
      }
    } catch (err) {
      console.error('Failed to save product', err);
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0a1142]">Products</h2>
          <p className="text-gray-500 mt-1 font-medium">
            Manage your catalog. Your WhatsApp AI shows these images, videos, and prices to customers automatically.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 bg-[#d51381] hover:bg-[#b00e6a] text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-pink-500/30 font-semibold"
        >
          <Plus className="w-5 h-5" />
          <span>Add Product</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center space-x-4 shadow-sm">
        <Search className="w-5 h-5 text-gray-400 ml-2" />
        <input
          type="text"
          placeholder="Search products..."
          className="flex-1 outline-none text-gray-700 font-medium bg-transparent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 font-medium">Loading products...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <Package className="w-16 h-16 mx-auto text-gray-200 mb-4" />
          <h3 className="text-xl font-bold text-gray-800">No products yet</h3>
          <p className="text-gray-500 mt-2">Add your first product so your AI bot can show it to customers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group">
              <div className="h-40 bg-gray-50 flex items-center justify-center overflow-hidden relative">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-10 h-10 text-gray-300" />
                )}
                {!p.isActive && (
                  <span className="absolute top-2 left-2 bg-gray-800/80 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                    Inactive
                  </span>
                )}
                <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(p)} className="p-2 bg-white/90 text-blue-500 rounded-lg shadow-sm hover:bg-white">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 bg-white/90 text-red-500 rounded-lg shadow-sm hover:bg-white">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-[#0a1142] text-lg">{p.name}</h3>
                  <span className="font-extrabold text-[#d51381]">£{Number(p.price).toFixed(2)}</span>
                </div>
                {p.category && (
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{p.category}</span>
                )}
                <p className="text-sm text-gray-500 font-medium line-clamp-2 flex-1">{p.description}</p>
                <div className="flex items-center space-x-3 mt-4 text-xs text-gray-400 font-bold">
                  <span className="flex items-center"><ImageIcon className="w-3.5 h-3.5 mr-1" /> {p.images?.length || 0}</span>
                  <span className="flex items-center"><Video className="w-3.5 h-3.5 mr-1" /> {p.videos?.length || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0a1142]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-[#0a1142] flex items-center">
                <Package className="w-6 h-6 mr-2" /> {editingId ? 'Edit Product' : 'Add Product'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto">
              {error && (
                <div className="mb-5 p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#445b76] uppercase tracking-wider mb-2">Product Name *</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#445b76] uppercase tracking-wider mb-2">Price *</label>
                    <input type="number" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#445b76] uppercase tracking-wider mb-2">Category</label>
                    <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Pizza"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#445b76] uppercase tracking-wider mb-2">Description</label>
                  <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#d51381] focus:ring-1 focus:ring-[#d51381] outline-none resize-none" />
                </div>

                {(existingMedia.images.length > 0 || existingMedia.videos.length > 0) && !removeExisting && (
                  <div>
                    <label className="block text-xs font-bold text-[#445b76] uppercase tracking-wider mb-2">Current Media</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {existingMedia.images.map((url, i) => (
                        <img key={i} src={url} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                      ))}
                      {existingMedia.videos.map((url, i) => (
                        <div key={i} className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                          <Video className="w-6 h-6 text-gray-400" />
                        </div>
                      ))}
                    </div>
                    <label className="flex items-center space-x-2 text-xs font-bold text-gray-500">
                      <input type="checkbox" checked={removeExisting} onChange={(e) => setRemoveExisting(e.target.checked)} />
                      <span>Replace all existing media with new uploads below</span>
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#445b76] uppercase tracking-wider mb-2">
                    {editingId ? 'Add More Images / Videos' : 'Upload Images / Videos'}
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
                    <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#d51381]/10 file:text-[#d51381] hover:file:bg-[#d51381]/20 cursor-pointer"
                    />
                    {files.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2 font-medium">{files.length} file(s) selected</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end space-x-3">
                  <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}
                    className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting}
                    className="px-6 py-3 bg-[#0a1142] hover:bg-[#131b54] text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center">
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isSubmitting ? 'Saving...' : 'Save Product'}
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
