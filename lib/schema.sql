-- Gatekeeper schema — access governance.
-- Apply with: node --env-file=.env.local scripts/migrate.mjs

-- People who may hold access.
create table if not exists identities (
  id         text primary key,
  name       text not null,
  email      text not null,
  department text not null,
  title      text not null,
  status     text not null default 'active',   -- active | disabled
  joined_at  timestamptz not null default now()
);

-- Applications / systems access is granted into.
create table if not exists apps (
  id          text primary key,
  name        text not null,
  category    text not null,
  criticality text not null default 'medium',  -- low | medium | high
  owner_id    text references identities(id)
);

-- Roles / permission sets within an app.
create table if not exists entitlements (
  id          text primary key,
  app_id      text not null references apps(id) on delete cascade,
  name        text not null,
  description text not null default '',
  risk        text not null default 'low'      -- low | medium | high
);

-- An identity actually holding an entitlement.
create table if not exists grants (
  id               text primary key,
  identity_id      text not null references identities(id) on delete cascade,
  entitlement_id   text not null references entitlements(id) on delete cascade,
  status           text not null default 'active',   -- active | revoked
  source           text not null default 'sync',     -- request | sync | manual
  granted_at       timestamptz not null default now(),
  revoked_at       timestamptz,
  last_reviewed_at timestamptz
);

create index if not exists grants_identity_idx on grants (identity_id);
create index if not exists grants_entitlement_idx on grants (entitlement_id);

-- Requests for access, awaiting an approval decision.
create table if not exists access_requests (
  id             text primary key,
  identity_id    text not null references identities(id) on delete cascade,
  entitlement_id text not null references entitlements(id) on delete cascade,
  justification  text not null default '',
  status         text not null default 'pending',  -- pending | approved | denied
  requested_at   timestamptz not null default now(),
  decided_at     timestamptz,
  decided_by     text,
  decision_note  text
);

create index if not exists requests_status_idx on access_requests (status, requested_at desc);

-- Periodic access-certification campaigns.
create table if not exists review_campaigns (
  id         text primary key,
  name       text not null,
  status     text not null default 'open',     -- open | closed
  created_at timestamptz not null default now(),
  closed_at  timestamptz
);

-- One grant to re-certify within a campaign.
create table if not exists review_items (
  id            text primary key,
  campaign_id   text not null references review_campaigns(id) on delete cascade,
  grant_id      text not null references grants(id) on delete cascade,
  decision      text not null default 'pending',  -- pending | certified | revoked
  decided_at    timestamptz,
  reviewer_note text
);

create index if not exists review_items_campaign_idx on review_items (campaign_id);

-- Immutable audit log.
create table if not exists audit_events (
  id          text primary key,
  at          timestamptz not null default now(),
  actor       text not null,
  action      text not null,
  entity_type text not null,
  entity_id   text not null,
  summary     text not null
);

create index if not exists audit_at_idx on audit_events (at desc);

-- Policy violations — recomputed by the policy engine.
create table if not exists violations (
  id          text primary key,
  kind        text not null,                    -- sod | stale | orphaned | over_privileged
  severity    text not null,                    -- low | medium | high
  identity_id text not null references identities(id) on delete cascade,
  summary     text not null,
  detail      text not null default '',
  detected_at timestamptz not null default now()
);

create index if not exists violations_kind_idx on violations (kind);
create index if not exists violations_identity_idx on violations (identity_id);
