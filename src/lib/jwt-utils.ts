import jwt from 'jsonwebtoken';

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Create a signed JWT with the given payload and expiration.
 * Used for email verification tokens, password reset tokens, etc.
 */
export function createSignedToken(
  payload: Record<string, unknown>,
  expiresIn: string | number,
): string {
  return jwt.sign(payload, getSecret(), { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });
}

/**
 * Verify and decode a signed JWT.
 * Throws if the token is invalid or expired.
 */
export function verifySignedToken(token: string): Record<string, unknown> {
  return jwt.verify(token, getSecret()) as Record<string, unknown>;
}
