import { db } from "@workspace/db";
import { platformSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function isDemoMode(): Promise<boolean> {
  try {
    const setting = await db.select().from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "demo_mode_enabled"))
      .limit(1);
    return setting.length > 0 ? setting[0].value === "true" : false;
  } catch {
    return false;
  }
}

export async function getDemoSnapshot() {
  const demoEnabled = await isDemoMode();
  if (!demoEnabled) {
    return { isDemoMode: false, snapshot: null };
  }
  
  const snapshot = {
    walletBalance: 12500.75,
    totalOrders: 42,
    totalRides: 18,
    recentTransactions: [
      { id: "txn_1", amount: 500, type: "credit", description: "Demo topup", createdAt: new Date() },
      { id: "txn_2", amount: 250, type: "debit", description: "Demo purchase", createdAt: new Date() },
    ],
    demoExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
  
  return { isDemoMode: true, snapshot };
}

export async function setDemoMode(enabled: boolean) {
  try {
    const existing = await db.select().from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "demo_mode_enabled"))
      .limit(1);
    
    if (existing.length) {
      await db.update(platformSettingsTable)
        .set({ value: enabled ? "true" : "false", updatedAt: new Date() })
        .where(eq(platformSettingsTable.key, "demo_mode_enabled"));
    } else {
      await db.insert(platformSettingsTable).values({
        key: "demo_mode_enabled",
        value: enabled ? "true" : "false",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return { success: true };
  } catch (err) {
    console.error("setDemoMode error:", err);
    return { success: false, error: String(err) };
  }
}
