// ─────────────────────────────────────────────────────────────
// Gatekeeper — access-governance domain types
// ─────────────────────────────────────────────────────────────

export type IdentityStatus = 'active' | 'disabled';

/** A person who may hold access. */
export interface Identity {
  id: string;
  name: string;
  email: string;
  department: string;
  title: string;
  status: IdentityStatus;
  joinedAt: string;
}

export type Criticality = 'low' | 'medium' | 'high';

/** A SaaS application or system that access is granted into. */
export interface App {
  id: string;
  name: string;
  category: string;
  criticality: Criticality;
  ownerId: string | null;
}

export type Risk = 'low' | 'medium' | 'high';

/** A role / permission set within an app. */
export interface Entitlement {
  id: string;
  appId: string;
  name: string;
  description: string;
  risk: Risk;
}

export type GrantStatus = 'active' | 'revoked';
export type GrantSource = 'request' | 'sync' | 'manual';

/** An identity actually holding an entitlement. */
export interface Grant {
  id: string;
  identityId: string;
  entitlementId: string;
  status: GrantStatus;
  source: GrantSource;
  grantedAt: string;
  revokedAt: string | null;
  lastReviewedAt: string | null;
}

export type RequestStatus = 'pending' | 'approved' | 'denied';

/** A request for access, awaiting an approval decision. */
export interface AccessRequest {
  id: string;
  identityId: string;
  entitlementId: string;
  justification: string;
  status: RequestStatus;
  requestedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNote: string | null;
}

export type CampaignStatus = 'open' | 'closed';

/** A periodic access-certification campaign. */
export interface ReviewCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  createdAt: string;
  closedAt: string | null;
}

export type ReviewDecision = 'pending' | 'certified' | 'revoked';

/** One grant to be re-certified within a campaign. */
export interface ReviewItem {
  id: string;
  campaignId: string;
  grantId: string;
  decision: ReviewDecision;
  decidedAt: string | null;
  reviewerNote: string | null;
}

/** An immutable audit-log entry. */
export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
}

export type ViolationKind = 'sod' | 'stale' | 'orphaned' | 'over_privileged';
export type Severity = 'low' | 'medium' | 'high';

/** A policy violation produced by the policy engine. */
export interface Violation {
  id: string;
  kind: ViolationKind;
  severity: Severity;
  identityId: string;
  summary: string;
  detail: string;
  detectedAt: string;
}
