import { Router } from "express";
import { db } from "@workspace/db";
import {
  popupCampaignsTable,
  popupImpressionsTable,
  popupTemplatesTable,
} from "@workspace/db/schema";
import { eq, desc, count, and, sql, gte, lte, or, isNull } from "drizzle-orm";
import {
  generateId, adminAuth, logger,
  type AdminRequest,
} from "../admin-shared.js";
import { sendSuccess, sendCreated, sendNotFound, sendValidationError, sendForbidden } from "../../lib/response.js";

const router = Router();

const DEFAULT_TEMPLATES = [
  {
    id: "tpl_eid_sale",
    name: "Eid Sale",
    description: "Festive Eid sale promotion with vibrant colors",
    category: "seasonal",
    popupType: "modal",
    defaultTitle: "Eid Mubarak! 🌙 Up to 50% OFF",
    defaultBody: "Celebrate Eid with amazing deals on groceries, food, and more. Limited time only!",
    defaultCtaText: "Shop Now",
    colorFrom: "#7C3AED",
    colorTo: "#EC4899",
    textColor: "#FFFFFF",
    animation: "scale",
    stylePreset: "festive",
    isBuiltIn: true,
    isActive: true,
  },
  {
    id: "tpl_ramadan_special",
    name: "Ramadan Special",
    description: "Ramadan month special offers and deals",
    category: "seasonal",
    popupType: "modal",
    defaultTitle: "Ramadan Kareem! 🌙",
    defaultBody: "Special Ramadan offers all month long. Order Sehri & Iftar essentials with fast delivery.",
    defaultCtaText: "Order Now",
    colorFrom: "#1E3A5F",
    colorTo: "#2E7D32",
    textColor: "#FFD700",
    animation: "fade",
    stylePreset: "ramadan",
    isBuiltIn: true,
    isActive: true,
  },
  {
    id: "tpl_new_feature",
    name: "New Feature Launch",
    description: "Announce new app features to users",
    category: "product",
    popupType: "bottom_sheet",
    defaultTitle: "✨ New Feature Available",
    defaultBody: "We've added something exciting! Check out the latest improvements to your app experience.",
    defaultCtaText: "Explore Now",
    colorFrom: "#0EA5E9",
    colorTo: "#6366F1",
    textColor: "#FFFFFF",
    animation: "slide_up",
    stylePreset: "feature",
    isBuiltIn: true,
    isActive: true,
  },
  {
    id: "tpl_flash_deal",
    name: "Flash Deal Alert",
    description: "Urgent flash deal countdown notification",
    category: "promotional",
    popupType: "floating_card",
    defaultTitle: "⚡ Flash Deal - Ends Soon!",
    defaultBody: "Grab this limited-time deal before it expires. Huge discounts for the next 2 hours only!",
    defaultCtaText: "Grab Deal",
    colorFrom: "#F59E0B",
    colorTo: "#EF4444",
    textColor: "#FFFFFF",
    animation: "bounce",
    stylePreset: "urgent",
    isBuiltIn: true,
    isActive: true,
  },
  {
    id: "tpl_maintenance",
    name: "Maintenance Notice",
    description: "Scheduled maintenance downtime notice",
    category: "system",
    popupType: "top_banner",
    defaultTitle: "⚙️ Scheduled Maintenance",
    defaultBody: "We'll be performing maintenance shortly. Some services may be temporarily unavailable.",
    defaultCtaText: "Understood",
    colorFrom: "#374151",
    colorTo: "#1F2937",
    textColor: "#F9FAFB",
    animation: "slide_down",
    stylePreset: "system",
    isBuiltIn: true,
    isActive: true,
  },
  {
    id: "tpl_welcome_back",
    name: "Welcome Back",
    description: "Re-engagement popup for returning users",
    category: "engagement",
    popupType: "modal",
    defaultTitle: "Welcome Back! 👋",
    defaultBody: "We missed you! Here's a special offer just for coming back. Enjoy exclusive deals today.",
    defaultCtaText: "Claim Offer",
    colorFrom: "#059669",
    colorTo: "#0EA5E9",
    textColor: "#FFFFFF",
    animation: "scale",
    stylePreset: "warm",
    isBuiltIn: true,
    isActive: true,
  },
  {
    id: "tpl_first_order",
    name: "First Order Bonus",
    description: "Incentivize new users to place their first order",
    category: "onboarding",
    popupType: "modal",
    defaultTitle: "🎁 First Order Bonus!",
    defaultBody: "Place your first order and get Rs.100 off! Use code FIRST100 at checkout. Hurry, limited time!",
    defaultCtaText: "Order Now",
    colorFrom: "#7C3AED",
    colorTo: "#2563EB",
    textColor: "#FFFFFF",
    animation: "scale",
    stylePreset: "reward",
    isBuiltIn: true,
    isActive: true,
  },
  {
    id: "tpl_area_launch",
    name: "Area Expansion Launch",
    description: "Announce service expansion to new areas",
    category: "announcement",
    popupType: "modal",
    defaultTitle: "🚀 Now Serving Your Area!",
    defaultBody: "Great news! AJKMart is now available in your neighborhood. Enjoy fast delivery right to your door.",
    defaultCtaText: "Start Shopping",
    colorFrom: "#DC2626",
    colorTo: "#7C3AED",
    textColor: "#FFFFFF",
    animation: "fade",
    stylePreset: "launch",
    isBuiltIn: true,
    isActive: true,
  },
  {
    id: "tpl_policy_update",
    name: "Policy Update",
    description: "Notify users about policy or terms changes",
    category: "system",
    popupType: "bottom_sheet",
    defaultTitle: "📋 Policy Update",
    defaultBody: "We've updated our Terms of Service and Privacy Policy. Please review the changes before continuing.",
    defaultCtaText: "Review & Accept",
    colorFrom: "#1E40AF",
    colorTo: "#1D4ED8",
    textColor: "#FFFFFF",
    animation: "slide_up",
    stylePreset: "formal",
    isBuiltIn: true,
    isActive: true,
  },
  {
    id: "tpl_rider_bonus",
    name: "Rider Bonus Alert",
    description: "Notify riders about earning bonuses",
    category: "rider",
    popupType: "floating_card",
    defaultTitle: "💰 Bonus Opportunity!",
    defaultBody: "Complete 5 deliveries today and earn an extra Rs.200 bonus. Peak hours are now active!",
    defaultCtaText: "Start Earning",
    colorFrom: "#059669",
    colorTo: "#10B981",
    textColor: "#FFFFFF",
    animation: "bounce",
    stylePreset: "reward",
    isBuiltIn: true,
    isActive: true,
  },
];

