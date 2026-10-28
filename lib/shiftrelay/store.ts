import { env } from 'cloudflare:workers';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { seed, type Workspace } from './domain';

let accessKeys: ReturnType<typeof createRemoteJWKSet> | undefined;
let accessIssuer: string | undefined;

export async function load(user: string) {
  const db = (env as any).DB;

  if (!db) {
    throw new Error('Database binding unavailable.');
  }

  await db
    .prepare(
      'INSERT OR IGNORE INTO workspaces (id, data, revision) VALUES (?, ?, 0)'
    )
    .bind(user, JSON.stringify(seed()))
    .run();

  const row = await db
    .prepare('SELECT data, revision FROM workspaces WHERE id = ?')
    .bind(user)
    .first();

  if (!row) {
    throw new Error('Workspace could not be loaded.');
  }

  return {
    state: JSON.parse(row.data) as Workspace,
    revision: row.revision as number,
  };
}

export async function save(
  user: string,
  state: Workspace,
  revision: number
) {
  const db = (env as any).DB;

  if (!db) {
    throw new Error('Database binding unavailable.');
  }

  const result = await db
    .prepare(
      'UPDATE workspaces SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?'
    )
    .bind(JSON.stringify(state), user, revision)
    .run();

  if (!result.meta.changes) {
    throw new Error(
      'This workspace changed in another tab. Refresh and try again.'
    );
  }

  return revision + 1;
}

export async function identity(req: Request): Promise<string> {
  // Local development only; excluded from production behavior.
  if (import.meta.env.DEV) {
    return 'local-development-owner';
  }

  const config = env as unknown as {
    ACCESS_TEAM_DOMAIN?: string;
    ACCESS_AUD?: string;
  };

  const issuer = config.ACCESS_TEAM_DOMAIN?.replace(/\/$/, '');
  const audience = config.ACCESS_AUD;

  if (!issuer || !audience) {
    throw new Error('Authentication is not configured.');
  }

  const token = req.headers.get('Cf-Access-Jwt-Assertion');

  if (!token) {
    throw new Error('Sign in to access ShiftRelay.');
  }

  if (!accessKeys || accessIssuer !== issuer) {
    accessKeys = createRemoteJWKSet(
      new URL(`${issuer}/cdn-cgi/access/certs`)
    );
    accessIssuer = issuer;
  }

  const { payload } = await jwtVerify(token, accessKeys, {
    issuer,
    audience,
    algorithms: ['RS256'],
    requiredClaims: ['sub', 'exp', 'email'],
  });

  if (!payload.sub || typeof payload.email !== 'string') {
    throw new Error('A signed-in user is required.');
  }

  return payload.sub;
}

export function checkOrigin(req: Request) {
  const origin = req.headers.get('origin');

  if (origin && origin !== new URL(req.url).origin) {
    throw new Error('Cross-origin request denied.');
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
}