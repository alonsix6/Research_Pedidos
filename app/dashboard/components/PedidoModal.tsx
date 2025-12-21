'use client';

import { useState, useEffect } from 'react';
import { Request } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { calculatePriority, formatLimaDate } from '@/lib/utils';
import {
  CloseIcon,
  ClientIcon,
  DescriptionIcon,
  UserIcon,
  CalendarIcon,
  SendIcon,
} from './Icons';

interface User {
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
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    client: '',
    description: '',
    requester_name: '',
    requester_role: '',
    deadline: '',
    assigned_to: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      newErrors.description = 'La descripcion es requerida';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-op1-card rounded-sm shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold uppercase tracking-wide">
            {editingRequest ? 'Editar Pedido' : 'Nuevo Pedido'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-sm transition-op1"
            title="Cerrar"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Cliente */}
          <div>
            <label className="label-op1 flex items-center gap-2">
              <ClientIcon size={14} />
              Cliente / Cuenta
            </label>
            <input
              type="text"
              value={formData.client}
              onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              className={`input-op1 ${errors.client ? 'border-op1-accent' : ''}`}
              placeholder="Ej: Claro, Movistar, BCP..."
            />
            {errors.client && (
              <p className="text-xs text-op1-accent mt-1">{errors.client}</p>
            )}
          </div>

          {/* Descripcion */}
          <div>
            <label className="label-op1 flex items-center gap-2">
              <DescriptionIcon size={14} />
              Descripcion del pedido
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`input-op1 resize-none ${errors.description ? 'border-op1-accent' : ''}`}
              rows={3}
              placeholder="Describe lo que necesitan..."
            />
            {errors.description && (
              <p className="text-xs text-op1-accent mt-1">{errors.description}</p>
            )}
          </div>

          {/* Solicitante */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-op1 flex items-center gap-2">
                <UserIcon size={14} />
                Solicitante
              </label>
              <input
                type="text"
                value={formData.requester_name}
                onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                className={`input-op1 ${errors.requester_name ? 'border-op1-accent' : ''}`}
                placeholder="Nombre"
              />
              {errors.requester_name && (
                <p className="text-xs text-op1-accent mt-1">{errors.requester_name}</p>
              )}
            </div>
            <div>
              <label className="label-op1">Cargo (opcional)</label>
              <input
                type="text"
                value={formData.requester_role}
                onChange={(e) => setFormData({ ...formData, requester_role: e.target.value })}
                className="input-op1"
                placeholder="Ej: Ejecutiva"
              />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="label-op1 flex items-center gap-2">
              <CalendarIcon size={14} />
              Fecha de entrega
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className={`input-op1 ${errors.deadline ? 'border-op1-accent' : ''}`}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.deadline && (
              <p className="text-xs text-op1-accent mt-1">{errors.deadline}</p>
            )}
          </div>

          {/* Asignado */}
          <div>
            <label className="label-op1 flex items-center gap-2">
              <UserIcon size={14} />
              Asignar a (opcional)
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="input-op1"
            >
              <option value="">Sin asignar</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Error general */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm">
              <p className="text-xs text-op1-accent">{errors.submit}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-op1 flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-op1-accent flex-1 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                'Guardando...'
              ) : (
                <>
                  <SendIcon size={16} />
                  {editingRequest ? 'Guardar cambios' : 'Crear pedido'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
