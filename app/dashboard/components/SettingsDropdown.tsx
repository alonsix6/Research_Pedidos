'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Volume2, VolumeX, Grid, List, Sun, Moon, X } from 'lucide-react';
import { springs } from '@/lib/animations';

interface SettingsDropdownProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  compactView: boolean;
  onToggleCompactView: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function SettingsDropdown({
  soundEnabled,
  onToggleSound,
  compactView,
  onToggleCompactView,
  isDark,
  onToggleTheme,
}: SettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-11 h-11 flex items-center justify-center rounded-full"
        style={{
          background: isOpen
            ? 'linear-gradient(180deg, #FF5722 0%, #E64A19 100%)'
            : 'linear-gradient(180deg, #4A4A4A 0%, #3A3A3A 100%)',
          boxShadow: isOpen
            ? '0 2px 0 #BF360C, inset 0 1px 0 rgba(255,255,255,0.2)'
            : '0 2px 0 #2A2A2A, inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95, y: 1 }}
        aria-label="Abrir ajustes"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Settings
          size={16}
          className={isOpen ? 'text-white' : 'text-gray-400'}
          aria-hidden="true"
        />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={springs.snappy}
            className="absolute top-full left-0 mt-2 z-50 min-w-[180px]"
            style={{
              background: 'linear-gradient(180deg, #3A3A3A 0%, #2A2A2A 100%)',
              borderRadius: '8px',
              boxShadow: `
                0 10px 40px rgba(0,0,0,0.5),
                0 4px 12px rgba(0,0,0,0.3),
                inset 0 1px 0 rgba(255,255,255,0.1)
              `,
              border: '1px solid rgba(255,255,255,0.05)',
            }}
            role="menu"
            aria-label="Menú de ajustes"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                Ajustes
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                aria-label="Cerrar menú"
              >
                <X size={12} className="text-gray-500" />
              </button>
            </div>

            {/* Options */}
            <div className="p-2 space-y-1">
              {/* Sound */}
              <SettingsOption
                icon={soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                label="Sonido"
                value={soundEnabled ? 'Activado' : 'Desactivado'}
                isActive={soundEnabled}
                onClick={() => {
                  onToggleSound();
                }}
                color="#00E5FF"
              />

              {/* Compact View */}
              <SettingsOption
                icon={compactView ? <List size={14} /> : <Grid size={14} />}
                label="Vista"
                value={compactView ? 'Compacta' : 'Normal'}
                isActive={compactView}
                onClick={() => {
                  onToggleCompactView();
                }}
                color="#FF4500"
              />

              {/* Theme */}
              <SettingsOption
                icon={isDark ? <Moon size={14} /> : <Sun size={14} />}
                label="Tema"
                value={isDark ? 'Oscuro' : 'Claro'}
                isActive={isDark}
                onClick={() => {
                  onToggleTheme();
                }}
                color="#FFD600"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsOption({
  icon,
  label,
  value,
  isActive,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isActive: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-colors"
      style={{
        background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
      }}
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
      whileTap={{ scale: 0.98 }}
      role="menuitem"
      aria-pressed={isActive}
    >
      <div className="flex items-center gap-2.5">
        <span style={{ color: isActive ? color : '#666' }}>{icon}</span>
        <span className="text-xs text-gray-300">{label}</span>
      </div>
      <span className="text-[10px] font-medium" style={{ color: isActive ? color : '#666' }}>
        {value}
      </span>
    </motion.button>
  );
}
