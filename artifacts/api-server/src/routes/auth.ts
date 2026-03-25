import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../lib/id.js";

const router: IRouter = Router();

router.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ error: "Phone number is required" });
    return;
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (existing.length > 0) {
    await db.update(usersTable).set({ otpCode: otp, otpExpiry }).where(eq(usersTable.phone, phone));
  } else {
    await db.insert(usersTable).values({
      id: generateId(),
      phone,
      otpCode: otp,
      otpExpiry,
      role: "customer",
      walletBalance: "0",
      isActive: true,
    });
  }
  req.log.info({ phone, otp }, "OTP sent");
  res.json({ message: "OTP sent successfully", otp });
});

router.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    res.status(400).json({ error: "Phone and OTP are required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.otpCode !== otp) {
    res.status(401).json({ error: "Invalid OTP" });
    return;
  }
  if (user.otpExpiry && new Date() > user.otpExpiry) {
    res.status(401).json({ error: "OTP expired" });
    return;
  }
  await db.update(usersTable).set({ otpCode: null, otpExpiry: null }).where(eq(usersTable.phone, phone));
  const token = Buffer.from(`${user.id}:${phone}:${Date.now()}`).toString("base64");
  res.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      walletBalance: parseFloat(user.walletBalance ?? "0"),
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

export default router;