async function seedTemplates() {
  try {
    const existing = await db.select({ id: popupTemplatesTable.id }).from(popupTemplatesTable).where(eq(popupTemplatesTable.isBuiltIn, true));
    const existingIds = new Set(existing.map(e => e.id));
    for (const tpl of DEFAULT_TEMPLATES) {
      if (!existingIds.has(tpl.id)) {
        await db.insert(popupTemplatesTable).values(tpl).onConflictDoNothing();
      }
    }
  } catch (e) {
    logger.warn({ err: e }, "[popups] Failed to seed templates");
  }
}

seedTemplates().catch(() => {});

function mapCampaign(c: typeof popupCampaignsTable.$inferSelect) {
  const now = new Date();
  let computedStatus = c.status;
  if (c.status === "live") {
    if (c.startDate && now < c.startDate) computedStatus = "scheduled";
    else if (c.endDate && now > c.endDate) computedStatus = "expired";
  }
  return {
    ...c,
    targeting: c.targeting ?? {},
    startDate: c.startDate ? c.startDate.toISOString() : null,
    endDate: c.endDate ? c.endDate.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    computedStatus,
  };
}

router.get("/popups/templates", async (_req, res) => {
  const templates = await db.select().from(popupTemplatesTable).where(eq(popupTemplatesTable.isActive, true)).orderBy(popupTemplatesTable.name);
  sendSuccess(res, { templates });
});

