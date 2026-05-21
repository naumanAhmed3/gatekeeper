import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gatekeeper — Access Governance',
  description:
    'An access-governance backend: identities, entitlements and grants, a policy engine that flags SoD conflicts and stale, orphaned and over-privileged access, approvals, certification reviews, and an immutable audit log.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
