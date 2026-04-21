import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, accountConditionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

export async function reconcileUserFlags(userId: string) {
  try {
    const conditions = await db.select().from(accountConditionsTable).where(eq(accountConditionsTable.isActive, true));
    const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user.length) throw new Error("User not found");
    
    let currentFlags = user[0].flags || {};
    
    for (const cond of conditions) {
      switch (cond.ruleType) {
        case "kyc_required":
          if (!user[0].kycVerified) currentFlags.kycRequired = true;
          else delete currentFlags.kycRequired;
          break;
        case "wallet_limit":
          if (cond.value && user[0].walletBalance > Number(cond.value)) {
            currentFlags.walletLimitExceeded = true;
          } else {
            delete currentFlags.walletLimitExceeded;
          }
          break;
        case "suspended":
          if (cond.isActive && user[0].status === "active") {
            currentFlags.suspended = true;
          } else {
            delete currentFlags.suspended;
          }
          break;
        default:
          if (cond.ruleFunction) {
            currentFlags[cond.ruleType] = cond.isActive;
          }
      }
    }
    
    await db.update(usersTable).set({ flags: currentFlags, updatedAt: new Date() }).where(eq(usersTable.id, userId));
    return { success: true, flags: currentFlags };
  } catch (err) {
    console.error("reconcileUserFlags error:", err);
    return { success: false, error: String(err) };
  }
}

router.get("/", async (req, res) => {
  try {
    const conditions = await db.select().from(accountConditionsTable);
    res.json({ success: true, data: conditions });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.post("/", async (req, res) => {
  try {
    const { ruleType, value, isActive, ruleFunction } = req.body;
    const [newCond] = await db.insert(accountConditionsTable).values({
      ruleType,
      value: value ? String(value) : null,
      isActive: isActive ?? true,
      ruleFunction: ruleFunction || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    res.json({ success: true, data: newCond });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const [updated] = await db.update(accountConditionsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(accountConditionsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ success: false, error: "Condition not found" });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await db.delete(accountConditionsTable).where(eq(accountConditionsTable.id, id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
