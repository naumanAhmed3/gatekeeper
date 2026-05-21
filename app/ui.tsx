import { initials, tintColor } from '@/lib/format';
import type { ViolationKind } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// Shared presentational components.
// ─────────────────────────────────────────────────────────────

type Level = 'low' | 'medium' | 'high';

const LEVEL_STYLE: Record<Level, string> = {
  high: 'text-high bg-high/10 ring-high/25',
  medium: 'text-medium bg-medium/10 ring-medium/25',
  low: 'text-low bg-low/10 ring-low/25',
};

/** Badge for a risk / severity / criticality level. */
export function LevelBadge({
  level,
  label,
}: {
  level: Level;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center text-[10.5px] font-medium rounded-full px-2 py-0.5 ring-1 ${LEVEL_STYLE[level]}`}
    >
      {label ?? level}
    </span>
  );
}

const STATUS_STYLE: Record<string, string> = {
  active: 'text-low bg-low/10 ring-low/25',
  approved: 'text-low bg-low/10 ring-low/25',
  certified: 'text-low bg-low/10 ring-low/25',
  pending: 'text-medium bg-medium/10 ring-medium/25',
  open: 'text-brand bg-brand/10 ring-brand/25',
  disabled: 'text-high bg-high/10 ring-high/25',
  revoked: 'text-neutral-400 bg-neutral-500/10 ring-neutral-500/25',
  denied: 'text-neutral-400 bg-neutral-500/10 ring-neutral-500/25',
  closed: 'text-neutral-400 bg-neutral-500/10 ring-neutral-500/25',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center text-[10.5px] font-medium rounded-full px-2 py-0.5 ring-1 ${
        STATUS_STYLE[status] ?? 'text-neutral-400 bg-neutral-500/10 ring-neutral-500/25'
      }`}
    >
      {status}
    </span>
  );
}

/** Initials avatar tile. */
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-full font-semibold text-ink shrink-0"
      style={{
        width: size,
        height: size,
        background: tintColor(name),
        fontSize: size * 0.36,
      }}
    >
      {initials(name)}
    </span>
  );
}

export const VIOLATION_LABEL: Record<ViolationKind, string> = {
  sod: 'Separation of duties',
  stale: 'Stale access',
  orphaned: 'Orphaned access',
  over_privileged: 'Over-privileged',
};

export function KindIcon({ kind }: { kind: ViolationKind }) {
  const paths: Record<ViolationKind, React.ReactNode> = {
    sod: <path d="M7 8l-4 4 4 4M17 8l4 4-4 4M14 4l-4 16" />,
    stale: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </>
    ),
    orphaned: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21c0-4 3-7 7-7M16 17l5 5M21 17l-5 5" />
      </>
    ),
    over_privileged: <path d="M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[kind]}
    </svg>
  );
}
