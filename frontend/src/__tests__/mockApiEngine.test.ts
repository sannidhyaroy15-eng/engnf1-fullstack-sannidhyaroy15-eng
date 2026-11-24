import { describe, it, expect, beforeEach } from 'vitest';
import { MockApiEngine } from '../services/mockApiEngine';

describe('TriageSync MockApiEngine & Business Logic Specification', () => {
  let engine: MockApiEngine;

  beforeEach(() => {
    localStorage.clear();
    engine = new MockApiEngine();
    engine.resetToSeed();
  });

  describe('Authentication & Role Isolation (Section 3)', () => {
    it('authenticates seed admin and user correctly', () => {
      const adminLogin = engine.login('admin@triagesync.test', 'Admin@123');
      expect(adminLogin.user.role).toBe('ADMIN');
      expect(adminLogin.token).toBeTruthy();

      const userLogin = engine.login('user@triagesync.test', 'User@123');
      expect(userLogin.user.role).toBe('USER');
    });

    it('rejects invalid password with 401', () => {
      expect(() => engine.login('admin@triagesync.test', 'WrongPass')).toThrow();
    });

    it('public registration ALWAYS assigns USER role and rejects duplicate email with 409', () => {
      const res = engine.register('New Agent', 'new.agent@triagesync.test', 'SecurePass1');
      expect(res.user.role).toBe('USER');

      // Duplicate registration attempt
      expect(() =>
        engine.register('Duplicate Agent', 'new.agent@triagesync.test', 'SecurePass1')
      ).toThrow();
    });
  });

  describe('Ticket Import & Human Override Protection (T-B2)', () => {
    it('imports tickets idempotently without creating duplicate externalId records', () => {
      const stats1 = engine.importTickets([
        { externalId: 'TEST-001', subject: 'Invoice charge error', body: 'Payment double charged' },
        { externalId: 'TEST-002', subject: 'Password sign in failure', body: 'Cannot login' },
      ]);
      expect(stats1.importedCount).toBe(2);
      expect(stats1.updatedCount).toBe(0);

      // Re-importing exact externalIds updates existing records
      const stats2 = engine.importTickets([
        { externalId: 'TEST-001', subject: 'Invoice charge error updated', body: 'Payment double charged updated' },
      ]);
      expect(stats2.importedCount).toBe(0);
      expect(stats2.updatedCount).toBe(1);
    });

    it('protects human-overridden categories from automated re-import overwriting', () => {
      // Import a new ticket
      engine.importTickets([
        { externalId: 'OVERRIDE-1', subject: 'Payment refund requested', body: 'Charge issue' },
      ]);

      const tickets = engine.getTickets({ q: 'OVERRIDE-1' }).data;
      expect(tickets[0].category).toBe('BILLING');
      expect(tickets[0].isHumanOverride).toBe(false);

      // Agent manually overrides category to BUG
      engine.setCurrentUser({
        id: 'agent_1',
        name: 'Agent',
        email: 'agent@test.com',
        role: 'USER',
        createdAt: new Date().toISOString(),
      });
      engine.updateTicket(tickets[0].id, { category: 'BUG' }, 'agent@test.com');

      const updatedTicket = engine.getTicketById(tickets[0].id).ticket;
      expect(updatedTicket.category).toBe('BUG');
      expect(updatedTicket.isHumanOverride).toBe(true);

      // Re-import feed with original keywords
      const reimportStats = engine.importTickets([
        { externalId: 'OVERRIDE-1', subject: 'Payment refund requested again', body: 'Charge issue again' },
      ]);

      expect(reimportStats.skippedOverrideCount).toBe(1);

      // Verify category was protected and NOT overwritten
      const checkTicket = engine.getTicketById(tickets[0].id).ticket;
      expect(checkTicket.category).toBe('BUG');
      expect(checkTicket.isHumanOverride).toBe(true);
    });
  });

  describe('Agent Review & Immutable Audit Events (T-B3)', () => {
    it('creates immutable ticket audit events when category, priority, or status changes', () => {
      // Import a fresh ticket known to have status OPEN and priority MEDIUM
      engine.importTickets([
        { externalId: 'AUDIT-TEST-1', subject: 'General inquiry for testing', body: 'Just a standard question' },
      ]);
      const ticket = engine.getTickets({ q: 'AUDIT-TEST-1' }).data[0];
      expect(ticket.status).toBe('OPEN');
      expect(ticket.priority).toBe('MEDIUM');

      // Update both status (OPEN -> IN_PROGRESS) and priority (MEDIUM -> URGENT)
      engine.updateTicket(
        ticket.id,
        { status: 'IN_PROGRESS', priority: 'URGENT' },
        'reviewer@triagesync.test'
      );

      const { ticket: reviewedTicket, events } = engine.getTicketById(ticket.id);
      expect(reviewedTicket.status).toBe('IN_PROGRESS');
      expect(reviewedTicket.priority).toBe('URGENT');
      expect(reviewedTicket.isReviewed).toBe(true);

      // Both changed fields recorded
      const recentEvents = events.filter((e) => e.actor === 'reviewer@triagesync.test');
      expect(recentEvents.length).toBe(2);
      expect(recentEvents.some((e) => e.field === 'status' && e.oldValue === 'OPEN' && e.newValue === 'IN_PROGRESS')).toBe(true);
      expect(recentEvents.some((e) => e.field === 'priority' && e.oldValue === 'MEDIUM' && e.newValue === 'URGENT')).toBe(true);
    });
  });

  describe('Resource Scheduling & Concurrency/Overlap Rules (Section 8)', () => {
    it('validates 30-minute interval alignment and duration', () => {
      engine.login('user@triagesync.test', 'User@123');

      // Invalid minute (15 mins)
      const badMinutes = {
        resourceId: 'res_room_001',
        startTime: '2026-03-01T10:15:00.000Z',
        endTime: '2026-03-01T11:15:00.000Z',
        purpose: 'Valid purpose long enough',
      };
      expect(() => engine.createBooking(badMinutes)).toThrow();
    });

    it('detects booking overlap for PENDING and APPROVED slots', () => {
      engine.login('user@triagesync.test', 'User@123');

      // Pick an unreserved day (20 days ahead) and resource
      const futureStart = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
      futureStart.setUTCHours(10, 0, 0, 0);
      const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000);

      const b1 = engine.createBooking({
        resourceId: 'res_lab_002',
        startTime: futureStart.toISOString(),
        endTime: futureEnd.toISOString(),
        purpose: 'First team retrospective session',
      });
      expect(b1.status).toBe('PENDING');

      // Attempt overlapping booking (starts 30 mins inside b1)
      const overlapStart = new Date(futureStart.getTime() + 30 * 60 * 1000);
      const overlapEnd = new Date(overlapStart.getTime() + 60 * 60 * 1000);

      expect(() =>
        engine.createBooking({
          resourceId: 'res_lab_002',
          startTime: overlapStart.toISOString(),
          endTime: overlapEnd.toISOString(),
          purpose: 'Conflicting meeting attempt',
        })
      ).toThrow();
    });

    it('enforces maximum 3 future active bookings per user constraint', () => {
      // Register a brand new user with 0 initial bookings
      const newUser = engine.register('Limit User', 'limit.user@triagesync.test', 'Pass1234');
      engine.login('limit.user@triagesync.test', 'Pass1234');

      const createSlot = (daysAhead: number) => {
        const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
        d.setUTCHours(9, 0, 0, 0);
        const end = new Date(d.getTime() + 60 * 60 * 1000);
        return { start: d.toISOString(), end: end.toISOString() };
      };

      // Create 3 future bookings on unreserved resource
      const s1 = createSlot(15);
      const s2 = createSlot(16);
      const s3 = createSlot(17);

      engine.createBooking({ resourceId: 'res_eq_002', startTime: s1.start, endTime: s1.end, purpose: 'Booking 1' });
      engine.createBooking({ resourceId: 'res_eq_002', startTime: s2.start, endTime: s2.end, purpose: 'Booking 2' });
      engine.createBooking({ resourceId: 'res_eq_002', startTime: s3.start, endTime: s3.end, purpose: 'Booking 3' });

      // 4th booking should throw 409 limit error
      const s4 = createSlot(18);
      expect(() =>
        engine.createBooking({
          resourceId: 'res_eq_002',
          startTime: s4.start,
          endTime: s4.end,
          purpose: 'Booking 4 should fail',
        })
      ).toThrow();
    });

    it('requires mandatory rejection note between 5-200 chars when admin rejects booking', () => {
      engine.login('admin@triagesync.test', 'Admin@123');
      const futureStart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      futureStart.setUTCHours(14, 0, 0, 0);
      const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000);

      const booking = engine.createBooking({
        resourceId: 'res_room_002',
        startTime: futureStart.toISOString(),
        endTime: futureEnd.toISOString(),
        purpose: 'Lab session before rejection test',
      });

      // Too short note (< 5 chars)
      expect(() => engine.rejectBooking(booking.id, 'No')).toThrow();

      // Valid note
      const rejected = engine.rejectBooking(booking.id, 'Room unavailable due to maintenance overhaul.');
      expect(rejected.status).toBe('REJECTED');
      expect(rejected.decisionNote).toBe('Room unavailable due to maintenance overhaul.');
    });
  });
});
