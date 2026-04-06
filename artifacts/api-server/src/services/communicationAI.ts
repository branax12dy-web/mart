import OpenAI from "openai";
import { db } from "@workspace/db";
import { aiModerationLogsTable } from "@workspace/db/schema";
import { generateId } from "../lib/id.js";
import { logger } from "../lib/logger.js";

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

const MODEL = "gpt-5-nano";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastError = e;
      const status = (e as { status?: number })?.status;
      if (status === 429 || status === 503 || status === 500) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200;
        logger.warn({ attempt: attempt + 1, delay, err: e }, `[commAI] ${label} retrying after transient error`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

async function logAiUsage(userId: string, actionType: string, inputText: string | null, outputText: string | null, tokensUsed: number) {
  try {
    await db.insert(aiModerationLogsTable).values({
      id: generateId(),
      userId,
      actionType,
      inputText: inputText?.slice(0, 500) ?? null,
      outputText: outputText?.slice(0, 500) ?? null,
      tokensUsed,
    });
  } catch (e) {
    logger.warn({ err: e }, "[commAI] Failed to log AI usage");
  }
}

export async function translateMessage(
  text: string,
  targetLang: "english" | "urdu" | "roman_english",
  userId: string,
): Promise<string> {
  try {
    const langLabel = targetLang === "roman_english" ? "Roman Urdu (Urdu written in English letters)" : targetLang === "urdu" ? "Urdu" : "English";
    const response = await withRetry(
      () => openai.chat.completions.create({
        model: MODEL,
        max_completion_tokens: 1024,
        messages: [
          {
            role: "system",
            content: `You are a translator. Auto-detect the input language and translate to ${langLabel}. Return ONLY the translated text, nothing else. If the text is already in the target language, return it as-is.`,
          },
          { role: "user", content: text },
        ],
      }),
      "Translation",
    );
    const result = response.choices[0]?.message?.content?.trim() ?? text;
    const tokens = response.usage?.total_tokens ?? 0;
    await logAiUsage(userId, "translation", text, result, tokens);
    return result;
  } catch (e) {
    logger.error({ err: e }, "[commAI] Translation failed after retries");
    return text;
  }
}

export async function composeMessage(
  userIntent: string,
  preferredLang: "english" | "urdu" | "roman_english",
  userId: string,
): Promise<string> {
  try {
    const langLabel = preferredLang === "roman_english" ? "Roman Urdu" : preferredLang === "urdu" ? "Urdu" : "English";
    const response = await withRetry(
      () => openai.chat.completions.create({
        model: MODEL,
        max_completion_tokens: 1024,
        messages: [
          {
            role: "system",
            content: `You are a message composition assistant for AJKMart, a multi-service delivery platform in Pakistan. The user will describe what they want to say. Generate a polished, professional message in ${langLabel}. Return ONLY the message text, nothing else. Keep it concise and natural.`,
          },
          { role: "user", content: userIntent },
        ],
      }),
      "Compose",
    );
    const result = response.choices[0]?.message?.content?.trim() ?? userIntent;
    const tokens = response.usage?.total_tokens ?? 0;
    await logAiUsage(userId, "compose", userIntent, result, tokens);
    return result;
  } catch (e) {
    logger.error({ err: e }, "[commAI] Compose failed after retries");
    return userIntent;
  }
}

export async function generateRoleTemplate(
  description: string,
  adminId: string,
): Promise<{
  name: string;
  permissions: Record<string, boolean>;
  rolePairRules: Record<string, boolean>;
  categoryRules: Record<string, boolean>;
  timeWindows: { start: string; end: string };
  messageLimits: { maxTextLength: number; maxVoiceDuration: number; dailyLimit: number };
}> {
  try {
    const response = await withRetry(
      () => openai.chat.completions.create({
        model: MODEL,
        max_completion_tokens: 2048,
        messages: [
          {
            role: "system",
            content: `You are an admin assistant for AJKMart communication system. Based on the description, generate a communication role configuration as JSON with these fields:
- name: string (short name for the role)
- permissions: { chat: boolean, voiceCall: boolean, voiceNote: boolean, fileSharing: boolean }
- rolePairRules: { "customer_vendor": boolean, "customer_rider": boolean, "vendor_rider": boolean, "customer_customer": boolean, "vendor_vendor": boolean, "rider_rider": boolean }
- categoryRules: { "food": boolean, "mart": boolean, "pharmacy": boolean, "parcel": boolean }
- timeWindows: { start: "HH:MM", end: "HH:MM" }
- messageLimits: { maxTextLength: number, maxVoiceDuration: number (seconds), dailyLimit: number }

Return ONLY valid JSON, nothing else.`,
          },
          { role: "user", content: description },
        ],
      }),
      "RoleTemplate",
    );
    const result = response.choices[0]?.message?.content?.trim() ?? "{}";
    const tokens = response.usage?.total_tokens ?? 0;
    await logAiUsage(adminId, "role_template", description, result, tokens);
    return JSON.parse(result);
  } catch (e) {
    logger.error({ err: e }, "[commAI] Role template generation failed after retries");
    return {
      name: "Custom Role",
      permissions: { chat: true, voiceCall: false, voiceNote: false, fileSharing: false },
      rolePairRules: { customer_vendor: true, customer_rider: false, vendor_rider: false, customer_customer: false, vendor_vendor: false, rider_rider: false },
      categoryRules: { food: true, mart: true, pharmacy: true, parcel: true },
      timeWindows: { start: "08:00", end: "22:00" },
      messageLimits: { maxTextLength: 500, maxVoiceDuration: 60, dailyLimit: 50 },
    };
  }
}

export async function transcribeAudio(audioBuffer: Buffer, format: string = "webm"): Promise<string> {
  try {
    const file = new File([audioBuffer], `audio.${format}`, { type: `audio/${format}` });
    const response = await withRetry(
      () => openai.audio.transcriptions.create({
        model: "gpt-4o-mini-transcribe",
        file,
        response_format: "json",
      }),
      "Transcription",
    );
    return (response as Record<string, unknown>).text as string ?? "";
  } catch (e) {
    logger.error({ err: e }, "[commAI] Transcription failed after retries");
    return "";
  }
}
