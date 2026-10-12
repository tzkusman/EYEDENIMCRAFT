# EYE – Production Monitoring System (Denim Crafts)

A production-grade, date-wise production monitoring web application designed specifically for **Denim Crafts** in Karachi, Pakistan. EYE digitizes the traditional factory manager's diary into an immutable, tamper-resistant digital ledger where garments and stitching lots are tracked against Delivery Challan (DC) numbers with date-wise IN/OUT entries, zero-balance auto-closure, and production gap visibility.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions and user preferences have been incorporated into this plan:

- **Confirmed Architecture**: Full Next.js preview running on port 3000 with complete working `/api/v1` routes and live data persistence for instant testing in the AI Studio environment, accompanied by a dedicated `/server` directory containing the standalone Express + Prisma + Supabase schema, seed scripts, Dockerfile, and pg_dump backup routines for cloud deployment.
- **Confirmed Seed Dataset**: Karachi denim stitching lines (Line 1 - Front & Back Stitching, Line 2 - Pocket Attach & Bar Tack, Line 3 - Waistband & Hemming, and Stitching-to-Wash challans) with authentic Karachi parties and batches.
- **Confirmed Input Method**: Strict manual keyboard entry (no camera barcode scanner) faithfully reproducing diary ledger efficiency: entering a value in `IN` disables `OUT` and vice versa; pressing `Enter` submits and automatically resets focus to `IN`.

---

### 1. Overview & Core Concept

