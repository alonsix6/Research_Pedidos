'use client';

import { useState } from 'react';
import { Request, RequestStatus } from '@/lib/types';
import {
  getNextStatuses,
  getStatusConfig,
  canTransition,
  requiresBlockedReason,
} from '@/lib/statusMachine';
import { formatLimaDate, formatDaysLeft } from '@/lib/utils';
import { logActivity } from '@/lib/activityLog';
import { ConflictError, updateRequestWithConflictCheck } from '@/lib/services/requests';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, springs } from '@/lib/animations';
import { X, Clock, User, Calendar, FileText, AlertTriangle, ChevronRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import StatusTimeline from './StatusTimeline';
import CommentThread from './CommentThread';

interface PedidoDetailPanelProps {
  request: Request;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (id: string, newStatus: RequestStatus) => void;
  teamMembers?: Array<{ id: string; name: string }>;
  currentUserId?: string | null;
}

export default function PedidoDetailPanel({
  request,
  isOpen,
  onClose,
  onStatusChange,
  teamMembers = [],
  currentUserId = null,
}: PedidoDetailPanelProps) {
  const [changingStatus, setChangingStatus] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');
  const [showBlockedInput, setShowBlockedInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'comments'>('timeline');
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const nextStatuses = getNextStatuses(request.status);
  const assignedName = teamMembers.find((m) => m.id === request.assigned_to)?.name || 'Sin asignar';
  const daysLeft = formatDaysLeft(request.deadline);
  const isBlocked = request.status === 'blocked';

  async function handleStatusChange(newStatus: RequestStatus) {
    if (!canTransition(request.status, newStatus)) return;

    // If transitioning to blocked, require a reason
    if (requiresBlockedReason(newStatus)) {
      setShowBlockedInput(true);
      return;
    }

    await performStatusChange(newStatus);
  }

  async function performStatusChange(newStatus: RequestStatus, reason?: string) {
    setChangingStatus(true);
    setConflictMessage(null);
    try {
      const patch: Partial<Request> = {
        status: newStatus,
        status_changed_at: new Date().toISOString(),
      };

      if (newStatus === 'blocked') {
        patch.blocked_reason = reason || '';
        patch.blocked_at = new Date().toISOString();
        patch.original_deadline = request.original_deadline || request.deadline;
      }

      if (request.status === 'blocked' && newStatus !== 'blocked') {
        patch.blocked_reason = null;
        patch.blocked_at = null;
      }

      if (newStatus === 'completed') {
        patch.completed_at = new Date().toISOString();
      }

      // Conflict-checked update: si otro user cambió el estado en paralelo,
      // ConflictError → mensaje inline + el panel se va a sincronizar solo
      // por realtime (request prop ya viene del array fresco, F4).
      try {
        await updateRequestWithConflictCheck(request.id, request.updated_at, patch);
      } catch (err) {
        if (err instanceof ConflictError) {
          setConflictMessage(
            'Otro usuario cambió el estado de este pedido. La pantalla se actualizó; intenta de nuevo si todavía aplica.'
          );
          return;
        }
        throw err;
      }

      const action =
        newStatus === 'blocked'
          ? 'blocked'
          : request.status === 'blocked'
            ? 'unblocked'
            : newStatus === 'completed'
              ? 'completed'
              : newStatus === 'cancelled'
                ? 'cancelled'
                : request.status === 'cancelled' && newStatus === 'pending'
                  ? 'reopened'
                  : 'status_changed';

      await logActivity(request.id, currentUserId, action, {
        from_status: request.status,
        to_status: newStatus,
        ...(reason && { blocked_reason: reason }),
      });

      onStatusChange?.(request.id, newStatus);
      setShowBlockedInput(false);
      setBlockedReason('');
    } catch (err) {
      console.error('Error changing status:', err);
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleBlockedSubmit() {
    if (!blockedReason.trim()) return;
    await performStatusChange('blocked', blockedReason.trim());
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <motion.div
            variants={modalOverlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md overflow-y-auto"
            style={{
              background: 'linear-gradient(180deg, #1E1E1E 0%, #161616 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between p-4"
              style={{
                background: 'linear-gradient(180deg, #252525 0%, #1E1E1E 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center gap-3">
                <StatusBadge status={request.status} size="md" />
              </div>
              <motion.button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-sm"
                style={{
                  background: 'linear-gradient(180deg, #4A4A4A 0%, #3A3A3A 100%)',
                  boxShadow: '0 2px 0 #2A2A2A',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95, y: 1 }}
              >
                <X size={14} className="text-white" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Client & Description */}
              <div>
                <h3
                  className="text-sm font-bold uppercase tracking-wide mb-1"
                  style={{ color: '#E5E5E5' }}
                >
                  {request.client}
                </h3>
                <p className="text-[12px] leading-relaxed" style={{ color: '#B0B0B0' }}>
                  {request.description}
                </p>
              </div>

              {/* Info Grid */}
              <div
                className="grid grid-cols-2 gap-3 p-3 rounded"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <InfoItem
                  icon={<User size={10} />}
                  label="Solicitante"
                  value={`${request.requester_name}${request.requester_role ? ` (${request.requester_role})` : ''}`}
                />
                <InfoItem icon={<User size={10} />} label="Asignado" value={assignedName} />
                <InfoItem
                  icon={<Calendar size={10} />}
                  label="Entrega"
                  value={formatLimaDate(request.deadline)}
                />
                <InfoItem
                  icon={<Clock size={10} />}
                  label="Tiempo"
                  value={daysLeft}
                  urgent={daysLeft.includes('Atrasado') || daysLeft.includes('HOY')}
                />
              </div>

              {/* Blocked Info */}
              {isBlocked && request.blocked_reason && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded"
                  style={{
                    background: 'rgba(229, 57, 53, 0.1)',
                    border: '1px solid rgba(229, 57, 53, 0.2)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={10} style={{ color: '#E53935' }} />
                    <span
                      className="text-[10px] font-medium uppercase tracking-wider"
                      style={{ color: '#E53935' }}
                    >
                      Motivo del bloqueo
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: '#EF9A9A' }}>
                    {request.blocked_reason}
                  </p>
                  {request.blocked_at && (
                    <p className="text-[9px] mt-1" style={{ color: '#EF5350' }}>
                      Bloqueado desde {formatLimaDate(request.blocked_at)}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Status Change Buttons */}
              {nextStatuses.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#666] mb-2">
                    Cambiar estado
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((status) => {
                      const config = getStatusConfig(status);
                      return (
                        <motion.button
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          disabled={changingStatus}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] font-medium uppercase tracking-wider disabled:opacity-40"
                          style={{
                            background: config.bgColor,
                            border: `1px solid ${config.color}40`,
                            color: config.textColor,
                          }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <ChevronRight size={10} />
                          {config.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Conflict notice (otro user pisó el cambio) */}
              {conflictMessage && (
                <div
                  role="alert"
                  className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100"
                >
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
                  <span className="flex-1">{conflictMessage}</span>
                  <button
                    type="button"
                    onClick={() => setConflictMessage(null)}
                    className="opacity-70 hover:opacity-100"
                    aria-label="Cerrar aviso"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Blocked Reason Input */}
              <AnimatePresence>
                {showBlockedInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="p-3 rounded space-y-2"
                      style={{
                        background: 'rgba(229, 57, 53, 0.08)',
                        border: '1px solid rgba(229, 57, 53, 0.2)',
                      }}
                    >
                      <p
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: '#E53935' }}
                      >
                        Motivo del bloqueo (obligatorio)
                      </p>
                      <textarea
                        value={blockedReason}
                        onChange={(e) => setBlockedReason(e.target.value)}
                        placeholder="Ej: Esperando datos del cliente..."
                        className="input-lcd w-full text-[11px] resize-none"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <motion.button
                          onClick={handleBlockedSubmit}
                          disabled={!blockedReason.trim() || changingStatus}
                          className="flex-1 px-3 py-1.5 rounded-sm text-[10px] font-medium uppercase tracking-wider text-white disabled:opacity-40"
                          style={{ background: '#E53935' }}
                          whileTap={{ scale: 0.97 }}
                        >
                          Confirmar Bloqueo
                        </motion.button>
                        <motion.button
                          onClick={() => {
                            setShowBlockedInput(false);
                            setBlockedReason('');
                          }}
                          className="px-3 py-1.5 rounded-sm text-[10px] font-medium uppercase tracking-wider text-[#999]"
                          style={{ background: 'rgba(255,255,255,0.06)' }}
                          whileTap={{ scale: 0.97 }}
                        >
                          Cancelar
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tabs: Timeline / Comments */}
              <div>
                <div
                  className="flex gap-1 mb-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <TabButton
                    active={activeTab === 'timeline'}
                    onClick={() => setActiveTab('timeline')}
                    label="Historial"
                  />
                  <TabButton
                    active={activeTab === 'comments'}
                    onClick={() => setActiveTab('comments')}
                    label="Comentarios"
                  />
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === 'timeline' ? (
                    <motion.div
                      key="timeline"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <StatusTimeline requestId={request.id} teamMembers={teamMembers} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="comments"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <CommentThread
                        requestId={request.id}
                        currentUserId={currentUserId}
                        teamMembers={teamMembers}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function InfoItem({
  icon,
  label,
  value,
  urgent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-0.5">
        <span style={{ color: '#FF4500' }}>{icon}</span>
        <span className="text-[8px] uppercase tracking-wider text-[#666]">{label}</span>
      </div>
      <p className="text-[11px]" style={{ color: urgent ? '#E53935' : '#C0C0C0' }}>
        {value}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 text-[10px] uppercase tracking-wider font-medium transition-colors relative"
      style={{
        color: active ? '#00E5FF' : '#666',
      }}
    >
      {label}
      {active && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: '#00E5FF' }}
        />
      )}
    </button>
  );
}
