import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/admin-jwt.js';
import { verifyCsrfToken } from '../utils/admin-csrf.js';

/**
 * Routes that remain accessible while the admin's JWT carries `mpc=true`
 * (must change password). Anything else is blocked with FORCE_PASSWORD_CHANGE
 * so the admin is funnelled through the rotation flow before they can act
 * on the rest of the panel.
 *
 * Matched against `req.originalUrl` (path only — query strings stripped).
 */
const FORCE_PASSWORD_CHANGE_ALLOWLIST = [
  '/api/admin/auth/change-password',
  '/api/admin/auth/logout',
  '/api/admin/auth/me',
  '/api/admin/auth/sessions',
  '/api/admin/auth/refresh',
];

function isForcedPasswordChangeAllowed(originalUrl: string): boolean {
  const path = originalUrl.split('?')[0]!;
  return FORCE_PASSWORD_CHANGE_ALLOWLIST.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`),
  );
}

/**
 * Block requests carrying an `mpc=true` access token unless they target an
 * allow-listed password-change/logout/me/sessions endpoint. Returns
 * `FORCE_PASSWORD_CHANGE` so the SPA can redirect the user to the rotation
 * screen.
 */
export function enforceMustChangePassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const mpc = req.admin?.mpc === true;
  if (!mpc) return next();
  if (isForcedPasswordChangeAllowed(req.originalUrl)) return next();
  res.status(403).json({
    error: 'You must change your password before using the admin panel.',
    code: 'FORCE_PASSWORD_CHANGE',
  });
  return;
}

declare global {
  namespace Express {
    interface Request {
      /**
       * Populated by either `authenticateAdmin` (admin-auth-v2) or the legacy
       * `adminAuth` middleware. Includes a denormalised `adminId` alias so
       * legacy callsites that read `req.admin.adminId` keep working.
       */
      admin?: Partial<AccessTokenPayload> & {
        sessionId?: string;
        adminId?: string | null;
        permissions?: string[];
      };
    }
  }
}

/**
 * Authenticate admin requests using JWT bearer token
 * Extracts token from Authorization: Bearer <token> header
 */
export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  try {
    const payload = verifyAccessToken(token);
    req.admin = payload;
    // Block every non-allow-listed route while the token carries `mpc=true`.
    if (payload.mpc === true && !isForcedPasswordChangeAllowed(req.originalUrl)) {
      res.status(403).json({
        error: 'You must change your password before using the admin panel.',
        code: 'FORCE_PASSWORD_CHANGE',
      });
      return;
    }
    next();
  } catch (err) {
    res.status(401).json({
      error: 'Invalid or expired token',
      code: 'AUTH_EXPIRED',
    });
    return;
  }
}

/**
 * CSRF protection middleware
 * Validates CSRF tokens for state-changing requests (POST, PUT, DELETE, PATCH)
 * GET, HEAD, OPTIONS requests skip CSRF check
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const headerToken = req.headers['x-csrf-token'] as string;
  const cookieToken = req.cookies.csrf_token as string;

  if (!headerToken || !cookieToken) {
    res.status(403).json({
      error: 'Missing CSRF token',
      code: 'CSRF_MISSING',
    });
    return;
  }

  // Header token should match cookie token (double-submit cookie pattern)
  if (headerToken !== cookieToken) {
    res.status(403).json({
      error: 'CSRF token mismatch',
      code: 'CSRF_INVALID',
    });
    return;
  }

  try {
    verifyCsrfToken(cookieToken);
    next();
  } catch (err) {
    res.status(403).json({
      error: 'Invalid or expired CSRF token',
      code: 'CSRF_EXPIRED',
    });
    return;
  }
}

/**
 * Optional admin check - doesn't fail, just populates req.admin if valid
 */
export function optionalAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);
      req.admin = payload;
    } catch (err) {
      // Silently fail - continue without auth
    }
  }

  next();
}