router.post("/popups/templates", async (req: AdminRequest, res) => {
  if (!canWrite(req.adminRole)) { sendForbidden(res, "Only super and manager roles can manage popups"); return; }
  const body = req.body as Record<string, unknown>;
  if (!body.name) { sendValidationError(res, "name is required"); return; }
  const [tpl] = await db.insert(popupTemplatesTable).values({
    id: generateId(),
    name: body.name as string,
    description: (body.description as string) || null,
    category: (body.category as string) || "general",
    popupType: (body.popupType as string) || "modal",
    defaultTitle: (body.defaultTitle as string) || null,
    defaultBody: (body.defaultBody as string) || null,
    defaultCtaText: (body.defaultCtaText as string) || null,
    colorFrom: (body.colorFrom as string) || "#7C3AED",
    colorTo: (body.colorTo as string) || "#4F46E5",
    textColor: (body.textColor as string) || "#FFFFFF",
    animation: (body.animation as string) || "fade",
    stylePreset: (body.stylePreset as string) || "default",
    isBuiltIn: false,
    isActive: true,
  }).returning();
  sendCreated(res, tpl);
});

router.patch("/popups/templates/:id", async (req: AdminRequest, res) => {
  if (!canWrite(req.adminRole)) { sendForbidden(res, "Only super and manager roles can manage popups"); return; }
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ["name", "description", "category", "popupType", "defaultTitle", "defaultBody", "defaultCtaText", "colorFrom", "colorTo", "textColor", "animation", "stylePreset", "isActive"];
  for (const f of fields) if (body[f] !== undefined) updates[f] = body[f];
  const [updated] = await db.update(popupTemplatesTable).set(updates).where(eq(popupTemplatesTable.id, req.params["id"]!)).returning();
  if (!updated) { sendNotFound(res, "Template not found"); return; }
  sendSuccess(res, updated);
});

router.delete("/popups/templates/:id", async (req: AdminRequest, res) => {
  if (!canWrite(req.adminRole)) { sendForbidden(res, "Only super and manager roles can manage popups"); return; }
  const [tpl] = await db.select({ isBuiltIn: popupTemplatesTable.isBuiltIn }).from(popupTemplatesTable).where(eq(popupTemplatesTable.id, req.params["id"]!)).limit(1);
  if (!tpl) { sendNotFound(res, "Template not found"); return; }
  if (tpl.isBuiltIn) { sendValidationError(res, "Cannot delete built-in templates"); return; }
  await db.delete(popupTemplatesTable).where(eq(popupTemplatesTable.id, req.params["id"]!));
  sendSuccess(res, { success: true });
});

router.get("/popups", async (_req, res) => {
  const campaigns = await db.select().from(popupCampaignsTable).orderBy(desc(popupCampaignsTable.priority), desc(popupCampaignsTable.createdAt));
  const impressionCounts = await db
    .select({
      popupId: popupImpressionsTable.popupId,
      views: count(),
    })
    .from(popupImpressionsTable)
    .where(eq(popupImpressionsTable.action, "view"))
    .groupBy(popupImpressionsTable.popupId);
  const clickCounts = await db
    .select({
      popupId: popupImpressionsTable.popupId,
      clicks: count(),
    })
    .from(popupImpressionsTable)
    .where(eq(popupImpressionsTable.action, "click"))
    .groupBy(popupImpressionsTable.popupId);

  const viewMap = Object.fromEntries(impressionCounts.map(r => [r.popupId, r.views]));
  const clickMap = Object.fromEntries(clickCounts.map(r => [r.popupId, r.clicks]));

  sendSuccess(res, {
    campaigns: campaigns.map(c => {
      const views = viewMap[c.id] ?? 0;
      const clicks = clickMap[c.id] ?? 0;
      return {
        ...mapCampaign(c),
        analytics: {
          views,
          clicks,
          ctr: views > 0 ? Math.round((clicks / views) * 100 * 10) / 10 : 0,
        },
      };
    }),
    total: campaigns.length,
  });
});

