import Link from 'next/link';

export type NavKey =
  | 'overview'
  | 'identities'
  | 'apps'
  | 'requests'
  | 'reviews'
  | 'violations'
  | 'audit';

export function Logo({ className = 'w-4.5 h-4.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l7 3v5.5c0 4.7-3 8.2-7 9.5-4-1.3-7-4.8-7-9.5V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

const LINKS: { key: NavKey; href: string; label: string }[] = [
  { key: 'overview', href: '/', label: 'Overview' },
  { key: 'identities', href: '/identities', label: 'Identities' },
  { key: 'apps', href: '/apps', label: 'Applications' },
  { key: 'requests', href: '/requests', label: 'Requests' },
  { key: 'reviews', href: '/reviews', label: 'Reviews' },
  { key: 'violations', href: '/violations', label: 'Violations' },
  { key: 'audit', href: '/audit', label: 'Audit' },
];

export function Nav({ active }: { active?: NavKey }) {
  return (
    <header className="border-b border-edge-soft sticky top-0 z-30 bg-ink/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-15 py-3 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand/15 ring-1 ring-brand/30 text-brand">
            <Logo />
          </span>
          <span className="font-semibold tracking-tight">Gatekeeper</span>
        </Link>
        <nav className="flex items-center gap-0.5 text-[13px] overflow-x-auto">
          {LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
                active === l.key
                  ? 'text-white bg-surface-2'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
