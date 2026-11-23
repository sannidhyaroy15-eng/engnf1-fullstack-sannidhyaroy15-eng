import {
  AdminStatsResponse,
  Booking,
  BookingStatus,
  ImportStatsResponse,
  PaginatedResponse,
  Resource,
  ResourceAvailabilityResponse,
  Ticket,
  TicketCategory,
  TicketEvent,
  TicketPriority,
  TicketStatus,
  TicketStatsResponse,
  User,
} from '../types';
import { classifyTicket } from '../utils/triage';
import {
  SEED_BOOKINGS,
  SEED_RESOURCES,
  SEED_TICKETS,
  SEED_TICKET_EVENTS,
  SEED_USERS,
} from './mockData';

const STORAGE_KEY_PREFIX = 'triagesync_';

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
}

export class MockApiEngine {
  private users: (User & { passwordPlain: string })[];
  private resources: Resource[];
  private tickets: Ticket[];
  private ticketEvents: TicketEvent[];
  private bookings: Booking[];
  private currentUser: User | null = null;

  constructor() {
    this.users = getStorage('users', SEED_USERS);
    this.resources = getStorage('resources', SEED_RESOURCES);
    this.tickets = getStorage('tickets', SEED_TICKETS);
    this.ticketEvents = getStorage('events', SEED_TICKET_EVENTS);
    this.bookings = getStorage('bookings', SEED_BOOKINGS);

    const savedAuth = getStorage<{ token: string; user: User } | null>('auth', null);
    if (savedAuth?.user) {
      this.currentUser = savedAuth.user;
    }
  }

  private persist() {
    setStorage('users', this.users);
    setStorage('resources', this.resources);
    setStorage('tickets', this.tickets);
    setStorage('events', this.ticketEvents);
    setStorage('bookings', this.bookings);
  }

  public resetToSeed() {
    this.users = [...SEED_USERS];
    this.resources = [...SEED_RESOURCES];
    this.tickets = [...SEED_TICKETS];
    this.ticketEvents = [...SEED_TICKET_EVENTS];
    this.bookings = [...SEED_BOOKINGS];
    this.persist();
  }

