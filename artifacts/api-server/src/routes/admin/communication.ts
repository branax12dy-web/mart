import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  conversationsTable,
  chatMessagesTable,
  callLogsTable,
  communicationRolesTable,
  communicationFlagsTable,
  aiModerationLogsTable,
  platformSettingsTable,
} from "@workspace/db/schema";
import { eq, desc, sql, and, count, gte, like, or } from "drizzle-orm";
import { generateId } from "../../lib/id.js";
import { generateRoleTemplate } from "../../services/communicationAI.js";
import { logger } from "../../lib/logger.js";

const router = Router();

router.get("/communication/dashboard", async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [convCount] = await db.select({ count: count() }).from(conversationsTable).where(eq(conversationsTable.status, "active"));
    const [msgCount] = await db.select({ count: count() }).from(chatMessagesTable).where(gte(chatMessagesTable.createdAt, today));
    const [callCount] = await db.select({ count: count() }).from(callLogsTable).where(gte(callLogsTable.startedAt, today));
    const [flagCount] = await db.select({ count: count() }).from(communicationFlagsTable).where(sql`${communicationFlagsTable.resolvedAt} IS NULL`);
    const [aiCount] = await db.select({ count: count() }).from(aiModerationLogsTable).where(gte(aiModerationLogsTable.createdAt, today));
    const [voiceNoteCount] = await db.select({ count: count() }).from(chatMessagesTable).where(and(gte(chatMessagesTable.createdAt, today), eq(chatMessagesTable.messageType, "voice_note")));

    res.json({
      data: {
        activeConversations: Number(convCount?.count ?? 0),
        messagesToday: Number(msgCount?.count ?? 0),
        callsToday: Number(callCount?.count ?? 0),
        voiceNotesToday: Number(voiceNoteCount?.count ?? 0),
        flaggedMessages: Number(flagCount?.count ?? 0),
        aiUsageToday: Number(aiCount?.count ?? 0),
      },
    });
  } catch (e) {
    logger.error({ err: e }, "[admin/comm] Dashboard query failed");
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

router.get("/communication/conversations", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || "1", 10);
    const limit = Math.min(parseInt(req.query.limit as string || "20", 10), 50);
    const offset = (page - 1) * limit;
    const search = req.query.search as string || "";

    let conversations;
    if (search) {
      const searchUsers = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(or(like(usersTable.ajkId, `%${search}%`), like(usersTable.name, `%${search}%`)))
        .limit(20);
      const userIds = searchUsers.map(u => u.id);

      if (userIds.length === 0) {
        return res.json({ data: [], total: 0 });
      }

      conversations = await db
        .select()
        .from(conversationsTable)
        .where(or(
          sql`${conversationsTable.participant1Id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::text[])`,
          sql`${conversationsTable.participant2Id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::text[])`,
        ))
        .orderBy(desc(conversationsTable.lastMessageAt))
        .limit(limit)
        .offset(offset);
    } else {
      conversations = await db
        .select()
        .from(conversationsTable)
        .orderBy(desc(conversationsTable.lastMessageAt))
        .limit(limit)
        .offset(offset);
    }

    const allUserIds = [...new Set(conversations.flatMap(c => [c.participant1Id, c.participant2Id]))];
    const users = allUserIds.length > 0
      ? await db
          .select({ id: usersTable.id, name: usersTable.name, roles: usersTable.roles, ajkId: usersTable.ajkId })
          .from(usersTable)
          .where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(allUserIds.map(id => sql`${id}`), sql`, `)}]::text[])`)
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const [totalCount] = await db.select({ count: count() }).from(conversationsTable);

    res.json({
      data: conversations.map(c => ({
        ...c,
        participant1: userMap[c.participant1Id] || null,
        participant2: userMap[c.participant2Id] || null,
      })),
      total: Number(totalCount?.count ?? 0),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.get("/communication/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string || "1", 10);
    const limit = Math.min(parseInt(req.query.limit as string || "50", 10), 100);
    const offset = (page - 1) * limit;

    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.conversationId, id))
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(limit)
      .offset(offset);

    const senderIds = [...new Set(messages.map(m => m.senderId))];
    const users = senderIds.length > 0
      ? await db
          .select({ id: usersTable.id, name: usersTable.name, ajkId: usersTable.ajkId })
          .from(usersTable)
          .where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(senderIds.map(id => sql`${id}`), sql`, `)}]::text[])`)
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    res.json({
      data: messages.reverse().map(m => ({
        ...m,
        content: m.originalContent || m.content,
        maskedContent: m.content,
        sender: userMap[m.senderId] || null,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to get messages" });
  }
});

router.get("/communication/calls", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || "1", 10);
    const limit = Math.min(parseInt(req.query.limit as string || "20", 10), 50);
    const offset = (page - 1) * limit;

    const calls = await db
      .select()
      .from(callLogsTable)
      .orderBy(desc(callLogsTable.startedAt))
      .limit(limit)
      .offset(offset);

    const userIds = [...new Set(calls.flatMap(c => [c.callerId, c.calleeId]))];
    const users = userIds.length > 0
      ? await db
          .select({ id: usersTable.id, name: usersTable.name, ajkId: usersTable.ajkId, roles: usersTable.roles })
          .from(usersTable)
          .where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::text[])`)
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const [totalCount] = await db.select({ count: count() }).from(callLogsTable);

    res.json({
      data: calls.map(c => ({
        ...c,
        caller: userMap[c.callerId] || null,
        callee: userMap[c.calleeId] || null,
      })),
      total: Number(totalCount?.count ?? 0),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to list calls" });
  }
});

router.get("/communication/ai-logs", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || "1", 10);
    const limit = Math.min(parseInt(req.query.limit as string || "20", 10), 50);
    const offset = (page - 1) * limit;

    const logs = await db
      .select()
      .from(aiModerationLogsTable)
      .orderBy(desc(aiModerationLogsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const userIds = [...new Set(logs.map(l => l.userId))];
    const users = userIds.length > 0
      ? await db
          .select({ id: usersTable.id, name: usersTable.name, ajkId: usersTable.ajkId })
          .from(usersTable)
          .where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::text[])`)
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const [totalCount] = await db.select({ count: count() }).from(aiModerationLogsTable);

    res.json({
      data: logs.map(l => ({
        ...l,
        user: userMap[l.userId] || null,
      })),
      total: Number(totalCount?.count ?? 0),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to list AI logs" });
  }
});

