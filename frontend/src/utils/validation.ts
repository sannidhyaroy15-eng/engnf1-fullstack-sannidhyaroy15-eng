import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name cannot exceed 50 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email address').max(254, 'Email cannot exceed 254 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password cannot exceed 64 characters')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'Password must contain at least one letter and one digit'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ticketUpdateSchema = z.object({
  category: z.enum(['BILLING', 'BUG', 'FEATURE_REQUEST', 'LOGIN', 'DELIVERY']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  assignedId: z.string().nullable().optional(),
});

export const ticketImportSchema = z.object({
  tickets: z.array(
    z.object({
      externalId: z.string().trim().min(1, 'External ID is required'),
      subject: z.string().trim().min(3, 'Subject must be 3-150 characters').max(150, 'Subject cannot exceed 150 characters'),
      body: z.string().trim().min(5, 'Body must be 5-2000 characters').max(2000, 'Body cannot exceed 2000 characters'),
    })
  ).min(1, 'At least one ticket is required'),
});

export const resourceSchema = z.object({
  name: z.string().trim().min(3, 'Name must be 3-60 characters').max(60, 'Name cannot exceed 60 characters'),
  type: z.enum(['ROOM', 'LAB', 'EQUIPMENT']),
  capacity: z.number().int('Capacity must be an integer').min(1, 'Capacity must be at least 1').max(500, 'Capacity cannot exceed 500'),
  description: z.string().max(300, 'Description cannot exceed 300 characters').optional().nullable(),
  isActive: z.boolean(),
});

export const bookingCreateSchema = z.object({
  resourceId: z.string().min(1, 'Resource is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  purpose: z.string().trim().min(5, 'Purpose must be at least 5 characters').max(200, 'Purpose cannot exceed 200 characters'),
  ticketId: z.string().nullable().optional(),
});

export const bookingRejectSchema = z.object({
  note: z.string().trim().min(5, 'Rejection note must be 5-200 characters').max(200, 'Rejection note cannot exceed 200 characters'),
});
