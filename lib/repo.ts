import { randomBytes } from 'node:crypto';
import { db } from './db';
import { buildSeed } from './seed';
import { evaluatePolicies } from './policy';
import type {
  AccessRequest,
  App,
  AuditEvent,
  Entitlement,
  Grant,
  GrantStatus,
  Identity,
  ReviewCampaign,
  ReviewItem,
  Risk,
  Severity,
  Violation,
} from './types';

// ─────────────────────────────────────────────────────────────
// Data access. Hand-written SQL over postgres.js — no ORM.
// ─────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

const iso = (v: any): string => new Date(v).toISOString();
const isoOrNull = (v: any): string | null => (v ? new Date(v).toISOString() : null);
const newId = (prefix: string): string => `${prefix}_${randomBytes(5).toString('hex')}`;

// ── Mappers ──────────────────────────────────────────────────

const mapIdentity = (r: any): Identity => ({
  id: r.id,
  name: r.name,
  email: r.email,
  department: r.department,
  title: r.title,
  status: r.status,
  joinedAt: iso(r.joined_at),
});

const mapApp = (r: any): App => ({
  id: r.id,
  name: r.name,
  category: r.category,
  criticality: r.criticality,
  ownerId: r.owner_id,
});

const mapEntitlement = (r: any): Entitlement => ({
  id: r.id,
  appId: r.app_id,
  name: r.name,
  description: r.description,
  risk: r.risk,
});

const mapGrant = (r: any): Grant => ({
  id: r.id,
  identityId: r.identity_id,
  entitlementId: r.entitlement_id,
  status: r.status,
  source: r.source,
  grantedAt: iso(r.granted_at),
  revokedAt: isoOrNull(r.revoked_at),
  lastReviewedAt: isoOrNull(r.last_reviewed_at),
});

const mapRequest = (r: any): AccessRequest => ({
  id: r.id,
  identityId: r.identity_id,
  entitlementId: r.entitlement_id,
  justification: r.justification,
  status: r.status,
  requestedAt: iso(r.requested_at),
  decidedAt: isoOrNull(r.decided_at),
  decidedBy: r.decided_by,
  decisionNote: r.decision_note,
});

const mapViolation = (r: any): Violation => ({
  id: r.id,
  kind: r.kind,
  severity: r.severity,
  identityId: r.identity_id,
  summary: r.summary,
  detail: r.detail,
  detectedAt: iso(r.detected_at),
});

const mapAudit = (r: any): AuditEvent => ({
  id: r.id,
  at: iso(r.at),
  actor: r.actor,
  action: r.action,
  entityType: r.entity_type,
  entityId: r.entity_id,
  summary: r.summary,
});

// ── View types (query-shaped joins) ──────────────────────────

export interface GrantView extends Grant {
  identityName: string;
  entitlementName: string;
  entitlementRisk: Risk;
  appId: string;
  appName: string;
}
export interface RequestView extends AccessRequest {
  identityName: string;
  identityTitle: string;
  entitlementName: string;
  entitlementRisk: Risk;
  appName: string;
}
export interface ReviewItemView extends ReviewItem {
  identityId: string;
  identityName: string;
  entitlementName: string;
  entitlementRisk: Risk;
  appName: string;
  grantedAt: string;
  grantStatus: GrantStatus;
}
export interface ViolationView extends Violation {
  identityName: string;
  identityDepartment: string;
}
export interface IdentityRow extends Identity {
  grantCount: number;
  violationCount: number;
}
export interface AppRow extends App {
  ownerName: string | null;
  entitlementCount: number;
  grantCount: number;
}

const mapGrantView = (r: any): GrantView => ({
  ...mapGrant(r),
  identityName: r.identity_name,
  entitlementName: r.entitlement_name,
  entitlementRisk: r.entitlement_risk,
  appId: r.app_id2,
  appName: r.app_name,
});

// ── Read: identities ─────────────────────────────────────────

export async function listIdentities(): Promise<Identity[]> {
  return (await db()`select * from identities order by name`).map(mapIdentity);
}

