'use client';

import { SettingsProvider } from '@/lib/hooks/useSettings';
import { ToastProvider } from './components/Toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </SettingsProvider>
  );
}
