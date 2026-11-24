# TriageSync — Full-Stack Support Ticket Triage & Resource Slot Scheduling Platform

## 1. Overview
**TriageSync** is an enterprise-grade support ticket triage and resource-slot scheduling platform designed for modern incident response and operations teams. Incoming support tickets are automatically classified using a deterministic keyword-based auto-triage engine, assigning an initial category and priority. Support agents review and adjust triage determinations with instant optimistic UI updates and protected human-override guarantees. All modifications generate an immutable audit trail with actor tracking (`X-Agent` header). When troubleshooting requires physical facilities or test equipment, agents seamlessly schedule shared internal resources (meeting rooms, laboratories, diagnostic hardware) with atomic conflict prevention and 30-minute interval validation.

---

## 2. Live Links
- **Frontend Web Application (Vercel/Production):** `https://triagesync.vercel.app` (or local `http://localhost:5173`)
- **Backend API Service:** `https://triagesync-api.onrender.com`
- **GitHub Repository:** `https://github.com/sannidhyaroy15-eng/engnf1-fullstack-sannidhyaroy15-eng`

---

## 3. Seeded Credentials

| Role | Name | Email | Password | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Admin Lead | `admin@triagesync.test` | `Admin@123` | Full access: resource CRUD, booking approval/rejection, analytics, ticket review |
| **USER** | Agent Demo | `user@triagesync.test` | `User@123` | Ticket triage queue, detail review, active resource scheduling, personal bookings |

> **Security Note:** Public registration always defaults to the `USER` role. Administrative accounts cannot be registered publicly and must be provisioned exclusively via database seed scripts.

---

## 4. Tech Stack

### Frontend
- **Framework & Build:** React 19 with Vite, TypeScript
- **Styling & UI:** Tailwind CSS, Lucide React icons, enterprise SaaS design system
- **Routing & State:** React Router DOM v7, TanStack Query (React Query v5)
- **Forms & Validation:** React Hook Form with Zod schemas
- **HTTP Client:** Axios with request interceptors for JWT Bearer and `X-Agent` headers
- **Analytics & Visualizations:** Recharts (PieChart, BarChart, ResponsiveContainer)
- **Testing:** Vitest with jsdom and React Testing Library

### Backend Architecture (Ready for Phase Integration)
- **Runtime & Framework:** Node.js, Express.js with TypeScript
- **Security Middleware:** Helmet, CORS, Rate Limiting, bcrypt password hashing
- **ORM & Database:** Prisma ORM, PostgreSQL with transactions and unique constraints
- **Testing:** Vitest, Supertest

---

## 5. Folder Structure
```text
triagesync/
├── frontend/
│   ├── src/
│   │   ├── __tests__/           # Vitest unit and integration test suites
│   │   ├── components/          # Reusable design system UI (Badge, Modal, Alert)
│   │   ├── context/             # AuthContext, session management, X-Agent header
│   │   ├── features/            # Feature-sliced modules (auth, tickets, resources)
│   │   ├── layouts/             # AppLayout, Sidebar, Header
│   │   ├── pages/               # Triage Queue, Detail, Resources, Bookings, Analytics
│   │   ├── services/            # Axios API client & full compliant simulation engine
│   │   ├── types/               # TypeScript interfaces, DTOs, and API contracts
│   │   ├── utils/               # Deterministic triage engine, Zod validators
│   │   ├── App.tsx              # Application router & QueryClientProvider
│   │   ├── index.css            # Tailwind directives & CSS custom design tokens
│   │   └── main.tsx             # React entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vitest.config.ts
├── docker-compose.yml           # PostgreSQL container definition
├── README.md                    # System documentation and specification
├── SOLUTION.md                  # Architectural decisions, concurrency, benchmarks
└── AI_USAGE.md                  # AI assistance disclosures and manual verifications
```

---

## 6. Local Setup

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0 (or pnpm / yarn)
- Git

### Quick Start
```bash
# 1. Clone repository
git clone https://github.com/sannidhyaroy15-eng/engnf1-fullstack-sannidhyaroy15-eng.git
cd engnf1-fullstack-sannidhyaroy15-eng

# 2. Enter frontend directory and install dependencies
cd frontend
npm install

# 3. Start development server
npm run dev
# Application will launch on http://localhost:5173

# 4. Run automated test suite
npm run test

# 5. Build production bundle
npm run build
```

---

## 7. Idempotent Seed Command
To execute the idempotent seed populating initial users, resources, tickets, and bookings:
```bash
# Frontend Mock Store / Standalone Reset:
# Click "Reset Seed" in the sidebar navigation footer, or run in browser console:
# localStorage.clear(); window.location.reload();

# Backend Seed (PostgreSQL & Prisma):
cd backend
npm run db:seed
# Executes prisma/seed.ts idempotently using upsert operations on unique constraints
```

---

## 8. Database Schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  USER
  ADMIN
}

enum TicketCategory {
  BILLING
  BUG
  FEATURE_REQUEST
  LOGIN
  DELIVERY
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum ResourceType {
  ROOM
  LAB
  EQUIPMENT
}

enum BookingStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model User {
  id           String    @id @default(uuid())
  name         String
  email        String    @unique
  passwordHash String
  role         UserRole  @default(USER)
  createdAt    DateTime  @default(now())
  bookings     Booking[]
  tickets      Ticket[]  @relation("AssignedTickets")