export async function identityRows(): Promise<IdentityRow[]> {
  const rows = await db()`
    select i.*,
      (select count(*) from grants g
         where g.identity_id = i.id and g.status = 'active')::int as grant_count,
      (select count(*) from violations v where v.identity_id = i.id)::int as violation_count
    from identities i order by i.name`;
  return rows.map((r: any) => ({
    ...mapIdentity(r),
    grantCount: r.grant_count,
    violationCount: r.violation_count,
  }));
}

export async function getIdentity(id: string): Promise<Identity | null> {
  const rows = await db()`select * from identities where id = ${id}`;
  return rows.length ? mapIdentity(rows[0]) : null;
}

// ── Read: apps + entitlements ────────────────────────────────

export async function appRows(): Promise<AppRow[]> {
  const rows = await db()`
    select a.*, o.name as owner_name,
      (select count(*) from entitlements e where e.app_id = a.id)::int as entitlement_count,
      (select count(*) from grants g join entitlements e on e.id = g.entitlement_id
         where e.app_id = a.id and g.status = 'active')::int as grant_count
    from apps a left join identities o on o.id = a.owner_id
    order by a.name`;
  return rows.map((r: any) => ({
    ...mapApp(r),
    ownerName: r.owner_name,
    entitlementCount: r.entitlement_count,
    grantCount: r.grant_count,
  }));
}

export async function getApp(id: string): Promise<App | null> {
  const rows = await db()`select * from apps where id = ${id}`;
  return rows.length ? mapApp(rows[0]) : null;
}

export async function listEntitlements(): Promise<Entitlement[]> {
  return (await db()`select * from entitlements order by name`).map(mapEntitlement);
}

export async function entitlementsForApp(
  appId: string,
): Promise<(Entitlement & { holders: number })[]> {
  const rows = await db()`
    select e.*,
      (select count(*) from grants g
         where g.entitlement_id = e.id and g.status = 'active')::int as holders
    from entitlements e where e.app_id = ${appId}
    order by case e.risk when 'high' then 0 when 'medium' then 1 else 2 end, e.name`;
  return rows.map((r: any) => ({ ...mapEntitlement(r), holders: r.holders }));
}

// ── Read: grants ─────────────────────────────────────────────

export async function listAllGrants(): Promise<Grant[]> {
  return (await db()`select * from grants`).map(mapGrant);
}

const GRANT_VIEW_SELECT = `
  select g.*, i.name as identity_name,
    e.name as entitlement_name, e.risk as entitlement_risk,
    a.id as app_id2, a.name as app_name
  from grants g
  join identities i on i.id = g.identity_id
  join entitlements e on e.id = g.entitlement_id
  join apps a on a.id = e.app_id`;

export async function grantsForIdentity(identityId: string): Promise<GrantView[]> {
  const rows = await db().unsafe(
    `${GRANT_VIEW_SELECT} where g.identity_id = $1
     order by g.status, e.risk, a.name`,
    [identityId],
  );
  return rows.map(mapGrantView);
}

export async function grantsForApp(appId: string): Promise<GrantView[]> {
  const rows = await db().unsafe(
    `${GRANT_VIEW_SELECT} where a.id = $1 and g.status = 'active'
     order by i.name`,
    [appId],
  );
  return rows.map(mapGrantView);
}

// ── Read: requests ───────────────────────────────────────────

export async function listRequests(): Promise<RequestView[]> {
  const rows = await db()`
    select r.*, i.name as identity_name, i.title as identity_title,
      e.name as entitlement_name, e.risk as entitlement_risk, a.name as app_name
    from access_requests r
    join identities i on i.id = r.identity_id
    join entitlements e on e.id = r.entitlement_id
    join apps a on a.id = e.app_id
    order by case r.status when 'pending' then 0 else 1 end, r.requested_at desc`;
  return rows.map((r: any) => ({
    ...mapRequest(r),
    identityName: r.identity_name,
    identityTitle: r.identity_title,
    entitlementName: r.entitlement_name,
    entitlementRisk: r.entitlement_risk,
    appName: r.app_name,
  }));
}

