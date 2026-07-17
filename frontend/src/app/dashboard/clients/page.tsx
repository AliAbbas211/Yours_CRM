'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Eye, Edit, Trash2, Mail, Phone, ShieldAlert } from 'lucide-react';
import AddClientModal from '@/components/AddClientModal';
import EditClientModal from '@/components/EditClientModal';
import Client360Modal from '../../../components/Client360Modal';

interface Client {
  id: string;
  ownerName?: string;
  companyName?: string;
  instanceName?: string;
  email?: string;
  phoneNumber?: string;
  status?: string;
  agentConfig?: {
    disabledBySuperAdmin?: boolean;
    scheduleEnabled?: boolean;
    scheduleStartTime?: string;
    scheduleEndTime?: string;
    timezone?: string;
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const response = await fetch('http://localhost:5000/api/clients', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data: Client[] = await response.json();
        setClients(data);
        // Keep the currently-open 360 modal in sync with fresh data
        if (selectedClient) {
          const updated = data.find((c) => c.id === selectedClient.id);
          if (updated) setSelectedClient(updated);
        }
      }
    } catch (error) {
      console.error('Failed to fetch clients', error);
    } finally {
      setLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    const loadClients = async () => {
      await fetchClients();
    };

    void loadClients();
  }, [fetchClients]);

  const deleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      const token = localStorage.getItem('crm_token');
      await fetch(`http://localhost:5000/api/clients/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchClients();
    } catch (error) {
      console.error('Failed to delete client', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0a1142]">Clients</h2>
          <p className="text-gray-500 mt-1 font-medium">Manage your tenant client accounts and subscriptions.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-2 bg-[#d51381] hover:bg-[#b00e6a] text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-pink-500/30 font-semibold"
        >
          <Plus className="w-5 h-5" />
          <span>Add Client</span>
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-white">
              <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">CUSTOMER IDENTITY</th>
              <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">INSTANCE NAME</th>
              <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">AUTH (WHATSAPP/EMAIL)</th>
              <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider">STATUS</th>
              <th className="p-4 font-bold text-[#899bb1] text-xs uppercase tracking-wider text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">Loading clients...</td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">No clients found. Add one to get started.</td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors bg-white">

                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-lg">
                        {client.ownerName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-[#0a1142] text-sm">{client.ownerName}</p>
                        <p className="text-gray-400 text-xs font-medium">{client.companyName}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold text-[#445b76] bg-[#f1f5f9] border border-gray-200">
                      {client.instanceName || 'N/A'}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-xs text-[#5c728a] font-medium">
                        <Mail className="w-3.5 h-3.5 mr-2 text-gray-400" />
                        {client.email}
                      </div>
                      <div className="flex items-center text-xs text-[#5c728a] font-medium">
                        <Phone className="w-3.5 h-3.5 mr-2 text-gray-400" />
                        {client.phoneNumber}
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      {client.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[#dc2626] bg-[#fef2f2] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          {client.status}
                        </span>
                      )}
                      {client.agentConfig?.disabledBySuperAdmin && (
                        <span title="Bot disabled by super admin" className="inline-flex items-center text-red-600">
                          <ShieldAlert className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 border border-[#f97316] text-[#f97316] rounded-md hover:bg-orange-50 transition-colors font-bold text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        <span>360 View</span>
                      </button>

                      <button
                        onClick={() => setEditingClient(client)}
                        className="p-1.5 text-[#f97316] bg-[#fff7ed] rounded-md hover:bg-orange-100 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteClient(client.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchClients}
      />

      <EditClientModal
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        onSuccess={fetchClients}
        client={editingClient}
      />

      <Client360Modal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        client={
          selectedClient
            ? {
                id: selectedClient.id,
                ownerName: selectedClient.ownerName || '',
                companyName: selectedClient.companyName || '',
                instanceName: selectedClient.instanceName || '',
                email: selectedClient.email || '',
                phoneNumber: selectedClient.phoneNumber || '',
                status:
                  selectedClient.status === 'ACTIVE' || selectedClient.status === 'SUSPENDED'
                    ? selectedClient.status
                    : 'ACTIVE',
                agentConfig: selectedClient.agentConfig || undefined,
              }
            : null
        }
        onRefresh={fetchClients}
      />
    </div>
  );
}
