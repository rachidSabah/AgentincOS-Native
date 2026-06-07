// ============================================================
// AgenticOS-V2 — Authentication Engine
// User management, session handling, MFA, SSO, rate limiting
// ============================================================

import * as crypto from 'crypto';
import { db } from './db';
import { rbacEngine, type UserRole } from './rbac-engine';
import { auditEngine } from './audit-engine';

// ─── Types ─────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

interface LoginAttempt {
  count: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

// ─── Configuration ─────────────────────────────────────────

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours default
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_COST = 16384; // N parameter
const SCRYPT_BLOCK_SIZE = 8; // r parameter
const SCRYPT_PARALLELIZATION = 1; // p parameter
const TOKEN_BYTES = 48;

// ─── SSO Provider Configs (placeholders) ───────────────────

const SSO_PROVIDERS: Record<string, { authorizeUrl: string; tokenUrl: string; scope: string }> = {
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
  },
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid profile email',
  },
  azure: {
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: 'openid profile email',
  },
  okta: {
    authorizeUrl: 'https://your-domain.okta.com/oauth2/v1/authorize',
    tokenUrl: 'https://your-domain.okta.com/oauth2/v1/token',
    scope: 'openid profile email',
  },
};

// ─── Auth Engine ───────────────────────────────────────────

class AuthEngine {
  private users: Map<string, UserRecord> = new Map();
  private sessions: Map<string, SessionRecord> = new Map();
  private loginAttempts: Map<string, LoginAttempt> = new Map();
  private initialized = false;

  // ─── Initialization ────────────────────────────────────

