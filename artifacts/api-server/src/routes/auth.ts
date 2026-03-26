import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../lib/id.js";

const router: IRouter = Router();

/* ─────────────────────────────────────────────────────────────
   POST /auth/send-otp
   Atomically upsert user by phone — one account per number.
───────────────────────────────────────────────────────────── */
router.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ error: "Phone number is required" });
    return;
  }

  const otp      = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  /* Atomic upsert — prevents duplicate accounts even under concurrent
     requests because the DB unique constraint on phone is the final
     authority.  If a row with this phone already exists, we ONLY update
     the OTP fields; we never touch role, wallet, or any other data. */
  await db
    .insert(usersTable)
    .values({
      id:            generateId(),
      phone,
      otpCode:       otp,
      otpExpiry,
      role:          "customer",
      roles:         "customer",
      walletBalance: "0",
      isActive:      true,
    })
    .onConflictDoUpdate({
      target: usersTable.phone,
      set: {
        otpCode:   otp,
        otpExpiry,
        updatedAt: new Date(),
      },
    });

  req.log.info({ phone, otp }, "OTP sent");

  // In development the OTP is returned so testers can log in without SMS.
  res.json({ message: "OTP sent successfully", otp });
});

/* ─────────────────────────────────────────────────────────────
   POST /auth/verify-otp
   Validates the OTP and returns a session token.
───────────────────────────────────────────────────────────── */
router.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    res.status(400).json({ error: "Phone and OTP are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found. Please request a new OTP." });
    return;
  }

  /* OTP code check */
  if (user.otpCode !== otp) {
    res.status(401).json({ error: "Invalid OTP. Please check and try again." });
    return;
  }

  /* OTP expiry check */
  if (user.otpExpiry && new Date() > user.otpExpiry) {
    res.status(401).json({ error: "OTP expired. Please request a new one." });
    return;
  }

  /* Clear OTP + update last login timestamp */
  await db
    .update(usersTable)
    .set({ otpCode: null, otpExpiry: null, lastLoginAt: new Date() })
    .where(eq(usersTable.phone, phone));

  const token = Buffer.from(`${user.id}:${phone}:${Date.now()}`).toString("base64");

  res.json({
    token,
    user: {
      id:            user.id,
      phone:         user.phone,
      name:          user.name,
      email:         user.email,
      role:          user.role,
      roles:         user.roles,
      avatar:        user.avatar,
      walletBalance: parseFloat(user.walletBalance ?? "0"),
      isActive:      user.isActive,
      cnic:          user.cnic,
      city:          user.city,
      createdAt:     user.createdAt.toISOString(),
    },
  });
});

export default router;
