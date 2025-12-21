'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, SortAsc, SortDesc, Filter } from 'lucide-react';
import { useSettings } from '@/lib/hooks/useSettings';

interface SearchFilterProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SearchFilter({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
}: SearchFilterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { settings, setSortBy, setSortOrder } = useSettings();

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure animation has started
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="overflow-hidden"
        >
          <div
            className="flex items-center gap-3 p-3 rounded-md mb-4"
            style={{
              background: 'linear-gradient(180deg, #3A3A3A 0%, #2A2A2A 100%)',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar por cliente, descripcion, persona..."
                className="input-lcd w-full pl-9 pr-8 py-2 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
                >
                  <X size={12} className="text-gray-500" />
                </button>
              )}
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Filter size={12} className="text-gray-500" />
                <select
                  value={settings.sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof settings.sortBy)}
                  className="input-lcd py-1.5 px-2 text-[10px] min-w-[90px]"
                >
                  <option value="deadline">Deadline</option>
                  <option value="priority">Prioridad</option>
                  <option value="client">Cliente</option>
                  <option value="created">Creado</option>
                </select>
              </div>

              <button
                onClick={() => setSortOrder(settings.sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 rounded transition-colors hover:bg-white/10"
                title={settings.sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
              >
                {settings.sortOrder === 'asc' ? (
                  <SortAsc size={14} className="text-[#00E5FF]" />
                ) : (
                  <SortDesc size={14} className="text-[#00E5FF]" />
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded transition-colors hover:bg-white/10"
                title="Cerrar busqueda (Esc)"
              >
                <X size={14} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Active filters indicator */}
          {searchQuery && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 mb-3 text-[10px] text-gray-500"
            >
              <span>Buscando:</span>
              <span className="px-2 py-0.5 rounded bg-[#FF4500]/20 text-[#FF4500]">
                &quot;{searchQuery}&quot;
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
