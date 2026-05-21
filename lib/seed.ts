import type {
  AccessRequest,
  App,
  AuditEvent,
  Entitlement,
  Grant,
  Identity,
  ReviewCampaign,
  ReviewItem,
} from './types';

// ─────────────────────────────────────────────────────────────
// A realistic access-governance dataset for the demo — a mid-size
// company's identities, apps, entitlements and grants. Several risks
// are deliberately embedded so the policy engine has real findings:
// separation-of-duties conflicts, orphaned access on disabled
// accounts, stale un-reviewed grants, and an over-privileged user.
// ─────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number): string => new Date(Date.now() - days * DAY).toISOString();

export interface SeedData {
  identities: Identity[];
  apps: App[];
  entitlements: Entitlement[];
  grants: Grant[];
  requests: AccessRequest[];
  campaign: ReviewCampaign;
  reviewItems: ReviewItem[];
  audit: AuditEvent[];
}

const IDENTITIES: Identity[] = [
  ['id-ada', 'Ada Bryce', 'Engineering', 'Staff Engineer', 'active', 720],
  ['id-leo', 'Leo Mensah', 'Engineering', 'Engineering Manager', 'active', 980],
  ['id-mei', 'Mei Tan', 'Engineering', 'Senior Engineer', 'active', 410],
  ['id-omar', 'Omar Haddad', 'Engineering', 'Software Engineer', 'active', 150],
  ['id-nina', 'Nina Park', 'Security', 'Security Lead', 'active', 640],
  ['id-raj', 'Raj Patel', 'Finance', 'Finance Manager', 'active', 880],
  ['id-sara', 'Sara Lund', 'Finance', 'Accountant', 'active', 300],
  ['id-tom', 'Tom Frost', 'Finance', 'Controller', 'active', 1100],
  ['id-eve', 'Eve Wong', 'Sales', 'Account Executive', 'active', 220],
  ['id-carl', 'Carl Reyes', 'Sales', 'Sales Director', 'active', 760],
  ['id-hana', 'Hana Sato', 'People', 'HR Manager', 'active', 540],
  ['id-jack', 'Jack Doyle', 'Marketing', 'Marketing Lead', 'active', 330],
  ['id-vera', 'Vera Ilic', 'Engineering', 'Software Engineer', 'disabled', 600],
  ['id-paul', 'Paul Greer', 'Sales', 'Account Executive', 'disabled', 470],
].map(([id, name, department, title, status, joined]) => ({
  id: id as string,
  name: name as string,
  email: `${(name as string).toLowerCase().split(' ')[0]}@northwind.example`,
  department: department as string,
  title: title as string,
  status: status as Identity['status'],
  joinedAt: ago(joined as number),
}));

const APPS: App[] = [
  ['app-github', 'GitHub', 'Engineering', 'high', 'id-leo'],
  ['app-aws', 'AWS', 'Engineering', 'high', 'id-nina'],
  ['app-stripe', 'Stripe', 'Finance', 'high', 'id-raj'],
  ['app-netsuite', 'NetSuite', 'Finance', 'high', 'id-tom'],
  ['app-salesforce', 'Salesforce', 'Sales', 'medium', 'id-carl'],
  ['app-workday', 'Workday', 'People', 'high', 'id-hana'],
  ['app-datadog', 'Datadog', 'Observability', 'medium', 'id-nina'],
  ['app-slack', 'Slack', 'Collaboration', 'low', 'id-jack'],
].map(([id, name, category, criticality, ownerId]) => ({
  id,
  name,
  category,
  criticality: criticality as App['criticality'],
  ownerId,
}));

