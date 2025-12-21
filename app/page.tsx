import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-op1-bg">
      <div className="card-op1 max-w-md w-full mx-4 text-center">
        <h1 className="text-2xl font-bold mb-4">RESET R&A</h1>
        <p className="text-op1-text-secondary mb-6">
          Sistema de Gestión de Pedidos
        </p>

        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="btn-op1 block w-full"
          >
            📊 Ir al Dashboard
          </Link>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-op1-text-secondary mb-2">
              Bot de Telegram: @Research_Pedidos_bot
            </p>
            <p className="text-xs text-op1-text-secondary">
              Usa /ayuda para ver los comandos disponibles
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