export async function requestsForIdentity(identityId: string): Promise<RequestView[]> {
  return (await listRequests()).filter((r) => r.identityId === identityId);
}

// ── Read: reviews ────────────────────────────────────────────

export async function listCampaigns(): Promise<
  (ReviewCampaign & { total: number; decided: number })[]
> {
  const rows = await db()`
    select c.*,
      (select count(*) from review_items ri where ri.campaign_id = c.id)::int as total,
      (select count(*) from review_items ri
         where ri.campaign_id = c.id and ri.decision <> 'pending')::int as decided
    from review_campaigns c order by c.created_at desc`;
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    createdAt: iso(r.created_at),
    closedAt: isoOrNull(r.closed_at),
    total: r.total,
    decided: r.decided,
  }));
}

export async function getCampaign(id: string): Promise<ReviewCampaign | null> {
  const rows = await db()`select * from review_campaigns where id = ${id}`;
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    createdAt: iso(r.created_at),
    closedAt: isoOrNull(r.closed_at),
  };
}

export async function reviewItemsForCampaign(
  campaignId: string,
): Promise<ReviewItemView[]> {
  const rows = await db()`
    select ri.*, g.identity_id, g.granted_at, g.status as grant_status,
      i.name as identity_name,
      e.name as entitlement_name, e.risk as entitlement_risk,
      a.name as app_name
    from review_items ri
    join grants g on g.id = ri.grant_id
    join identities i on i.id = g.identity_id
    join entitlements e on e.id = g.entitlement_id
    join apps a on a.id = e.app_id
    where ri.campaign_id = ${campaignId}
    order by case ri.decision when 'pending' then 0 else 1 end, i.name`;
  return rows.map((r: any) => ({
    id: r.id,
    campaignId: r.campaign_id,
    grantId: r.grant_id,
    decision: r.decision,
    decidedAt: isoOrNull(r.decided_at),
    reviewerNote: r.reviewer_note,
    identityId: r.identity_id,
    identityName: r.identity_name,
    entitlementName: r.entitlement_name,
    entitlementRisk: r.entitlement_risk,
    appName: r.app_name,
    grantedAt: iso(r.granted_at),
    grantStatus: r.grant_status,
  }));
}

// ── Read: violations + audit ─────────────────────────────────

export async function listViolations(): Promise<ViolationView[]> {
  const rows = await db()`
    select v.*, i.name as identity_name, i.department as identity_department
    from violations v join identities i on i.id = v.identity_id
    order by case v.severity when 'high' then 0 when 'medium' then 1 else 2 end,
             v.kind`;
  return rows.map((r: any) => ({
    ...mapViolation(r),
    identityName: r.identity_name,
    identityDepartment: r.identity_department,
  }));
}

export async function violationsForIdentity(
  identityId: string,
): Promise<Violation[]> {
  const rows = await db()`
    select * from violations where identity_id = ${identityId}
    order by case severity when 'high' then 0 when 'medium' then 1 else 2 end`;
  return rows.map(mapViolation);
}

export async function listAudit(limit = 60): Promise<AuditEvent[]> {
  return (
    await db()`select * from audit_events order by at desc limit ${limit}`
  ).map(mapAudit);
}

// ── Dashboard stats ──────────────────────────────────────────

export interface OverviewStats {
  identityCount: number;
  disabledCount: number;
  appCount: number;
  activeGrantCount: number;
  pendingRequestCount: number;
  violationCount: number;
}

export async function overviewStats(): Promise<OverviewStats> {
  const [r] = await db()`
    select
      (select count(*) from identities)::int as identity_count,
      (select count(*) from identities where status = 'disabled')::int as disabled_count,
      (select count(*) from apps)::int as app_count,
      (select count(*) from grants where status = 'active')::int as active_grant_count,
      (select count(*) from access_requests where status = 'pending')::int as pending_request_count,
      (select count(*) from violations)::int as violation_count`;
  return {
    identityCount: r.identity_count,
    disabledCount: r.disabled_count,
    appCount: r.app_count,
    activeGrantCount: r.active_grant_count,
    pendingRequestCount: r.pending_request_count,
    violationCount: r.violation_count,
  };
}

