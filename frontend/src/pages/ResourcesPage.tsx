import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Edit,
  FlaskConical,
  Layers,
  LayoutGrid,
  Plus,
  Power,
  Search,
  Users,
} from 'lucide-react';
import { api, extractErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Resource, ResourceType } from '../types';
import { ResourceModal } from '../features/resources/ResourceModal';
import { Alert } from '../components/ui/Alert';

export const ResourcesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [minCapacity, setMinCapacity] = useState<number>(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['resources', { page, search, type, minCapacity }],
    queryFn: () =>
      api.resources.getResources({
        page,
        limit: 10,
        search: search.trim() || undefined,
        type: type !== 'ALL' ? type : undefined,
        minCapacity: minCapacity > 0 ? minCapacity : undefined,
      }),
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (editingResource) {
        return api.resources.updateResource(editingResource.id, formData);
      } else {
        return api.resources.createResource(formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setIsModalOpen(false);
      setEditingResource(null);
    },
    onError: (err) => {
      setActionError(extractErrorMessage(err));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.resources.updateResource(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
    onError: (err) => {
      setActionError(extractErrorMessage(err));
    },
  });

  const handleOpenCreate = () => {
    setActionError(null);
    setEditingResource(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (res: Resource) => {
    setActionError(null);
    setEditingResource(res);
    setIsModalOpen(true);
  };

  const getTypeIcon = (resType: ResourceType) => {
    switch (resType) {
      case 'ROOM':
        return <LayoutGrid className="w-4 h-4 text-blue-600" />;
      case 'LAB':
        return <FlaskConical className="w-4 h-4 text-emerald-600" />;
      case 'EQUIPMENT':
        return <Cpu className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Internal Shared Resources
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Meeting rooms, diagnostic laboratories, and test equipment catalog
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Resource</span>
          </button>
        )}
      </div>

      {actionError && (
        <Alert type="error" className="mb-4">
          {actionError}
        </Alert>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-center">
          <div className="lg:col-span-2 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search resources by name or description..."
              className="block w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-800 bg-white focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">All Types (Rooms, Labs, Equipment)</option>
              <option value="ROOM">Rooms Only</option>
              <option value="LAB">Laboratories Only</option>
              <option value="EQUIPMENT">Equipment Only</option>
            </select>
          </div>

          <div>
            <input
              type="number"
              min={0}
              value={minCapacity || ''}
              onChange={(e) => {
                setMinCapacity(Number(e.target.value) || 0);
                setPage(1);
              }}
              placeholder="Min Capacity..."
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Resource Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm animate-pulse h-48" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-800">No resources found</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data.map((res) => (
            <div
              key={res.id}
              className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                res.isActive ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-75 bg-slate-50/60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                      {getTypeIcon(res.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm tracking-tight">{res.name}</h3>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {res.type}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      res.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {res.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 my-2 min-h-[32px]">
                  {res.description || 'No additional technical description provided.'}
                </p>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 w-fit">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Capacity: {res.capacity} units</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {res.isActive ? (
                  <Link
                    to={`/resources/schedule?resourceId=${res.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 py-1"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Check Availability</span>
                  </Link>
                ) : (
                  <span className="text-xs text-slate-400 italic">Not available for booking</span>
                )}

                {user?.role === 'ADMIN' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(res)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Edit Resource"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        toggleActiveMutation.mutate({ id: res.id, isActive: !res.isActive })
                      }
                      className={`p-1.5 rounded-lg transition-colors ${
                        res.isActive
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={res.isActive ? 'Deactivate Resource' : 'Activate Resource'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs text-slate-600">
          <span>
            Page {data.page} of {data.totalPages} ({data.total} total resources)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={data.page >= data.totalPages}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal for Admin */}
      <ResourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (formData) => {
          await saveMutation.mutateAsync(formData);
        }}
        resource={editingResource}
        isSubmitting={saveMutation.isPending}
      />
    </div>
  );
};
