import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'sherlock-admin-secret-key-2026-very-secure-jwt-token-alpha'
);

const COOKIE_NAME = 'sherlock_admin_token';

export async function createSession(email: string, name: string = 'Главный следователь') {
  const token = await new SignJWT({ email, name, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}

export async function verifyToken(token: string) {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as { email: string; name: string; role: string };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function verifyApiAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return await verifyToken(authHeader.substring(7));
    }
    return null;
  }
  return await verifyToken(token);
}

export function getExpectedAdminCredentials() {
  const email = process.env.ADMIN_EMAIL || 'admin@registry.gov';
  const password = process.env.ADMIN_PASSWORD || 'sherlock2026';
  return { email, password };
}