router.get("/communication/flags", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || "1", 10);
    const limit = Math.min(parseInt(req.query.limit as string || "20", 10), 50);
    const offset = (page - 1) * limit;
    const status = req.query.status as string || "pending";

    const condition = status === "resolved"
      ? sql`${communicationFlagsTable.resolvedAt} IS NOT NULL`
      : sql`${communicationFlagsTable.resolvedAt} IS NULL`;

    const flags = await db
      .select()
      .from(communicationFlagsTable)
      .where(condition)
      .orderBy(desc(communicationFlagsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const messageIds = flags.map(f => f.messageId).filter(Boolean) as string[];
    let messages: any[] = [];
    if (messageIds.length > 0) {
      messages = await db
        .select()
        .from(chatMessagesTable)
        .where(sql`${chatMessagesTable.id} = ANY(ARRAY[${sql.join(messageIds.map(id => sql`${id}`), sql`, `)}]::text[])`);
    }
    const msgMap = Object.fromEntries(messages.map(m => [m.id, m]));

    res.json({
      data: flags.map(f => ({
        ...f,
        message: f.messageId ? msgMap[f.messageId] || null : null,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to list flags" });
  }
});

router.patch("/communication/flags/:id/resolve", async (req: any, res) => {
  try {
    const { id } = req.params;
    await db.update(communicationFlagsTable).set({
      resolvedAt: new Date(),
      reviewedByAdminId: req.adminPayload?.adminId || "admin",
    }).where(eq(communicationFlagsTable.id, id));
    res.json({ data: { status: "resolved" } });
  } catch (e) {
    res.status(500).json({ error: "Failed to resolve flag" });
  }
});

router.get("/communication/roles", async (_req, res) => {
  try {
    const roles = await db.select().from(communicationRolesTable).orderBy(desc(communicationRolesTable.createdAt));
    res.json({ data: roles });
  } catch (e) {
    res.status(500).json({ error: "Failed to list roles" });
  }
});

router.post("/communication/roles", async (req, res) => {
  try {
    const { name, description, permissions, rolePairRules, categoryRules, timeWindows, messageLimits, isPreset } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const id = generateId();
    await db.insert(communicationRolesTable).values({
      id,
      name,
      description: description || null,
      permissions: permissions || null,
      rolePairRules: rolePairRules || null,
      categoryRules: categoryRules || null,
      timeWindows: timeWindows || null,
      messageLimits: messageLimits || null,
      isPreset: isPreset || false,
    });

    res.status(201).json({ data: { id } });
  } catch (e) {
    res.status(500).json({ error: "Failed to create role" });
  }
});

router.put("/communication/roles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, rolePairRules, categoryRules, timeWindows, messageLimits } = req.body;

    await db.update(communicationRolesTable).set({
      name,
      description,
      permissions,
      rolePairRules,
      categoryRules,
      timeWindows,
      messageLimits,
      updatedAt: new Date(),
    }).where(eq(communicationRolesTable.id, id));

    res.json({ data: { status: "updated" } });
  } catch (e) {
    res.status(500).json({ error: "Failed to update role" });
  }
});

router.delete("/communication/roles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(communicationRolesTable).where(eq(communicationRolesTable.id, id));
    res.json({ data: { status: "deleted" } });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete role" });
  }
});