  /**
   * Initialize the auth engine, loading users from DB.
   * Falls back to in-memory if DB is not available.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const users = await db.user.findMany();
      for (const user of users) {
        this.users.set(user.id, {
          id: user.id,
          username: user.username,
          passwordHash: user.passwordHash,
          salt: user.salt,
          role: user.role as UserRole,
          mfaEnabled: user.mfaEnabled,
          mfaSecret: user.mfaSecret,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        });
      }

      // Load active sessions from DB
      const sessions = await db.session.findMany({
        where: { expiresAt: { gt: new Date() } },
      });
      for (const session of sessions) {
        this.sessions.set(session.token, {
          id: session.id,
          userId: session.userId,
          token: session.token,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        });
      }

      this.initialized = true;
      console.log('[auth] Engine initialized with', users.length, 'users');
    } catch (err) {
      console.warn('[auth] Failed to initialize from DB, using in-memory only:', err);
      this.initialized = true;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // ─── User Management ───────────────────────────────────

  /**
   * Create a new user with the specified role.
   */
  async createUser(username: string, password: string, role: UserRole): Promise<UserRecord> {
    await this.ensureInitialized();

    // Check if username already exists
    for (const [, user] of this.users) {
      if (user.username === username) {
        throw new Error(`Username already exists: ${username}`);
      }
    }

    // Generate salt and hash password
    const salt = this.generateSalt();
    const passwordHash = await this.hashPassword(password, salt);

    let userId: string;

    try {
      // Create in DB
      const dbUser = await db.user.create({
        data: {
          username,
          passwordHash,
          salt,
          role,
          mfaEnabled: false,
          isActive: true,
        },
      });
      userId = dbUser.id;
    } catch (err) {
      // Fallback to in-memory with generated ID
      userId = crypto.randomUUID();
      console.warn('[auth] Failed to create user in DB, using in-memory:', err);
    }

    const user: UserRecord = {
      id: userId,
      username,
      passwordHash,
      salt,
      role,
      mfaEnabled: false,
      mfaSecret: null,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(userId, user);

    // Grant the role in RBAC
    await rbacEngine.grantRole(userId, role);

    // Audit log
    await auditEngine.log({
      action: 'user.create',
      resource: 'users',
      result: 'success',
      userId,
      details: JSON.stringify({ username, role }),
    });

    return user;
  }

  /**
   * Authenticate a user with username and password.
   * Returns a session record on success, null on failure.
   */
  async authenticate(username: string, password: string, ipAddress?: string, userAgent?: string): Promise<SessionRecord | null> {
    await this.ensureInitialized();

    // Find user by username
    let user: UserRecord | null = null;
    for (const [, u] of this.users) {
      if (u.username === username) {
        user = u;
        break;
      }
    }

    if (!user) {
      await auditEngine.log({
        action: 'auth.login',
        resource: 'users',
        result: 'denied',
        details: JSON.stringify({ reason: 'user_not_found', username }),
        ipAddress,
        userAgent,
      });
      return null;
    }

    // Check if user is active
    if (!user.isActive) {
      await auditEngine.log({
        action: 'auth.login',
        resource: 'users',
        userId: user.id,
        result: 'denied',
        details: JSON.stringify({ reason: 'account_disabled' }),
        ipAddress,
        userAgent,
      });
      return null;
    }

    // Check rate limiting
    const attempts = this.loginAttempts.get(user.id);
    if (attempts && attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      await auditEngine.log({
        action: 'auth.login',
        resource: 'users',
        userId: user.id,
        result: 'denied',
        details: JSON.stringify({ reason: 'account_locked', lockedUntil: attempts.lockedUntil }),
        ipAddress,
        userAgent,
      });
      return null;
    }

    // Verify password
    const valid = await this.verifyPassword(password, user.passwordHash, user.salt);
    if (!valid) {
      // Increment failed attempts
      this.recordFailedAttempt(user.id);

      await auditEngine.log({
        action: 'auth.login',
        resource: 'users',
        userId: user.id,
        result: 'denied',
        details: JSON.stringify({ reason: 'invalid_password' }),
        ipAddress,
        userAgent,
      });
      return null;
    }

    // Reset login attempts on success
    this.loginAttempts.delete(user.id);

    // Create session
    const session = await this.createSession(user.id);

    // Update last login
    user.lastLoginAt = new Date();
    try {
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch {
      // DB update not critical
    }

    await auditEngine.log({
      action: 'auth.login',
      resource: 'users',
      userId: user.id,
      result: 'success',
      ipAddress,
      userAgent,
    });

    return session;
  }

  /**
   * Logout by invalidating a session.
   */
  async logout(sessionId: string): Promise<void> {
    await this.ensureInitialized();

    // Find session by token
    let session: SessionRecord | null = null;
    for (const [, s] of this.sessions) {
      if (s.id === sessionId || s.token === sessionId) {
        session = s;
        break;
      }
    }

    if (!session) return;

    // Remove from memory
    this.sessions.delete(session.token);

    // Remove from DB
    try {
      await db.session.delete({
        where: { id: session.id },
      });
    } catch {
      // DB delete not critical
    }

    await auditEngine.log({
      action: 'auth.logout',
      resource: 'users',
      userId: session.userId,
      result: 'success',
    });
  }

  /**
   * Validate a session token. Returns the session if valid, null otherwise.
   */
  async validateSession(sessionId: string): Promise<SessionRecord | null> {
    await this.ensureInitialized();

    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check expiry
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Refresh a session, extending its expiry time.
   */
  async refreshSession(sessionId: string): Promise<SessionRecord> {
    await this.ensureInitialized();

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Check if session is still valid (not too old to refresh)
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      throw new Error('Session expired, cannot refresh');
    }

    // Extend expiry
    session.expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    // Update in DB
    try {
      await db.session.update({
        where: { id: session.id },
        data: { expiresAt: session.expiresAt },
      });
    } catch {
      // DB update not critical
    }

    return session;
  }

  // ─── Password Management ──────────────────────────────

  /**
   * Hash a password using scrypt.
   */
  private async hashPassword(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(
        password,
        salt,
        SCRYPT_KEY_LENGTH,
        { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELIZATION },
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey.toString('hex'));
        }
      );
    });
  }

  /**
   * Verify a password against a stored hash.
   */
  private async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    try {
      const computedHash = await this.hashPassword(password, salt);
      return crypto.timingSafeEqual(
        Buffer.from(computedHash, 'hex'),
        Buffer.from(hash, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * Change a user's password.
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    await this.ensureInitialized();

    const user = this.users.get(userId);
    if (!user) return false;

    // Verify old password
    const valid = await this.verifyPassword(oldPassword, user.passwordHash, user.salt);
    if (!valid) return false;

    // Generate new salt and hash
    const newSalt = this.generateSalt();
    const newHash = await this.hashPassword(newPassword, newSalt);

    // Update user
    user.salt = newSalt;
    user.passwordHash = newHash;
    user.updatedAt = new Date();

    try {
      await db.user.update({
        where: { id: userId },
        data: { passwordHash: newHash, salt: newSalt },
      });
    } catch {
      // DB update not critical
    }

    await auditEngine.log({
      action: 'auth.change_password',
      resource: 'users',
      userId,
      result: 'success',
    });

    return true;
  }

  /**
   * Reset a user's password and return a temporary password.
   */
  async resetPassword(userId: string): Promise<string> {
    await this.ensureInitialized();

    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    // Generate temporary password
    const tempPassword = crypto.randomBytes(16).toString('base64url').slice(0, 20);

    // Generate new salt and hash
    const newSalt = this.generateSalt();
    const newHash = await this.hashPassword(tempPassword, newSalt);

    user.salt = newSalt;
    user.passwordHash = newHash;
    user.updatedAt = new Date();

    try {
      await db.user.update({
        where: { id: userId },
        data: { passwordHash: newHash, salt: newSalt },
      });
    } catch {
      // DB update not critical
    }

    await auditEngine.log({
      action: 'auth.reset_password',
      resource: 'users',
      userId,
      result: 'success',
    });

    return tempPassword;
  }

  // ─── SSO (OAuth2/OIDC Placeholders) ───────────────────

  /**
   * Initiate SSO login with an external provider.
   * Returns the redirect URL for the OAuth2 authorization flow.
   */
  async initiateSSO(provider: 'github' | 'google' | 'azure' | 'okta'): Promise<string> {
    await this.ensureInitialized();

    const config = SSO_PROVIDERS[provider];
    if (!config) {
      throw new Error(`Unknown SSO provider: ${provider}`);
    }

    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    if (!clientId) {
      throw new Error(`SSO provider ${provider} is not configured. Set ${provider.toUpperCase()}_CLIENT_ID env variable.`);
    }

    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state for verification (in production, use Redis or DB)
    // For now, we store it in a simple map
    this.ssoStates.set(state, { provider, createdAt: Date.now() });

    // Build authorization URL
    const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/auth/sso/callback`);
    const authUrl = `${config.authorizeUrl}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${encodeURIComponent(config.scope)}&state=${state}&response_type=code`;

    await auditEngine.log({
      action: 'auth.sso_initiate',
      resource: 'users',
      result: 'success',
      details: JSON.stringify({ provider }),
    });

    return authUrl;
  }

  // Simple in-memory SSO state store
  private ssoStates: Map<string, { provider: string; createdAt: number }> = new Map();

  /**
   * Handle SSO callback after the user authenticates with the external provider.
   * This is a placeholder — full implementation would exchange the code for tokens.
   */
  async handleSSOCallback(provider: string, code: string): Promise<SessionRecord> {
    await this.ensureInitialized();

    // In a full implementation, this would:
    // 1. Exchange the authorization code for an access token
    // 2. Fetch the user profile from the provider
    // 3. Find or create a local user
    // 4. Create a session

    // For now, create a basic session
    const userId = `sso-${provider}-${crypto.randomUUID().slice(0, 8)}`;

    await auditEngine.log({
      action: 'auth.sso_callback',
      resource: 'users',
      result: 'success',
      details: JSON.stringify({ provider }),
    });

    // Create a session for the SSO user
    const session = await this.createSession(userId);
    return session;
  }

  // ─── Multi-Factor Authentication ──────────────────────

  /**
   * Enable MFA for a user. Returns the TOTP secret and QR code URL.
   */
  async enableMFA(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    await this.ensureInitialized();

    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    // Generate TOTP secret (base32 encoded)
    const secret = crypto.randomBytes(20).toString('base64');

    // Build otpauth URL for QR code
    const issuer = encodeURIComponent('AgenticOS-V2');
    const account = encodeURIComponent(user.username);
    const qrCodeUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    // Store secret (not yet active until verified)
    user.mfaSecret = secret;

    try {
      await db.user.update({
        where: { id: userId },
        data: { mfaSecret: secret },
      });
    } catch {
      // DB update not critical
    }

    await auditEngine.log({
      action: 'auth.mfa_enable',
      resource: 'users',
      userId,
      result: 'success',
    });

    return { secret, qrCodeUrl };
  }

  /**
   * Verify an MFA code for a user.
   * Implements TOTP verification with a 1-period window.
   */
  async verifyMFA(userId: string, code: string): Promise<boolean> {
    await this.ensureInitialized();

    const user = this.users.get(userId);
    if (!user || !user.mfaSecret) return false;

    // Verify TOTP code
    const valid = this.verifyTOTP(code, user.mfaSecret);
    if (valid && !user.mfaEnabled) {
      // First successful verification — activate MFA
      user.mfaEnabled = true;
      try {
        await db.user.update({
          where: { id: userId },
          data: { mfaEnabled: true },
        });
      } catch {
        // DB update not critical
      }
    }

    return valid;
  }

  /**
   * Disable MFA for a user (requires current MFA code).
   */
  async disableMFA(userId: string, code: string): Promise<boolean> {
    await this.ensureInitialized();

    const user = this.users.get(userId);
    if (!user) return false;

    // Verify the current MFA code
    if (user.mfaEnabled && user.mfaSecret) {
      const valid = this.verifyTOTP(code, user.mfaSecret);
      if (!valid) return false;
    }

    user.mfaEnabled = false;
    user.mfaSecret = null;

    try {
      await db.user.update({
        where: { id: userId },
        data: { mfaEnabled: false, mfaSecret: null },
      });
    } catch {
      // DB update not critical
    }

    await auditEngine.log({
      action: 'auth.mfa_disable',
      resource: 'users',
      userId,
      result: 'success',
    });

    return true;
  }

  // ─── User Lookup ──────────────────────────────────────

  /**
   * Get a user by ID.
   */
  async getUser(userId: string): Promise<UserRecord | null> {
    await this.ensureInitialized();
    return this.users.get(userId) ?? null;
  }

  /**
   * Get a user by username.
   */
  async getUserByUsername(username: string): Promise<UserRecord | null> {
    await this.ensureInitialized();
    for (const [, user] of this.users) {
      if (user.username === username) return user;
    }
    return null;
  }

  /**
   * List all users.
   */
  async listUsers(): Promise<UserRecord[]> {
    await this.ensureInitialized();
    return Array.from(this.users.values());
  }

  // ─── Internal Helpers ─────────────────────────────────

  /**
   * Create a new session for a user.
   */
  private async createSession(userId: string): Promise<SessionRecord> {
    const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    const session: SessionRecord = {
      id: sessionId,
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
    };

    this.sessions.set(token, session);

    try {
      await db.session.create({
        data: {
          id: sessionId,
          userId,
          token,
          expiresAt,
        },
      });
    } catch {
      // DB create not critical
    }

    return session;
  }

  /**
   * Generate a random salt for password hashing.
   */
  private generateSalt(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Record a failed login attempt and apply rate limiting.
   */
  private recordFailedAttempt(userId: string): void {
    const attempts = this.loginAttempts.get(userId) ?? {
      count: 0,
      lockedUntil: null,
      lastAttempt: 0,
    };

    attempts.count += 1;
    attempts.lastAttempt = Date.now();

    // Lock account after max attempts
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      attempts.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    }

    this.loginAttempts.set(userId, attempts);
  }

  /**
   * Verify a TOTP code against a secret.
   * Supports a window of ±1 period (30 seconds each direction).
   */
  private verifyTOTP(code: string, secret: string): boolean {
    const period = 30;
    const digits = 6;
    const now = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(now / period);

    // Check current time step and ±1 window
    for (let offset = -1; offset <= 1; offset++) {
      const step = timeStep + offset;
      const expectedCode = this.generateTOTP(secret, step, digits);
      if (crypto.timingSafeEqual(Buffer.from(code), Buffer.from(expectedCode))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate a TOTP code for a given time step.
   */
  private generateTOTP(secret: string, timeStep: number, digits: number): string {
    // Convert secret from base64 to buffer
    const key = Buffer.from(secret, 'base64');

    // Convert time step to 8-byte buffer (big-endian)
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(Math.floor(timeStep / 0x100000000), 0);
    timeBuffer.writeUInt32BE(timeStep & 0xffffffff, 4);

    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(timeBuffer);
    const hmacResult = hmac.digest();

    // Dynamic truncation
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const binary =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, digits);
    return otp.toString().padStart(digits, '0');
  }

  /**
   * Clean up expired sessions.
   */
  async cleanupExpiredSessions(): Promise<number> {
    await this.ensureInitialized();

    const now = new Date();
    let cleaned = 0;

    for (const [token, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
        cleaned++;

        try {
          await db.session.delete({ where: { id: session.id } });
        } catch {
          // DB delete not critical
        }
      }
    }

    return cleaned;
  }
}

// ─── Singleton Export ───
export const authEngine = new AuthEngine();
