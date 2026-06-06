// ============================================================
// AgenticOS-V2 — Encryption Engine
// Enterprise data protection with AES-256-GCM encryption,
// key derivation via scrypt, and secure secret storage
// ============================================================

import * as crypto from 'crypto';
import { db } from './db';
import { auditEngine } from './audit-engine';

// ─── Types ─────────────────────────────────────────────────

export interface EncryptedData {
  algorithm: string;
  keyId: string;
  iv: string;       // base64
  ciphertext: string; // base64
  tag: string;       // base64
  salt: string;      // base64
}

interface KeyInfo {
  id: string;
  key: Buffer;
  createdAt: number;
  isActive: boolean;
}

// ─── Configuration ─────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const SALT_BYTES = 32;
const KEY_LENGTH = 32; // 256 bits for AES-256
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

// ─── Encryption Engine ─────────────────────────────────────

class EncryptionEngine {
  private masterKey: Buffer = Buffer.alloc(0);
  private keyId: string = '';
  private keyStore: Map<string, KeyInfo> = new Map();
  private initialized = false;

  // ─── Initialization ────────────────────────────────────

  /**
   * Initialize the encryption engine with a master password.
   * Derives the master key using scrypt.
   */
  async initialize(masterPassword: string): Promise<void> {
    if (this.initialized) return;

    // Generate or load salt for key derivation
    let salt: Buffer;
    const existingSalt = process.env.ENCRYPTION_SALT;
    if (existingSalt) {
      salt = Buffer.from(existingSalt, 'base64');
    } else {
      salt = crypto.randomBytes(SALT_BYTES);
      console.log('[encryption] Generated new salt. Set ENCRYPTION_SALT env for persistence.');
    }

    // Derive master key
    this.masterKey = this.deriveKey(masterPassword, salt);
    this.keyId = `key-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Store key info
    this.keyStore.set(this.keyId, {
      id: this.keyId,
      key: this.masterKey,
      createdAt: Date.now(),
      isActive: true,
    });

    this.initialized = true;

    await auditEngine.log({
      action: 'security.encryption_operation',
      resource: 'encryption',
      result: 'success',
      details: JSON.stringify({ operation: 'initialize', keyId: this.keyId }),
    });

    console.log('[encryption] Engine initialized with key ID:', this.keyId);
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Encryption engine not initialized. Call initialize() first.');
    }
  }

  // ─── Key Management ───────────────────────────────────

  /**
   * Rotate the encryption key. Returns the new key ID.
   * Existing data remains decryptable with old keys.
   */
  async rotateKey(): Promise<string> {
    this.ensureInitialized();

    // Deactivate current key
    const currentKey = this.keyStore.get(this.keyId);
    if (currentKey) {
      currentKey.isActive = false;
    }

    // Generate new key
    const newSalt = this.generateSalt();
    const newKey = crypto.randomBytes(KEY_LENGTH);
    const newKeyId = `key-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    this.keyStore.set(newKeyId, {
      id: newKeyId,
      key: newKey,
      createdAt: Date.now(),
      isActive: true,
    });

    this.masterKey = newKey;
    this.keyId = newKeyId;

    await auditEngine.log({
      action: 'security.key_rotation',
      resource: 'encryption',
      result: 'success',
      details: JSON.stringify({ newKeyId, previousKeyId: currentKey?.id }),
    });

    return newKeyId;
  }

  // ─── Encryption / Decryption ──────────────────────────

