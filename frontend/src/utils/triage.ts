import { TicketCategory, TicketPriority } from '../types';

/**
 * Deterministic Auto-Triage Keyword Classification Engine (T-B1)
 *
 * Category Rules:
 * - BILLING: refund, invoice, charge, payment
 * - LOGIN: password, 2fa, sign in, locked out, login
 * - DELIVERY: package, arrived, shipping, tracking, delivery
 * - BUG: crash, error, 500, broken
 * - FEATURE_REQUEST: All remaining tickets
 *
 * Priority Rules:
 * - URGENT: urgent, production down, locked out
 * - HIGH: error, refund, not arrived
 * - MEDIUM: All other cases
 */
export function classifyTicket(subject: string, body: string): {
  category: TicketCategory;
  priority: TicketPriority;
} {
  const combinedText = `${subject} ${body}`.toLowerCase();

  // Category determination
  let category: TicketCategory = 'FEATURE_REQUEST';

  const billingKeywords = ['refund', 'invoice', 'charge', 'payment'];
  const loginKeywords = ['password', '2fa', 'sign in', 'locked out', 'login'];
  const deliveryKeywords = ['package', 'arrived', 'shipping', 'tracking', 'delivery'];
  const bugKeywords = ['crash', 'error', '500', 'broken'];

  if (billingKeywords.some((kw) => combinedText.includes(kw))) {
    category = 'BILLING';
  } else if (loginKeywords.some((kw) => combinedText.includes(kw))) {
    category = 'LOGIN';
  } else if (deliveryKeywords.some((kw) => combinedText.includes(kw))) {
    category = 'DELIVERY';
  } else if (bugKeywords.some((kw) => combinedText.includes(kw))) {
    category = 'BUG';
  } else {
    category = 'FEATURE_REQUEST';
  }

  // Priority determination
  let priority: TicketPriority = 'MEDIUM';

  const urgentKeywords = ['urgent', 'production down', 'locked out'];
  const highKeywords = ['error', 'refund', 'not arrived'];

  if (urgentKeywords.some((kw) => combinedText.includes(kw))) {
    priority = 'URGENT';
  } else if (highKeywords.some((kw) => combinedText.includes(kw))) {
    priority = 'HIGH';
  } else {
    priority = 'MEDIUM';
  }

  return { category, priority };
}
