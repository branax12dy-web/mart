import { db } from "@workspace/db";
import { webhookRegistrationsTable, webhookLogsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger.js";

const generateLogId = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 20; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

export async function emitWebhookEvent(event: string, data: Record<string, unknown>) {
  try {
    const webhooks = await db.select().from(webhookRegistrationsTable)
      .where(eq(webhookRegistrationsTable.isActive, true));

    const matching = webhooks.filter(w => {
      const events = (w.events as string[]) || [];
      return events.includes(event);
    });

    if (matching.length === 0) return;

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const webhook of matching) {
      dispatchWebhook(webhook, event, payload).catch(err => {
        logger.error(`[webhook-emitter] Failed to dispatch to ${webhook.url}: ${err.message}`);
      });
    }
  } catch (err: any) {
    logger.error(`[webhook-emitter] Error emitting event ${event}: ${err.message}`);
  }
}

async function dispatchWebhook(
  webhook: { id: string; url: string; secret: string | null },
  event: string,
  payload: Record<string, unknown>,
) {
  const logId = generateLogId();
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhook.secret || "",
        "X-Webhook-Event": event,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const durationMs = Date.now() - startTime;
    const responseText = await response.text().catch(() => "");

    await db.insert(webhookLogsTable).values({
      id: logId,
      webhookId: webhook.id,
      event,
      url: webhook.url,
      status: response.status,
      requestBody: payload,
      responseBody: responseText.slice(0, 2000),
      success: response.ok,
      durationMs,
    });

    if (!response.ok) {
      const retryTimeout = setTimeout(() => {
        retryWebhook(webhook, event, payload).catch(() => {});
      }, 5000);
      if (retryTimeout.unref) retryTimeout.unref();
    }
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    await db.insert(webhookLogsTable).values({
      id: logId,
      webhookId: webhook.id,
      event,
      url: webhook.url,
      status: 0,
      requestBody: payload,
      success: false,
      error: err.message || "Unknown error",
      durationMs,
    }).catch(() => {});

    const retryTimeout = setTimeout(() => {
      retryWebhook(webhook, event, payload).catch(() => {});
    }, 5000);
    if (retryTimeout.unref) retryTimeout.unref();
  }
}

async function retryWebhook(
  webhook: { id: string; url: string; secret: string | null },
  event: string,
  payload: Record<string, unknown>,
) {
  const logId = generateLogId();
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhook.secret || "",
        "X-Webhook-Event": event,
        "X-Webhook-Retry": "1",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const durationMs = Date.now() - startTime;
    const responseText = await response.text().catch(() => "");

    await db.insert(webhookLogsTable).values({
      id: logId,
      webhookId: webhook.id,
      event: `${event} (retry)`,
      url: webhook.url,
      status: response.status,
      requestBody: payload,
      responseBody: responseText.slice(0, 2000),
      success: response.ok,
      durationMs,
    }).catch(() => {});
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    await db.insert(webhookLogsTable).values({
      id: logId,
      webhookId: webhook.id,
      event: `${event} (retry)`,
      url: webhook.url,
      status: 0,
      requestBody: payload,
      success: false,
      error: err.message || "Unknown error",
      durationMs,
    }).catch(() => {});
  }
}