router.post("/communication/roles/ai-generate", async (req: any, res) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: "Description is required" });

    const adminId = req.adminPayload?.adminId || "admin";
    const template = await generateRoleTemplate(description, adminId);
    res.json({ data: template });
  } catch (e) {
    res.status(500).json({ error: "Failed to generate role template" });
  }
});

router.post("/communication/users/:id/block", async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(usersTable).set({ commBlocked: true, updatedAt: new Date() }).where(eq(usersTable.id, id));
    res.json({ data: { status: "blocked" } });
  } catch (e) {
    res.status(500).json({ error: "Failed to block user" });
  }
});

router.post("/communication/users/:id/unblock", async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(usersTable).set({ commBlocked: false, updatedAt: new Date() }).where(eq(usersTable.id, id));
    res.json({ data: { status: "unblocked" } });
  } catch (e) {
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

router.get("/communication/settings", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(platformSettingsTable)
      .where(like(platformSettingsTable.category, "communication"));
    res.json({ data: Object.fromEntries(rows.map(r => [r.key, r.value])) });
  } catch (e) {
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.put("/communication/settings", async (req, res) => {
  try {
    const settings = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(settings)) {
      await db.insert(platformSettingsTable).values({
        key,
        value: String(value),
        label: key.replace(/^comm_/, "").replace(/_/g, " "),
        category: "communication",
      }).onConflictDoUpdate({
        target: platformSettingsTable.key,
        set: { value: String(value), updatedAt: new Date() },
      });
    }
    res.json({ data: { status: "updated" } });
  } catch (e) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

router.get("/communication/ajk-ids", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || "1", 10);
    const limit = Math.min(parseInt(req.query.limit as string || "20", 10), 50);
    const offset = (page - 1) * limit;
    const search = req.query.search as string || "";
    const role = req.query.role as string || "";

    let condition = sql`${usersTable.ajkId} IS NOT NULL`;
    if (search) {
      condition = sql`(${usersTable.ajkId} ILIKE ${"%" + search + "%"} OR ${usersTable.name} ILIKE ${"%" + search + "%"} OR ${usersTable.phone} ILIKE ${"%" + search + "%"})`;
    }

    let users;
    if (role) {
      users = await db.select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, roles: usersTable.roles, ajkId: usersTable.ajkId, commBlocked: usersTable.commBlocked }).from(usersTable).where(and(condition, sql`${usersTable.roles}::text ILIKE ${"%" + role + "%"}`)).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);
    } else {
      users = await db.select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, roles: usersTable.roles, ajkId: usersTable.ajkId, commBlocked: usersTable.commBlocked }).from(usersTable).where(condition).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);
    }

    const [total] = await db.select({ count: count() }).from(usersTable).where(sql`${usersTable.ajkId} IS NOT NULL`);

    res.json({ data: users, total: Number(total?.count ?? 0) });
  } catch (e) {
    logger.error({ err: e }, "[admin/comm] AJK IDs query failed");
    res.status(500).json({ error: "Failed to list AJK IDs" });
  }
});

