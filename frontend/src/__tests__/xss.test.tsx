import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Component simulating ticket details rendering
const TicketContentDisplay: React.FC<{ subject: string; body: string }> = ({
  subject,
  body,
}) => {
  return (
    <div>
      <h1 data-testid="ticket-subject">{subject}</h1>
      <pre data-testid="ticket-body">{body}</pre>
    </div>
  );
};

describe('T-B5 XSS-Safe Rendering Specification', () => {
  it('renders raw HTML and script payloads safely as escaped text strings without evaluating DOM scripts', () => {
    const maliciousSubject = "<script>alert('XSS_SUBJECT')</script>";
    const maliciousBody = "<img src=x onerror=alert('XSS_BODY')><svg onload=alert(1)>Malicious Payload</svg>";

    const { container } = render(
      <TicketContentDisplay subject={maliciousSubject} body={maliciousBody} />
    );

    // Ensure raw scripts are not parsed as executable DOM elements
    const scriptElements = container.querySelectorAll('script');
    expect(scriptElements.length).toBe(0);

    const imgElements = container.querySelectorAll('img');
    expect(imgElements.length).toBe(0);

    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBe(0);

    // Ensure textual representation is safely displayed
    const subjectEl = screen.getByTestId('ticket-subject');
    expect(subjectEl.textContent).toBe(maliciousSubject);

    const bodyEl = screen.getByTestId('ticket-body');
    expect(bodyEl.textContent).toBe(maliciousBody);
  });
});
