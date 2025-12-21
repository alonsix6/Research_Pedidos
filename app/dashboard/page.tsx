'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Request } from '@/lib/types';
import { classifyByUrgency } from '@/lib/utils';
import { Plus, RefreshCw, Lightbulb, MessageSquare } from 'lucide-react';

// Device components
import DeviceFrame from './components/device/DeviceFrame';
import TopBar from './components/device/TopBar';
import SpeakerGrille from './components/device/SpeakerGrille';
import StatsDisplay from './components/device/StatsDisplay';
import SectionHeader from './components/device/SectionHeader';

// Controls
import Button3D from './components/controls/Button3D';
import Knob from './components/controls/Knob';

// Cards
import PedidoPad from './components/PedidoPad';
import PedidoModal from './components/PedidoModal';

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
    }
  }

  function handleEdit(request: Request) {
    setEditingRequest(request);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Seguro que deseas eliminar este pedido?')) return;

    try {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadRequests();
    } catch (err) {
      console.error('Error deleting request:', err);
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

  const activeRequests = requests.filter(
    (r) => r.status === 'pending' || r.status === 'in_progress'
  );
  const completedRequests = requests.filter((r) => r.status === 'completed');
  const { urgent, thisWeek, later } = classifyByUrgency(activeRequests);

  return (
    <DeviceFrame>
      {/* Top Bar con indicadores */}
      <TopBar isConnected={!error} />

      {/* Header Section */}
      <div className="flex items-start justify-between p-4 pb-2">
        {/* Branding */}
        <div>
          <h1
            className="text-lg font-bold tracking-wide"
            style={{ color: '#1A1A1A' }}
          >
            RESET R&A
          </h1>
          <p
            className="text-[10px] uppercase tracking-wider"
            style={{ color: '#666' }}
          >
            Sistema de Pedidos v1.0
          </p>
        </div>

        {/* Speaker Grille decorativo */}
        <SpeakerGrille rows={6} cols={16} />
      </div>

      {/* Pantalla LCD con Stats */}
      <div className="px-4 py-2">
        {loading ? (
          <div className="lcd-screen p-8 text-center">
            <p className="lcd-number text-lg">LOADING...</p>
          </div>
        ) : error ? (
          <div className="lcd-screen p-8 text-center">
            <p className="text-[#CE2021] text-sm mb-4">{error}</p>
            <Button3D variant="orange" onClick={loadRequests}>
              REINTENTAR
            </Button3D>
          </div>
        ) : (
          <StatsDisplay
            total={requests.length}
            active={activeRequests.length}
            completed={completedRequests.length}
            urgent={urgent.length}
          />
        )}
      </div>

      {/* Seccion de Controles */}
      <div
        className="flex items-center justify-between px-4 py-3 mx-4 rounded-sm"
        style={{
          background: 'linear-gradient(180deg, #D0D0D0 0%, #C0C0C0 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)',
        }}
      >
        {/* Knob decorativo */}
        <Knob label="VOLUME" size="sm" value={75} />

        {/* Botones de accion */}
        <div className="flex items-center gap-2">
          <Button3D variant="orange" onClick={handleOpenNewModal} className="flex items-center gap-2">
            <Plus size={14} />
            NUEVO
          </Button3D>
          <Button3D variant="black" onClick={loadRequests} className="flex items-center gap-2">
            <RefreshCw size={14} />
            REFRESH
          </Button3D>
        </div>

        {/* Knob decorativo */}
        <Knob label="BPM" subLabel="SWING" variant="orange" size="sm" value={60} />
      </div>

      {/* Contenido Principal - Lista de Pedidos */}
      <div className="p-4 space-y-6">
        {/* Urgentes */}
        {urgent.length > 0 && (
          <section>
            <SectionHeader
              title="URGENTES"
              count={urgent.length}
              color="red"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {urgent.map((request) => (
                <PedidoPad
                  key={request.id}
                  request={request}
                  onComplete={handleComplete}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        )}

        {/* Esta semana */}
        {thisWeek.length > 0 && (
          <section>
            <SectionHeader
              title="ESTA SEMANA"
              count={thisWeek.length}
              color="orange"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {thisWeek.map((request) => (
                <PedidoPad
                  key={request.id}
                  request={request}
                  onComplete={handleComplete}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        )}

        {/* Proximos */}
        {later.length > 0 && (
          <section>
            <SectionHeader
              title="PROXIMOS"
              count={later.length}
              color="green"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {later.map((request) => (
                <PedidoPad
                  key={request.id}
                  request={request}
                  onComplete={handleComplete}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        )}

        {/* Completados */}
        {completedRequests.length > 0 && (
          <section>
            <SectionHeader
              title="COMPLETADOS"
              count={completedRequests.length}
              color="cyan"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {completedRequests.slice(0, 6).map((request) => (
                <PedidoPad
                  key={request.id}
                  request={request}
                />
              ))}
            </div>
          </section>
        )}

        {/* Estado vacio */}
        {!loading && activeRequests.length === 0 && (
          <div className="lcd-screen p-8 text-center">
            <p className="lcd-number text-lg mb-2">NO DATA</p>
            <p className="text-[#666] text-xs mb-4">No hay pedidos activos</p>
            <Button3D variant="orange" onClick={handleOpenNewModal}>
              CREAR PRIMER PEDIDO
            </Button3D>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-3 mt-4"
        style={{
          background: 'linear-gradient(180deg, #B8B8B8 0%, #A8A8A8 100%)',
          borderTop: '1px solid rgba(255,255,255,0.3)',
        }}
      >
        <div className="flex items-center gap-2 text-[10px]" style={{ color: '#555' }}>
          <Lightbulb size={12} />
          <span>TIP: Usa el bot de Telegram para agregar pedidos rapidamente</span>
        </div>
        <a
          href="https://t.me/Research_Pedidos_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] hover:text-[#FF4500] transition-colors"
          style={{ color: '#555' }}
        >
          <MessageSquare size={12} />
          @Research_Pedidos_bot
        </a>
      </div>

      {/* Modal */}
      <PedidoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={loadRequests}
        editingRequest={editingRequest}
      />
    </DeviceFrame>
  );
}
