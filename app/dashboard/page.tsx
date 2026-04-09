'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Request, RequestStatus } from '@/lib/types';
import { classifyByUrgency } from '@/lib/utils';
import { logActivity } from '@/lib/activityLog';
import { canTransition } from '@/lib/statusMachine';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animations';
import {
  Plus,
  RefreshCw,
  Lightbulb,
  MessageSquare,
  Search,
  History,
  Keyboard,
  Wifi,
  WifiOff,
  LayoutGrid,
  List,
  BarChart3,
} from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
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
import { useTeamMembers } from '@/lib/hooks/useTeamMembers';
import { useTheme } from '@/lib/hooks/useTheme';
import { useToast } from './components/Toast';
import { useTeamInfo } from '@/lib/hooks/useTeamInfo';

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
import SettingsDropdown from './components/SettingsDropdown';
import { StatsSkeleton, SectionSkeleton } from './components/LoadingSkeleton';
import PedidoDetailPanel from './components/PedidoDetailPanel';
import KanbanBoard from './components/KanbanBoard';
import AnalyticsPanel from './components/AnalyticsPanel';

const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID;
const MAX_VISIBLE_COMPLETED = 3;

type ViewMode = 'list' | 'kanban';

export default function DashboardPage() {
  // Settings & Preferences
  const { settings, toggleSound, toggleCompactView } = useSettings();
  const { playClick, playSuccess, playWhoosh, playNotification } = useAppSound(settings.soundEnabled);
  const { showToast } = useToast();
  const { theme, toggleTheme, isDark } = useTheme();

  // Team info
  const { team } = useTeamInfo();

  // Team members
  const { members: teamMembers } = useTeamMembers();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Detail Panel
  const [detailRequest, setDetailRequest] = useState<Request | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Realtime data with optimistic updates
  const { requests, loading, error, isConnected, refresh, optimisticUpdate, optimisticDelete } = useRealtimeRequests({
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
    const request = requests.find((r) => r.id === id);
    if (!request) return;

    // Optimistic update
    optimisticUpdate(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    try {
      let query = supabase
        .from('requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status_changed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (TEAM_ID) {
        query = query.eq('team_id', TEAM_ID);
      }

      const { error } = await query;
      if (error) throw error;

      // Log activity
      await logActivity(id, null, 'completed', {
        from_status: request.status,
        to_status: 'completed',
      });

      playSuccess();
      showToast('success', 'Completado!', 'El pedido ha sido marcado como completado');
    } catch (err) {
      console.error('Error completing request:', err);
      // Revert optimistic update
      optimisticUpdate(id, { status: request.status, completed_at: null });
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

    const request = requests.find((r) => r.id === id);
    // Optimistic delete
    optimisticDelete(id);

    try {
      let query = supabase.from('requests').delete().eq('id', id);

      if (TEAM_ID) {
        query = query.eq('team_id', TEAM_ID);
      }

      const { error } = await query;
      if (error) throw error;
      showToast('info', 'Eliminado', 'El pedido ha sido eliminado');
    } catch (err) {
      console.error('Error deleting request:', err);
      // Revert - refresh to get original state
      refresh();
      showToast('error', 'Error', 'No se pudo eliminar el pedido');
    }
  }

  function handleOpenDetail(request: Request) {
    playClick();
    setDetailRequest(request);
  }

  function handleStatusChange(id: string, newStatus: RequestStatus) {
    // Optimistic update
    optimisticUpdate(id, {
      status: newStatus,
      updated_at: new Date().toISOString(),
      status_changed_at: new Date().toISOString(),
      ...(newStatus === 'completed' && { completed_at: new Date().toISOString() }),
    });

    // Update the detail panel's request if it's open
    if (detailRequest?.id === id) {
      setDetailRequest((prev) =>
        prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : null
      );
    }

    playSuccess();
    showToast('success', 'Estado actualizado', `Cambiado a ${newStatus}`);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    playClick();
  }

  // Computed data
  const activeRequests = useMemo(() =>
    requests.filter((r) => r.status !== 'completed' && r.status !== 'cancelled'),
    [requests]
  );

  const completedRequests = useMemo(() =>
    requests.filter((r) => r.status === 'completed'),
    [requests]
  );

  // Calculate requests by member
  const requestsByMember = useMemo(() => {
    const counts: Record<string, number> = {};
    activeRequests.forEach((r) => {
      if (r.assigned_to) {
        counts[r.assigned_to] = (counts[r.assigned_to] || 0) + 1;
      }
    });
    return counts;
  }, [activeRequests]);

  // Filtered stats for LCD display
  const filteredStats = useMemo(() => {
    if (selectedMember === null) {
      return {
        total: requests.length,
        active: activeRequests.length,
        completed: completedRequests.length,
        urgent: activeRequests.filter(r => r.priority === 'urgent' || r.priority === 'high').length,
      };
    }

    const memberRequests = requests.filter(r => r.assigned_to === selectedMember);
    const memberActive = memberRequests.filter(r => r.status !== 'completed' && r.status !== 'cancelled');
    const memberCompleted = memberRequests.filter(r => r.status === 'completed');
    const memberUrgent = memberActive.filter(r => r.priority === 'urgent' || r.priority === 'high');

    return {
      total: memberRequests.length,
      active: memberActive.length,
      completed: memberCompleted.length,
      urgent: memberUrgent.length,
    };
  }, [requests, activeRequests, completedRequests, selectedMember]);

  // Filter & Sort
  const filteredRequests = useMemo(() => {
    let result = [...activeRequests];

    // Filter by selected team member
    if (selectedMember !== null) {
      result = result.filter((r) => r.assigned_to === selectedMember);
    }

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
  }, [activeRequests, selectedMember, searchQuery, settings.sortBy, settings.sortOrder]);

  const { urgent, thisWeek, later } = useMemo(() =>
    classifyByUrgency(filteredRequests),
    [filteredRequests]
  );

  const visibleCompleted = completedRequests.slice(0, MAX_VISIBLE_COMPLETED);
  const hasMoreCompleted = completedRequests.length > MAX_VISIBLE_COMPLETED;

  // Render list section helper
  const renderSection = (title: string, items: Request[], color: 'red' | 'orange' | 'green' | 'cyan', sectionKey: string) => {
    if (items.length === 0) return null;
    return (
      <motion.section
        key={sectionKey}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <SectionHeader title={title} count={items.length} color={color} />
        <SortableContext items={items.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <motion.div
            variants={staggerContainerVariants}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {items.map((request) => (
              <motion.div key={request.id} variants={staggerItemVariants}>
                <PedidoPad
                  request={request}
                  onComplete={request.status === 'in_review' ? handleComplete : undefined}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onOpenDetail={handleOpenDetail}
                  compact={settings.compactView}
                  isDraggable
                />
              </motion.div>
            ))}
          </motion.div>
        </SortableContext>
      </motion.section>
    );
  };

  return (
    <ErrorBoundary>
    <DeviceFrame>
      {/* Top Bar with connection indicator - hidden on mobile */}
      <div className="decorative-mobile-hide">
        <TopBar isConnected={isConnected && !error} />
      </div>

      {/* Header Section */}
      <header className="flex items-start justify-between p-4 pb-2">
        <div>
          <h1 className="text-lg font-bold tracking-wide" style={{ color: 'var(--header-text)' }}>
            {team?.name?.toUpperCase() || 'PEDIDOS'}
          </h1>
          <p className="text-[10px] uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--footer-text)' }}>
            Sistema de Pedidos v3.0
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
        <div className="decorative-mobile-hide">
          <SpeakerGrille rows={6} cols={16} aria-hidden="true" />
        </div>
      </header>

      {/* Main content area - WCAG landmark */}
      <main id="main-content" role="main" aria-label="Panel de pedidos">
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
            total={filteredStats.total}
            active={filteredStats.active}
            completed={filteredStats.completed}
            urgent={filteredStats.urgent}
            teamMembers={teamMembers}
            selectedMember={selectedMember}
            onMemberSelect={(memberId) => {
              playClick();
              setSelectedMember(memberId);
            }}
            requestsByMember={requestsByMember}
          />
        )}
      </div>

      {/* Controls Section */}
      <div
        className="flex items-center justify-between px-4 py-3 mx-4 rounded-sm transition-all duration-300"
        style={{
          background: 'var(--controls-bg)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)',
        }}
      >
        {/* Left controls - Settings + View toggle */}
        <nav className="flex items-center gap-2" aria-label="Controles de visualización">
          <SettingsDropdown
            soundEnabled={settings.soundEnabled}
            onToggleSound={toggleSound}
            compactView={settings.compactView}
            onToggleCompactView={toggleCompactView}
            isDark={isDark}
            onToggleTheme={() => { playClick(); toggleTheme(); }}
          />
          {/* View mode toggle */}
          <div className="flex items-center rounded-sm overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <motion.button
              onClick={() => { playClick(); setViewMode('list'); }}
              className="p-1.5"
              style={{
                background: viewMode === 'list' ? 'rgba(255,69,0,0.3)' : 'transparent',
                color: viewMode === 'list' ? '#FF4500' : '#666',
              }}
              whileTap={{ scale: 0.95 }}
              aria-label="Vista de lista"
              title="Vista de lista"
            >
              <List size={14} />
            </motion.button>
            <motion.button
              onClick={() => { playClick(); setViewMode('kanban'); }}
              className="p-1.5"
              style={{
                background: viewMode === 'kanban' ? 'rgba(255,69,0,0.3)' : 'transparent',
                color: viewMode === 'kanban' ? '#FF4500' : '#666',
              }}
              whileTap={{ scale: 0.95 }}
              aria-label="Vista Kanban"
              title="Vista Kanban"
            >
              <LayoutGrid size={14} />
            </motion.button>
          </div>
        </nav>

        {/* Action buttons */}
        <div className="flex items-center gap-2" role="group" aria-label="Acciones principales">
          <Button3D variant="black" onClick={handleToggleSearch} aria-label="Buscar pedidos (Alt+K)" aria-expanded={isSearchOpen}>
            <Search size={14} aria-hidden="true" />
            <span className="sr-only">Buscar</span>
          </Button3D>
          <Button3D variant="orange" onClick={handleOpenNewModal} aria-label="Crear nuevo pedido (Alt+N)">
            <Plus size={14} aria-hidden="true" />
            NUEVO
          </Button3D>
          <Button3D variant="black" onClick={handleRefresh} aria-label="Refrescar datos (Alt+R)">
            <RefreshCw size={14} aria-hidden="true" />
            <span className="sr-only">Refrescar</span>
          </Button3D>
        </div>

        {/* Right controls */}
        <nav className="flex items-center gap-2" aria-label="Controles adicionales">
          <motion.button
            onClick={() => { playClick(); setShowAnalytics(!showAnalytics); }}
            className="w-11 h-11 flex items-center justify-center rounded-full"
            style={{
              background: showAnalytics
                ? 'linear-gradient(180deg, #FF6B35 0%, #FF4500 100%)'
                : 'linear-gradient(180deg, #4A4A4A 0%, #3A3A3A 100%)',
              boxShadow: showAnalytics
                ? '0 2px 0 #C23400, inset 0 1px 0 rgba(255,255,255,0.2)'
                : '0 2px 0 #2A2A2A, inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, y: 1 }}
            aria-label="Mostrar analytics"
          >
            <BarChart3 size={16} className={showAnalytics ? 'text-white' : 'text-gray-400'} aria-hidden="true" />
          </motion.button>

          <motion.button
            onClick={() => { playClick(); setIsHistoryOpen(true); }}
            className="w-11 h-11 flex items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(180deg, #4A4A4A 0%, #3A3A3A 100%)',
              boxShadow: '0 2px 0 #2A2A2A, inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, y: 1 }}
            aria-label="Ver historial de pedidos completados"
          >
            <History size={16} className="text-gray-400" aria-hidden="true" />
          </motion.button>

          <motion.button
            onClick={handleShowHelp}
            className="desktop-only w-11 h-11 flex items-center justify-center rounded-full"
            style={{
              background: 'linear-gradient(180deg, #4A4A4A 0%, #3A3A3A 100%)',
              boxShadow: '0 2px 0 #2A2A2A, inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, y: 1 }}
            aria-label="Ver atajos de teclado (Alt+/)"
          >
            <Keyboard size={16} className="text-gray-400" aria-hidden="true" />
          </motion.button>
        </nav>
      </div>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && !loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 mt-3 overflow-hidden"
          >
            <AnalyticsPanel
              requests={requests}
              teamMembers={teamMembers}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
        {viewMode === 'kanban' ? (
          /* Kanban View */
          <KanbanBoard
            requests={filteredRequests}
            onOpenDetail={handleOpenDetail}
            onEdit={handleEdit}
            onStatusChange={handleStatusChange}
            teamMembers={teamMembers}
            compact={settings.compactView}
          />
        ) : (
          /* List View */
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {loading ? (
              <>
                <SectionSkeleton count={2} />
                <SectionSkeleton count={3} />
              </>
            ) : (
              <>
                <AnimatePresence mode="popLayout">
                  {renderSection('URGENTES', urgent, 'red', 'urgent')}
                  {renderSection('ESTA SEMANA', thisWeek, 'orange', 'thisWeek')}
                  {renderSection('PROXIMOS', later, 'green', 'later')}

                  {/* Completados */}
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
                            <PedidoPad
                              request={request}
                              compact={settings.compactView}
                              onOpenDetail={handleOpenDetail}
                            />
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
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="lcd-screen p-8 text-center" role="status" aria-live="polite">
                <p className="lcd-number text-lg mb-2">NO DATA</p>
                <p className="text-[#949494] text-xs mb-4">No hay pedidos activos</p>
                <Button3D variant="orange" onClick={handleOpenNewModal} aria-label="Crear el primer pedido">CREAR PRIMER PEDIDO</Button3D>
              </motion.div>
            )}

            {/* Search no results */}
            {!loading && searchQuery && filteredRequests.length === 0 && activeRequests.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lcd-screen p-6 text-center" role="status" aria-live="polite">
                <Search size={24} className="mx-auto mb-3 text-[#949494]" aria-hidden="true" />
                <p className="text-sm text-[#B0B0B0] mb-1">No se encontraron resultados</p>
                <p className="text-xs text-[#949494]">
                  Intenta con otra búsqueda o{' '}
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[#00E5FF] hover:underline focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:ring-offset-2 focus:ring-offset-[#131313] rounded"
                    aria-label="Limpiar filtro de búsqueda"
                  >
                    limpia el filtro
                  </button>
                </p>
              </motion.div>
            )}
          </DndContext>
        )}
      </div>
      </main>

      {/* Footer */}
      <footer
        className="flex items-center justify-between px-4 py-3 mt-4"
        style={{
          background: 'linear-gradient(180deg, #B8B8B8 0%, #A8A8A8 100%)',
          borderTop: '1px solid rgba(255,255,255,0.3)',
        }}
        role="contentinfo"
      >
        <div className="desktop-only items-center gap-2 text-[10px]" style={{ color: '#595959' }}>
          <Lightbulb size={12} aria-hidden="true" />
          <span>TIP: Presiona Alt+/ para ver los atajos de teclado</span>
        </div>
        <a
          href="https://t.me/Research_Pedidos_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] hover:text-[#FF4500] transition-colors"
          style={{ color: '#595959' }}
          aria-label="Abrir bot de Telegram @Research_Pedidos_bot en nueva ventana"
        >
          <MessageSquare size={12} aria-hidden="true" />
          @Research_Pedidos_bot
        </a>
      </footer>

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

      {/* Detail Panel */}
      {detailRequest && (
        <PedidoDetailPanel
          request={detailRequest}
          isOpen={!!detailRequest}
          onClose={() => setDetailRequest(null)}
          onStatusChange={handleStatusChange}
          teamMembers={teamMembers}
          currentUserId={teamMembers[0]?.id || null}
        />
      )}
    </DeviceFrame>
    </ErrorBoundary>
  );
}
