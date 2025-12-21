'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BarChart3, MessageSquare, ArrowRight, Zap, Clock, Users } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #E8E8E8 0%, #D0D0D0 50%, #C0C0C0 100%)',
      }}
    >
      {/* Background texture */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Device Frame */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg"
      >
        {/* Main device body */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(180deg, #D8D8D8 0%, #C8C8C8 50%, #B8B8B8 100%)',
            boxShadow: `
              0 40px 100px rgba(0,0,0,0.3),
              0 15px 40px rgba(0,0,0,0.2),
              inset 0 2px 0 rgba(255,255,255,0.8),
              inset 0 -2px 0 rgba(0,0,0,0.1)
            `,
          }}
        >
          {/* Top strip with indicators */}
          <div
            className="flex items-center justify-between px-6 py-3"
            style={{
              background: 'linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="led led-green" />
              <span className="text-[10px] font-bold text-gray-400 tracking-wider">SYSTEM READY</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="led led-orange" />
              <span className="text-[10px] font-bold text-gray-500 tracking-wider">v2.0</span>
            </div>
          </div>

          {/* Logo Section */}
          <div className="px-8 pt-10 pb-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {/* Logo mark */}
              <div
                className="w-20 h-20 mx-auto mb-6 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #FF5722 0%, #FF4500 50%, #E64A19 100%)',
                  boxShadow: `
                    0 8px 24px rgba(255,69,0,0.4),
                    0 4px 12px rgba(255,69,0,0.3),
                    inset 0 2px 0 rgba(255,255,255,0.3),
                    inset 0 -2px 0 rgba(0,0,0,0.2)
                  `,
                }}
              >
                <BarChart3 size={36} className="text-white" strokeWidth={2.5} />
              </div>

              <h1
                className="text-3xl font-black tracking-tight mb-2"
                style={{ color: '#1A1A1A' }}
              >
                RESET R&A
              </h1>
              <p
                className="text-sm uppercase tracking-[0.2em] font-medium"
                style={{ color: '#666' }}
              >
                Sistema de Pedidos
              </p>
            </motion.div>
          </div>

          {/* Features strip */}
          <div
            className="mx-6 rounded-lg p-4 mb-6"
            style={{
              background: 'linear-gradient(180deg, #1E1E1E 0%, #151515 100%)',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <div className="grid grid-cols-3 gap-4">
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Zap size={20} className="mx-auto mb-2 text-[#FF4500]" />
                <p className="text-[9px] uppercase tracking-wider text-gray-500">Tiempo Real</p>
              </motion.div>
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Clock size={20} className="mx-auto mb-2 text-[#00E5FF]" />
                <p className="text-[9px] uppercase tracking-wider text-gray-500">Deadlines</p>
              </motion.div>
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Users size={20} className="mx-auto mb-2 text-[#00C853]" />
                <p className="text-[9px] uppercase tracking-wider text-gray-500">Equipo</p>
              </motion.div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="px-6 pb-6">
            <Link href="/dashboard">
              <motion.button
                className="w-full py-4 px-6 rounded-lg flex items-center justify-center gap-3 text-white font-bold uppercase tracking-wider text-sm"
                style={{
                  background: 'linear-gradient(180deg, #FF5722 0%, #FF4500 50%, #E64A19 100%)',
                  boxShadow: `
                    0 6px 0 #BF360C,
                    0 8px 20px rgba(255,69,0,0.4),
                    inset 0 2px 0 rgba(255,255,255,0.2)
                  `,
                }}
                whileHover={{
                  scale: 1.02,
                  boxShadow: `
                    0 6px 0 #BF360C,
                    0 12px 30px rgba(255,69,0,0.5),
                    inset 0 2px 0 rgba(255,255,255,0.2)
                  `,
                }}
                whileTap={{
                  scale: 0.98,
                  y: 4,
                  boxShadow: `
                    0 2px 0 #BF360C,
                    0 4px 10px rgba(255,69,0,0.3),
                    inset 0 2px 0 rgba(255,255,255,0.2)
                  `,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <BarChart3 size={20} />
                Ir al Dashboard
                <ArrowRight size={18} />
              </motion.button>
            </Link>
          </div>

          {/* Telegram Section */}
          <div
            className="px-6 py-4"
            style={{
              background: 'linear-gradient(180deg, #C0C0C0 0%, #B0B0B0 100%)',
              borderTop: '1px solid rgba(255,255,255,0.5)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg, #3A3A3A 0%, #2A2A2A 100%)',
                    boxShadow: '0 3px 0 #1A1A1A, inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                >
                  <MessageSquare size={18} className="text-[#00E5FF]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-0.5">Bot de Telegram</p>
                  <p className="text-xs font-bold text-gray-800">@Research_Pedidos_bot</p>
                </div>
              </div>
              <a
                href="https://t.me/Research_Pedidos_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: 'linear-gradient(180deg, #4A4A4A 0%, #3A3A3A 100%)',
                  boxShadow: '0 3px 0 #2A2A2A, inset 0 1px 0 rgba(255,255,255,0.1)',
                  color: '#FFF',
                }}
              >
                Abrir
              </a>
            </div>
          </div>

          {/* Bottom strip */}
          <div
            className="flex items-center justify-center py-3"
            style={{
              background: 'linear-gradient(180deg, #A8A8A8 0%, #989898 100%)',
            }}
          >
            <p className="text-[9px] uppercase tracking-[0.15em] text-gray-600">
              Research & Analytics Team
            </p>
          </div>
        </div>

        {/* Decorative screws */}
        <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 shadow-inner" />
        <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 shadow-inner" />
        <div className="absolute bottom-4 left-4 w-3 h-3 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 shadow-inner" />
        <div className="absolute bottom-4 right-4 w-3 h-3 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 shadow-inner" />
      </motion.div>
    </main>
  );
}
