import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/profile", async (req, res) => {
  const userId = req.query["userId"] as string;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    phone: user.phone,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    walletBalance: parseFloat(user.walletBalance ?? "0"),
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/profile", async (req, res) => {
  const { userId, name, email, avatar } = req.body;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  await db.update(usersTable).set({ name, email, avatar, updatedAt: new Date() }).where(eq(usersTable.id, userId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    phone: user.phone,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    walletBalance: parseFloat(user.walletBalance ?? "0"),
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
