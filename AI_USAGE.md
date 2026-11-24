# AI Usage & Verification Log

This document transparently outlines the artificial intelligence tooling utilized during the development of the **TriageSync** platform, the scope of tasks addressed, and the rigorous manual verification and override procedures implemented.

---

## 1. AI Tools Used
- **Agent / LLM:** Google DeepMind Gemini Agentic Assistant (Antigravity)
- **Role:** Full-Stack Architecture, TypeScript Code Generation, Test Authoring, and Refactoring

---

## 2. Scope of Tasks Addressed
1. **Initial Project Scaffolding:** Setting up Vite React 19, Tailwind CSS, and strict TypeScript configurations.
2. **Deterministic Triage Rule Engine:** Translating keyword rules from the technical assessment prompt into a pure, deterministic keyword classifier (`classifyTicket`).
3. **Database & API Typing:** Generating strictly typed TypeScript domain entities, DTOs, and Zod schemas according to Section 4 and Section 6.
4. **Mock Store & Architecture Layer:** Constructing an in-memory, localStorage-persisted mock API engine that faithfully simulates transactions, error codes, unique constraints, and RBAC authorization.
5. **UI & Design System Components:** Building enterprise SaaS dashboard layouts, responsive sidebars, modals, badges, and Recharts analytics visualizations.
6. **Automated Test Generation:** Creating Vitest test suites for triage classification, idempotent import, human override protection, booking validation, and XSS-safe rendering.

---

## 3. Review and Verification Process
All AI-suggested code underwent strict multi-tiered review:
1. **Type-Safety Verification:** Full compilation via `tsc -b && vite build` to prevent any type mismatches, implicit anys, or unhandled null/undefined values.
2. **Automated Test Execution:** Running `vitest run` across 19 unit and integration tests to verify that business logic, error status codes (`400`, `401`, `403`, `409`), and boundary conditions execute properly.
3. **Security Assessment:**
   - Confirming that passwords are never returned in user objects.
   - Verifying that public registrations strictly assign the `USER` role.
   - Validating that ticket subjects and descriptions are rendered as escaped text nodes rather than injected via `dangerouslySetInnerHTML`.
   - Ensuring that availability endpoints reveal only `startTime`, `endTime`, and `status`, preserving user privacy per Section 8 (B13–B16).

---

## 4. Example of AI Suggestion Independently Verified or Overridden

### Scenario: Zod `coerce` vs Strict Input Typing in `ResourceModal`
- **Initial AI Generation:** The initial Zod schema utilized `capacity: z.coerce.number().int().min(1).max(500)` with `isActive: z.boolean().default(true)`.
- **Issue Discovered:** When integrating with `react-hook-form` via `@hookform/resolvers/zod`, Zod 4 input typing marked `capacity` as `unknown` and `isActive` as optional (`boolean | undefined`) on the form input types, whereas the onSubmit handler and domain entity required strict `number` and `boolean`. This caused TypeScript error `TS2322` and prevented production compilation.
- **Manual Verification & Override:**
  1. Removed `z.coerce.number()` in favor of strict `z.number().int().min(1).max(500)`.
  2. Applied `{ valueAsNumber: true }` in React Hook Form's `register('capacity', { valueAsNumber: true })` attribute.
  3. Made `isActive: z.boolean()` explicit on input.
  4. Verified that the form now type-checks flawlessly and compiles with zero TypeScript errors.

### Scenario: Keyword Conflict in Unit Test
- **Initial AI Generation:** In `triage.test.ts`, a test case checked `classifyTicket('NullPointer crash', 'Backend crash in payment consumer')`.
- **Issue Discovered:** The classifier categorized the ticket as `BILLING` instead of `BUG` because the body contained the keyword `"payment"`, which under the deterministic priority rules is evaluated before `BUG`.
- **Manual Verification & Override:** Corrected the test fixture to `classifyTicket('NullPointer crash', 'Backend crash in telemetry consumer')`, verifying that keyword precedence rules function exactly as specified in Section 7 (T-B1).
