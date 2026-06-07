// ============================================================
// AgenticOS-V2 — Auth API Route
// Handles authentication, user management, MFA, and SSO
// ============================================================

import { NextResponse } from 'next/server';
import { authEngine } from '@/lib/auth-engine';
import { rbacEngine } from '@/lib/rbac-engine';
import { auditEngine } from '@/lib/audit-engine';
import type { UserRole } from '@/lib/rbac-engine';

// ─── GET: Validate Session ────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId query parameter is required' },
        { status: 400 }
      );
    }

    const session = await authEngine.validateSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { valid: false, error: 'Session not found or expired' },
        { status: 401 }
      );
    }

    // Get user info
    const user = await authEngine.getUser(session.userId);

    return NextResponse.json({
      valid: true,
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
      user: user ? {
        id: user.id,
        username: user.username,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
      } : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ─── POST: Auth Actions ───────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // Extract request metadata for audit
    const ipAddress = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    const userAgent = request.headers.get('user-agent') ?? 'unknown';

    switch (action) {
      // ─── Login ─────────────────────────────────────────
      case 'login': {
        const { username, password } = body;
        if (!username || !password) {
          return NextResponse.json(
            { error: 'username and password are required' },
            { status: 400 }
          );
        }

        const session = await authEngine.authenticate(username, password, ipAddress, userAgent);

        if (!session) {
          return NextResponse.json(
            { error: 'Invalid credentials or account locked' },
            { status: 401 }
          );
        }

        const user = await authEngine.getUser(session.userId);

        return NextResponse.json({
          success: true,
          session: {
            id: session.id,
            token: session.token,
            expiresAt: session.expiresAt,
          },
          user: user ? {
            id: user.id,
            username: user.username,
            role: user.role,
            mfaEnabled: user.mfaEnabled,
          } : null,
        });
      }

      // ─── Logout ────────────────────────────────────────
      case 'logout': {
        const { sessionId } = body;
        if (!sessionId) {
          return NextResponse.json(
            { error: 'sessionId is required' },
            { status: 400 }
          );
        }

        await authEngine.logout(sessionId);
        return NextResponse.json({ success: true });
      }

      // ─── Create User (Admin Only) ──────────────────────
      case 'create-user': {
        const { username, password, role, adminSessionId } = body;
        if (!username || !password || !role) {
          return NextResponse.json(
            { error: 'username, password, and role are required' },
            { status: 400 }
          );
        }

        // Validate role
        const validRoles: UserRole[] = ['admin', 'operator', 'developer', 'viewer', 'guest'];
        if (!validRoles.includes(role as UserRole)) {
          return NextResponse.json(
            { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
            { status: 400 }
          );
        }

        // Verify admin session if provided
        if (adminSessionId) {
          const session = await authEngine.validateSession(adminSessionId);
          if (!session) {
            return NextResponse.json(
              { error: 'Admin session invalid or expired' },
              { status: 401 }
            );
          }

          const hasPermission = await rbacEngine.checkPermission(session.userId, 'users', 'manage');
          if (!hasPermission) {
            await auditEngine.log({
              action: 'authz.check',
              resource: 'users',
              userId: session.userId,
              result: 'denied',
              details: JSON.stringify({ attemptedAction: 'create-user' }),
              ipAddress,
              userAgent,
            });
            return NextResponse.json(
              { error: 'Insufficient permissions to create users' },
              { status: 403 }
            );
          }
        }

        const user = await authEngine.createUser(username, password, role as UserRole);

        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt,
          },
        }, { status: 201 });
      }

      // ─── Change Password ──────────────────────────────
      case 'change-password': {
        const { userId, oldPassword, newPassword } = body;
        if (!userId || !oldPassword || !newPassword) {
          return NextResponse.json(
            { error: 'userId, oldPassword, and newPassword are required' },
            { status: 400 }
          );
        }

        // Validate new password strength
        if (newPassword.length < 8) {
          return NextResponse.json(
            { error: 'New password must be at least 8 characters' },
            { status: 400 }
          );
        }

        const success = await authEngine.changePassword(userId, oldPassword, newPassword);

        if (!success) {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 401 }
          );
        }

        return NextResponse.json({ success: true });
      }

      // ─── SSO Initiate ─────────────────────────────────
      case 'sso': {
        const { provider } = body;
        if (!provider) {
          return NextResponse.json(
            { error: 'provider is required' },
            { status: 400 }
          );
        }

        const validProviders = ['github', 'google', 'azure', 'okta'];
        if (!validProviders.includes(provider)) {
          return NextResponse.json(
            { error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` },
            { status: 400 }
          );
        }

        try {
          const redirectUrl = await authEngine.initiateSSO(provider as 'github' | 'google' | 'azure' | 'okta');
          return NextResponse.json({ redirectUrl });
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : 'SSO initiation failed' },
            { status: 500 }
          );
        }
      }

      // ─── SSO Callback ─────────────────────────────────
      case 'sso-callback': {
        const { provider, code } = body;
        if (!provider || !code) {
          return NextResponse.json(
            { error: 'provider and code are required' },
            { status: 400 }
          );
        }

        try {
          const session = await authEngine.handleSSOCallback(provider, code);
          return NextResponse.json({
            success: true,
            session: {
              id: session.id,
              token: session.token,
              expiresAt: session.expiresAt,
            },
          });
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : 'SSO callback failed' },
            { status: 500 }
          );
        }
      }

      // ─── MFA Enable ───────────────────────────────────
      case 'mfa-enable': {
        const { userId } = body;
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required' },
            { status: 400 }
          );
        }

        try {
          const result = await authEngine.enableMFA(userId);
          return NextResponse.json({
            success: true,
            secret: result.secret,
            qrCodeUrl: result.qrCodeUrl,
          });
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to enable MFA' },
            { status: 500 }
          );
        }
      }

      // ─── MFA Verify ───────────────────────────────────
      case 'mfa-verify': {
        const { userId, code } = body;
        if (!userId || !code) {
          return NextResponse.json(
            { error: 'userId and code are required' },
            { status: 400 }
          );
        }

        const valid = await authEngine.verifyMFA(userId, code);
        if (!valid) {
          return NextResponse.json(
            { error: 'Invalid MFA code' },
            { status: 401 }
          );
        }

        return NextResponse.json({ success: true });
      }

      // ─── MFA Disable ─────────────────────────────────
      case 'mfa-disable': {
        const { userId, code } = body;
        if (!userId || !code) {
          return NextResponse.json(
            { error: 'userId and code are required' },
            { status: 400 }
          );
        }

        const success = await authEngine.disableMFA(userId, code);
        if (!success) {
          return NextResponse.json(
            { error: 'Invalid MFA code or user not found' },
            { status: 401 }
          );
        }

        return NextResponse.json({ success: true });
      }

      // ─── Refresh Session ──────────────────────────────
      case 'refresh': {
        const { token } = body;
        if (!token) {
          return NextResponse.json(
            { error: 'token is required' },
            { status: 400 }
          );
        }

        try {
          const session = await authEngine.refreshSession(token);
          return NextResponse.json({
            success: true,
            session: {
              id: session.id,
              token: session.token,
              expiresAt: session.expiresAt,
            },
          });
        } catch {
          return NextResponse.json(
            { error: 'Session not found or expired' },
            { status: 401 }
          );
        }
      }

      // ─── Reset Password ───────────────────────────────
      case 'reset-password': {
        const { userId, adminSessionId } = body;
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required' },
            { status: 400 }
          );
        }

        // Verify admin session
        if (adminSessionId) {
          const session = await authEngine.validateSession(adminSessionId);
          if (!session) {
            return NextResponse.json(
              { error: 'Admin session invalid or expired' },
              { status: 401 }
            );
          }

          const hasPermission = await rbacEngine.checkPermission(session.userId, 'users', 'manage');
          if (!hasPermission) {
            return NextResponse.json(
              { error: 'Insufficient permissions to reset passwords' },
              { status: 403 }
            );
          }
        }

        try {
          const tempPassword = await authEngine.resetPassword(userId);
          return NextResponse.json({
            success: true,
            tempPassword,
          });
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Password reset failed' },
            { status: 500 }
          );
        }
      }

      // ─── List Users ───────────────────────────────────
      case 'list-users': {
        const { sessionId: listSessionId } = body;
        if (!listSessionId) {
          return NextResponse.json(
            { error: 'sessionId is required' },
            { status: 400 }
          );
        }

        const session = await authEngine.validateSession(listSessionId);
        if (!session) {
          return NextResponse.json(
            { error: 'Session invalid or expired' },
            { status: 401 }
          );
        }

        const hasPermission = await rbacEngine.checkPermission(session.userId, 'users', 'read');
        if (!hasPermission) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }

        const users = await authEngine.listUsers();
        return NextResponse.json({
          users: users.map((u) => ({
            id: u.id,
            username: u.username,
            role: u.role,
            mfaEnabled: u.mfaEnabled,
            isActive: u.isActive,
            lastLoginAt: u.lastLoginAt,
            createdAt: u.createdAt,
          })),
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[auth-api] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
