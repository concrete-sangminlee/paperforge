import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';

const SECRET = process.env.NEXTAUTH_SECRET || '';

export function authenticateFromCookie(req: IncomingMessage): { id: string; role: string } | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );

  const token =
    cookies['next-auth.session-token'] ||
    cookies['__Secure-next-auth.session-token'] ||
    cookies['authjs.session-token'];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, SECRET) as { id?: string; sub?: string; role?: string };
    return { id: decoded.id || decoded.sub || '', role: decoded.role || 'user' };
  } catch {
    return null;
  }
}
