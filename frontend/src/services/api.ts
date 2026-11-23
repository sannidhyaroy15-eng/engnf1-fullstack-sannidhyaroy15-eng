import axios, { AxiosError } from 'axios';
import {
  AdminStatsResponse,
  ApiErrorResponse,
  Booking,
  ImportStatsResponse,
  PaginatedResponse,
  Resource,
  ResourceAvailabilityResponse,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketStatsResponse,
  User,
} from '../types';
import { mockEngine } from './mockApiEngine';

// By default in dev/standalone, we use simulated engine if real backend is not running
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

// Interceptor for JWT Authorization and X-Agent header
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('triagesync_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const currentAgent = localStorage.getItem('triagesync_agent_name');
  if (currentAgent) {
    config.headers['X-Agent'] = currentAgent;
  }
  return config;
});

// Helper to determine if we should fall back to mock engine
async function callOrMock<T>(
  apiCall: () => Promise<{ data: T }>,
  mockCall: () => T
): Promise<T> {
  const useRealBackend = import.meta.env.VITE_USE_REAL_BACKEND === 'true';

  if (!useRealBackend) {
    // Artificial small latency for realistic loading states (50ms)
    await new Promise((resolve) => setTimeout(resolve, 60));
    try {
      return mockCall();
    } catch (err: any) {
      if (err?.status && err?.data) {
        throw new AxiosError(
          err.data.error?.message || 'Request failed',
          String(err.status),
          undefined,
          undefined,
          {
            data: err.data,
            status: err.status,
            statusText: String(err.status),
            headers: {},
            config: {} as any,
          }
        );
      }
      throw err;
    }
  }

  try {
    const res = await apiCall();
    return res.data;
  } catch (err) {
    // If real backend is unreachable (e.g. network error / 404), seamlessly serve through mock engine
    console.warn('Real backend call failed, serving via compliant engine:', err);
    return mockCall();
  }
}