const ENTITLEMENTS: Entitlement[] = [
  ['ent-github-admin', 'app-github', 'Organization Admin', 'Full control of the GitHub org, members and repos.', 'high'],
  ['ent-github-write', 'app-github', 'Write', 'Push access to repositories.', 'medium'],
  ['ent-github-read', 'app-github', 'Read', 'Read-only repository access.', 'low'],
  ['ent-aws-admin', 'app-aws', 'Administrator', 'Unrestricted AWS account access.', 'high'],
  ['ent-aws-power', 'app-aws', 'Power User', 'Full access except IAM and billing.', 'high'],
  ['ent-aws-readonly', 'app-aws', 'Read Only', 'View-only access to AWS resources.', 'low'],
  ['ent-stripe-admin', 'app-stripe', 'Account Admin', 'Full Stripe account administration.', 'high'],
  ['ent-stripe-vendor', 'app-stripe', 'Vendor Manager', 'Create and edit payees and vendors.', 'high'],
  ['ent-stripe-approver', 'app-stripe', 'Payments Approver', 'Approve and release outgoing payments.', 'high'],
  ['ent-stripe-read', 'app-stripe', 'Read Only', 'View payments and reports.', 'low'],
  ['ent-netsuite-admin', 'app-netsuite', 'Finance Admin', 'Full NetSuite financials administration.', 'high'],
  ['ent-netsuite-book', 'app-netsuite', 'Bookkeeper', 'Record journal entries and reconcile.', 'medium'],
  ['ent-sf-admin', 'app-salesforce', 'Salesforce Admin', 'Full Salesforce configuration access.', 'high'],
  ['ent-sf-rep', 'app-salesforce', 'Sales Rep', 'Manage own pipeline and accounts.', 'low'],
  ['ent-workday-admin', 'app-workday', 'HR Admin', 'Access to all employee records and payroll.', 'high'],
  ['ent-workday-self', 'app-workday', 'Employee Self-Service', 'View and edit own profile.', 'low'],
  ['ent-datadog-admin', 'app-datadog', 'Datadog Admin', 'Manage monitors, dashboards and users.', 'medium'],
  ['ent-datadog-viewer', 'app-datadog', 'Viewer', 'Read dashboards and metrics.', 'low'],
  ['ent-slack-admin', 'app-slack', 'Workspace Admin', 'Manage the Slack workspace and members.', 'medium'],
  ['ent-slack-member', 'app-slack', 'Member', 'Standard Slack workspace member.', 'low'],
].map(([id, appId, name, description, risk]) => ({
  id,
  appId,
  name,
  description,
  risk: risk as Entitlement['risk'],
}));

// [identity, entitlement, granted daysAgo, reviewed daysAgo | null, source]
type G = [string, string, number, number | null, Grant['source']];
const GRANT_ROWS: G[] = [
  // Everyone — baseline collaboration + self-service.
  ...['id-ada', 'id-leo', 'id-mei', 'id-omar', 'id-nina', 'id-raj', 'id-sara',
      'id-tom', 'id-eve', 'id-carl', 'id-hana', 'id-jack'].flatMap(
    (id): G[] => [
      [id, 'ent-slack-member', 200, 40, 'sync'],
      [id, 'ent-workday-self', 200, 40, 'sync'],
    ],
  ),
  // Engineering
  ['id-ada', 'ent-github-write', 300, 30, 'request'],
  ['id-ada', 'ent-aws-power', 260, 30, 'request'],
  ['id-ada', 'ent-datadog-viewer', 90, 30, 'sync'],
  ['id-leo', 'ent-github-admin', 400, 35, 'manual'],
  ['id-leo', 'ent-aws-power', 380, null, 'manual'],
  ['id-leo', 'ent-datadog-admin', 150, 35, 'request'],
  ['id-mei', 'ent-github-write', 240, 25, 'request'],
  ['id-mei', 'ent-aws-readonly', 240, 25, 'sync'],
  ['id-mei', 'ent-datadog-viewer', 120, 25, 'sync'],
  // Omar — a junior engineer who has quietly accumulated high-risk access.
  ['id-omar', 'ent-github-admin', 95, null, 'manual'],
  ['id-omar', 'ent-aws-admin', 88, null, 'manual'],
  ['id-omar', 'ent-aws-power', 110, null, 'manual'],
  ['id-omar', 'ent-stripe-admin', 70, null, 'manual'],
  ['id-omar', 'ent-github-write', 130, 30, 'sync'],
  // Security
  ['id-nina', 'ent-aws-admin', 500, 20, 'manual'],
  ['id-nina', 'ent-github-admin', 480, 20, 'manual'],
  ['id-nina', 'ent-datadog-admin', 460, 20, 'manual'],
  // Finance
  ['id-raj', 'ent-stripe-admin', 600, null, 'manual'],
  ['id-raj', 'ent-netsuite-admin', 590, null, 'manual'],
  ['id-raj', 'ent-stripe-approver', 250, null, 'manual'],
  ['id-tom', 'ent-netsuite-admin', 700, 60, 'manual'],
  ['id-tom', 'ent-stripe-read', 700, 60, 'sync'],
  // Sara — separation-of-duties conflict: can both create vendors and
  // approve payments to them.
  ['id-sara', 'ent-stripe-vendor', 280, null, 'request'],
  ['id-sara', 'ent-stripe-approver', 270, null, 'manual'],
  ['id-sara', 'ent-netsuite-book', 280, 50, 'request'],
  // Sales
  ['id-eve', 'ent-sf-rep', 210, 45, 'sync'],
  ['id-carl', 'ent-sf-admin', 740, null, 'manual'],
  ['id-carl', 'ent-sf-rep', 740, 45, 'sync'],
  // People / Marketing
  ['id-hana', 'ent-workday-admin', 520, 30, 'manual'],
  ['id-jack', 'ent-slack-admin', 320, null, 'manual'],
  // Disabled accounts that still hold access — orphaned.
  ['id-vera', 'ent-github-write', 580, null, 'sync'],
  ['id-vera', 'ent-aws-power', 560, null, 'manual'],
  ['id-vera', 'ent-datadog-viewer', 560, null, 'sync'],
  ['id-paul', 'ent-sf-rep', 450, null, 'sync'],
  ['id-paul', 'ent-sf-admin', 300, null, 'manual'],
];