// ── Policy recompute ─────────────────────────────────────────

export async function recomputeViolations(): Promise<number> {
  const sql = db();
  const [identities, entitlements, grants] = await Promise.all([
    listIdentities(),
    listEntitlements(),
    listAllGrants(),
  ]);
  const drafts = evaluatePolicies({ identities, entitlements, grants });
  await sql.begin(async (tx) => {
    await tx`delete from violations`;
    for (const d of drafts) {
      await tx`
        insert into violations (id, kind, severity, identity_id, summary, detail)
        values (${newId('vln')}, ${d.kind}, ${d.severity}, ${d.identityId},
                ${d.summary}, ${d.detail})`;
    }
  });
  return drafts.length;
}

// ── Audit helper ─────────────────────────────────────────────

async function writeAudit(
  sql: any,
  actor: string,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
): Promise<void> {
  await sql`
    insert into audit_events (id, actor, action, entity_type, entity_id, summary)
    values (${newId('evt')}, ${actor}, ${action}, ${entityType}, ${entityId}, ${summary})`;
}

// ── Mutations ────────────────────────────────────────────────

/** Approve or deny a pending access request. Approval creates a grant. */
export async function decideRequest(
  id: string,
  decision: 'approved' | 'denied',
  actor: string,
): Promise<void> {
  const sql = db();
  await sql.begin(async (tx) => {
    const rows = await tx`select * from access_requests where id = ${id}`;
    if (!rows.length || rows[0].status !== 'pending') return;
    const req = rows[0];

    await tx`
      update access_requests
      set status = ${decision}, decided_at = now(), decided_by = ${actor}
      where id = ${id}`;

    const [ent] = await tx`
      select e.name, a.name as app_name from entitlements e
      join apps a on a.id = e.app_id where e.id = ${req.entitlement_id}`;
    const [who] = await tx`select name from identities where id = ${req.identity_id}`;
    const label = `${ent.app_name} · ${ent.name}`;

    if (decision === 'approved') {
      await tx`
        insert into grants (id, identity_id, entitlement_id, status, source,
                            granted_at, last_reviewed_at)
        values (${newId('grn')}, ${req.identity_id}, ${req.entitlement_id},
                'active', 'request', now(), now())`;
      await writeAudit(tx, actor, 'request.approved', 'request', id,
        `Approved ${who.name}'s request for ${label} — grant provisioned.`);
    } else {
      await writeAudit(tx, actor, 'request.denied', 'request', id,
        `Denied ${who.name}'s request for ${label}.`);
    }
  });
  await recomputeViolations();
}

/** Revoke an active grant. */
export async function revokeGrant(id: string, actor: string): Promise<void> {
  const sql = db();
  await sql.begin(async (tx) => {
    const rows = await tx`select * from grants where id = ${id}`;
    if (!rows.length || rows[0].status !== 'active') return;
    const g = rows[0];
    await tx`
      update grants set status = 'revoked', revoked_at = now() where id = ${id}`;
    const [ent] = await tx`
      select e.name, a.name as app_name from entitlements e
      join apps a on a.id = e.app_id where e.id = ${g.entitlement_id}`;
    const [who] = await tx`select name from identities where id = ${g.identity_id}`;
    await writeAudit(tx, actor, 'grant.revoked', 'grant', id,
      `Revoked ${who.name}'s access to ${ent.app_name} · ${ent.name}.`);
  });
  await recomputeViolations();
}

