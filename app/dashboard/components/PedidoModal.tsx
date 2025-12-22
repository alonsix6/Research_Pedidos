'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, modalContentVariants, springs } from '@/lib/animations';
import { Request } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { calculatePriority } from '@/lib/utils';
import { X, Briefcase, FileText, User, Calendar, Send, Loader2 } from 'lucide-react';
import Button3D from './controls/Button3D';

interface ModalUser {
  id: string;
  name: string;
}

interface PedidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingRequest?: Request | null;
}

export default function PedidoModal({
  isOpen,
  onClose,
  onSuccess,
  editingRequest,
}: PedidoModalProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<ModalUser[]>([]);
  const [formData, setFormData] = useState({
    client: '',
    description: '',
    requester_name: '',
    requester_role: '',
    deadline: '',
    assigned_to: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const formId = useId();

  // Focus trap and escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Focus the modal when it opens
    modalRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      if (editingRequest) {
        setFormData({
          client: editingRequest.client,
          description: editingRequest.description,
          requester_name: editingRequest.requester_name,
          requester_role: editingRequest.requester_role || '',
          deadline: editingRequest.deadline.split('T')[0],
          assigned_to: editingRequest.assigned_to || '',
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingRequest]);

  async function loadUsers() {
    const { data } = await supabase.from('users').select('id, name').order('name');
    if (data) {
      setUsers(data);
    }
  }

  function resetForm() {
    setFormData({
      client: '',
      description: '',
      requester_name: '',
      requester_role: '',
      deadline: '',
      assigned_to: '',
    });
    setErrors({});
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};

    if (!formData.client.trim()) {
      newErrors.client = 'El cliente es requerido';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }
    if (!formData.requester_name.trim()) {
      newErrors.requester_name = 'El solicitante es requerido';
    }
    if (!formData.deadline) {
      newErrors.deadline = 'La fecha de entrega es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const deadlineDate = new Date(formData.deadline);
      const priority = calculatePriority(deadlineDate.toISOString());

      const requestData = {
        client: formData.client.trim(),
        description: formData.description.trim(),
        requester_name: formData.requester_name.trim(),
        requester_role: formData.requester_role.trim(),
        deadline: deadlineDate.toISOString(),
        assigned_to: formData.assigned_to || null,
        priority,
        status: editingRequest?.status || 'pending',
      };

      if (editingRequest) {
        const { error } = await supabase
          .from('requests')
          .update(requestData)
          .eq('id', editingRequest.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('requests').insert({
          ...requestData,
          created_by: users[0]?.id || null,
        });

        if (error) throw error;
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      console.error('Error saving request:', err);
      setErrors({ submit: 'Error al guardar el pedido. Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* Overlay */}
          <motion.div
            variants={modalOverlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal como dispositivo */}
          <motion.div
            ref={modalRef}
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative w-full max-w-lg metallic-surface rounded-lg overflow-hidden max-h-[90vh] flex flex-col"
            style={{
              boxShadow: `
                0 25px 80px rgba(0,0,0,0.6),
                0 10px 30px rgba(0,0,0,0.4),
                inset 0 1px 0 rgba(255,255,255,0.4),
                inset 0 -1px 0 rgba(0,0,0,0.2)
              `,
            }}
            tabIndex={-1}
          >
            {/* Header estilo TopBar */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{
                background: 'linear-gradient(180deg, #D8D8D8 0%, #C0C0C0 100%)',
                borderBottom: '1px solid rgba(0,0,0,0.15)',
              }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="led led-orange"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden="true"
                />
                <h2
                  id={titleId}
                  className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]"
                >
                  {editingRequest ? 'EDITAR PEDIDO' : 'NUEVO PEDIDO'}
                </h2>
              </div>
              <motion.button
                onClick={onClose}
                className="w-11 h-11 flex items-center justify-center rounded-sm
                           bg-gradient-to-b from-[#4A4A4A] to-[#3A3A3A]
                           shadow-[0_2px_0_#2A2A2A,inset_0_1px_0_rgba(255,255,255,0.1)]"
                whileHover={{ scale: 1.05, backgroundColor: '#5A5A5A' }}
                whileTap={{ scale: 0.95, y: 1 }}
                transition={springs.snappy}
                aria-label="Cerrar modal"
                type="button"
              >
                <X size={16} className="text-white" aria-hidden="true" />
              </motion.button>
            </div>

            {/* Screen del formulario */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="lcd-screen p-4">
                <form id={formId} onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Cliente */}
                  <FormField
                    id={`${formId}-client`}
                    icon={<Briefcase size={12} />}
                    label="Cliente / Cuenta"
                    error={errors.client}
                    required
                  >
                    <input
                      id={`${formId}-client`}
                      type="text"
                      value={formData.client}
                      onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      className="input-lcd w-full"
                      placeholder="Ej: Claro, Movistar, BCP..."
                      aria-invalid={!!errors.client}
                      aria-describedby={errors.client ? `${formId}-client-error` : undefined}
                      required
                    />
                  </FormField>

                  {/* Descripcion */}
                  <FormField
                    id={`${formId}-description`}
                    icon={<FileText size={12} />}
                    label="Descripción"
                    error={errors.description}
                    required
                  >
                    <textarea
                      id={`${formId}-description`}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input-lcd w-full resize-none"
                      rows={3}
                      placeholder="Describe lo que necesitan..."
                      aria-invalid={!!errors.description}
                      aria-describedby={errors.description ? `${formId}-description-error` : undefined}
                      required
                    />
                  </FormField>

                  {/* Solicitante */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      id={`${formId}-requester`}
                      icon={<User size={12} />}
                      label="Solicitante"
                      error={errors.requester_name}
                      required
                    >
                      <input
                        id={`${formId}-requester`}
                        type="text"
                        value={formData.requester_name}
                        onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                        className="input-lcd w-full"
                        placeholder="Nombre"
                        aria-invalid={!!errors.requester_name}
                        aria-describedby={errors.requester_name ? `${formId}-requester-error` : undefined}
                        required
                      />
                    </FormField>
                    <FormField
                      id={`${formId}-role`}
                      label="Cargo"
                    >
                      <input
                        id={`${formId}-role`}
                        type="text"
                        value={formData.requester_role}
                        onChange={(e) => setFormData({ ...formData, requester_role: e.target.value })}
                        className="input-lcd w-full"
                        placeholder="Ej: Ejecutiva"
                      />
                    </FormField>
                  </div>

                  {/* Deadline */}
                  <FormField
                    id={`${formId}-deadline`}
                    icon={<Calendar size={12} />}
                    label="Fecha de entrega"
                    error={errors.deadline}
                    required
                  >
                    <input
                      id={`${formId}-deadline`}
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="input-lcd w-full"
                      min={new Date().toISOString().split('T')[0]}
                      aria-invalid={!!errors.deadline}
                      aria-describedby={errors.deadline ? `${formId}-deadline-error` : undefined}
                      required
                    />
                  </FormField>

                  {/* Asignado */}
                  <FormField
                    id={`${formId}-assigned`}
                    icon={<User size={12} />}
                    label="Asignar a"
                  >
                    <select
                      id={`${formId}-assigned`}
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      className="input-lcd w-full"
                    >
                      <option value="">Sin asignar</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {/* Error general */}
                  <AnimatePresence>
                    {errors.submit && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-3 rounded-sm text-xs"
                        style={{
                          background: 'rgba(229, 57, 53, 0.2)',
                          border: '1px solid #E53935',
                          color: '#E53935',
                        }}
                        role="alert"
                        aria-live="assertive"
                      >
                        {errors.submit}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </div>
            </div>

            {/* Botones de accion */}
            <div
              className="flex gap-3 p-4"
              style={{
                background: 'linear-gradient(180deg, #C8C8C8 0%, #B8B8B8 100%)',
                borderTop: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              <Button3D
                variant="grey"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
                type="button"
              >
                CANCELAR
              </Button3D>
              <Button3D
                variant="orange"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2"
                type="submit"
                form={formId}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      aria-hidden="true"
                    >
                      <Loader2 size={14} />
                    </motion.div>
                    GUARDANDO...
                  </>
                ) : (
                  <>
                    <Send size={14} aria-hidden="true" />
                    {editingRequest ? 'GUARDAR' : 'CREAR'}
                  </>
                )}
              </Button3D>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function FormField({
  id,
  icon,
  label,
  error,
  required,
  children,
}: {
  id: string;
  icon?: React.ReactNode;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const errorId = `${id}-error`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <label htmlFor={id} className="flex items-center gap-2 mb-1.5">
        {icon && <span style={{ color: '#FF4500' }} aria-hidden="true">{icon}</span>}
        <span
          className="text-[10px] uppercase tracking-wider font-medium"
          style={{ color: error ? '#E53935' : '#949494' }}
        >
          {label}
          {required && <span className="text-[#FF4500] ml-0.5" aria-hidden="true">*</span>}
          {required && <span className="sr-only"> (requerido)</span>}
        </span>
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            id={errorId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-[10px] mt-1"
            style={{ color: '#E53935' }}
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
