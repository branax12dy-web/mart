import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, accountConditionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../../lib/id.js";

const router = Router();

export async function reconcileUserFlags(userId: string): Promise<{ success: boolean; conditions?: number; error?: string }> {
  try {
    const conditions = await db
      .select()
      .from(accountConditionsTable)
      .where(eq(accountConditionsTable.userId, userId));
    return { success: true, conditions: conditions.length };
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
    const { userId, userRole, conditionType, severity, category, reason, notes, appliedBy, isActive } = req.body;
    const [newCond] = await db.insert(accountConditionsTable).values({
      id: generateId(),
      userId,
      userRole,
      conditionType,
      severity,
      category: category ?? severity,
      reason: reason ?? "Applied by admin",
      notes: notes ?? null,
      appliedBy: appliedBy ?? null,
      isActive: isActive ?? true,
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
  return;
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