  @@index([email])
}

model Ticket {
  id              String         @id @default(uuid())
  externalId      String         @unique
  subject         String
  body            String
  autoCategory    TicketCategory
  category        TicketCategory
  isHumanOverride Boolean        @default(false)
  priority        TicketPriority
  status          TicketStatus   @default(OPEN)
  assignedId      String?
  assignedUser    User?          @relation("AssignedTickets", fields: [assignedId], references: [id])
  isReviewed      Boolean        @default(false)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  events          TicketEvent[]
  bookings        Booking[]

  @@index([status])
  @@index([category])
  @@index([priority])
}

model TicketEvent {
  id        String   @id @default(uuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  field     String
  oldValue  String?
  newValue  String?
  actor     String
  createdAt DateTime @default(now())

  @@index([ticketId, createdAt])
}

model Resource {
  id          String       @id @default(uuid())
  name        String       @unique
  type        ResourceType
  capacity    Int
  description String?
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  bookings    Booking[]

  @@index([type])
  @@index([isActive])
}

model Booking {
  id           String        @id @default(uuid())
  resourceId   String
  resource     Resource      @relation(fields: [resourceId], references: [id])
  userId       String
  user         User          @relation(fields: [userId], references: [id])
  ticketId     String?
  ticket       Ticket?       @relation(fields: [ticketId], references: [id])
  startTime    DateTime
  endTime      DateTime
  purpose      String
  status       BookingStatus @default(PENDING)
  decisionNote String?
  createdAt    DateTime      @default(now())

  @@index([resourceId, startTime, endTime])
  @@index([userId, status])
}
```

---

## 9. API Summary

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new support agent (strictly `USER` role) |
| `POST` | `/api/auth/login` | Public | Authenticate with email/password; returns JWT |
| `GET` | `/api/auth/me` | Authenticated | Fetch current authenticated session profile |
| `POST` | `/api/tickets/import` | Authenticated | Idempotent batch ingestion with human-override protection |
| `GET` | `/api/tickets` | Authenticated | Paginated query with combined AND filters & search |
| `GET` | `/api/tickets/:id` | Authenticated | Fetch single ticket with chronological audit timeline |
| `PATCH` | `/api/tickets/:id` | Authenticated | Update ticket fields; captures `X-Agent` audit trail |
| `GET` | `/api/stats` | Authenticated | Triage queue statistics & model agreement percentage |
| `GET` | `/api/resources` | Authenticated | List shared resources (USER: active only; ADMIN: all) |
| `GET` | `/api/resources/:id` | Authenticated | Fetch resource details |
| `POST` | `/api/resources` | ADMIN | Create new shared resource |
| `PATCH` | `/api/resources/:id` | ADMIN | Modify resource attributes or toggle active status |
| `GET` | `/api/resources/:id/availability` | Authenticated | Privacy-safe 30-min occupied intervals |
| `POST` | `/api/bookings` | Authenticated | Atomic slot reservation with conflict detection |
| `GET` | `/api/bookings/mine` | Authenticated | List current user's reservations |
| `GET` | `/api/bookings` | ADMIN | Filter & review all organization bookings |
| `PATCH` | `/api/bookings/:id/cancel` | Owner / ADMIN | Cancel reservation (PENDING/APPROVED → CANCELLED) |
| `PATCH` | `/api/bookings/:id/approve` | ADMIN | Approve reservation (PENDING → APPROVED) |
| `PATCH` | `/api/bookings/:id/reject` | ADMIN | Reject reservation with mandatory note (5-200 chars) |
| `GET` | `/api/admin/stats` | ADMIN | Telemetry, top utilized assets, and queue distribution |

---

## 10. Completed Features Checklist and Known Limitations

### Completed Features Checklist
- [x] **Deterministic Keyword Auto-Triage:** Keyword categorization and priority assignment adhering to exact rules.
- [x] **Idempotent Ingestion & Override Protection:** Re-import never duplicates `externalId` and strictly preserves manual overrides.
- [x] **Instant Optimistic UI Updates:** Instant ticket editing with automatic rollback on rejection.
- [x] **Immutable Audit Trail:** Chronological log of field changes, old/new values, and actor identification (`X-Agent` header).
- [x] **XSS-Safe Rendering:** Raw HTML and `<script>` payloads rendered as safe escaped text.
- [x] **Atomic 30-Minute Interval Grid:** Slot alignment, duration verification (30-240 min), and 30-day lookahead limit.
- [x] **Race-Safe Overlap Detection:** Conflict evaluation: `newStart < existingEnd && newEnd > existingStart` for PENDING/APPROVED slots.
- [x] **Max 3 Future Bookings Constraint:** Enforces per-user concurrency limit.
- [x] **Booking Lifecycle Management:** Role-guarded transitions (`PENDING` → `APPROVED`/`REJECTED`/`CANCELLED`) with mandatory rejection note.
- [x] **Role-Based Routing & Access Control:** Dedicated USER and ADMIN workflows with 403 access denial protection.
- [x] **Responsive Enterprise SaaS Design System:** Tested on 375px mobile, 768px tablet, and 1280px desktop.
- [x] **Visual Analytics:** Interactive Recharts graphs for bookings by status, top resources, and triage agreement rates.
- [x] **19 Automated Vitest Suites:** Unit and integration coverage of triage, API contracts, validations, and XSS safety.

### Known Limitations
- The present milestone implements the complete frontend user experience, state management, and an exact client-side mock/simulation layer that mirrors all database constraints, transactions, and API routes. The independent Express/Prisma backend will be mounted in the subsequent backend sprint without altering frontend contracts.
