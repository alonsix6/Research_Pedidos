'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, modalContentVariants } from '@/lib/animations';
import { X, Keyboard } from 'lucide-react';
import { shortcutsList } from '@/lib/hooks/useKeyboardShortcuts';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
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
            className="relative w-full max-w-sm metallic-surface rounded-lg overflow-hidden"
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
                <Keyboard size={16} className="text-[#FF4500]" />
                <span className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                  ATAJOS DE TECLADO
                </span>
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

            {/* Content */}
            <div className="p-4">
              <div className="lcd-screen p-4">
                <div className="space-y-2">
                  {shortcutsList.map((shortcut, index) => (
                    <motion.div
                      key={shortcut.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                    >
                      <span className="text-xs text-gray-400">{shortcut.description}</span>
                      <kbd
                        className="px-2 py-1 rounded text-[10px] font-bold"
                        style={{
                          background: 'linear-gradient(180deg, #3A3A3A 0%, #2A2A2A 100%)',
                          boxShadow: '0 2px 0 #1A1A1A, inset 0 1px 0 rgba(255,255,255,0.1)',
                          color: '#00E5FF',
                        }}
                      >
                        {shortcut.key}
                      </kbd>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer tip */}
            <div className="px-4 pb-4">
              <p className="text-[10px] text-center text-gray-500">
                Presiona <kbd className="px-1 py-0.5 bg-gray-700 rounded text-[9px]">?</kbd> para mostrar/ocultar
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
