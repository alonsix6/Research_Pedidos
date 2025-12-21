'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Request } from '@/lib/types';
import { classifyByUrgency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animations';
import {
  Plus,
  RefreshCw,
  Lightbulb,
  MessageSquare,
  Search,
  Volume2,
  VolumeX,
  Grid,
  List,
  History,
  Keyboard,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

// Hooks
import { useSettings } from '@/lib/hooks/useSettings';
import { useAppSound } from '@/lib/hooks/useAppSound';
import { useKeyboardShortcuts, createDashboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useRealtimeRequests } from '@/lib/hooks/useRealtimeRequests';
import { useToast } from './components/Toast';

// Device components
import DeviceFrame from './components/device/DeviceFrame';
import TopBar from './components/device/TopBar';
import SpeakerGrille from './components/device/SpeakerGrille';
import StatsDisplay from './components/device/StatsDisplay';
import SectionHeader from './components/device/SectionHeader';

// Controls
import Button3D from './components/controls/Button3D';

// Cards & Components
import PedidoPad from './components/PedidoPad';
import PedidoModal from './components/PedidoModal';
import SearchFilter from './components/SearchFilter';
import HistoryModal from './components/HistoryModal';
import ShortcutsModal from './components/ShortcutsModal';
import { StatsSkeleton, SectionSkeleton } from './components/LoadingSkeleton';

const MAX_VISIBLE_COMPLETED = 3;

export default function DashboardPage() {
  // Settings & Preferences
  const { settings, toggleSound, toggleCompactView } = useSettings();
  const { playClick, playSuccess, playWhoosh, playNotification } = useAppSound(settings.soundEnabled);
  const { showToast } = useToast();

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Realtime data
  const { requests, loading, error, isConnected, refresh } = useRealtimeRequests({
    onInsert: (req) => {
      playNotification();
      showToast('notification', 'Nuevo pedido', `${req.client}: ${req.description.slice(0, 50)}...`);
    },
    onUpdate: () => {
      playWhoosh();
    },
  });

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handlers
  const handleOpenNewModal = useCallback(() => {
    playClick();
    setEditingRequest(null);
    setIsModalOpen(true);
  }, [playClick]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingRequest(null);
    setIsSearchOpen(false);
    setIsHistoryOpen(false);
    setIsShortcutsOpen(false);
  }, []);

  const handleRefresh = useCallback(() => {
    playWhoosh();
    refresh();
    showToast('info', 'Actualizando...', 'Sincronizando con el servidor');
  }, [playWhoosh, refresh, showToast]);

  const handleToggleSearch = useCallback(() => {
    playClick();
    setIsSearchOpen((prev) => !prev);
    if (!isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [playClick, isSearchOpen]);

  const handleShowHelp = useCallback(() => {
    playClick();
    setIsShortcutsOpen(true);
  }, [playClick]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    shortcuts: createDashboardShortcuts({
      onNewRequest: handleOpenNewModal,
      onRefresh: handleRefresh,
      onCloseModal: handleCloseModal,
      onToggleSearch: handleToggleSearch,
      onShowHelp: handleShowHelp,
      onToggleCompactView: () => {
        playClick();
        toggleCompactView();
        showToast('info', settings.compactView ? 'Vista normal' : 'Vista compacta');
      },
      onToggleSound: () => {
        toggleSound();
      },
    }),
  });

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
      playSuccess();
      showToast('success', 'Completado!', 'El pedido ha sido marcado como completado');
    } catch (err) {
      console.error('Error completing request:', err);
      showToast('error', 'Error', 'No se pudo completar el pedido');
    }
  }

  function handleEdit(request: Request) {
    playClick();
    setEditingRequest(request);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Seguro que deseas eliminar este pedido?')) return;

    try {
      const { error } = await supabase.from('requests').delete().eq('id', id);

      if (error) throw error;
      showToast('info', 'Eliminado', 'El pedido ha sido eliminado');
    } catch (err) {
      console.error('Error deleting request:', err);
      showToast('error', 'Error', 'No se pudo eliminar el pedido');
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    console.log('Drag end:', active.id, 'over', over.id);
    playClick();
  }

  // Computed data
  const activeRequests = useMemo(() =>
    requests.filter((r) => r.status === 'pending' || r.status === 'in_progress'),
    [requests]
  );

  const completedRequests = useMemo(() =>
    requests.filter((r) => r.status === 'completed'),
    [requests]
  );

  // Filter & Sort
  const filteredRequests = useMemo(() => {
    let result = [...activeRequests];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.client.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.requester_name.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (settings.sortBy) {
        case 'deadline':
          comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          break;
        case 'priority':
          const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'client':
          comparison = a.client.localeCompare(b.client);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return settings.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [activeRequests, searchQuery, settings.sortBy, settings.sortOrder]);

  const { urgent, thisWeek, later } = useMemo(() =>
    classifyByUrgency(filteredRequests),
    [filteredRequests]
  );

  const visibleCompleted = completedRequests.slice(0, MAX_VISIBLE_COMPLETED);
  const hasMoreCompleted = completedRequests.length > MAX_VISIBLE_COMPLETED;

  return (
    <DeviceFrame>
      {/* Top Bar with connection indicator */}
      <TopBar isConnected={isConnected && !error} />

      {/* Header Section */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div>
          <h1 className="text-lg font-bold tracking-wide" style={{ color: '#1A1A1A' }}>
            RESET R&A
          </h1>
          <p className="text-[10px] uppercase tracking-wider flex items-center gap-2" style={{ color: '#666' }}>
            Sistema de Pedidos v2.0
            <span className="flex items-center gap-1">
              {isConnected ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1 text-[#00C853]"
                >
                  <Wifi size={10} />
                  <span className="text-[8px]">LIVE</span>
                </motion.span>
              ) : (
                <span className="flex items-center gap-1 text-[#E53935]">
                  <WifiOff size={10} />
                  <span className="text-[8px]">OFFLINE</span>
                </span>
              )}
            </span>
          </p>
        </div>
        <SpeakerGrille rows={6} cols={16} />
      </div>

      {/* LCD Stats Display */}
      <div className="px-4 py-2">
        {loading ? (
          <StatsSkeleton />
        ) : error ? (
          <div className="lcd-screen p-8 text-center">
            <p className="text-[#CE2021] text-sm mb-4">{error}</p>
            <Button3D variant="orange" onClick={handleRefresh}>
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

      {/* Controls Section */}
      <div
        className="flex items-center justify-between px-4 py-3 mx-4 rounded-sm"
        style={{
          background: 'linear-gradient(180deg, #D0D0D0 0%, #C0C0C0 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)',
        }}
      >
        {/* Left controls */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={toggleSound}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(180deg, #4A4A4A 0%, #3A3A3A 100%)',
              boxShadow: '0 2px 0 #2A2A2A, inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, y: 1 }}
            title={settings.soundEnabled ? 'Desactivar sonido (Alt+M)' : 'Activar sonido (Alt+M)'}
          >
            {settings.soundEnabled ? (
              <Volume2 size={12} className="text-[#00E5FF]" />
            ) : (
              <VolumeX size={12} className="text-gray-500" />
            )}
          </motion.button>

          <motion.button
            onClick={toggleCompactView}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(180deg, #4A4A4A 0%, #3A3A3A 100%)',
              boxShadow: '0 2px 0 #2A2A2A, inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, y: 1 }}
            title={settings.compactView ? 'Vista normal (Alt+C)' : 'Vista compacta (Alt+C)'}
          >
            {settings.compactView ? (
              <List size={12} className="text-[#FF4500]" />
            ) : (
              <Grid size={12} className="text-gray-400" />
            )}
          </motion.button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button3D variant="black" onClick={handleToggleSearch} className="flex items-center gap-2" title="Buscar (Alt+K)">
            <Search size={14} />
          </Button3D>
          <Button3D variant="orange" onClick={handleOpenNewModal} className="flex items-center gap-2" title="Nuevo pedido (Alt+N)">
            <Plus size={14} />
            NUEVO
          </Button3D>
          <Button3D variant="black" onClick={handleRefresh} className="flex items-center gap-2" title="Refrescar (Alt+R)">
            <RefreshCw size={14} />
          </Button3D>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => { playClick(); setIsHistoryOpen(true); }}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(180deg, #4A4A4A 0%, #3A3A3A 100%)',
              boxShadow: '0 2px 0 #2A2A2A, inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, y: 1 }}
            title="Historial de completados"
          >
            <History size={12} className="text-gray-400" />
          </motion.button>

          <motion.button
            onClick={handleShowHelp}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(180deg, #4A4A4A 0%, #3A3A3A 100%)',
              boxShadow: '0 2px 0 #2A2A2A, inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, y: 1 }}
            title="Atajos de teclado (Alt+/)"
          >
            <Keyboard size={12} className="text-gray-400" />
          </motion.button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="px-4 mt-3">
        <SearchFilter
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {loading ? (
            <>
              <SectionSkeleton count={2} />
              <SectionSkeleton count={3} />
            </>
          ) : (
            <>
              {/* Urgentes */}
              <AnimatePresence mode="popLayout">
                {urgent.length > 0 && (
                  <motion.section
                    key="urgent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <SectionHeader title="URGENTES" count={urgent.length} color="red" />
                    <SortableContext items={urgent.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                      <motion.div
                        variants={staggerContainerVariants}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                      >
                        {urgent.map((request) => (
                          <motion.div key={request.id} variants={staggerItemVariants}>
                            <PedidoPad
                              request={request}
                              onComplete={handleComplete}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              compact={settings.compactView}
                              isDraggable
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    </SortableContext>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* Esta semana */}
              <AnimatePresence mode="popLayout">
                {thisWeek.length > 0 && (
                  <motion.section
                    key="thisWeek"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <SectionHeader title="ESTA SEMANA" count={thisWeek.length} color="orange" />
                    <SortableContext items={thisWeek.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                      <motion.div
                        variants={staggerContainerVariants}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                      >
                        {thisWeek.map((request) => (
                          <motion.div key={request.id} variants={staggerItemVariants}>
                            <PedidoPad
                              request={request}
                              onComplete={handleComplete}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              compact={settings.compactView}
                              isDraggable
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    </SortableContext>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* Proximos */}
              <AnimatePresence mode="popLayout">
                {later.length > 0 && (
                  <motion.section
                    key="later"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <SectionHeader title="PROXIMOS" count={later.length} color="green" />
                    <SortableContext items={later.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                      <motion.div
                        variants={staggerContainerVariants}
                        initial="initial"
                        animate="animate"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                      >
                        {later.map((request) => (
                          <motion.div key={request.id} variants={staggerItemVariants}>
                            <PedidoPad
                              request={request}
                              onComplete={handleComplete}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              compact={settings.compactView}
                              isDraggable
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    </SortableContext>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* Completados */}
              <AnimatePresence mode="popLayout">
                {completedRequests.length > 0 && (
                  <motion.section
                    key="completed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <SectionHeader title="COMPLETADOS" count={completedRequests.length} color="cyan" />
                      {hasMoreCompleted && (
                        <motion.button
                          onClick={() => { playClick(); setIsHistoryOpen(true); }}
                          className="text-[10px] uppercase tracking-wide text-[#00E5FF] hover:text-white transition-colors flex items-center gap-1"
                          whileHover={{ x: 3 }}
                        >
                          Ver todos ({completedRequests.length})
                          <History size={10} />
                        </motion.button>
                      )}
                    </div>
                    <motion.div
                      variants={staggerContainerVariants}
                      initial="initial"
                      animate="animate"
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                    >
                      {visibleCompleted.map((request) => (
                        <motion.div key={request.id} variants={staggerItemVariants}>
                          <PedidoPad request={request} compact={settings.compactView} />
                        </motion.div>
                      ))}
                    </motion.div>
                  </motion.section>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Empty state */}
          {!loading && activeRequests.length === 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="lcd-screen p-8 text-center">
              <p className="lcd-number text-lg mb-2">NO DATA</p>
              <p className="text-[#666] text-xs mb-4">No hay pedidos activos</p>
              <Button3D variant="orange" onClick={handleOpenNewModal}>CREAR PRIMER PEDIDO</Button3D>
            </motion.div>
          )}

          {/* Search no results */}
          {!loading && searchQuery && filteredRequests.length === 0 && activeRequests.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lcd-screen p-6 text-center">
              <Search size={24} className="mx-auto mb-3 text-gray-600" />
              <p className="text-sm text-gray-400 mb-1">No se encontraron resultados</p>
              <p className="text-xs text-gray-600">
                Intenta con otra busqueda o{' '}
                <button onClick={() => setSearchQuery('')} className="text-[#00E5FF] hover:underline">limpia el filtro</button>
              </p>
            </motion.div>
          )}
        </DndContext>
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
          <span>TIP: Presiona Alt+/ para ver los atajos de teclado</span>
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

      {/* Modals */}
      <PedidoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={() => {
          playSuccess();
          showToast('success', editingRequest ? 'Actualizado!' : 'Creado!', 'El pedido ha sido guardado');
        }}
        editingRequest={editingRequest}
      />

      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </DeviceFrame>
  );
}