const WRITE_ROLES = ["super", "manager"];

function canWrite(role: string | undefined): boolean {
  return WRITE_ROLES.includes(role ?? "");
}

router.post("/popups", async (req: AdminRequest, res) => {
  if (!canWrite(req.adminRole)) { sendForbidden(res, "Only super and manager roles can manage popups"); return; }
  const body = req.body as Record<string, unknown>;
  if (!body.title) { sendValidationError(res, "title is required"); return; }
  const validTypes = ["modal", "bottom_sheet", "top_banner", "floating_card"];
  const popupType = (body.popupType as string) || "modal";
  if (!validTypes.includes(popupType)) { sendValidationError(res, `popupType must be one of: ${validTypes.join(", ")}`); return; }

  const targeting = (body.targeting && typeof body.targeting === "object") ? body.targeting as Record<string, unknown> : {};

  const [campaign] = await db.insert(popupCampaignsTable).values({
    id: generateId(),
    title: body.title as string,
    body: (body.body as string) || null,
    mediaUrl: (body.mediaUrl as string) || null,
    ctaText: (body.ctaText as string) || null,
    ctaLink: (body.ctaLink as string) || null,
    popupType,
    displayFrequency: (body.displayFrequency as string) || "once",
    maxImpressionsPerUser: (body.maxImpressionsPerUser as number) ?? 1,
    maxTotalImpressions: (body.maxTotalImpressions as number) || null,
    priority: (body.priority as number) ?? 0,
    startDate: body.startDate ? new Date(body.startDate as string) : null,
    endDate: body.endDate ? new Date(body.endDate as string) : null,
    timezone: (body.timezone as string) || "Asia/Karachi",
    targeting,
    status: (body.status as string) || "draft",
    stylePreset: (body.stylePreset as string) || "default",
    colorFrom: (body.colorFrom as string) || "#7C3AED",
    colorTo: (body.colorTo as string) || "#4F46E5",
    textColor: (body.textColor as string) || "#FFFFFF",
    animation: (body.animation as string) || "fade",
    templateId: (body.templateId as string) || null,
    createdBy: req.adminId || null,
  }).returning();
  sendCreated(res, mapCampaign(campaign!));
});

router.post("/popups/from-template/:templateId", async (req: AdminRequest, res) => {
  if (!canWrite(req.adminRole)) { sendForbidden(res, "Only super and manager roles can manage popups"); return; }
  const [tpl] = await db.select().from(popupTemplatesTable).where(eq(popupTemplatesTable.id, req.params["templateId"]!)).limit(1);
  if (!tpl) { sendNotFound(res, "Template not found"); return; }
  const body = req.body as Record<string, unknown>;
  const targeting = (body.targeting && typeof body.targeting === "object") ? body.targeting as Record<string, unknown> : {};
  const [campaign] = await db.insert(popupCampaignsTable).values({
    id: generateId(),
    title: (body.title as string) || tpl.defaultTitle || tpl.name,
    body: (body.body as string) || tpl.defaultBody || null,
    mediaUrl: (body.mediaUrl as string) || null,
    ctaText: (body.ctaText as string) || tpl.defaultCtaText || null,
    ctaLink: (body.ctaLink as string) || null,
    popupType: tpl.popupType,
    displayFrequency: (body.displayFrequency as string) || "once",
    maxImpressionsPerUser: 1,
    priority: 0,
    startDate: body.startDate ? new Date(body.startDate as string) : null,
    endDate: body.endDate ? new Date(body.endDate as string) : null,
    timezone: "Asia/Karachi",
    targeting,
    status: "draft",
    stylePreset: tpl.stylePreset || "default",
    colorFrom: tpl.colorFrom,
    colorTo: tpl.colorTo,
    textColor: tpl.textColor,
    animation: tpl.animation || "fade",
    templateId: tpl.id,
    createdBy: req.adminId || null,
  }).returning();
  sendCreated(res, mapCampaign(campaign!));
});

