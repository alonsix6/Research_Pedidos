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

export function useKeyboardShortcuts({ enabled = true, shortcuts }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs (except Escape)
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        if (event.key !== 'Escape') {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey;
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

// Dashboard shortcuts with Alt modifier to prevent accidental triggers
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
      alt: true,
      action: onNewRequest,
      description: 'Nuevo pedido',
    },
    {
      key: 'r',
      alt: true,
      action: onRefresh,
      description: 'Refrescar datos',
    },
    {
      key: 'Escape',
      action: onCloseModal,
      description: 'Cerrar modal/dialogo',
    },
    {
      key: 'k',
      alt: true,
      action: onToggleSearch,
      description: 'Abrir busqueda',
    },
    {
      key: '/',
      alt: true,
      action: onShowHelp,
      description: 'Mostrar atajos',
    },
    {
      key: 'c',
      alt: true,
      action: onToggleCompactView,
      description: 'Vista compacta',
    },
    {
      key: 'm',
      alt: true,
      action: onToggleSound,
      description: 'Silenciar/activar sonido',
    },
  ];
}

// Shortcut help data for display
export const shortcutsList = [
  { key: 'Alt + N', description: 'Nuevo pedido' },
  { key: 'Alt + R', description: 'Refrescar datos' },
  { key: 'Esc', description: 'Cerrar modal' },
  { key: 'Alt + K', description: 'Buscar' },
  { key: 'Alt + /', description: 'Mostrar atajos' },
  { key: 'Alt + C', description: 'Vista compacta' },
  { key: 'Alt + M', description: 'Sonido on/off' },
];