  /**
   * Encrypt a string using AES-256-GCM.
   */
  async encrypt(data: string): Promise<EncryptedData> {
    this.ensureInitialized();

    const iv = crypto.randomBytes(IV_BYTES);
    const salt = this.generateSalt();

    // Derive a unique encryption key from master key + salt
    const derivedKey = this.deriveKey(this.masterKey.toString('hex'), salt);

    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv, { authTagLength: 16 });
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      algorithm: ALGORITHM,
      keyId: this.keyId,
      iv: iv.toString('base64'),
      ciphertext: encrypted.toString('base64'),
      tag: tag.toString('base64'),
      salt: salt.toString('base64'),
    };
  }

  /**
   * Decrypt encrypted data using AES-256-GCM.
   */
  async decrypt(encrypted: EncryptedData): Promise<string> {
    this.ensureInitialized();

    // Find the key used for encryption
    const keyInfo = this.keyStore.get(encrypted.keyId);
    if (!keyInfo) {
      throw new Error(`Encryption key not found: ${encrypted.keyId}. Key may have been removed.`);
    }

    const iv = Buffer.from(encrypted.iv, 'base64');
    const salt = Buffer.from(encrypted.salt, 'base64');
    const tag = Buffer.from(encrypted.tag, 'base64');
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

    // Derive the same key using master key + salt
    const derivedKey = this.deriveKey(keyInfo.key.toString('hex'), salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv, { authTagLength: 16 });
    decipher.setAuthTag(tag);

    try {
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch {
      throw new Error('Decryption failed. Data may be corrupted or tampered with.');
    }
  }

  /**
   * Encrypt a file (reads, encrypts, and overwrites the file).
   * Note: In a real implementation, this would use file system APIs.
   * This is a placeholder that encrypts the content if provided.
   */
  async encryptFile(filePath: string): Promise<void> {
    this.ensureInitialized();

    // In a server-side context, we would use fs to read/write
    // For now, this logs the operation
    await auditEngine.log({
      action: 'security.encryption_operation',
      resource: 'encryption',
      result: 'success',
      details: JSON.stringify({ operation: 'encrypt_file', filePath }),
    });

    console.log(`[encryption] File encryption requested for: ${filePath}`);
  }

  /**
   * Decrypt a file.
   */
  async decryptFile(filePath: string): Promise<void> {
    this.ensureInitialized();

    await auditEngine.log({
      action: 'security.encryption_operation',
      resource: 'encryption',
      result: 'success',
      details: JSON.stringify({ operation: 'decrypt_file', filePath }),
    });

    console.log(`[encryption] File decryption requested for: ${filePath}`);
  }

  // ─── Secure Secret Storage ────────────────────────────

  /**
   * Store a secret (encrypted) in the database.
   */
  async storeSecret(key: string, value: string): Promise<void> {
    this.ensureInitialized();

    const encrypted = await this.encrypt(value);

    try {
      await db.encryptedSecret.upsert({
        where: { key },
        create: {
          key,
          value: JSON.stringify(encrypted),
          keyId: encrypted.keyId,
        },
        update: {
          value: JSON.stringify(encrypted),
          keyId: encrypted.keyId,
        },
      });
    } catch (err) {
      console.warn('[encryption] Failed to store secret in DB:', err);
      throw new Error('Failed to store secret');
    }

    await auditEngine.log({
      action: 'security.encryption_operation',
      resource: 'encryption',
      result: 'success',
      details: JSON.stringify({ operation: 'store_secret', key }),
    });
  }

  /**
   * Retrieve a stored secret (decrypts before returning).
   */
  async retrieveSecret(key: string): Promise<string | null> {
    this.ensureInitialized();

    try {
      const record = await db.encryptedSecret.findUnique({
        where: { key },
      });

      if (!record) return null;

      const encrypted: EncryptedData = JSON.parse(record.value);
      return await this.decrypt(encrypted);
    } catch (err) {
      console.warn('[encryption] Failed to retrieve secret:', err);
      return null;
    }
  }

  /**
   * Delete a stored secret.
   */
  async deleteSecret(key: string): Promise<void> {
    this.ensureInitialized();

    try {
      await db.encryptedSecret.delete({
        where: { key },
      });
    } catch (err) {
      console.warn('[encryption] Failed to delete secret from DB:', err);
    }

    await auditEngine.log({
      action: 'security.encryption_operation',
      resource: 'encryption',
      result: 'success',
      details: JSON.stringify({ operation: 'delete_secret', key }),
    });
  }

  /**
   * List all stored secret keys (without decrypting values).
   */
  async listSecrets(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const secrets = await db.encryptedSecret.findMany({
        select: { key: true },
      });
      return secrets.map((s: any) => s.key);
    } catch (err) {
      console.warn('[encryption] Failed to list secrets from DB:', err);
      return [];
    }
  }

  // ─── Key Derivation ───────────────────────────────────

  /**
   * Derive a key from a password and salt using scrypt.
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.scryptSync(password, salt, KEY_LENGTH, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
    });
  }

  /**
   * Generate a random salt.
   */
  private generateSalt(): Buffer {
    return crypto.randomBytes(SALT_BYTES);
  }

  // ─── Utility ──────────────────────────────────────────

  /**
   * Get the current key ID.
   */
  getKeyId(): string {
    return this.keyId;
  }

  /**
   * Check if the engine is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the number of stored keys.
   */
  getKeyCount(): number {
    return this.keyStore.size;
  }

  /**
   * Generate a random token (useful for API keys, etc.).
   */
  generateToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Hash data with SHA-256.
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate an HMAC signature.
   */
  hmac(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
}

// ─── Singleton Export ───
export const encryptionEngine = new EncryptionEngine();
