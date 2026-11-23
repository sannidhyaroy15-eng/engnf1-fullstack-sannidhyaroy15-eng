export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type TicketCategory = 'BILLING' | 'BUG' | 'FEATURE_REQUEST' | 'LOGIN' | 'DELIVERY';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Ticket {
  id: string;
  externalId: string;
  subject: string;
  body: string;
  autoCategory: TicketCategory;
  category: TicketCategory;
  isHumanOverride: boolean;
  priority: TicketPriority;
  status: TicketStatus;
  assignedId: string | null;
  assignedUser?: User | null;
  isReviewed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TicketAuditField = 'category' | 'priority' | 'status' | 'assignedId';

export interface TicketEvent {
  id: string;
  ticketId: string;
  field: TicketAuditField;
  oldValue: string | null;
  newValue: string | null;
  actor: string;
  createdAt: string;
}

export type ResourceType = 'ROOM' | 'LAB' | 'EQUIPMENT';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface Booking {
  id: string;
  resourceId: string;
  resource?: Resource;
  userId: string;
  user?: User;
  ticketId: string | null;
  ticket?: Ticket | null;
  startTime: string; // ISO 8601 UTC
  endTime: string;   // ISO 8601 UTC
  purpose: string;
  status: BookingStatus;
  decisionNote: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ImportTicketItem {
  externalId: string;
  subject: string;
  body: string;
}

export interface ImportStatsResponse {
  importedCount: number;
  updatedCount: number;
  skippedOverrideCount: number;
  total: number;
}

export interface TicketStatsResponse {
  total: number;
  byCategory: Record<TicketCategory, number>;
  byPriority: Record<TicketPriority, number>;
  byStatus: Record<TicketStatus, number>;
  reviewedCount: number;
  modelAgreementRate: number; // in percentage e.g. 78.5
}

export interface AdminStatsResponse {
  activeResources: number;
  bookingsByStatus: {
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    total: number;
  };
  topResources: Array<{
    resourceId: string;
    name: string;
    type: ResourceType;
    bookingCount: number;
  }>;
  ticketStats: TicketStatsResponse;
}

export interface ResourceAvailabilitySlot {
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED';
}

export interface ResourceAvailabilityResponse {
  resourceId: string;
  from: string;
  to: string;
  bookings: ResourceAvailabilitySlot[];
}