  // Current session helper
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public setCurrentUser(user: User | null) {
    this.currentUser = user;
    if (user) {
      setStorage('auth', { token: 'mock-jwt-token-' + user.id, user });
    } else {
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'auth');
    }
  }

  // --- AUTHENTICATION ---
  public login(email: string, passwordPlain: string): { token: string; user: User } {
    const user = this.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );

    if (!user || user.passwordPlain !== passwordPlain) {
      throw {
        status: 401,
        data: {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          },
        },
      };
    }

    const { passwordPlain: _, ...safeUser } = user;
    const token = 'mock-jwt-token-' + safeUser.id;
    this.setCurrentUser(safeUser);
    return { token, user: safeUser };
  }

  public register(name: string, email: string, passwordPlain: string): { user: User } {
    const trimmedEmail = email.toLowerCase().trim();
    if (this.users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      throw {
        status: 409,
        data: {
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email already exists.',
          },
        },
      };
    }

    const newUser = {
      id: 'user_' + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      email: trimmedEmail,
      role: 'USER' as const, // Strict rule: registration ALWAYS creates USER
      passwordPlain,
      createdAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    this.persist();

    const { passwordPlain: _, ...safeUser } = newUser;
    return { user: safeUser };
  }

  public getMe(): { user: User } {
    if (!this.currentUser) {
      throw {
        status: 401,
        data: {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required.',
          },
        },
      };
    }
    return { user: this.currentUser };
  }

  // --- TICKETS ---
  public getTickets(params: {
    status?: string;
    category?: string;
    priority?: string;
    q?: string;
    page?: number;
    limit?: number;
  }): PaginatedResponse<Ticket> {
    let result = [...this.tickets];

    // Status filter
    if (params.status && params.status !== 'ALL') {
      result = result.filter((t) => t.status === params.status);
    }

    // Category filter
    if (params.category && params.category !== 'ALL') {
      result = result.filter((t) => t.category === params.category);
    }

    // Priority filter
    if (params.priority && params.priority !== 'ALL') {
      result = result.filter((t) => t.priority === params.priority);
    }

    // Query filter (searches both subject and body, injection-safe)
    if (params.q && params.q.trim()) {
      const qLower = params.q.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(qLower) ||
          t.body.toLowerCase().includes(qLower) ||
          t.externalId.toLowerCase().includes(qLower)
      );
    }

    // Sort descending by createdAt
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.limit) || 10));
    const total = result.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = result.slice(start, start + pageSize);

    // Attach assigned user metadata
    const populatedData = data.map((t) => {
      const assigned = t.assignedId ? this.users.find((u) => u.id === t.assignedId) : null;
      return {
        ...t,
        assignedUser: assigned ? { id: assigned.id, name: assigned.name, email: assigned.email, role: assigned.role, createdAt: assigned.createdAt } : null,
      };
    });

    return {
      data: populatedData,
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  public getTicketById(id: string): { ticket: Ticket; events: TicketEvent[] } {
    const ticket = this.tickets.find((t) => t.id === id);
    if (!ticket) {
      throw {
        status: 404,
        data: {
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Ticket not found.',
          },
        },
      };
    }

    const assigned = ticket.assignedId ? this.users.find((u) => u.id === ticket.assignedId) : null;
    const populatedTicket: Ticket = {
      ...ticket,
      assignedUser: assigned ? { id: assigned.id, name: assigned.name, email: assigned.email, role: assigned.role, createdAt: assigned.createdAt } : null,
    };

    const events = this.ticketEvents
      .filter((e) => e.ticketId === id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return { ticket: populatedTicket, events };
  }

  public updateTicket(
    id: string,
    updates: {
      category?: TicketCategory;
      priority?: TicketPriority;
      status?: TicketStatus;
      assignedId?: string | null;
    },
    xAgentHeader?: string
  ): { ticket: Ticket; events: TicketEvent[] } {
    const ticketIndex = this.tickets.findIndex((t) => t.id === id);
    if (ticketIndex === -1) {
      throw {
        status: 404,
        data: {
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Ticket not found.',
          },
        },
      };
    }

    const ticket = this.tickets[ticketIndex];
    const actor = xAgentHeader || this.currentUser?.email || 'system@triagesync.test';
    const now = new Date().toISOString();
    const newEvents: TicketEvent[] = [];

    let isHumanOverride = ticket.isHumanOverride;
    let isReviewed = ticket.isReviewed;

    // Check category change
    if (updates.category && updates.category !== ticket.category) {
      newEvents.push({
        id: 'event_' + Math.random().toString(36).substring(2, 9),
        ticketId: ticket.id,
        field: 'category',
        oldValue: ticket.category,
        newValue: updates.category,
        actor,
        createdAt: now,
      });
      isHumanOverride = true; // Rule T-B3: If category changes, set isHumanOverride = true
      isReviewed = true;
      ticket.category = updates.category;
    }

    // Check priority change
    if (updates.priority && updates.priority !== ticket.priority) {
      newEvents.push({
        id: 'event_' + Math.random().toString(36).substring(2, 9),
        ticketId: ticket.id,
        field: 'priority',
        oldValue: ticket.priority,
        newValue: updates.priority,
        actor,
        createdAt: now,
      });
      isReviewed = true;
      ticket.priority = updates.priority;
    }

    // Check status change
    if (updates.status && updates.status !== ticket.status) {
      newEvents.push({
        id: 'event_' + Math.random().toString(36).substring(2, 9),
        ticketId: ticket.id,
        field: 'status',
        oldValue: ticket.status,
        newValue: updates.status,
        actor,
        createdAt: now,
      });
      isReviewed = true;
      ticket.status = updates.status;
    }

    // Check assignedId change
    if (updates.assignedId !== undefined && updates.assignedId !== ticket.assignedId) {
      newEvents.push({
        id: 'event_' + Math.random().toString(36).substring(2, 9),
        ticketId: ticket.id,
        field: 'assignedId',
        oldValue: ticket.assignedId,
        newValue: updates.assignedId,
        actor,
        createdAt: now,
      });
      isReviewed = true;
      ticket.assignedId = updates.assignedId;
    }

    ticket.isHumanOverride = isHumanOverride;
    ticket.isReviewed = isReviewed;
    ticket.updatedAt = now;

    this.tickets[ticketIndex] = ticket;
    this.ticketEvents.push(...newEvents);
    this.persist();

    return this.getTicketById(id);
  }

  public importTickets(
    items: { externalId: string; subject: string; body: string }[]
  ): ImportStatsResponse {
    let importedCount = 0;
    let updatedCount = 0;
    let skippedOverrideCount = 0;
    const now = new Date().toISOString();

    for (const item of items) {
      const existing = this.tickets.find((t) => t.externalId === item.externalId);
      const { category: predictedCategory, priority: predictedPriority } = classifyTicket(
        item.subject,
        item.body
      );

      if (existing) {
        // Update subject and body
        existing.subject = item.subject;
        existing.body = item.body;
        existing.updatedAt = now;

        if (existing.isHumanOverride) {
          // Rule T-B2: Never overwrite a human-overridden category during re-import
          skippedOverrideCount++;
        } else {
          // Re-run auto-classification only when isHumanOverride = false
          existing.category = predictedCategory;
          existing.autoCategory = predictedCategory;
          existing.priority = predictedPriority;
        }
        updatedCount++;
      } else {
        // Create new ticket
        const newTicket: Ticket = {
          id: 'tick_' + Math.random().toString(36).substring(2, 9),
          externalId: item.externalId,
          subject: item.subject,
          body: item.body,
          autoCategory: predictedCategory,
          category: predictedCategory,
          isHumanOverride: false,
          priority: predictedPriority,
          status: 'OPEN',
          assignedId: null,
          isReviewed: false,
          createdAt: now,
          updatedAt: now,
        };
        this.tickets.push(newTicket);
        importedCount++;
      }
    }

    this.persist();

    return {
      importedCount,
      updatedCount,
      skippedOverrideCount,
      total: items.length,
    };
  }

  public getTicketStats(): TicketStatsResponse {
    const total = this.tickets.length;
    const byCategory: Record<TicketCategory, number> = {
      BILLING: 0,
      BUG: 0,
      FEATURE_REQUEST: 0,
      LOGIN: 0,
      DELIVERY: 0,
    };
    const byPriority: Record<TicketPriority, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };
    const byStatus: Record<TicketStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    let reviewedCount = 0;
    let agreementMatches = 0;

    for (const t of this.tickets) {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      if (t.isReviewed) reviewedCount++;
      if (t.autoCategory === t.category) agreementMatches++;
    }

    const modelAgreementRate = total > 0 ? Number(((agreementMatches / total) * 100).toFixed(1)) : 100;

    return {
      total,
      byCategory,
      byPriority,
      byStatus,
      reviewedCount,
      modelAgreementRate,
    };
  }

  // --- RESOURCES ---
  public getResources(params: {
    search?: string;
    type?: string;
    minCapacity?: number;
    page?: number;
    limit?: number;
  }): PaginatedResponse<Resource> {
    let list = [...this.resources];

    // User visibility restriction: USER sees active resources only, ADMIN sees all
    if (this.currentUser?.role !== 'ADMIN') {
      list = list.filter((r) => r.isActive);
    }

    if (params.type && params.type !== 'ALL') {
      list = list.filter((r) => r.type === params.type);
    }

    if (params.minCapacity && Number(params.minCapacity) > 0) {
      list = list.filter((r) => r.capacity >= Number(params.minCapacity));
    }

    if (params.search && params.search.trim()) {
      const s = params.search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          (r.description && r.description.toLowerCase().includes(s))
      );
    }

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.limit) || 10));
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = list.slice(start, start + pageSize);

    return {
      data,
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  public getResourceById(id: string): Resource {
    const resource = this.resources.find((r) => r.id === id);
    if (!resource) {
      throw {
        status: 404,
        data: {
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Resource not found.',
          },
        },
      };
    }
    if (this.currentUser?.role !== 'ADMIN' && !resource.isActive) {
      throw {
        status: 403,
        data: {
          error: {
            code: 'FORBIDDEN',
            message: 'Resource is inactive.',
          },
        },
      };
    }
    return resource;
  }

  public createResource(data: {
    name: string;
    type: Resource['type'];
    capacity: number;
    description?: string | null;
  }): Resource {
    if (this.currentUser?.role !== 'ADMIN') {
      throw {
        status: 403,
        data: { error: { code: 'FORBIDDEN', message: 'Admin access required.' } },
      };
    }

    // Name uniqueness case-insensitive
    const trimmedName = data.name.trim();
    if (
      this.resources.some((r) => r.name.toLowerCase() === trimmedName.toLowerCase())
    ) {
      throw {
        status: 409,
        data: {
          error: {
            code: 'RESOURCE_NAME_EXISTS',
            message: 'A resource with this name already exists.',
          },
        },
      };
    }

    const newResource: Resource = {
      id: 'res_' + Math.random().toString(36).substring(2, 9),
      name: trimmedName,
      type: data.type,
      capacity: Number(data.capacity),
      description: data.description ? data.description.trim() : null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    this.resources.push(newResource);
    this.persist();
    return newResource;
  }

  public updateResource(
    id: string,
    data: Partial<Omit<Resource, 'id' | 'createdAt'>>
  ): Resource {
    if (this.currentUser?.role !== 'ADMIN') {
      throw {
        status: 403,
        data: { error: { code: 'FORBIDDEN', message: 'Admin access required.' } },
      };
    }

    const index = this.resources.findIndex((r) => r.id === id);
    if (index === -1) {
      throw {
        status: 404,
        data: { error: { code: 'RESOURCE_NOT_FOUND', message: 'Resource not found.' } },
      };
    }

    if (data.name) {
      const trimmedName = data.name.trim();
      const existing = this.resources.find(
        (r) => r.id !== id && r.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existing) {
        throw {
          status: 409,
          data: {
            error: {
              code: 'RESOURCE_NAME_EXISTS',
              message: 'A resource with this name already exists.',
            },
          },
        };
      }
      this.resources[index].name = trimmedName;
    }

    if (data.type) this.resources[index].type = data.type;
    if (data.capacity !== undefined) this.resources[index].capacity = Number(data.capacity);
    if (data.description !== undefined) this.resources[index].description = data.description;
    if (data.isActive !== undefined) this.resources[index].isActive = data.isActive;

    this.persist();
    return this.resources[index];
  }

  public getResourceAvailability(
    resourceId: string,
    from: string,
    to: string
  ): ResourceAvailabilityResponse {
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();

    // Reveal only PENDING and APPROVED bookings; hide owner details per B13-B16
    const relevant = this.bookings.filter(
      (b) =>
        b.resourceId === resourceId &&
        (b.status === 'PENDING' || b.status === 'APPROVED') &&
        new Date(b.startTime).getTime() < toTime &&
        new Date(b.endTime).getTime() > fromTime
    );

    return {
      resourceId,
      from,
      to,
      bookings: relevant.map((b) => ({
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status as 'PENDING' | 'APPROVED',
      })),
    };
  }

  // --- BOOKINGS ---
  public createBooking(data: {
    resourceId: string;
    startTime: string;
    endTime: string;
    purpose: string;
    ticketId?: string | null;
  }): Booking {
    if (!this.currentUser) {
      throw {
        status: 401,
        data: { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      };
    }

    const resource = this.resources.find((r) => r.id === data.resourceId);
    if (!resource || !resource.isActive) {
      throw {
        status: 400,
        data: {
          error: {
            code: 'RESOURCE_UNAVAILABLE',
            message: 'Bookings can only be created for active resources.',
          },
        },
      };
    }

    const startDate = new Date(data.startTime);
    const endDate = new Date(data.endTime);
    const now = new Date();

    // Time validation (B1-B4)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw {
        status: 400,
        data: { error: { code: 'INVALID_TIMESTAMP', message: 'Invalid ISO 8601 UTC date string.' } },
      };
    }

    // Must be in the future
    if (startDate.getTime() <= now.getTime()) {
      throw {
        status: 400,
        data: { error: { code: 'PAST_START_TIME', message: 'Booking start time must be in the future.' } },
      };
    }

    // Must be within 30 days
    const maxFuture = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (startDate.getTime() > maxFuture.getTime()) {
      throw {
        status: 400,
        data: { error: { code: 'MAX_FUTURE_EXCEEDED', message: 'Bookings can be no more than 30 days ahead.' } },
      };
    }

    // Minutes must be 00 or 30, seconds and ms must be 0
    if (
      (startDate.getUTCMinutes() !== 0 && startDate.getUTCMinutes() !== 30) ||
      startDate.getUTCSeconds() !== 0 ||
      startDate.getUTCMilliseconds() !== 0 ||
      (endDate.getUTCMinutes() !== 0 && endDate.getUTCMinutes() !== 30) ||
      endDate.getUTCSeconds() !== 0 ||
      endDate.getUTCMilliseconds() !== 0
    ) {
      throw {
        status: 400,
        data: {
          error: {
            code: 'INVALID_GRID_ALIGNMENT',
            message: 'Booking times must align with 30-minute intervals (00 or 30 minutes, 0 seconds).',
          },
        },
      };
    }

    const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
    if (durationMinutes < 30 || durationMinutes > 240) {
      throw {
        status: 400,
        data: {
          error: {
            code: 'INVALID_DURATION',
            message: 'Booking duration must be between 30 and 240 minutes inclusive.',
          },
        },
      };
    }

    // User limit: at most 3 future PENDING/APPROVED bookings
    const futureUserBookings = this.bookings.filter(
      (b) =>
        b.userId === this.currentUser?.id &&
        (b.status === 'PENDING' || b.status === 'APPROVED') &&
        new Date(b.startTime).getTime() > now.getTime()
    );

    if (futureUserBookings.length >= 3) {
      throw {
        status: 409,
        data: {
          error: {
            code: 'USER_BOOKING_LIMIT_EXCEEDED',
            message: 'A user can have at most 3 future active bookings.',
          },
        },
      };
    }

    // Overlap validation (B5)
    // newStart < existingEnd AND newEnd > existingStart
    const hasOverlap = this.bookings.some((b) => {
      if (b.resourceId !== data.resourceId) return false;
      if (b.status !== 'PENDING' && b.status !== 'APPROVED') return false;

      const existingStart = new Date(b.startTime).getTime();
      const existingEnd = new Date(b.endTime).getTime();

      return startDate.getTime() < existingEnd && endDate.getTime() > existingStart;
    });

    if (hasOverlap) {
      throw {
        status: 409,
        data: {
          error: {
            code: 'RESOURCE_OVERLAP',
            message: 'This resource slot is already booked for the selected time window.',
          },
        },
      };
    }

    const newBooking: Booking = {
      id: 'book_' + Math.random().toString(36).substring(2, 9),
      resourceId: data.resourceId,
      resource,
      userId: this.currentUser.id,
      user: this.currentUser,
      ticketId: data.ticketId || null,
      ticket: data.ticketId ? this.tickets.find((t) => t.id === data.ticketId) || null : null,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      purpose: data.purpose.trim(),
      status: 'PENDING',
      decisionNote: null,
      createdAt: now.toISOString(),
    };

    this.bookings.push(newBooking);
    this.persist();
    return newBooking;
  }

  public getMyBookings(params: { status?: string; page?: number; limit?: number }): PaginatedResponse<Booking> {
    if (!this.currentUser) {
      throw {
        status: 401,
        data: { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      };
    }

    let list = this.bookings.filter((b) => b.userId === this.currentUser?.id);

    if (params.status && params.status !== 'ALL') {
      list = list.filter((b) => b.status === params.status);
    }

    list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.limit) || 10));
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = list.slice(start, start + pageSize).map((b) => ({
      ...b,
      resource: this.resources.find((r) => r.id === b.resourceId),
    }));

    return {
      data,
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  public getAllBookings(params: {
    status?: string;
    resourceId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): PaginatedResponse<Booking> {
    if (this.currentUser?.role !== 'ADMIN') {
      throw {
        status: 403,
        data: { error: { code: 'FORBIDDEN', message: 'Admin access required.' } },
      };
    }

    let list = [...this.bookings];

    if (params.status && params.status !== 'ALL') {
      list = list.filter((b) => b.status === params.status);
    }

    if (params.resourceId && params.resourceId !== 'ALL') {
      list = list.filter((b) => b.resourceId === params.resourceId);
    }

    if (params.from) {
      const fromTime = new Date(params.from).getTime();
      list = list.filter((b) => new Date(b.endTime).getTime() >= fromTime);
    }

    if (params.to) {
      const toTime = new Date(params.to).getTime();
      list = list.filter((b) => new Date(b.startTime).getTime() <= toTime);
    }

    list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.limit) || 10));
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;

    const data = list.slice(start, start + pageSize).map((b) => {
      const u = this.users.find((user) => user.id === b.userId);
      return {
        ...b,
        resource: this.resources.find((r) => r.id === b.resourceId),
        user: u ? { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt } : undefined,
      };
    });

    return {
      data,
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  public getBookingById(id: string): Booking {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) {
      throw {
        status: 404,
        data: { error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } },
      };
    }

    if (this.currentUser?.role !== 'ADMIN' && booking.userId !== this.currentUser?.id) {
      throw {
        status: 403,
        data: { error: { code: 'FORBIDDEN', message: 'Unauthorized to view this booking.' } },
      };
    }

    return {
      ...booking,
      resource: this.resources.find((r) => r.id === booking.resourceId),
      user: this.users.find((u) => u.id === booking.userId),
    };
  }

  public cancelBooking(id: string): Booking {
    const index = this.bookings.findIndex((b) => b.id === id);
    if (index === -1) {
      throw {
        status: 404,
        data: { error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } },
      };
    }

    const booking = this.bookings[index];

    // Only owner can cancel
    if (booking.userId !== this.currentUser?.id && this.currentUser?.role !== 'ADMIN') {
      throw {
        status: 403,
        data: { error: { code: 'FORBIDDEN', message: 'Only the booking owner can cancel this booking.' } },
      };
    }

    // Allowed: PENDING -> CANCELLED, APPROVED -> CANCELLED
    if (booking.status !== 'PENDING' && booking.status !== 'APPROVED') {
      throw {
        status: 409,
        data: {
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot cancel a booking with status '${booking.status}'.`,
          },
        },
      };
    }

    booking.status = 'CANCELLED';
    this.bookings[index] = booking;
    this.persist();
    return booking;
  }

  public approveBooking(id: string): Booking {
    if (this.currentUser?.role !== 'ADMIN') {
      throw {
        status: 403,
        data: { error: { code: 'FORBIDDEN', message: 'Admin access required.' } },
      };
    }

    const index = this.bookings.findIndex((b) => b.id === id);
    if (index === -1) {
      throw {
        status: 404,
        data: { error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } },
      };
    }

    const booking = this.bookings[index];
    if (booking.status !== 'PENDING') {
      throw {
        status: 409,
        data: {
          error: {
            code: 'INVALID_TRANSITION',
            message: `Only PENDING bookings can be approved. Current status: '${booking.status}'.`,
          },
        },
      };
    }

    booking.status = 'APPROVED';
    this.bookings[index] = booking;
    this.persist();
    return booking;
  }

  public rejectBooking(id: string, note: string): Booking {
    if (this.currentUser?.role !== 'ADMIN') {
      throw {
        status: 403,
        data: { error: { code: 'FORBIDDEN', message: 'Admin access required.' } },
      };
    }

    const trimmedNote = note ? note.trim() : '';
    if (trimmedNote.length < 5 || trimmedNote.length > 200) {
      throw {
        status: 400,
        data: {
          error: {
            code: 'INVALID_NOTE',
            message: 'Rejection note is mandatory and must be between 5 and 200 characters.',
          },
        },
      };
    }

    const index = this.bookings.findIndex((b) => b.id === id);
    if (index === -1) {
      throw {
        status: 404,
        data: { error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found.' } },
      };
    }

    const booking = this.bookings[index];
    if (booking.status !== 'PENDING') {
      throw {
        status: 409,
        data: {
          error: {
            code: 'INVALID_TRANSITION',
            message: `Only PENDING bookings can be rejected. Current status: '${booking.status}'.`,
          },
        },
      };
    }

    booking.status = 'REJECTED';
    booking.decisionNote = trimmedNote;
    this.bookings[index] = booking;
    this.persist();
    return booking;
  }

  // --- ADMIN STATS ---
  public getAdminStats(): AdminStatsResponse {
    if (this.currentUser?.role !== 'ADMIN') {
      throw {
        status: 403,
        data: { error: { code: 'FORBIDDEN', message: 'Admin access required.' } },
      };
    }

    const activeResources = this.resources.filter((r) => r.isActive).length;

    const bookingsByStatus = {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      total: this.bookings.length,
    };

    const resourceCounts: Record<string, number> = {};

    for (const b of this.bookings) {
      if (b.status === 'PENDING') bookingsByStatus.pending++;
      else if (b.status === 'APPROVED') bookingsByStatus.approved++;
      else if (b.status === 'REJECTED') bookingsByStatus.rejected++;
      else if (b.status === 'CANCELLED') bookingsByStatus.cancelled++;

      resourceCounts[b.resourceId] = (resourceCounts[b.resourceId] || 0) + 1;
    }

    const topResources = Object.entries(resourceCounts)
      .map(([resId, count]) => {
        const res = this.resources.find((r) => r.id === resId);
        return {
          resourceId: resId,
          name: res?.name || 'Unknown',
          type: res?.type || 'ROOM',
          bookingCount: count,
        };
      })
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 3);

    const ticketStats = this.getTicketStats();

    return {
      activeResources,
      bookingsByStatus,
      topResources,
      ticketStats,
    };
  }
}

export const mockEngine = new MockApiEngine();
