'use client';

import { useEffect, useRef } from 'react';
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
          role="search"
          aria-label="Búsqueda y filtros de pedidos"
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
              <label htmlFor="search-pedidos" className="sr-only">
                Buscar pedidos por cliente, descripción o persona
              </label>
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#949494]"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                id="search-pedidos"
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar por cliente, descripción, persona..."
                className="input-lcd w-full pl-9 pr-8 py-2 text-xs"
                aria-describedby={searchQuery ? "search-results" : undefined}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded"
                  aria-label="Limpiar búsqueda"
                  type="button"
                >
                  <X size={12} className="text-[#949494]" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Filter size={12} className="text-[#949494]" aria-hidden="true" />
                <label htmlFor="sort-by" className="sr-only">
                  Ordenar por
                </label>
                <select
                  id="sort-by"
                  value={settings.sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof settings.sortBy)}
                  className="input-lcd py-1.5 px-2 text-[10px] min-w-[90px]"
                  aria-label="Ordenar pedidos por"
                >
                  <option value="deadline">Deadline</option>
                  <option value="priority">Prioridad</option>
                  <option value="client">Cliente</option>
                  <option value="created">Creado</option>
                </select>
              </div>

              <button
                onClick={() => setSortOrder(settings.sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2.5 rounded transition-colors hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={settings.sortOrder === 'asc' ? 'Orden ascendente, cambiar a descendente' : 'Orden descendente, cambiar a ascendente'}
                aria-pressed={settings.sortOrder === 'desc'}
                type="button"
              >
                {settings.sortOrder === 'asc' ? (
                  <SortAsc size={14} className="text-[#00E5FF]" aria-hidden="true" />
                ) : (
                  <SortDesc size={14} className="text-[#00E5FF]" aria-hidden="true" />
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2.5 rounded transition-colors hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Cerrar panel de búsqueda (Escape)"
                type="button"
              >
                <X size={14} className="text-[#949494]" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Active filters indicator */}
          {searchQuery && (
            <motion.div
              id="search-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 mb-3 text-[10px] text-[#949494]"
              role="status"
              aria-live="polite"
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