- **What It Does**: Digitizes handwritten factory diaries into an automated ledger. Users open a DC with an immutable DC No and initial opening quantity. Sub-assemblies and garment movements are recorded purely through `IN` and `OUT` values. The system automatically computes running balances, highlights inactive or stale DCs in red, flags multi-day production gaps, and marks a DC as closed (`—`) the moment its balance hits exactly zero.
- **Target Audience / Persona**: Factory floor operators, merchandisers, production floor managers, and factory administrators at Denim Crafts in Karachi.
- **Key Value**: Eliminates discrepancies, missing slips, and untracked delays across stitching lines and wash transitions, giving real-time visibility into pending quantities and stale batches across the floor.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Authentication & Role Context**: Operators log in with email/password (or quick-switch between demo roles: Admin, Manager, Merchandiser). Karachi timezone (`Asia/Karachi`) and formatted dates (`dd-mm-yyyy`) are preserved across all screens.
2. **Dashboard Overview**: Summary KPI cards (Open DCs, Closed DCs, Total Pending Qty, Stale DCs, Today's IN & OUT), followed by a 30-day interactive IN vs OUT bar/area chart and an Open DCs status table.
3. **Open New DC**: Accessible to all logged-in roles. Operator enters Date (default today), manual DC No (e.g. `DC-ST-8841`), Opening Quantity, Party (e.g. `Artistic Milliners / Unit 4`), Article (e.g. `Slim Fit Denim 12oz`), and optional remarks. Prominently highlights the immutability guarantee: *"DC No cannot be changed after saving."*
4. **Date-Wise Register (The Digital Diary)**: Production register grouped by date (newest first). Each date block displays all entries across all DCs with In, Out, Balance, Gap days, Note, and User, complete with daily totals and net movement footers. Days with zero movements display a quiet *"No activity"* notice to reveal floor bottlenecks. Includes single-day/range filters and export buttons (Excel / PDF).
5. **DC Detail (Ledger & Quick Entry Bar)**: Header displays DC No, opening date, status badge, and balance (`—` when closed). A ledger table displays the opening quantity as the first row. Gaps $>1$ day are marked with a distinct divider row (`3 days gap`). Below the ledger, a quick-entry bar enables rapid typing: typing in `IN` disables `OUT`, and pressing Enter submits the entry and refocuses `IN`.
6. **Reports & Exports**: Summaries by DC, longest production gaps, and stale DC reports, exportable to Excel (`.xlsx`) and PDF for floor briefings.
7. **User Management & Audit Log**: Admin controls for creating users, setting roles, toggling active states, resetting passwords, and inspecting the tamper-evident audit log with old/new value diffs.

#### Visual Identity & Theme
- **Color Palette & Mood**: Industrial denim blue primary (`#1e3a5f`), slate neutral surfaces (`#f8fafc` / `#ffffff`), deep navy text (`#0f172a`), emerald green for completed/closed batches (`#16a34a`), soft amber for warnings (`#d97706`), and bold crimson for stale production delays (`#dc2626`).
- **Typography & Hierarchy**: Clean, high-legibility display with `Plus Jakarta Sans` for headers and navigation, paired with strict tabular monospace numerals (`font-mono tabular-nums`) for all DC numbers, quantities, balances, and dates.
- **Anti-Slop Discipline**: Zero gratuitous pills on raw metadata; clean dividers; natural title-casing; high contrast touch targets ($\ge 44\text{px}$) suited for tablets and phones on the factory floor.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Running Balance Calculation on the Server**
  - *Chosen Approach*: Balances are dynamically computed on the server from the transactional chain (`openingQty + sum(IN) - sum(OUT)`) and never persisted as an independent mutable column.
  - *Why*: Eliminates race conditions and synchronization errors.
- **Decision 2: Transactional Locking & Overspend Prevention**
  - *Chosen Approach*: Every `OUT` entry validates that `qty <= currentBalance` within an atomic transaction. If exceeded, returns an immediate human-readable error (e.g. *"Only 4,700 available, you entered 5,000"*).
  - *Why*: Prevents garment quantities from going negative in a fast-paced environment.
- **Decision 3: DC Number Immutability**
  - *Chosen Approach*: Enforced at three independent layers: (1) API rejects any payload containing `dcNo` updates, (2) database trigger/guard prevents modification, (3) UI renders DC No as read-only text. Admins can only VOID a misplaced DC with an audited reason.
  - *Why*: DC numbers correspond to physical paper slips and gate passes in Karachi; modifying them digitally causes severe audit mismatches.
- **Decision 4: Dual Architecture (Next.js Live Preview + Standalone Express/Prisma Export)**
  - *Chosen Approach*: Build a full-stack Next.js app serving `/api/v1` endpoints and client components on port 3000 for zero-setup live interaction in the browser, while providing `/server` with standalone Express, Prisma schema, Dockerfile, tests, and documentation.
  - *Why*: Guarantees instant verification and testing inside the AI Studio container without requiring external Supabase connection strings, while delivering the complete standalone stack requested.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Denim Crafts - EYE UI                         │
│  (Top Bar: Brand "EYE", User Profile, Role Badge, Navigation Links)    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐        ┌──────────────────┐
│ Dashboard & KPIs │       │ Date Register    │        │ DC Detail Ledger │
│ • 30-Day Trend   │       │ • Daily Totals   │        │ • Quick Entry Bar│
│ • Stale DC Alert │       │ • Gap Dividers   │        │ • Balance Curve  │
│ • Open DCs List  │       │ • Excel/PDF Exp. │        │ • Auto-Close '—' │
└────────┬─────────┘       └─────────┬────────┘        └─────────┬────────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │ JSON / REST
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Unified REST API Engine (/api/v1)                    │
│  • Zod Validation   • Permissions Matrix   • Mutex / Atomic Tx         │
│  • Running Balances • Stale Check (5 days) • Tamper-Proof Audit Logger │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌────────────────────────────────┐              ┌────────────────────────────────┐
│   AI Studio Live Data Store    │              │   Standalone Production Stack  │
│  • Next.js App Router API      │              │  • Express + Prisma ORM        │
│  • In-Memory / File Persistent │              │  • Supabase PostgreSQL + Auth  │
│  • Pre-seeded Karachi Batches  │              │  • Docker & Docker Compose     │
└────────────────────────────────┘              └────────────────────────────────┘
```

#### Data Entities & Schemas
- **Profile**: `id`, `fullName`, `email`, `role` (`ADMIN` | `MANAGER` | `MERCHANDISER`), `isActive`, `createdAt`
- **Challan**: `id`, `dcNo` (unique, uppercase, immutable), `openDate`, `openingQty`, `party`, `article`, `remarks`, `status` (`OPEN` | `CLOSED` | `VOID`), `closedDate`, `voidReason`, `createdById`, `createdAt`, `updatedAt`
- **Entry**: `id`, `challanId`, `entryDate`, `type` (`IN` | `OUT`), `qty`, `note`, `createdById`, `createdAt`, `updatedAt`, `deletedAt` (soft delete)
- **AuditLog**: `id`, `userId`, `action`, `entity`, `entityId`, `oldValue`, `newValue`, `reason`, `ip`, `createdAt`
- **Setting**: `key`, `value` (`staleDays`: 5, `companyName`: "Denim Crafts")

#### Interactive Handlers & State Mapping
- `POST /api/v1/challans`: Validates `dcNo` uniqueness; creates initial challan; writes audit log.
- `POST /api/v1/challans/:id/entries`: Validates `entryDate >= challan.openDate && entryDate <= today`; validates `OUT <= currentBalance`; adds entry; auto-updates status to `CLOSED` if net balance hits 0.
- `PATCH /api/v1/entries/:id`: Role check (Merchandiser limited to own entries created today; Manager/Admin any day with reason); re-computes balance chain; triggers auto-reopen if closed DC balance becomes $>0$.
- `POST /api/v1/challans/:id/void`: Admin only; marks `VOID`; archives reason; prohibits reopening.
- `GET /api/v1/register`: Generates daily chronological buckets across all DCs, computes daily In/Out/Net, and inserts synthetic empty rows for inactive dates.
