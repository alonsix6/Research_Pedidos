'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button3D from './controls/Button3D';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary para capturar errores de React y mostrar una UI de fallback
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="lcd-screen p-8 text-center" role="alert">
          <AlertTriangle size={48} className="mx-auto mb-4 text-[#FF4500]" />
          <h2 className="lcd-number text-lg mb-2">ERROR</h2>
          <p className="text-[#949494] text-sm mb-4">
            Algo salió mal. Por favor intenta de nuevo.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <p className="text-[#CE2021] text-xs mb-4 font-mono break-all">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Button3D variant="orange" onClick={this.handleReset}>
              <RefreshCw size={14} />
              Reintentar
            </Button3D>
            <Button3D variant="black" onClick={this.handleReload}>
              Recargar página
            </Button3D>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