export function buildSeed(): SeedData {
  const grants: Grant[] = GRANT_ROWS.map((row, i) => {
    const [identityId, entitlementId, grantedDays, reviewedDays, source] = row;
    return {
      id: `grn_${String(i + 1).padStart(3, '0')}`,
      identityId,
      entitlementId,
      status: 'active',
      source,
      grantedAt: ago(grantedDays),
      revokedAt: null,
      lastReviewedAt: reviewedDays === null ? null : ago(reviewedDays),
    };
  });

  const requests: AccessRequest[] = [
    {
      id: 'req_001',
      identityId: 'id-jack',
      entitlementId: 'ent-datadog-viewer',
      justification: 'Need to monitor campaign landing-page performance.',
      status: 'pending',
      requestedAt: ago(2),
      decidedAt: null,
      decidedBy: null,
      decisionNote: null,
    },
    {
      id: 'req_002',
      identityId: 'id-eve',
      entitlementId: 'ent-sf-admin',
      justification: 'Want to build custom reports for my accounts.',
      status: 'pending',
      requestedAt: ago(3),
      decidedAt: null,
      decidedBy: null,
      decisionNote: null,
    },
    {
      id: 'req_003',
      identityId: 'id-mei',
      entitlementId: 'ent-aws-power',
      justification: 'Taking over deploys for the billing service.',
      status: 'pending',
      requestedAt: ago(1),
      decidedAt: null,
      decidedBy: null,
      decisionNote: null,
    },
    {
      id: 'req_004',
      identityId: 'id-omar',
      entitlementId: 'ent-github-read',
      justification: 'Onboarding — read access to start.',
      status: 'approved',
      requestedAt: ago(150),
      decidedAt: ago(149),
      decidedBy: 'Leo Mensah',
      decisionNote: 'Standard onboarding access.',
    },
  ];

  const campaign: ReviewCampaign = {
    id: 'cmp_q2',
    name: 'Q2 2026 — High-Risk Access Certification',
    status: 'open',
    createdAt: ago(4),
    closedAt: null,
  };

  // Certify the high-risk grants this quarter.
  const reviewGrantIds = grants
    .filter((g) => {
      const ent = ENTITLEMENTS.find((e) => e.id === g.entitlementId);
      return ent?.risk === 'high';
    })
    .map((g) => g.id);
  const reviewItems: ReviewItem[] = reviewGrantIds.map((grantId, i) => ({
    id: `rvi_${String(i + 1).padStart(3, '0')}`,
    campaignId: campaign.id,
    grantId,
    decision: 'pending',
    decidedAt: null,
    reviewerNote: null,
  }));

  const audit: AuditEvent[] = [
    ['evt_1', 160, 'system', 'sync', 'grant', 'grn_001', 'Synced 24 grants from connected applications.'],
    ['evt_2', 149, 'Leo Mensah', 'request.approved', 'request', 'req_004', 'Approved access request for Omar Haddad — GitHub Read.'],
    ['evt_3', 60, 'Tom Frost', 'grant.reviewed', 'grant', 'grn_021', 'Certified NetSuite Finance Admin during Q1 review.'],
    ['evt_4', 4, 'Nina Park', 'campaign.opened', 'campaign', 'cmp_q2', 'Opened Q2 2026 High-Risk Access Certification.'],
    ['evt_5', 3, 'Eve Wong', 'request.created', 'request', 'req_002', 'Requested Salesforce Admin access.'],
    ['evt_6', 1, 'Mei Tan', 'request.created', 'request', 'req_003', 'Requested AWS Power User access.'],
  ].map(([id, days, actor, action, entityType, entityId, summary]) => ({
    id: id as string,
    at: ago(days as number),
    actor: actor as string,
    action: action as string,
    entityType: entityType as string,
    entityId: entityId as string,
    summary: summary as string,
  }));

  return {
    identities: IDENTITIES,
    apps: APPS,
    entitlements: ENTITLEMENTS,
    grants,
    requests,
    campaign,
    reviewItems,
    audit,
  };
}