/** Certify (keep) or revoke a grant during a review campaign. */
export async function decideReviewItem(
  id: string,
  decision: 'certified' | 'revoked',
  actor: string,
): Promise<void> {
  const sql = db();
  await sql.begin(async (tx) => {
    const rows = await tx`select * from review_items where id = ${id}`;
    if (!rows.length || rows[0].decision !== 'pending') return;
    const item = rows[0];

    await tx`
      update review_items set decision = ${decision}, decided_at = now()
      where id = ${id}`;

    const [g] = await tx`select * from grants where id = ${item.grant_id}`;
    const [ent] = await tx`
      select e.name, a.name as app_name from entitlements e
      join apps a on a.id = e.app_id where e.id = ${g.entitlement_id}`;
    const [who] = await tx`select name from identities where id = ${g.identity_id}`;
    const label = `${ent.app_name} · ${ent.name}`;

    if (decision === 'certified') {
      await tx`update grants set last_reviewed_at = now() where id = ${item.grant_id}`;
      await writeAudit(tx, actor, 'grant.reviewed', 'grant', item.grant_id,
        `Certified ${who.name}'s ${label} access during review.`);
    } else {
      await tx`
        update grants set status = 'revoked', revoked_at = now()
        where id = ${item.grant_id} and status = 'active'`;
      await writeAudit(tx, actor, 'grant.revoked', 'grant', item.grant_id,
        `Revoked ${who.name}'s ${label} access during review.`);
    }
  });
  await recomputeViolations();
}

// ── Seed ─────────────────────────────────────────────────────

export async function seedDatabase(): Promise<{ identities: number; grants: number }> {
  const sql = db();
  const s = buildSeed();

  await sql.begin(async (tx) => {
    await tx`delete from violations`;
    await tx`delete from audit_events`;
    await tx`delete from review_items`;
    await tx`delete from review_campaigns`;
    await tx`delete from access_requests`;
    await tx`delete from grants`;
    await tx`delete from entitlements`;
    await tx`delete from apps`;
    await tx`delete from identities`;

    for (const i of s.identities) {
      await tx`
        insert into identities (id, name, email, department, title, status, joined_at)
        values (${i.id}, ${i.name}, ${i.email}, ${i.department}, ${i.title},
                ${i.status}, ${i.joinedAt})`;
    }
    for (const a of s.apps) {
      await tx`
        insert into apps (id, name, category, criticality, owner_id)
        values (${a.id}, ${a.name}, ${a.category}, ${a.criticality}, ${a.ownerId})`;
    }
    for (const e of s.entitlements) {
      await tx`
        insert into entitlements (id, app_id, name, description, risk)
        values (${e.id}, ${e.appId}, ${e.name}, ${e.description}, ${e.risk})`;
    }
    for (const g of s.grants) {
      await tx`
        insert into grants (id, identity_id, entitlement_id, status, source,
                            granted_at, revoked_at, last_reviewed_at)
        values (${g.id}, ${g.identityId}, ${g.entitlementId}, ${g.status},
                ${g.source}, ${g.grantedAt}, ${g.revokedAt}, ${g.lastReviewedAt})`;
    }
    for (const r of s.requests) {
      await tx`
        insert into access_requests (id, identity_id, entitlement_id, justification,
                                     status, requested_at, decided_at, decided_by,
                                     decision_note)
        values (${r.id}, ${r.identityId}, ${r.entitlementId}, ${r.justification},
                ${r.status}, ${r.requestedAt}, ${r.decidedAt}, ${r.decidedBy},
                ${r.decisionNote})`;
    }
    await tx`
      insert into review_campaigns (id, name, status, created_at, closed_at)
      values (${s.campaign.id}, ${s.campaign.name}, ${s.campaign.status},
              ${s.campaign.createdAt}, ${s.campaign.closedAt})`;
    for (const ri of s.reviewItems) {
      await tx`
        insert into review_items (id, campaign_id, grant_id, decision, decided_at,
                                  reviewer_note)
        values (${ri.id}, ${ri.campaignId}, ${ri.grantId}, ${ri.decision},
                ${ri.decidedAt}, ${ri.reviewerNote})`;
    }
    for (const ev of s.audit) {
      await tx`
        insert into audit_events (id, at, actor, action, entity_type, entity_id, summary)
        values (${ev.id}, ${ev.at}, ${ev.actor}, ${ev.action}, ${ev.entityType},
                ${ev.entityId}, ${ev.summary})`;
    }
  });

  await recomputeViolations();
  return { identities: s.identities.length, grants: s.grants.length };
}
