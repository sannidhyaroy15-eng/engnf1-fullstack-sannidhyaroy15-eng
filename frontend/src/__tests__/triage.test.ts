import { describe, it, expect } from 'vitest';
import { classifyTicket } from '../utils/triage';

describe('T-B1 Deterministic Auto-Triage Keyword Engine', () => {
  describe('Category Classification', () => {
    it('classifies BILLING keywords (refund, invoice, charge, payment)', () => {
      expect(classifyTicket('Request for refund', 'Please process refund').category).toBe('BILLING');
      expect(classifyTicket('Invoice inquiry', 'Need monthly invoice copy').category).toBe('BILLING');
      expect(classifyTicket('Unexpected charge', 'I see a credit card charge').category).toBe('BILLING');
      expect(classifyTicket('Payment failed', 'My payment gateway returned an error').category).toBe('BILLING');
    });

    it('classifies LOGIN keywords (password, 2fa, sign in, locked out, login)', () => {
      expect(classifyTicket('Reset password', 'Forgot my account password').category).toBe('LOGIN');
      expect(classifyTicket('2FA device lost', 'Lost mobile authenticator for 2fa').category).toBe('LOGIN');
      expect(classifyTicket('Unable to sign in', 'Single sign in fails').category).toBe('LOGIN');
      expect(classifyTicket('Account locked out', 'User locked out after 3 attempts').category).toBe('LOGIN');
      expect(classifyTicket('Login error', 'SSO login page redirects indefinitely').category).toBe('LOGIN');
    });

    it('classifies DELIVERY keywords (package, arrived, shipping, tracking, delivery)', () => {
      expect(classifyTicket('Package missing', 'The delivery package was not found').category).toBe('DELIVERY');
      expect(classifyTicket('Diagnostic arrived', 'Replacement board has arrived broken').category).toBe('DELIVERY');
      expect(classifyTicket('Shipping status', 'Express shipping is delayed').category).toBe('DELIVERY');
      expect(classifyTicket('Tracking number needed', 'Please provide courier tracking').category).toBe('DELIVERY');
      expect(classifyTicket('Delivery address update', 'Change delivery location').category).toBe('DELIVERY');
    });

    it('classifies BUG keywords (crash, error, 500, broken)', () => {
      expect(classifyTicket('App crash on start', 'Application crashes on startup').category).toBe('BUG');
      expect(classifyTicket('HTTP 500 received', 'API endpoint throws internal 500').category).toBe('BUG');
      expect(classifyTicket('Broken button', 'Submit button is broken on form').category).toBe('BUG');
      expect(classifyTicket('NullPointer crash', 'Backend crash in telemetry consumer').category).toBe('BUG');
    });

    it('defaults remaining tickets to FEATURE_REQUEST', () => {
      expect(classifyTicket('Add dark mode', 'Please add an option to toggle dark theme').category).toBe('FEATURE_REQUEST');
      expect(classifyTicket('Export to CSV', 'Allow exporting table data to spreadsheet format').category).toBe('FEATURE_REQUEST');
    });
  });

  describe('Priority Classification', () => {
    it('assigns URGENT priority for critical triggers (urgent, production down, locked out)', () => {
      expect(classifyTicket('Urgent ticket', 'This is urgent please reply').priority).toBe('URGENT');
      expect(classifyTicket('Production down in US-West', 'Complete cluster outage').priority).toBe('URGENT');
      expect(classifyTicket('Locked out of admin console', 'Account locked out').priority).toBe('URGENT');
    });

    it('assigns HIGH priority for high triggers (error, refund, not arrived)', () => {
      expect(classifyTicket('Refund requested', 'Need my payment refunded').priority).toBe('HIGH');
      expect(classifyTicket('Internal error', 'Uncaught runtime error occurred').priority).toBe('HIGH');
      expect(classifyTicket('Package not arrived', 'Shipment has not arrived on scheduled date').priority).toBe('HIGH');
    });

    it('defaults to MEDIUM priority for other cases', () => {
      expect(classifyTicket('General question', 'How do I invite team members?').priority).toBe('MEDIUM');
      expect(classifyTicket('Add webhook support', 'Feature suggestion for webhooks').priority).toBe('MEDIUM');
    });
  });
});
