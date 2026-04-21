/**
 * UserService - Admin User Management
 * 
 * Centralized business logic for:
 * - Authentication & Authorization
 * - User CRUD operations
 * - OTP management
 * - Profile updates
 * - User status & conditions
 * - Session management
 */

import { db } from "@workspace/db";
import {
  usersTable,
  adminAccountsTable,
  accountConditionsTable,
  userSessionsTable,
  refreshTokensTable,
  walletTransactionsTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { hashPassword, validatePasswordStrength, verifyAdminSecret } from "./password.js";
import { verifyTotpToken, generateTotpSecret, generateTotpQr } from "./totp.js";
import { canonicalizePhone } from "@workspace/phone-utils";
import { logger } from "../lib/logger.js";

export interface CreateUserInput {
  phone?: string;
  email?: string;
  name?: string;
  username?: string;
  role?: string;
  city?: string;
  area?: string;
  tempPassword?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  city?: string;
  area?: string;
  status?: string;
}

export interface AdminAccountInput {
  name: string;
  role: string;
  secret: string;
}

export class UserService {
  /**
   * Create a new user (for admin use)
   */
  static async createUser(input: CreateUserInput) {
    const trimPhone = input.phone?.trim() || null;
    const trimEmail = input.email?.trim().toLowerCase() || null;
    const trimName = input.name?.trim() || null;
    const trimUsername = input.username?.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || null;

    // Validate inputs
    if (!trimPhone && !trimName) {
      throw new Error("Either phone or name is required");
    }

    let canonPhone: string | null = null;
    if (trimPhone) {
      canonPhone = canonicalizePhone(trimPhone);
      if (!/^3\d{9}$/.test(canonPhone)) {
        throw new Error("Phone must be a valid Pakistani mobile number");
      }

      // Check uniqueness
      const [existing] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.phone, canonPhone))
        .limit(1);
      if (existing) {
        throw new Error("A user with this phone number already exists");
      }
    }

    if (trimEmail && !trimEmail.includes("@")) {
      throw new Error("Invalid email format");
    }

    if (trimEmail) {
      const [existing] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, trimEmail))
        .limit(1);
      if (existing) {
        throw new Error("A user with this email already exists");
      }
    }

    if (trimUsername && trimUsername.length < 3) {
      throw new Error("Username must be at least 3 characters");
    }

    if (trimUsername) {
      const [existing] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.username, trimUsername))
        .limit(1);
      if (existing) {
        throw new Error("This username is already taken");
      }
    }

    const validRoles = ["customer", "rider", "vendor"];
    const userRole = validRoles.includes(input.role || "") ? input.role : "customer";

    // Hash temporary password if provided
    let passwordHash = null;
    if (input.tempPassword) {
      const strengthCheck = validatePasswordStrength(input.tempPassword);
      if (!strengthCheck.isStrong) {
        throw new Error(`Weak password: ${strengthCheck.feedback.join(", ")}`);
      }
      passwordHash = await hashPassword(input.tempPassword);
    }

    const userId = generateId();
    const now = new Date();

    await db.insert(usersTable).values({
      id: userId,
      phone: canonPhone,
      email: trimEmail,
      name: trimName,
      username: trimUsername,
      roles: userRole,
      city: input.city || null,
      area: input.area || null,
      passwordHash: passwordHash || null,
      createdAt: now,
      updatedAt: now,
      kycStatus: "pending",
      status: "active",
    });

    logger.info({ userId, phone: canonPhone }, "[UserService] User created");

    return { userId };
  }

  /**
   * Update user profile
   */
  static async updateUser(userId: string, input: UpdateUserInput) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (input.name !== undefined) {
      updates.name = input.name.trim() || null;
    }
    if (input.email !== undefined) {
      const trimEmail = input.email.trim().toLowerCase();
      if (trimEmail && !trimEmail.includes("@")) {
        throw new Error("Invalid email format");
      }
      updates.email = trimEmail || null;
    }
    if (input.city !== undefined) {
      updates.city = input.city.trim() || null;
    }
    if (input.area !== undefined) {
      updates.area = input.area.trim() || null;
    }

    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));

    logger.info({ userId, updates }, "[UserService] User updated");

    return { success: true };
  }

  /**
   * Set user status (active/suspended/banned)
   */
  static async setUserStatus(userId: string, status: "active" | "suspended" | "banned") {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    await db.update(usersTable).set({ status, updatedAt: new Date() }).where(eq(usersTable.id, userId));

    logger.info({ userId, status }, "[UserService] User status changed");

    return { success: true };
  }

  /**
   * Approve pending user (KYC)
   */
  static async approveUser(userId: string) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    await db
      .update(usersTable)
      .set({ kycStatus: "approved", status: "active", updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    logger.info({ userId }, "[UserService] User approved");

    return { success: true };
  }

  /**
   * Reject pending user
   */
  static async rejectUser(userId: string, reason: string) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    await db
      .update(usersTable)
      .set({
        kycStatus: "rejected",
        status: "suspended",
        kycRejectReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId));

    logger.info({ userId, reason }, "[UserService] User rejected");

    return { success: true };
  }

  /**
   * Delete user (admin action)
   */
  static async deleteUser(userId: string) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    // Soft delete by setting status
    await db.update(usersTable).set({ status: "deleted", updatedAt: new Date() }).where(eq(usersTable.id, userId));

    // Revoke all sessions
    await db.delete(userSessionsTable).where(eq(userSessionsTable.userId, userId));

    logger.info({ userId }, "[UserService] User deleted");

    return { success: true };
  }

  /**
   * Create admin sub-account
   */
  static async createAdminAccount(input: AdminAccountInput) {
    if (input.name.trim().length < 3) {
      throw new Error("Admin name must be at least 3 characters");
    }

    if (input.secret.length < 8) {
      throw new Error("Admin secret must be at least 8 characters");
    }

    const passwordHash = await hashPassword(input.secret);

    const adminId = generateId();

    await db.insert(adminAccountsTable).values({
      id: adminId,
      name: input.name.trim(),
      role: input.role || "viewer",
      totpEnabled: false,
      totpSecret: null,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    });

    logger.info({ adminId, name: input.name, role: input.role }, "[UserService] Admin account created");

    return { adminId };
  }

  /**
   * Get OTP bypass status for user
   */
  static async getOtpBypassStatus(userId: string) {
    const [user] = await db
      .select({
        otpBypassUntil: usersTable.otpBypassUntil,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    const now = new Date();
    const isBypassed = user.otpBypassUntil && user.otpBypassUntil > now;

    return {
      isBypassed,
      bypassUntil: user.otpBypassUntil,
    };
  }

  /**
   * Set OTP bypass for user
   */
  static async setOtpBypass(userId: string, bypassMinutes: number) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    const bypassUntil = new Date(Date.now() + bypassMinutes * 60 * 1000);

    await db
      .update(usersTable)
      .set({ otpBypassUntil: bypassUntil, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    logger.info({ userId, bypassMinutes }, "[UserService] OTP bypass set");

    return { success: true, bypassUntil };
  }

  /**
   * Clear OTP bypass for user
   */
  static async clearOtpBypass(userId: string) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    await db
      .update(usersTable)
      .set({ otpBypassUntil: null, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    logger.info({ userId }, "[UserService] OTP bypass cleared");

    return { success: true };
  }
}
