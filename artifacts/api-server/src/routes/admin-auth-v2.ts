/**
 * Enhanced Admin Authentication Routes (v2)
 * Implements production-grade authentication with:
 * - HttpOnly refresh tokens with cookie-based storage
 * - 15-minute access tokens (in-memory on frontend)
 * - MFA/TOTP support
 * - Session management with rotation and revocation
 * - CSRF protection
 * - Comprehensive audit logging
 *
 * Reference: /workspaces/mart/artifacts/admin/admin-login-guide.md
 */

import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { 
  adminLogin, 
  verify2fa, 
  createAdminSession, 
  refreshAdminSession,
  logoutAdminSession,
  getAdminActiveSessions,
  revokeAllAdminSessions,
} from '../services/admin-auth.service.js';
import { 
  authenticateAdmin, 
  csrfProtection,
} from '../middlewares/admin-auth.js';
import { 
  getClientIp, 
  logAdminAudit,
} from '../middlewares/admin-audit.js';
import { verify2faChallengeToken } from '../utils/admin-jwt.js';
import { verifyRefreshToken } from '../utils/admin-jwt.js';

const router = Router();

// Rate limiting for login attempts: max 5 failed attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failures
  keyGenerator: (req) => getClientIp(req),
});

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
}).strict();

const twoFaSchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required'),
  totp: z.string().length(6, 'TOTP must be 6 digits').regex(/^\d{6}$/, 'TOTP must be numeric'),
}).strict();

const refreshSchema = z.object({
  // Refresh token comes from httpOnly cookie, but can optionally be sent in body
}).strict();

/**
 * POST /api/admin/auth/login
 * Login with username and password
 * Returns: access token, user info, or MFA challenge
 */
router.post('/auth/login', loginLimiter, async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  try {
    const body = loginSchema.parse(req.body);

    // Perform login
    const result = await adminLogin(body.username, body.password, ip, userAgent);

    if (!result.success) {
      await logAdminAudit('admin_login_failed', {
        ip,
        userAgent,
        result: 'failure',
        reason: result.error,
      });
      return res.status(401).json({ error: result.error });
    }

    // If MFA is required
    if (result.requiresMfa && result.tempToken) {
      await logAdminAudit('admin_login_mfa_required', {
        adminId: result.admin?.id,
        ip,
        userAgent,
        result: 'success',
      });

      return res.json({
        requiresMfa: true,
        tempToken: result.tempToken,
        message: 'Please provide your TOTP code',
      });
    }

    // No MFA - create session
    const admin = result.admin!;
    const session = await createAdminSession(admin, ip, userAgent);

    // Set secure cookies
    res.cookie('refresh_token', session.refreshToken, {
      httpOnly: true, // Cannot be accessed from JavaScript
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'strict', // CSRF protection
      path: '/api/admin/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('csrf_token', session.csrfToken, {
      httpOnly: false, // Frontend needs to read this for X-CSRF-Token header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    await logAdminAudit('admin_login_success', {
      adminId: admin.id,
      ip,
      userAgent,
      result: 'success',
    });

    res.json({
      accessToken: session.accessToken,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.username || admin.name,
        role: admin.role,
      },
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: err.errors,
      });
    }

    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/auth/2fa
 * Verify TOTP and complete login
 */
