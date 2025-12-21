'use client';

import { useEffect, useCallback } from 'react';

interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: ShortcutHandler[];
}

export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Allow Escape to work in inputs
        if (event.key !== 'Escape') {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

// Common shortcuts for the dashboard
export function createDashboardShortcuts({
  onNewRequest,
  onRefresh,
  onCloseModal,
  onToggleSearch,
  onShowHelp,
  onToggleCompactView,
  onToggleSound,
}: {
  onNewRequest: () => void;
  onRefresh: () => void;
  onCloseModal: () => void;
  onToggleSearch: () => void;
  onShowHelp: () => void;
  onToggleCompactView: () => void;
  onToggleSound: () => void;
}): ShortcutHandler[] {
  return [
    {
      key: 'n',
      action: onNewRequest,
      description: 'Nuevo pedido',
    },
    {
      key: 'r',
      action: onRefresh,
      description: 'Refrescar datos',
    },
    {
      key: 'Escape',
      action: onCloseModal,
      description: 'Cerrar modal/dialogo',
    },
    {
      key: '/',
      action: onToggleSearch,
      description: 'Abrir busqueda',
    },
    {
      key: '?',
      shift: true,
      action: onShowHelp,
      description: 'Mostrar atajos',
    },
    {
      key: 'c',
      action: onToggleCompactView,
      description: 'Vista compacta',
    },
    {
      key: 's',
      action: onToggleSound,
      description: 'Activar/desactivar sonido',
    },
  ];
}

// Shortcut help data
export const shortcutsList = [
  { key: 'N', description: 'Nuevo pedido' },
  { key: 'R', description: 'Refrescar datos' },
  { key: 'Esc', description: 'Cerrar modal' },
  { key: '/', description: 'Buscar' },
  { key: '?', description: 'Mostrar atajos' },
  { key: 'C', description: 'Vista compacta' },
  { key: 'S', description: 'Sonido on/off' },
];
