import type { Entitlement, Grant, Identity, Severity, ViolationKind } from './types';

// ─────────────────────────────────────────────────────────────
// The policy engine. Evaluates the access graph and produces the
// violations the rest of Gatekeeper reports on. Pure and synchronous
// — the caller persists the results.
// ─────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;
const STALE_DAYS = 180;
const OVER_PRIVILEGED_THRESHOLD = 3;

/** Pairs of entitlements that must not be held by the same person. */
export const SOD_RULES = [
  {
    a: 'ent-stripe-vendor',
    b: 'ent-stripe-approver',
    label: 'Vendor Manager + Payments Approver',
    note: 'The same person can both create a payee and approve payments to it.',
  },
  {
    a: 'ent-netsuite-admin',
    b: 'ent-stripe-approver',
    label: 'Finance Admin + Payments Approver',
    note: 'The same person controls the ledger and can release outgoing payments.',
  },
];

export interface ViolationDraft {
  kind: ViolationKind;
  severity: Severity;
  identityId: string;
  summary: string;
  detail: string;
}

export interface PolicyInput {
  identities: Identity[];
  entitlements: Entitlement[];
  grants: Grant[];
}

/** Run every policy rule over the access graph. */
export function evaluatePolicies(input: PolicyInput): ViolationDraft[] {
  const { identities, entitlements, grants } = input;
  const entById = new Map(entitlements.map((e) => [e.id, e]));

  const activeByIdentity = new Map<string, Grant[]>();
  for (const g of grants) {
    if (g.status !== 'active') continue;
    const list = activeByIdentity.get(g.identityId);
    if (list) list.push(g);
    else activeByIdentity.set(g.identityId, [g]);
  }

  const out: ViolationDraft[] = [];

  for (const identity of identities) {
    const held = activeByIdentity.get(identity.id) ?? [];
    const entIds = new Set(held.map((g) => g.entitlementId));

    // 1 — Orphaned access: a disabled account that still holds grants.
    if (identity.status === 'disabled' && held.length > 0) {
      out.push({
        kind: 'orphaned',
        severity: 'high',
        identityId: identity.id,
        summary: `${held.length} active grant${held.length === 1 ? '' : 's'} on a disabled account`,
        detail: `${identity.name}'s account is disabled, but ${held.length} grant${held.length === 1 ? ' is' : 's are'} still active. All access for offboarded accounts must be revoked.`,
      });
    }

    // 2 — Separation of duties: conflicting entitlement pairs.
    for (const rule of SOD_RULES) {
      if (entIds.has(rule.a) && entIds.has(rule.b)) {
        out.push({
          kind: 'sod',
          severity: 'high',
          identityId: identity.id,
          summary: `Separation-of-duties conflict — ${rule.label}`,
          detail: `${identity.name} holds both conflicting entitlements. ${rule.note}`,
        });
      }
    }

    // Disabled accounts are already covered by the orphaned rule.
    if (identity.status !== 'active') continue;

    // 3 — Stale access: long-held grants that have not been re-certified.
    const stale = held.filter((g) => {
      const grantedDays = (Date.now() - new Date(g.grantedAt).getTime()) / DAY;
      if (grantedDays < STALE_DAYS) return false;
      if (!g.lastReviewedAt) return true;
      const reviewedDays =
        (Date.now() - new Date(g.lastReviewedAt).getTime()) / DAY;
      return reviewedDays >= STALE_DAYS;
    });
    if (stale.length > 0) {
      out.push({
        kind: 'stale',
        severity: 'medium',
        identityId: identity.id,
        summary: `${stale.length} grant${stale.length === 1 ? '' : 's'} not reviewed in over 6 months`,
        detail: `${identity.name} holds ${stale.length} grant${stale.length === 1 ? '' : 's'} granted over ${STALE_DAYS} days ago and never certified (or last certified more than 6 months ago).`,
      });
    }

    // 4 — Over-privileged: too many high-risk entitlements for one person.
    const highRisk = held.filter(
      (g) => entById.get(g.entitlementId)?.risk === 'high',
    );
    if (highRisk.length >= OVER_PRIVILEGED_THRESHOLD) {
      out.push({
        kind: 'over_privileged',
        severity: 'medium',
        identityId: identity.id,
        summary: `Over-privileged — ${highRisk.length} high-risk entitlements`,
        detail: `${identity.name} (${identity.title}) holds ${highRisk.length} high-risk entitlements. Confirm every one is required for this role.`,
      });
    }
  }

  return out;
}

const SEVERITY_WEIGHT: Record<Severity, number> = { high: 12, medium: 5, low: 2 };

/** A 0–100 workspace risk score from the open violations. */
export function riskScore(violations: { severity: Severity }[]): number {
  const sum = violations.reduce((s, v) => s + SEVERITY_WEIGHT[v.severity], 0);
  return Math.min(100, sum);
}