router.post("/popups/clone/:id", async (req: AdminRequest, res) => {
  if (!canWrite(req.adminRole)) { sendForbidden(res, "Only super and manager roles can manage popups"); return; }
  const [orig] = await db.select().from(popupCampaignsTable).where(eq(popupCampaignsTable.id, req.params["id"]!)).limit(1);
  if (!orig) { sendNotFound(res, "Campaign not found"); return; }
  const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = orig;
  const [clone] = await db.insert(popupCampaignsTable).values({
    ...rest,
    id: generateId(),
    title: `${orig.title} (Copy)`,
    status: "draft",
    createdBy: req.adminId || null,
  }).returning();
  sendCreated(res, mapCampaign(clone!));
});

router.get("/popups/:id", async (req, res) => {
  const [campaign] = await db.select().from(popupCampaignsTable).where(eq(popupCampaignsTable.id, req.params["id"]!)).limit(1);
  if (!campaign) { sendNotFound(res, "Campaign not found"); return; }
  sendSuccess(res, mapCampaign(campaign));
});

router.patch("/popups/:id", async (req: AdminRequest, res) => {
  if (!canWrite(req.adminRole)) { sendForbidden(res, "Only super and manager roles can manage popups"); return; }
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const simpleFields = ["title", "body", "mediaUrl", "ctaText", "ctaLink", "popupType", "displayFrequency", "maxImpressionsPerUser", "maxTotalImpressions", "priority", "timezone", "targeting", "status", "stylePreset", "colorFrom", "colorTo", "textColor", "animation", "templateId"];
  for (const f of simpleFields) if (body[f] !== undefined) updates[f] = body[f];
  if (body.startDate !== undefined) updates.startDate = body.startDate ? new Date(body.startDate as string) : null;
  if (body.endDate !== undefined) updates.endDate = body.endDate ? new Date(body.endDate as string) : null;

  const [updated] = await db.update(popupCampaignsTable).set(updates).where(eq(popupCampaignsTable.id, req.params["id"]!)).returning();
  if (!updated) { sendNotFound(res, "Campaign not found"); return; }
  sendSuccess(res, mapCampaign(updated));
});

router.delete("/popups/:id", async (req: AdminRequest, res) => {
  if (!canWrite(req.adminRole)) { sendForbidden(res, "Only super and manager roles can manage popups"); return; }
  const [deleted] = await db.delete(popupCampaignsTable).where(eq(popupCampaignsTable.id, req.params["id"]!)).returning();
  if (!deleted) { sendNotFound(res, "Campaign not found"); return; }
  sendSuccess(res, { success: true });
});

router.post("/popups/bulk-status", async (req: AdminRequest, res) => {
  if (!canWrite(req.adminRole)) { sendForbidden(res, "Only super and manager roles can manage popups"); return; }
  const { ids, status } = req.body as { ids: string[]; status: string };
  if (!Array.isArray(ids) || !status) { sendValidationError(res, "ids array and status required"); return; }
  for (const id of ids) {
    await db.update(popupCampaignsTable).set({ status, updatedAt: new Date() }).where(eq(popupCampaignsTable.id, id));
  }
  sendSuccess(res, { success: true, count: ids.length });
});

router.post("/popups/reorder", async (req: AdminRequest, res) => {
  if (!canWrite(req.adminRole)) { sendForbidden(res, "Only super and manager roles can manage popups"); return; }
  const { items } = req.body as { items: { id: string; priority: number }[] };
  if (!Array.isArray(items)) { sendValidationError(res, "items array required"); return; }
  for (const item of items) {
    await db.update(popupCampaignsTable).set({ priority: item.priority, updatedAt: new Date() }).where(eq(popupCampaignsTable.id, item.id));
  }
  sendSuccess(res, { success: true });
});

