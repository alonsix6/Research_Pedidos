'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenDisplay, { LCDNumber, LCDLabel, LCDIcon, LCDDivider } from './ScreenDisplay';
import { User } from '@/lib/types';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';

interface StatsDisplayProps {
  total: number;
  active: number;
  completed: number;
  urgent: number;
  teamMembers: User[];
  selectedMember: string | null; // null = todos
  onMemberSelect: (memberId: string | null) => void;
  requestsByMember: Record<string, number>; // { memberId: count }
}

export default function StatsDisplay({
  total,
  active,
  completed,
  urgent,
  teamMembers,
  selectedMember,
  onMemberSelect,
  requestsByMember,
}: StatsDisplayProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get first letter of name for compact display
  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  // Get short name (first name only, max 6 chars)
  const getShortName = (name: string) => {
    const firstName = name.split(' ')[0];
    return firstName.length > 6 ? firstName.slice(0, 6) : firstName;
  };

  const selectedMemberName = selectedMember
    ? teamMembers.find((m) => m.id === selectedMember)?.name || 'Miembro'
    : 'Todo el equipo';

  return (
    <ScreenDisplay>
      <div className="flex flex-col gap-3" role="region" aria-label="Estadísticas de pedidos">
        {/* Fila superior - Filtros por persona + Collapse toggle */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2"
            role="group"
            aria-label="Filtrar por miembro del equipo"
          >
            {/* Botón "Todos" */}
            <TeamButton
              label={<Users size={14} aria-hidden="true" />}
              name="TODOS"
              fullName="Todo el equipo"
              active={selectedMember === null}
              onClick={() => onMemberSelect(null)}
              count={active}
            />

            {/* Botones de miembros del equipo */}
            {teamMembers.map((member) => (
              <TeamButton
                key={member.id}
                label={getInitial(member.name)}
                name={getShortName(member.name).toUpperCase()}
                fullName={member.name}
                active={selectedMember === member.id}
                onClick={() => onMemberSelect(member.id)}
                count={requestsByMember[member.id] || 0}
              />
            ))}
          </div>

          <div className="flex items-center gap-3" role="status" aria-label="Indicadores de estado">
            {/* Stats mini (visible when collapsed) */}
            <AnimatePresence>
              {isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="hidden sm:flex items-center gap-2 mr-2"
                >
                  <span className="text-[10px] text-[#00E5FF]">{active}</span>
                  <span className="text-[8px] text-gray-600">/</span>
                  <span className="text-[10px] text-[#00C853]">{completed}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <LCDIcon type="record" active={urgent > 0} />
            <LCDIcon type="play" active={active > 0} />

            {/* Collapse toggle - visible on mobile */}
            <motion.button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="mobile-only w-8 h-8 flex items-center justify-center rounded-sm ml-2"
              style={{
                background: '#2A2A2A',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
              }}
              whileTap={{ scale: 0.95 }}
              aria-label={isCollapsed ? 'Expandir estadísticas' : 'Colapsar estadísticas'}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? (
                <ChevronDown size={14} className="text-gray-400" />
              ) : (
                <ChevronUp size={14} className="text-gray-400" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Collapsible content */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <LCDDivider />

              {/* Stats principales */}
              <div
                className="grid grid-cols-3 gap-4 py-3"
                role="group"
                aria-label={`Estadísticas de ${selectedMemberName}`}
                aria-live="polite"
                aria-atomic="true"
              >
                <StatItem label="TOTAL" value={total} color="cyan" description="pedidos totales" />
                <StatItem
                  label="ACTIVOS"
                  value={active}
                  color="orange"
                  description="pedidos activos"
                />
                <StatItem
                  label="LISTOS"
                  value={completed}
                  color="green"
                  description="pedidos completados"
                />
              </div>

              <LCDDivider />

              {/* Fila inferior - Info adicional */}
              <div className="flex items-center justify-between pt-3">
                <div
                  className="flex items-center gap-2"
                  role="status"
                  aria-label={`${urgent} pedidos urgentes`}
                >
                  <LCDLabel color="orange">URG</LCDLabel>
                  <LCDNumber value={urgent.toString().padStart(2, '0')} color="orange" size="sm" />
                </div>

                {/* Mostrar filtro activo */}
                <div
                  className="flex items-center gap-2"
                  role="status"
                  aria-label={`Vista actual: ${selectedMemberName}`}
                >
                  <LCDLabel color="cyan">
                    {selectedMember === null
                      ? 'EQUIPO'
                      : teamMembers.find((m) => m.id === selectedMember)?.name.toUpperCase() || ''}
                  </LCDLabel>
                </div>

                <div
                  className="flex items-center gap-2"
                  role="status"
                  aria-label={`${teamMembers.length} miembros del equipo`}
                >
                  <LCDLabel color="cyan">TEAM</LCDLabel>
                  <LCDNumber
                    value={teamMembers.length.toString().padStart(2, '0')}
                    color="cyan"
                    size="sm"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScreenDisplay>
  );
}

function StatItem({
  label,
  value,
  color,
  description,
}: {
  label: string;
  value: number;
  color: 'cyan' | 'orange' | 'green';
  description?: string;
}) {
  return (
    <div
      className="flex flex-col items-center"
      aria-label={`${value} ${description || label.toLowerCase()}`}
    >
      <LCDLabel color="white">{label}</LCDLabel>
      <LCDNumber value={value.toString().padStart(2, '0')} color={color} size="lg" />
    </div>
  );
}

function TeamButton({
  label,
  name,
  fullName,
  active = false,
  onClick,
  count,
}: {
  label: React.ReactNode;
  name: string;
  fullName: string;
  active?: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="relative flex flex-col items-center gap-0.5 min-w-[44px]"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Filtrar por ${fullName}${count > 0 ? `, ${count} pedidos activos` : ''}`}
      aria-pressed={active}
      type="button"
    >
      <div
        className="w-10 h-10 flex items-center justify-center rounded-sm text-[11px] font-bold transition-all"
        style={{
          background: active ? 'linear-gradient(180deg, #FF5722 0%, #FF4500 100%)' : '#2A2A2A',
          color: active ? 'white' : '#949494',
          boxShadow: active
            ? '0 0 10px rgba(255,69,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)'
            : 'inset 0 1px 2px rgba(0,0,0,0.3)',
        }}
        aria-hidden="true"
      >
        {label}
      </div>
      <span
        className="text-[7px] font-medium tracking-wide"
        style={{ color: active ? '#FF4500' : '#949494' }}
        aria-hidden="true"
      >
        {name}
      </span>
      {/* Badge con contador */}
      {count > 0 && (
        <div
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[8px] font-bold px-1"
          style={{
            background: active ? '#00E5FF' : '#444',
            color: active ? '#000' : '#B0B0B0',
          }}
          aria-hidden="true"
        >
          {count > 9 ? '9+' : count}
        </div>
      )}
    </motion.button>
  );
}
