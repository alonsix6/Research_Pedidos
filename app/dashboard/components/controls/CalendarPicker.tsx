'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  parse,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isBefore,
  isToday,
  isSameDay,
  isSameMonth,
  startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarPickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: Date;
  id?: string;
  error?: boolean;
  ariaDescribedBy?: string;
}

const WEEKDAYS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];

export default function CalendarPicker({
  value,
  onChange,
  minDate,
  id,
  error,
  ariaDescribedBy,
}: CalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      return startOfMonth(parse(value, 'yyyy-MM-dd', new Date()));
    }
    return startOfMonth(new Date());
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : null;

  const today = startOfDay(new Date());
  const min = minDate ? startOfDay(minDate) : today;

  // Update viewDate when value changes externally
  useEffect(() => {
    if (value) {
      setViewDate(startOfMonth(parse(value, 'yyyy-MM-dd', new Date())));
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const days = useCallback(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [viewDate]);

  const handleSelect = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const prevMonth = () => setViewDate((d) => subMonths(d, 1));
  const nextMonth = () => setViewDate((d) => addMonths(d, 1));

  const isPrevDisabled = isBefore(endOfMonth(subMonths(viewDate, 1)), min);

  const displayValue = selectedDate ? format(selectedDate, 'dd/MM/yyyy') : '';

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen((o) => !o)}
        className="input-lcd w-full text-left flex items-center justify-between gap-2"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-invalid={error || undefined}
        aria-describedby={ariaDescribedBy}
        style={{ cursor: 'pointer' }}
      >
        <span style={{ color: displayValue ? 'var(--te-cyan)' : '#3A3A3A' }}>
          {displayValue || 'Seleccionar fecha...'}
        </span>
        <Calendar
          size={14}
          style={{ color: 'var(--te-orange)', flexShrink: 0 }}
          aria-hidden="true"
        />
      </button>

      {/* Calendar Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label="Calendario"
            className="mt-1 w-full"
            style={{
              background: '#0D0D0D',
              border: '2px solid #1A1A1A',
              borderRadius: '4px',
              fontFamily: "'JetBrains Mono', monospace",
              boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,229,255,0.05)',
            }}
          >
            {/* Month Navigation */}
            <div className="flex items-center justify-between px-2 py-2">
              <button
                type="button"
                onClick={prevMonth}
                disabled={isPrevDisabled}
                className="w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
                style={{
                  background: isPrevDisabled ? 'transparent' : '#1A1A1A',
                  color: isPrevDisabled ? '#1A1A1A' : 'var(--te-cyan)',
                  cursor: isPrevDisabled ? 'not-allowed' : 'pointer',
                }}
                aria-label="Mes anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <span
                className="text-xs uppercase tracking-wider font-medium"
                style={{ color: 'var(--te-cyan)' }}
              >
                {format(viewDate, 'MMMM yyyy', { locale: es })}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
                style={{
                  background: '#1A1A1A',
                  color: 'var(--te-cyan)',
                  cursor: 'pointer',
                }}
                aria-label="Mes siguiente"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 px-2">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="text-center py-1"
                  style={{ color: '#3A3A3A', fontSize: '9px', letterSpacing: '0.05em' }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day Grid */}
            <div className="grid grid-cols-7 px-2 pb-2">
              {days().map((day) => {
                const inCurrentMonth = isSameMonth(day, viewDate);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isDisabled = isBefore(day, min) && !isSameDay(day, min);
                const isDayToday = isToday(day);

                if (!inCurrentMonth) {
                  return <div key={day.toISOString()} />;
                }

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && handleSelect(day)}
                    className="relative flex flex-col items-center justify-center rounded-sm transition-all"
                    style={{
                      height: '28px',
                      fontSize: '11px',
                      fontWeight: isSelected ? 600 : 400,
                      color: isDisabled ? '#1A1A1A' : isSelected ? '#FFFFFF' : 'var(--te-cyan)',
                      background: isSelected ? 'var(--te-orange)' : 'transparent',
                      boxShadow: isSelected ? '0 0 8px rgba(255, 69, 0, 0.4)' : 'none',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!isDisabled && !isSelected) {
                        e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                    aria-label={format(day, "d 'de' MMMM 'de' yyyy", { locale: es })}
                    aria-pressed={isSelected || undefined}
                  >
                    {format(day, 'd')}
                    {isDayToday && !isSelected && (
                      <span
                        className="absolute bottom-0.5 w-1 h-1 rounded-full"
                        style={{ background: 'var(--te-orange)' }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
