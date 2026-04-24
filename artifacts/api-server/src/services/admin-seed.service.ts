/**
 * admin-seed.service.ts — first-boot super-admin seeding.
 *
 * Behaviour:
 *  - On every startup we check whether **any** admin account exists. If
 *    one or more rows are present, we do nothing (idempotent).
 *  - If the `admin_accounts` table is empty we provision a default
 *    super-admin with `must_change_password = true`, an `email` taken
 *    from `ADMIN_SEED_EMAIL` (default `admin@ajkmart.local`), and a
 *    bcrypt'd password from `ADMIN_SEED_PASSWORD` (defaults to a randomly
 *    generated string that we log loudly so the operator can capture it).
 *  - The seeded admin is granted the built-in `super_admin` RBAC role so
 *    `/api/admin/system/rbac/*` and every permission gate works out of
 *    the box.
 *
 * The seed is best-effort: failure logs an error and does not crash boot.
 */
import { db } from "@workspace/db";
import {
  adminAccountsTable,
  rolesTable,
  adminRoleAssignmentsTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { hashAdminSecret } from "./password.js";
import { generateId } from "../lib/id.js";

const SUPER_ADMIN_SLUG = "super_admin";
const DEFAULT_SEED_EMAIL = "admin@ajkmart.local";
const DEFAULT_SEED_USERNAME = "admin";
const DEFAULT_SEED_NAME = "Super Admin";

export interface SeedResult {
  /** True if a new admin was created on this boot. */
  created: boolean;
  /** Email of the seeded admin (for log surface). */
  email?: string;
  /** Generated password — only present when ADMIN_SEED_PASSWORD was unset. */
  generatedPassword?: string;
}

function generateRandomPassword(): string {
  // 16 bytes → 22 url-safe chars, more than strong enough for a one-shot
  // bootstrap secret that the operator must rotate on first login.
  return randomBytes(16)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, 20);
}

/**
 * Seed the default super-admin if and only if no admin accounts exist.
 * Idempotent — safe to call on every boot.
 */
export async function seedDefaultSuperAdmin(): Promise<SeedResult> {
  const existing = await db
    .select({ id: adminAccountsTable.id })
    .from(adminAccountsTable)
    .limit(1);

  if (existing.length > 0) {
    return { created: false };
  }

  const email = (process.env.ADMIN_SEED_EMAIL ?? DEFAULT_SEED_EMAIL).trim();
  const username = (process.env.ADMIN_SEED_USERNAME ?? DEFAULT_SEED_USERNAME).trim();
  const name = (process.env.ADMIN_SEED_NAME ?? DEFAULT_SEED_NAME).trim();

  let plainPassword = process.env.ADMIN_SEED_PASSWORD?.trim();
  let generated = false;
  if (!plainPassword) {
    plainPassword = generateRandomPassword();
    generated = true;
  }

  const id = `admin_${generateId()}`;
  const secret = hashAdminSecret(plainPassword);

  await db.insert(adminAccountsTable).values({
    id,
    name,
    username,
    email,
    secret,
    role: "super",
    permissions: "",
    isActive: true,
    mustChangePassword: true,
  });

  // Grant the super_admin RBAC role so the new admin has full permissions
  // even without relying on the legacy `role = 'super'` short-circuit.
  try {
    const [superRole] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.slug, SUPER_ADMIN_SLUG))
      .limit(1);

    if (superRole) {
      await db
        .insert(adminRoleAssignmentsTable)
        .values({ adminId: id, roleId: superRole.id, grantedBy: "system" })
        .onConflictDoNothing();
    } else {
      console.warn(
        "[admin-seed] super_admin role not found — RBAC seed must run before admin seed for the new admin to receive role assignment",
      );
    }
  } catch (err) {
    console.error("[admin-seed] failed to assign super_admin role:", err);
  }

  // Loudly log the generated password (only when we generated it) so the
  // operator can capture it from boot logs. This is intentionally on the
  // first boot only — subsequent boots are no-ops.
  console.log("==================================================================");
  console.log("[admin-seed] default super-admin created");
  console.log(`[admin-seed]   email:    ${email}`);
  console.log(`[admin-seed]   username: ${username}`);
  if (generated) {
    console.log(`[admin-seed]   password: ${plainPassword}`);
    console.log("[admin-seed] ⚠  This password was randomly generated. The admin");
    console.log("[admin-seed]    will be forced to change it on first login.");
  } else {
    console.log("[admin-seed]   password: (from ADMIN_SEED_PASSWORD env)");
    console.log("[admin-seed] ⚠  The admin will be forced to change it on first login.");
  }
  console.log("==================================================================");

  return {
    created: true,
    email,
    ...(generated ? { generatedPassword: plainPassword } : {}),
  };
}
