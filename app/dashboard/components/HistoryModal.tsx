'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, modalContentVariants, staggerContainerVariants, staggerItemVariants } from '@/lib/animations';
import { X, ChevronLeft, ChevronRight, Calendar, Check, Search } from 'lucide-react';
import { Request } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { formatLimaDate } from '@/lib/utils';
import Button3D from './controls/Button3D';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ITEMS_PER_PAGE = 10;
const MAX_SEARCH_LENGTH = 100;

export default function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const [completedRequests, setCompletedRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, currentPage, searchQuery]);

  async function loadHistory() {
    setLoading(true);
    try {
      let query = supabase
        .from('requests')
        .select('*', { count: 'exact' })
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      // Apply search filter if present
      if (searchQuery.trim()) {
        query = query.or(
          `client.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,requester_name.ilike.%${searchQuery}%`
        );
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      setCompletedRequests(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // Limitar longitud de búsqueda para prevenir DoS
    if (value.length <= MAX_SEARCH_LENGTH) {
      setSearchQuery(value);
      setCurrentPage(1); // Reset to first page on search
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            variants={modalOverlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative w-full max-w-2xl metallic-surface rounded-lg overflow-hidden max-h-[85vh] flex flex-col"
            style={{
              boxShadow: `
                0 25px 80px rgba(0,0,0,0.6),
                0 10px 30px rgba(0,0,0,0.4),
                inset 0 1px 0 rgba(255,255,255,0.4),
                inset 0 -1px 0 rgba(0,0,0,0.2)
              `,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{
                background: 'linear-gradient(180deg, #D8D8D8 0%, #C0C0C0 100%)',
                borderBottom: '1px solid rgba(0,0,0,0.15)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="led led-green" />
                <span className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                  HISTORIAL DE COMPLETADOS
                </span>
                <span className="text-xs text-gray-600">({totalCount})</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-sm transition-all
                           bg-gradient-to-b from-[#4A4A4A] to-[#3A3A3A]
                           shadow-[0_2px_0_#2A2A2A,inset_0_1px_0_rgba(255,255,255,0.1)]
                           hover:from-[#5A5A5A] hover:to-[#4A4A4A]
                           active:translate-y-[1px] active:shadow-[0_1px_0_#2A2A2A]"
              >
                <X size={14} className="text-white" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3" style={{ background: '#C8C8C8' }}>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Buscar en historial..."
                  className="w-full pl-9 pr-3 py-2 rounded text-sm bg-white/50 border border-gray-300
                             focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]/20"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="lcd-screen p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <motion.div
                      className="w-6 h-6 border-2 border-[#00E5FF] border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                ) : completedRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No hay pedidos completados</p>
                  </div>
                ) : (
                  <motion.div
                    variants={staggerContainerVariants}
                    initial="initial"
                    animate="animate"
                    className="space-y-2"
                  >
                    {completedRequests.map((request) => (
                      <HistoryItem key={request.id} request={request} />
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background: 'linear-gradient(180deg, #C8C8C8 0%, #B8B8B8 100%)',
                  borderTop: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                <Button3D
                  variant="grey"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 text-xs"
                >
                  <ChevronLeft size={14} />
                  Anterior
                </Button3D>

                <span className="text-xs text-gray-600">
                  Pagina {currentPage} de {totalPages}
                </span>

                <Button3D
                  variant="grey"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 text-xs"
                >
                  Siguiente
                  <ChevronRight size={14} />
                </Button3D>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function HistoryItem({ request }: { request: Request }) {
  return (
    <motion.div
      variants={staggerItemVariants}
      className="flex items-center gap-4 p-3 rounded"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Check icon */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1AA167]/20 flex items-center justify-center">
        <Check size={12} className="text-[#1AA167]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{request.client}</p>
        <p className="text-[10px] text-gray-500 truncate">{request.description}</p>
      </div>

      {/* Meta */}
      <div className="flex-shrink-0 text-right">
        <p className="text-[10px] text-gray-500">{request.requester_name}</p>
        <div className="flex items-center gap-1 text-[9px] text-gray-600">
          <Calendar size={10} />
          {request.completed_at ? formatLimaDate(request.completed_at) : '-'}
        </div>
      </div>
    </motion.div>
  );
}
