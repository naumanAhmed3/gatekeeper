import { timingSafeEqual } from 'node:crypto';

export interface AdminPrincipal {
  actor: string;
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function requireAdmin(req: Request): AdminPrincipal {
  const user = process.env.GATEKEEPER_ADMIN_USER;
  const password = process.env.GATEKEEPER_ADMIN_PASSWORD;
  if (!user || !password) throw new Error('ADMIN_AUTH_NOT_CONFIGURED');

  const header = req.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) throw new Error('UNAUTHORIZED');
  let supplied = '';
  try {
    supplied = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    throw new Error('UNAUTHORIZED');
  }
  const split = supplied.indexOf(':');
  if (split < 0) throw new Error('UNAUTHORIZED');
  if (!equal(supplied.slice(0, split), user) || !equal(supplied.slice(split + 1), password)) {
    throw new Error('UNAUTHORIZED');
  }
  return { actor: user };
}

export function authError(error: unknown): Response | null {
  if (!(error instanceof Error)) return null;
  if (error.message === 'UNAUTHORIZED') {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Gatekeeper"' } },
    );
  }
  if (error.message === 'ADMIN_AUTH_NOT_CONFIGURED') {
    return Response.json({ error: 'Administrative authentication is not configured' }, { status: 503 });
  }
  return null;
}
