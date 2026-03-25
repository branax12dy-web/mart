import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, walletTransactionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../lib/id.js";

const router: IRouter = Router();

router.get("/", async (req, res) => {
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
  const transactions = await db.select().from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.userId, userId))
    .orderBy(walletTransactionsTable.createdAt);
  res.json({
    balance: parseFloat(user.walletBalance ?? "0"),
    transactions: transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: parseFloat(t.amount),
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

router.post("/topup", async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount) {
    res.status(400).json({ error: "userId and amount required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const newBalance = (parseFloat(user.walletBalance ?? "0") + parseFloat(amount)).toString();
  await db.update(usersTable).set({ walletBalance: newBalance }).where(eq(usersTable.id, userId));
  await db.insert(walletTransactionsTable).values({
    id: generateId(),
    userId,
    type: "credit",
    amount: amount.toString(),
    description: "Wallet top-up",
  });
  const transactions = await db.select().from(walletTransactionsTable).where(eq(walletTransactionsTable.userId, userId));
  res.json({
    balance: parseFloat(newBalance),
    transactions: transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: parseFloat(t.amount),
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

export default router;