router.post('/auth/2fa', loginLimiter, async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  try {
    const body = twoFaSchema.parse(req.body);

    // Verify temp token
    let adminId: string;
    try {
      const payload = verify2faChallengeToken(body.tempToken);
      adminId = payload.sub;
    } catch (err) {
      await logAdminAudit('admin_2fa_failed_invalid_token', {
        ip,
        userAgent,
        result: 'failure',
        reason: 'Invalid temporary token',
      });
      return res.status(401).json({ error: 'Temporary token expired or invalid' });
    }

    // Verify TOTP
    const mfaResult = await verify2fa(adminId, body.totp, ip, userAgent);
    if (!mfaResult.success) {
      await logAdminAudit('admin_2fa_failed_invalid_code', {
        adminId,
        ip,
        userAgent,
        result: 'failure',
        reason: 'Invalid TOTP code',
      });
      return res.status(401).json({ error: mfaResult.error });
    }

    // Create session
    const admin = mfaResult.admin!;
    const session = await createAdminSession(admin, ip, userAgent);

    // Set secure cookies
    res.cookie('refresh_token', session.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/admin/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('csrf_token', session.csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logAdminAudit('admin_2fa_success', {
      adminId: admin.id,
      ip,
      userAgent,
      result: 'success',
    });

    res.json({
      accessToken: session.accessToken,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.username || admin.name,
        role: admin.role,
      },
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: err.errors,
      });
    }

    console.error('2FA verification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/auth/refresh
 * Refresh access token using refresh token cookie
 * Implements token rotation for enhanced security
 */
router.post('/auth/refresh', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'];
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({
      error: 'No refresh token found',
      code: 'REFRESH_MISSING',
    });
  }

  const result = await refreshAdminSession(refreshToken, ip, userAgent);

  if (!result.success) {
    res.clearCookie('refresh_token', { path: '/api/admin/auth' });
    res.clearCookie('csrf_token', { path: '/' });

    await logAdminAudit('admin_refresh_failed', {
      ip,
      userAgent,
      result: 'failure',
      reason: result.error,
    });

    return res.status(401).json({
      error: result.error,
      code: 'REFRESH_INVALID',
    });
  }

  // Update cookies with new tokens (rotation)
  res.cookie('refresh_token', result.refreshToken!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/admin/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.cookie('csrf_token', result.csrfToken!, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  await logAdminAudit('admin_refresh_success', {
    adminId: result.admin?.id,
    ip,
    userAgent,
    result: 'success',
  });

  res.json({
    accessToken: result.accessToken,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });
});

/**
 * POST /api/admin/auth/logout
 * Logout and revoke current session
 */
router.post(
  '/auth/logout',
  authenticateAdmin,
  csrfProtection,
  async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'];
    const adminId = req.admin?.sub;
    const refreshToken = req.cookies.refresh_token;

    // Revoke session
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await logoutAdminSession(payload.sessionId);
      } catch (err) {
        // Token might be invalid, continue anyway
      }
    }

    // Clear cookies
    res.clearCookie('refresh_token', { path: '/api/admin/auth' });
    res.clearCookie('csrf_token', { path: '/' });

    await logAdminAudit('admin_logout', {
      adminId,
      ip,
      userAgent,
      result: 'success',
    });

    res.json({ success: true, message: 'Logged out successfully' });
  }
);

/**
 * GET /api/admin/auth/sessions
 * Get all active sessions for the authenticated admin
 * Requires valid access token
 */
router.get(
  '/auth/sessions',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    const adminId = req.admin?.sub;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessions = await getAdminActiveSessions(adminId);

    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        ip: s.ip,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        expiresAt: s.expiresAt,
      })),
      total: sessions.length,
    });
  }
);

/**
 * DELETE /api/admin/auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete(
  '/auth/sessions/:sessionId',
  authenticateAdmin,
  csrfProtection,
  async (req: Request, res: Response) => {
    const adminId = req.admin?.sub;
    const sessionId = req.params.sessionId;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify the session belongs to the admin
    const sessions = await getAdminActiveSessions(adminId);
    const session = sessions.find((s) => s.id === sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await logoutAdminSession(sessionId);

    res.json({ success: true, message: 'Session revoked' });
  }
);

/**
 * DELETE /api/admin/auth/sessions
 * Revoke all sessions for the authenticated admin
 * (Logout from all devices)
 */
router.delete(
  '/auth/sessions',
  authenticateAdmin,
  csrfProtection,
  async (req: Request, res: Response) => {
    const adminId = req.admin?.sub;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await revokeAllAdminSessions(adminId);

    // Clear current cookies
    res.clearCookie('refresh_token', { path: '/api/admin/auth' });
    res.clearCookie('csrf_token', { path: '/' });

    res.json({ success: true, message: 'All sessions revoked' });
  }
);

export default router;
