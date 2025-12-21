'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Request } from '@/lib/types';
import { classifyByUrgency } from '@/lib/utils';
import StatsBar from './components/StatsBar';
import PedidosList from './components/PedidosList';
import PedidoModal from './components/PedidoModal';
import {
  SectionUrgent,
  SectionThisWeek,
  SectionLater,
  SectionCompleted,
  PlusIcon,
  TipIcon,
  AlertIcon,
  CheckIcon,
} from './components/Icons';

export default function DashboardPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('deadline', { ascending: true });

      if (error) throw error;

      setRequests(data || []);
    } catch (err) {
      console.error('Error loading requests:', err);
      setError('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(id: string) {
    try {
      const { error } = await supabase
        .from('requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      loadRequests();
    } catch (err) {
      console.error('Error completing request:', err);
      alert('Error al completar el pedido');
    }
  }

  function handleEdit(request: Request) {
    setEditingRequest(request);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Estas seguro de eliminar este pedido?')) return;

    try {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadRequests();
    } catch (err) {
      console.error('Error deleting request:', err);
      alert('Error al eliminar el pedido');
    }
  }

  function handleOpenNewModal() {
    setEditingRequest(null);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingRequest(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-op1-bg p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-op1-text-secondary">Cargando pedidos...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-op1-bg p-6">
        <div className="max-w-4xl mx-auto">
          <div className="card-op1 text-center py-12">
            <p className="text-op1-accent mb-4 flex items-center justify-center gap-2">
              <AlertIcon size={16} />
              {error}
            </p>
            <button onClick={loadRequests} className="btn-op1">
              Reintentar
            </button>
          </div>
        </div>
      </main>
    );
  }

  const activeRequests = requests.filter(
    (r) => r.status === 'pending' || r.status === 'in_progress'
  );
  const completedRequests = requests.filter((r) => r.status === 'completed');

  const { urgent, thisWeek, later } = classifyByUrgency(activeRequests);

  return (
    <main className="min-h-screen bg-op1-bg p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-xl font-bold uppercase tracking-wide">
              RESET R&A - PEDIDOS
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenNewModal}
                className="btn-op1-accent flex items-center gap-2"
              >
                <PlusIcon size={16} />
                Nuevo Pedido
              </button>
              <a
                href="https://t.me/Research_Pedidos_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-op1-text-secondary hover:text-op1-accent transition-op1"
              >
                @Research_Pedidos_bot
              </a>
            </div>
          </div>
          <p className="text-xs text-op1-text-secondary">
            Dashboard de gestion de pedidos
          </p>
        </header>

        {/* Stats */}
        <StatsBar
          total={requests.length}
          active={activeRequests.length}
          completed={completedRequests.length}
        />

        {/* Pedidos urgentes */}
        <PedidosList
          title="URGENTES - Vencen hoy o estan atrasados"
          icon={<SectionUrgent size={16} />}
          requests={urgent}
          emptyMessage="No hay pedidos urgentes. Todo bajo control!"
          emptyIcon={<CheckIcon size={14} style={{ color: '#00CC66' }} />}
          onComplete={handleComplete}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Pedidos de esta semana */}
        <PedidosList
          title="ESTA SEMANA - Proximos 7 dias"
          icon={<SectionThisWeek size={16} />}
          requests={thisWeek}
          emptyMessage="No hay pedidos para esta semana"
          onComplete={handleComplete}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Pedidos futuros */}
        <PedidosList
          title="PROXIMOS - Mas de 7 dias"
          icon={<SectionLater size={16} />}
          requests={later}
          emptyMessage="No hay pedidos programados a largo plazo"
          onComplete={handleComplete}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Completados recientes */}
        {completedRequests.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-300">
            <PedidosList
              title="COMPLETADOS"
              icon={<SectionCompleted size={16} />}
              requests={completedRequests.slice(0, 5)}
              emptyMessage=""
            />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-op1-text-secondary">
          <p className="flex items-center justify-center gap-2">
            <TipIcon size={14} />
            Tip: Usa el bot de Telegram (@Research_Pedidos_bot) para agregar
            pedidos facilmente
          </p>
          <p className="mt-2">Reset R&A - {new Date().getFullYear()}</p>
        </footer>
      </div>

      {/* Modal */}
      <PedidoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={loadRequests}
        editingRequest={editingRequest}
      />
    </main>
  );
}
