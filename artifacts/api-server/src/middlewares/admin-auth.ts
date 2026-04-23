import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/admin-jwt.js';
import { verifyCsrfToken } from '../utils/admin-csrf.js';

declare global {
  namespace Express {
    interface Request {
      admin?: AccessTokenPayload & { sessionId?: string };
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
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  try {
    const payload = verifyAccessToken(token);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'AUTH_EXPIRED',
    });
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
    return res.status(403).json({
      error: 'Missing CSRF token',
      code: 'CSRF_MISSING',
    });
  }

  // Header token should match cookie token (double-submit cookie pattern)
  if (headerToken !== cookieToken) {
    return res.status(403).json({
      error: 'CSRF token mismatch',
      code: 'CSRF_INVALID',
    });
  }

  try {
    verifyCsrfToken(cookieToken);
    next();
  } catch (err) {
    return res.status(403).json({
      error: 'Invalid or expired CSRF token',
      code: 'CSRF_EXPIRED',
    });
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
