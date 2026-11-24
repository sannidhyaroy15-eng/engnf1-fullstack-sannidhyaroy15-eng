import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../components/ui/Modal';
import { resourceSchema } from '../../utils/validation';
import { Resource, ResourceType } from '../../types';
import { z } from 'zod';

type ResourceFormInputs = z.infer<typeof resourceSchema>;

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ResourceFormInputs) => Promise<void>;
  resource?: Resource | null;
  isSubmitting: boolean;
}

export const ResourceModal: React.FC<ResourceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  resource,
  isSubmitting,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResourceFormInputs>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      name: '',
      type: 'ROOM',
      capacity: 10,
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (resource) {
      reset({
        name: resource.name,
        type: resource.type,
        capacity: resource.capacity,
        description: resource.description || '',
        isActive: resource.isActive,
      });
    } else {
      reset({
        name: '',
        type: 'ROOM',
        capacity: 10,
        description: '',
        isActive: true,
      });
    }
  }, [resource, reset, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={resource ? 'Edit Internal Resource' : 'Register New Resource'}
      description="Shared meeting room, laboratory, or diagnostic equipment configuration"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Resource Name
          </label>
          <input
            type="text"
            placeholder="e.g. Conference Room Orion"
            {...register('name')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
          />
          {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Resource Type
            </label>
            <select
              {...register('type')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="ROOM">ROOM</option>
              <option value="LAB">LAB</option>
              <option value="EQUIPMENT">EQUIPMENT</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Capacity (Persons/Units)
            </label>
            <input
              type="number"
              min={1}
              max={500}
              {...register('capacity', { valueAsNumber: true })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
            {errors.capacity && (
              <p className="mt-1 text-xs text-rose-600">{errors.capacity.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Technical specifications, location, or available instrumentation..."
            {...register('description')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-rose-600">{errors.description.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="isActive"
            {...register('isActive')}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="text-xs font-medium text-slate-700">
            Active for scheduling (inactive resources cannot be booked)
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? 'Saving...' : resource ? 'Save Changes' : 'Create Resource'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