router.put("/communication/ajk-ids/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { ajkId } = req.body;
    if (!ajkId || typeof ajkId !== "string") return res.status(400).json({ error: "ajkId is required" });

    const cleaned = ajkId.trim().toUpperCase();
    if (cleaned.length < 3 || cleaned.length > 20) return res.status(400).json({ error: "AJK ID must be 3-20 characters" });
    if (!/^[A-Z0-9\-]+$/.test(cleaned)) return res.status(400).json({ error: "AJK ID can only contain letters, numbers, and hyphens" });

    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(and(eq(usersTable.ajkId, cleaned), sql`${usersTable.id} != ${userId}`)).limit(1);
    if (existing) return res.status(409).json({ error: "This AJK ID is already taken by another user" });

    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    await db.update(usersTable).set({ ajkId: cleaned, updatedAt: new Date() }).where(eq(usersTable.id, userId));
    res.json({ data: { ajkId: cleaned } });
  } catch (e) {
    logger.error({ err: e }, "[admin/comm] AJK ID update failed");
    res.status(500).json({ error: "Failed to update AJK ID" });
  }
});

router.get("/communication/users/search", async (req, res) => {
  try {
    const q = req.query.q as string || "";
    if (q.length < 2) return res.json({ data: [] });

    const users = await db
      .select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, roles: usersTable.roles, ajkId: usersTable.ajkId })
      .from(usersTable)
      .where(or(
        sql`${usersTable.name} ILIKE ${"%" + q + "%"}`,
        sql`${usersTable.phone} ILIKE ${"%" + q + "%"}`,
        sql`${usersTable.ajkId} ILIKE ${"%" + q + "%"}`,
      ))
      .limit(20);

    res.json({ data: users });
  } catch (e) {
    res.status(500).json({ error: "Failed to search users" });
  }
});

router.get("/communication/export/:type", async (req, res) => {
  try {
    const { type } = req.params;
    let rows: any[] = [];

    if (type === "messages") {
      rows = await db.select().from(chatMessagesTable).orderBy(desc(chatMessagesTable.createdAt)).limit(1000);
    } else if (type === "calls") {
      rows = await db.select().from(callLogsTable).orderBy(desc(callLogsTable.startedAt)).limit(1000);
    } else if (type === "ai-logs") {
      rows = await db.select().from(aiModerationLogsTable).orderBy(desc(aiModerationLogsTable.createdAt)).limit(1000);
    }

    if (rows.length === 0) return res.json({ data: [] });

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map(r => headers.map(h => {
        const val = (r as any)[h];
        if (val === null || val === undefined) return "";
        const str = String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(",")),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=communication_${type}_${Date.now()}.csv`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: "Failed to export data" });
  }
});

export default router;