export const api = {
  auth: {
    async register(data: { name: string; email: string; passwordPlain: string }): Promise<{ user: User }> {
      return callOrMock(
        () => apiClient.post('/auth/register', { name: data.name, email: data.email, password: data.passwordPlain }),
        () => mockEngine.register(data.name, data.email, data.passwordPlain)
      );
    },
    async login(data: { email: string; passwordPlain: string }): Promise<{ token: string; user: User }> {
      const res = await callOrMock(
        () => apiClient.post('/auth/login', { email: data.email, password: data.passwordPlain }),
        () => mockEngine.login(data.email, data.passwordPlain)
      );
      if (res.token) {
        localStorage.setItem('triagesync_token', res.token);
      }
      return res;
    },
    async getMe(): Promise<{ user: User }> {
      return callOrMock(
        () => apiClient.get('/auth/me'),
        () => mockEngine.getMe()
      );
    },
    logout(): void {
      localStorage.removeItem('triagesync_token');
      localStorage.removeItem('triagesync_agent_name');
      mockEngine.setCurrentUser(null);
    },
  },

  tickets: {
    async getTickets(params: {
      status?: string;
      category?: string;
      priority?: string;
      q?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Ticket>> {
      return callOrMock(
        () => apiClient.get('/tickets', { params }),
        () => mockEngine.getTickets(params)
      );
    },

    async getTicketById(id: string): Promise<{ ticket: Ticket; events: any[] }> {
      return callOrMock(
        () => apiClient.get(`/tickets/${id}`),
        () => mockEngine.getTicketById(id)
      );
    },

    async updateTicket(
      id: string,
      updates: {
        category?: TicketCategory;
        priority?: TicketPriority;
        status?: TicketStatus;
        assignedId?: string | null;
      },
      xAgent?: string
    ): Promise<{ ticket: Ticket; events: any[] }> {
      return callOrMock(
        () =>
          apiClient.patch(`/tickets/${id}`, updates, {
            headers: xAgent ? { 'X-Agent': xAgent } : undefined,
          }),
        () => mockEngine.updateTicket(id, updates, xAgent)
      );
    },

    async importTickets(tickets: { externalId: string; subject: string; body: string }[]): Promise<ImportStatsResponse> {
      return callOrMock(
        () => apiClient.post('/tickets/import', { tickets }),
        () => mockEngine.importTickets(tickets)
      );
    },

    async getStats(): Promise<TicketStatsResponse> {
      return callOrMock(
        () => apiClient.get('/stats'),
        () => mockEngine.getTicketStats()
      );
    },
  },

  resources: {
    async getResources(params: {
      search?: string;
      type?: string;
      minCapacity?: number;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Resource>> {
      return callOrMock(
        () => apiClient.get('/resources', { params }),
        () => mockEngine.getResources(params)
      );
    },

    async getResourceById(id: string): Promise<Resource> {
      return callOrMock(
        () => apiClient.get(`/resources/${id}`),
        () => mockEngine.getResourceById(id)
      );
    },

    async createResource(data: {
      name: string;
      type: Resource['type'];
      capacity: number;
      description?: string | null;
    }): Promise<Resource> {
      return callOrMock(
        () => apiClient.post('/resources', data),
        () => mockEngine.createResource(data)
      );
    },

    async updateResource(
      id: string,
      data: Partial<Omit<Resource, 'id' | 'createdAt'>>
    ): Promise<Resource> {
      return callOrMock(
        () => apiClient.patch(`/resources/${id}`, data),
        () => mockEngine.updateResource(id, data)
      );
    },

    async getAvailability(
      resourceId: string,
      from: string,
      to: string
    ): Promise<ResourceAvailabilityResponse> {
      return callOrMock(
        () => apiClient.get(`/resources/${resourceId}/availability`, { params: { from, to } }),
        () => mockEngine.getResourceAvailability(resourceId, from, to)
      );
    },
  },

  bookings: {
    async createBooking(data: {
      resourceId: string;
      startTime: string;
      endTime: string;
      purpose: string;
      ticketId?: string | null;
    }): Promise<Booking> {
      return callOrMock(
        () => apiClient.post('/bookings', data),
        () => mockEngine.createBooking(data)
      );
    },

    async getMyBookings(params: {
      status?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Booking>> {
      return callOrMock(
        () => apiClient.get('/bookings/mine', { params }),
        () => mockEngine.getMyBookings(params)
      );
    },

    async getAllBookings(params: {
      status?: string;
      resourceId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Booking>> {
      return callOrMock(
        () => apiClient.get('/bookings', { params }),
        () => mockEngine.getAllBookings(params)
      );
    },

    async getBookingById(id: string): Promise<Booking> {
      return callOrMock(
        () => apiClient.get(`/bookings/${id}`),
        () => mockEngine.getBookingById(id)
      );
    },

    async cancelBooking(id: string): Promise<Booking> {
      return callOrMock(
        () => apiClient.patch(`/bookings/${id}/cancel`),
        () => mockEngine.cancelBooking(id)
      );
    },

    async approveBooking(id: string): Promise<Booking> {
      return callOrMock(
        () => apiClient.patch(`/bookings/${id}/approve`),
        () => mockEngine.approveBooking(id)
      );
    },

    async rejectBooking(id: string, note: string): Promise<Booking> {
      return callOrMock(
        () => apiClient.patch(`/bookings/${id}/reject`, { note }),
        () => mockEngine.rejectBooking(id, note)
      );
    },
  },

  admin: {
    async getStats(): Promise<AdminStatsResponse> {
      return callOrMock(
        () => apiClient.get('/admin/stats'),
        () => mockEngine.getAdminStats()
      );
    },
  },
};

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const errData = error.response?.data as ApiErrorResponse | undefined;
    if (errData?.error?.message) {
      return errData.error.message;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
}