router.get("/popups/:id/analytics", async (req, res) => {
  const popupId = req.params["id"]!;
  const [campaign] = await db.select({ id: popupCampaignsTable.id, title: popupCampaignsTable.title }).from(popupCampaignsTable).where(eq(popupCampaignsTable.id, popupId)).limit(1);
  if (!campaign) { sendNotFound(res, "Campaign not found"); return; }

  const [viewCount] = await db.select({ count: count() }).from(popupImpressionsTable).where(and(eq(popupImpressionsTable.popupId, popupId), eq(popupImpressionsTable.action, "view")));
  const [clickCount] = await db.select({ count: count() }).from(popupImpressionsTable).where(and(eq(popupImpressionsTable.popupId, popupId), eq(popupImpressionsTable.action, "click")));
  const [dismissCount] = await db.select({ count: count() }).from(popupImpressionsTable).where(and(eq(popupImpressionsTable.popupId, popupId), eq(popupImpressionsTable.action, "dismiss")));
  const [uniqueViewers] = await db.select({ count: sql<number>`count(distinct ${popupImpressionsTable.userId})` }).from(popupImpressionsTable).where(and(eq(popupImpressionsTable.popupId, popupId), eq(popupImpressionsTable.action, "view")));

  const views = viewCount?.count ?? 0;
  const clicks = clickCount?.count ?? 0;
  const dismisses = dismissCount?.count ?? 0;
  const unique = Number(uniqueViewers?.count ?? 0);
  const ctr = views > 0 ? Math.round((Number(clicks) / Number(views)) * 100 * 10) / 10 : 0;
  const dismissRate = views > 0 ? Math.round((Number(dismisses) / Number(views)) * 100 * 10) / 10 : 0;

  const recentImpressions = await db
    .select()
    .from(popupImpressionsTable)
    .where(eq(popupImpressionsTable.popupId, popupId))
    .orderBy(desc(popupImpressionsTable.seenAt))
    .limit(10);

  sendSuccess(res, {
    popupId,
    title: campaign.title,
    views: Number(views),
    clicks: Number(clicks),
    dismisses: Number(dismisses),
    uniqueViewers: unique,
    ctr,
    dismissRate,
    recentActivity: recentImpressions.map(i => ({
      ...i,
      seenAt: i.seenAt.toISOString(),
    })),
  });
});

router.post("/popups/ai-generate", async (req: AdminRequest, res) => {
  if (!canWrite(req.adminRole)) { sendForbidden(res, "Only super and manager roles can manage popups"); return; }
  const { goal, style } = req.body as { goal: string; style?: string };
  if (!goal) { sendValidationError(res, "goal is required"); return; }

  const openAiKey = process.env["OPENAI_API_KEY"];
  if (!openAiKey) {
    sendSuccess(res, {
      title: "Special Offer Just for You! 🎉",
      body: `${goal}. Don't miss out on this amazing opportunity. Limited time offer!`,
      ctaText: "Shop Now",
      suggestedTemplate: "tpl_flash_deal",
      suggestedColors: { colorFrom: "#7C3AED", colorTo: "#EC4899" },
    });
    return;
  }

  try {
    const prompt = `You are a marketing copywriter for AJKMart, a super app in Pakistan. Generate a popup notification for:
Goal: ${goal}
Style preference: ${style || "modern and engaging"}

Respond ONLY with valid JSON in this exact format:
{
  "title": "Short attention-grabbing title (max 50 chars, use emojis)",
  "body": "Compelling description (2-3 sentences, max 120 chars)",
  "ctaText": "Call to action button text (2-4 words)",
  "suggestedType": "modal|bottom_sheet|top_banner|floating_card",
  "suggestedColors": { "colorFrom": "#hex", "colorTo": "#hex" },
  "animation": "fade|scale|slide_up|slide_down|bounce"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as Record<string, unknown>;
    sendSuccess(res, parsed);
  } catch (e: unknown) {
    logger.warn({ err: e }, "[popups] AI generation failed, using fallback");
    sendSuccess(res, {
      title: "Don't Miss Out! 🎉",
      body: goal,
      ctaText: "Learn More",
      suggestedType: "modal",
      suggestedColors: { colorFrom: "#7C3AED", colorTo: "#4F46E5" },
      animation: "scale",
    });
  }
});

export default router;
