# Gatekeeper — Access Governance

Gatekeeper answers the three questions every access review asks: **who can
access what, why, and whether they still should.** It models identities,
applications, entitlements and grants; runs a **policy engine** over the access
graph to surface real risk; handles access requests and certification reviews;
and records every decision in an immutable audit log.

**Live demo:** https://gatekeeper-iota.vercel.app

> Load the demo dataset — a mid-size company with deliberately embedded
> governance risks — then approve a request, revoke a grant, or work through a
> certification campaign and watch the policy engine and audit log react.

---

## What it does

### The data model

```
identity ──< grant >── entitlement ──> app
   │                       │
   └──< access_request     └── (risk: low | medium | high)
   └──< review_item (in a review_campaign)
   └──< violation                       audit_event  (append-only)
```

- **Identities** — people, with a status (active / disabled).
- **Apps** — connected systems, each with a criticality.
- **Entitlements** — roles within an app, each carrying a risk level.
- **Grants** — an identity actually holding an entitlement, with a source and a
  last-reviewed date.
- **Access requests**, **review campaigns**, **audit events**, **violations**.

### The policy engine

`lib/policy.ts` is a pure function over the access graph. It runs four rules
and is re-evaluated automatically after every access change:

| Rule | What it catches | Severity |
|---|---|---|
| **Separation of duties** | One person holding two conflicting entitlements (e.g. *create a vendor* **and** *approve payments to it*) | high |
| **Orphaned access** | A disabled account that still holds active grants | high |
| **Over-privileged** | A person carrying 3+ high-risk entitlements | medium |
| **Stale access** | A grant held 180+ days that was never certified | medium |

Findings roll up into a **0–100 workspace risk score**, weighted by severity.

### Workflows

- **Access requests** — approve (which provisions a grant) or deny.
- **Certification reviews** — a campaign puts each high-risk grant in front of a
  reviewer to *certify* (keep, refresh the review date) or *revoke*.
- **Revocation** — pull any grant directly.
- Every one of these writes to the **audit log** and triggers a policy
  re-evaluation.

---

## Architecture

```
  Browser ──▶ Next.js (App Router) on Vercel
                │
                ├─ Dashboard ... overview · identities · apps · requests
                │                 · reviews · violations · audit
                │
                ├─ POST /api/requests/:id        approve / deny
                ├─ POST /api/grants/:id/revoke   revoke
                ├─ POST /api/review-items/:id    certify / revoke
                ├─ POST /api/recompute           re-run the policy engine
                │        │
                │        ├─ lib/repo.ts    transactional mutations + audit
                │        └─ lib/policy.ts  the policy engine (pure)
                │
                └──────────────────────▶ Postgres (Neon)
                   identities · apps · entitlements · grants ·
                   access_requests · review_campaigns · review_items ·
                   audit_events · violations
```

Mutations run inside a single Postgres transaction that updates the entity,
writes the audit event, and (on commit) recomputes violations — so the policy
view is never stale.

---

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Postgres** (Neon) via `postgres.js` — hand-written SQL, no ORM
- **Tailwind CSS v4**
- **Vercel** — hosting

---

## Project structure

```
gatekeeper/
├── lib/
│   ├── types.ts      domain types
│   ├── schema.sql    9-table relational schema
│   ├── seed.ts       the demo dataset (with embedded risks)
│   ├── policy.ts     the policy engine + risk score
│   ├── repo.ts       data access, transactional mutations, audit
│   ├── db.ts / format.ts
├── app/
│   ├── page.tsx                overview — risk score, findings, activity
│   ├── identities/             list + per-person access profile
│   ├── apps/                   list + per-app entitlements & access
│   ├── requests/page.tsx       approve / deny queue
│   ├── reviews/                certification campaigns
│   ├── violations/page.tsx     policy findings, grouped
│   ├── audit/page.tsx          the immutable log
│   └── api/{seed,requests/[id],grants/[id]/revoke,review-items/[id],recompute}
└── scripts/migrate.mjs
```

---

## Run it locally

Requires Node 20+, pnpm, and a Postgres database.

```bash
pnpm install
echo 'DATABASE_URL=postgres://…' > .env.local
node --env-file=.env.local scripts/migrate.mjs
pnpm dev
```

Open http://localhost:3000 and click **Load demo data**.

---

## Design notes

- **Violations are materialised, not computed on read.** They are recomputed
  after every mutation and stored, so dashboard reads stay a single query — and
  there is an explicit *Re-run policy engine* control.
- **The audit log is append-only.** There is no update or delete path for
  `audit_events`; every mutation route writes one inside its transaction.
- The SoD rules are a small declarative table in `lib/policy.ts` — adding a
  conflicting pair is a one-line change.

---

## License

MIT
