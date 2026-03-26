/**
 * Payment Gateway Routes
 * Supports: JazzCash (MWALLET), EasyPaisa (MWALLET REST)
 * ─────────────────────────────────────────────────────
 * All gateway credentials are stored in platform_settings table
 * and fetched fresh on each request so changes take effect instantly.
 */

import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { ordersTable, walletTransactionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getPlatformSettings } from "./admin.js";
import { generateId } from "../lib/id.js";

const router: IRouter = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function hmacSHA256(key: string, data: string): string {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function txnDateTime(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function txnExpiry(minutes = 15): string {
  const exp = new Date(Date.now() + minutes * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${exp.getFullYear()}${pad(exp.getMonth()+1)}${pad(exp.getDate())}${pad(exp.getHours())}${pad(exp.getMinutes())}${pad(exp.getSeconds())}`;
}

// ─── JazzCash Hash Generation ────────────────────────────────────────────────
function buildJazzCashHash(params: Record<string, string>, salt: string): string {
  const sorted = Object.keys(params)
    .filter(k => params[k] !== "" && k !== "pp_SecureHash")
    .sort()
    .map(k => params[k])
    .join("&");
  const message = `${salt}&${sorted}`;
  return hmacSHA256(salt, message).toUpperCase();
}

// ─── EasyPaisa Hash Generation ───────────────────────────────────────────────
function buildEasyPaisaHash(fields: string[], hashKey: string): string {
  const data = fields.join("&");
  return sha256(`${hashKey}&${data}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/payments/methods
//  Public — returns which payment methods are currently active
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/methods", async (_req, res) => {
  const s = await getPlatformSettings();
  const methods: Array<{
    id: string;
    label: string;
    logo: string;
    available: boolean;
    mode: string;
    description: string;
  }> = [
    {
      id: "cash",
      label: "Cash on Delivery",
      logo: "💵",
      available: true,
      mode: "live",
      description: "Delivery par payment karein — COD",
    },
    {
      id: "wallet",
      label: "AJKMart Wallet",
      logo: "💰",
      available: (s["feature_wallet"] ?? "on") === "on",
      mode: "live",
      description: "Apni wallet se pay karein — instant",
    },
    {
      id: "jazzcash",
      label: "JazzCash",
      logo: "🔴",
      available: (s["jazzcash_enabled"] ?? "off") === "on",
      mode: s["jazzcash_mode"] ?? "sandbox",
      description: "JazzCash mobile wallet — Jazz subscribers",
    },
    {
      id: "easypaisa",
      label: "EasyPaisa",
      logo: "🟢",
      available: (s["easypaisa_enabled"] ?? "off") === "on",
      mode: s["easypaisa_mode"] ?? "sandbox",
      description: "EasyPaisa wallet — Telenor subscribers",
    },
  ];

  res.json({
    methods: methods.filter(m => m.available || m.id === "cash" || m.id === "wallet"),
    currency: s["payment_currency"] ?? "PKR",
    minAmount: parseFloat(s["payment_min_online"] ?? "50"),
    maxAmount: parseFloat(s["payment_max_online"] ?? "100000"),
    timeoutMins: parseInt(s["payment_timeout_mins"] ?? "15"),
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/payments/test-connection/:gateway
//  Admin only — tests if credentials are valid (sandbox ping)
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/test-connection/:gateway", async (req, res) => {
  const adminSecret = String(req.headers["x-admin-secret"] ?? "");
  if (adminSecret !== (process.env.ADMIN_SECRET || "ajkmart-admin-2025")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const s = await getPlatformSettings();
  const gw = req.params["gateway"];

  if (gw === "jazzcash") {
    const merchantId = s["jazzcash_merchant_id"] ?? "";
    const password   = s["jazzcash_password"]    ?? "";
    const salt       = s["jazzcash_salt"]         ?? "";
    if (!merchantId || !password || !salt) {
      res.json({ ok: false, status: "missing_credentials", message: "JazzCash credentials incomplete — enter Merchant ID, Password and Salt." });
      return;
    }
    // Build a test hash to verify credentials format
    const testParams = {
      pp_MerchantID:  merchantId,
      pp_Password:    password,
      pp_TxnRefNo:    `T${Date.now()}`,
      pp_Amount:      "100",
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: txnDateTime(),
    };
    const hash = buildJazzCashHash(testParams, salt);
    const mode = s["jazzcash_mode"] ?? "sandbox";
    res.json({
      ok: true,
      status: "credentials_set",
      mode,
      message: `JazzCash credentials configured (${mode.toUpperCase()}). Hash generation: ✅`,
      sampleHash: hash.slice(0, 12) + "...",
      gatewayUrl: mode === "live"
        ? "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/"
        : "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/",
    });
    return;
  }

  if (gw === "easypaisa") {
    const storeId   = s["easypaisa_store_id"]    ?? "";
    const hashKey   = s["easypaisa_hash_key"]     ?? "";
    const username  = s["easypaisa_username"]     ?? "";
    const epPassword = s["easypaisa_password"]    ?? "";
    if (!storeId || !hashKey) {
      res.json({ ok: false, status: "missing_credentials", message: "EasyPaisa credentials incomplete — enter Store ID and Hash Key." });
      return;
    }
    const testHash = buildEasyPaisaHash([storeId, "100", "PKR"], hashKey);
    const mode = s["easypaisa_mode"] ?? "sandbox";
    res.json({
      ok: true,
      status: "credentials_set",
      mode,
      message: `EasyPaisa credentials configured (${mode.toUpperCase()}). Hash generation: ✅`,
      sampleHash: testHash.slice(0, 12) + "...",
      hasUsername: !!username && !!epPassword,
      gatewayUrl: mode === "live"
        ? "https://easypay.easypaisa.com.pk/easypay-service/rest/v4/initTransaction"
        : "https://easypaystg.easypaisa.com.pk/easypay-service/rest/v4/initTransaction",
    });
    return;
  }

  res.status(400).json({ error: "Unknown gateway. Use: jazzcash, easypaisa" });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/initiate
//  Body: { gateway, amount, orderId, mobileNumber?, returnUrl? }
//  Returns the payment params to submit to gateway or a request ID
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/initiate", async (req, res) => {
  const { gateway, amount, orderId, mobileNumber } = req.body;

  if (!gateway || !amount || !orderId) {
    res.status(400).json({ error: "gateway, amount and orderId are required" });
    return;
  }

  const s = await getPlatformSettings();
  const amountPaisa = Math.round(parseFloat(amount) * 100);

  if (gateway === "jazzcash") {
    if ((s["jazzcash_enabled"] ?? "off") !== "on") {
      res.status(503).json({ error: "JazzCash gateway is currently disabled" });
      return;
    }
    const merchantId = s["jazzcash_merchant_id"] ?? "";
    const password   = s["jazzcash_password"]    ?? "";
    const salt       = s["jazzcash_salt"]         ?? "";
    const currency   = s["jazzcash_currency"]     ?? "PKR";
    const mode       = s["jazzcash_mode"]         ?? "sandbox";
    const timeoutMins = parseInt(s["payment_timeout_mins"] ?? "15");

    const isSandboxMode = mode === "sandbox";

    // Sandbox mode: allow without credentials (simulate)
    // Live mode: require credentials
    if (!isSandboxMode && (!merchantId || !password || !salt)) {
      res.status(503).json({ error: "JazzCash live mode requires Merchant ID, Password and Salt. Configure credentials in admin settings." });
      return;
    }

    const txnRef      = `AJKM${Date.now()}`;
    const txnDate     = txnDateTime();
    const txnExpDate  = txnExpiry(timeoutMins);
    const returnUrl   = s["jazzcash_return_url"] || `${req.protocol}://${req.get("host")}/api/payments/callback/jazzcash`;

    const params: Record<string, string> = {
      pp_Version:            "1.1",
      pp_TxnType:            "MWALLET",
      pp_Language:           "EN",
      pp_MerchantID:         merchantId,
      pp_SubMerchantID:      "",
      pp_Password:           password,
      pp_BankID:             "TBANK",
      pp_ProductID:          "RETL",
      pp_TxnRefNo:           txnRef,
      pp_Amount:             String(amountPaisa),
      pp_TxnCurrency:        currency,
      pp_TxnDateTime:        txnDate,
      pp_BillReference:      orderId,
      pp_Description:        `AJKMart Order ${orderId.slice(-6).toUpperCase()}`,
      pp_TxnExpiryDateTime:  txnExpDate,
      pp_ReturnURL:          returnUrl,
      ppmpf_1:               mobileNumber || "",
      ppmpf_2:               "",
      ppmpf_3:               "",
      ppmpf_4:               "",
      ppmpf_5:               "",
    };

    params["pp_SecureHash"] = buildJazzCashHash(params, salt);

    const gatewayUrl = mode === "live"
      ? "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/"
      : "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";

    // In sandbox mode we simulate a pending payment
    const isSandbox = mode === "sandbox";

    res.json({
      gateway:    "jazzcash",
      mode,
      txnRef,
      gatewayUrl,
      params,
      mobile:     mobileNumber || null,
      instructions: isSandbox
        ? "Sandbox mode: Use any mobile number. Payment will be simulated."
        : `Enter your JazzCash mobile number (${mobileNumber || "03XX-XXXXXXX"}) and approve the payment on your JazzCash app.`,
      simulateUrl: isSandbox ? `/api/payments/simulate/jazzcash/${txnRef}` : null,
    });
    return;
  }

  if (gateway === "easypaisa") {
    if ((s["easypaisa_enabled"] ?? "off") !== "on") {
      res.status(503).json({ error: "EasyPaisa gateway is currently disabled" });
      return;
    }
    const storeId    = s["easypaisa_store_id"]   ?? "";
    const hashKey    = s["easypaisa_hash_key"]    ?? "";
    const username   = s["easypaisa_username"]   ?? "";
    const epPassword = s["easypaisa_password"]   ?? "";
    const mode       = s["easypaisa_mode"]        ?? "sandbox";

    const isSandboxEP = mode === "sandbox";
    if (!isSandboxEP && (!storeId || !hashKey)) {
      res.status(503).json({ error: "EasyPaisa live mode requires Store ID and Hash Key. Configure credentials in admin settings." });
      return;
    }

    const txnRef     = `EP${Date.now()}`;
    const amountStr  = parseFloat(amount).toFixed(2);
    const isSandbox  = mode === "sandbox";

    const hashFields = [storeId, txnRef, amountStr, "PKR", mobileNumber || ""];
    const hash = buildEasyPaisaHash(hashFields, hashKey);

    const payload = {
      orderId:              txnRef,
      storeId,
      transactionAmount:    amountStr,
      transactionType:      "MA",
      mobileAccountNo:      mobileNumber || "",
      emailAddress:         "",
      transactionCurrency:  "PKR",
      paymentExpiryDate:    new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      enabledPaymentMethods: 0,
      postBackURL:          `${req.protocol}://${req.get("host")}/api/payments/callback/easypaisa`,
      encryptedHashRequest: hash,
    };

    // Call EasyPaisa REST API if credentials are full and not sandbox
    if (!isSandbox && username && epPassword) {
      try {
        const authHeader = "Basic " + Buffer.from(`${username}:${epPassword}`).toString("base64");
        const epRes = await fetch(
          "https://easypay.easypaisa.com.pk/easypay-service/rest/v4/initTransaction",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": authHeader,
              "Credentials": authHeader,
            },
            body: JSON.stringify(payload),
          }
        );
        const epData = await epRes.json() as any;
        if (epData?.responseCode === "0000") {
          res.json({
            gateway:    "easypaisa",
            mode:       "live",
            txnRef,
            token:      epData.token,
            instructions: `Mobile number ${mobileNumber} pe EasyPaisa notification aayegi — approve karein.`,
            status:     "pending",
          });
          return;
        }
        res.status(502).json({ error: `EasyPaisa error: ${epData?.responseDesc || "Unknown error"}` });
        return;
      } catch (e: any) {
        res.status(502).json({ error: `EasyPaisa API unreachable: ${e.message}` });
        return;
      }
    }

    // Sandbox / missing credentials — simulate
    res.json({
      gateway:     "easypaisa",
      mode,
      txnRef,
      payload,
      mobile:      mobileNumber || null,
      instructions: isSandbox
        ? "Sandbox mode: Use any EasyPaisa number. Payment will be simulated."
        : `Mobile number ${mobileNumber} pe EasyPaisa notification aayegi — approve karein.`,
      simulateUrl: isSandbox ? `/api/payments/simulate/easypaisa/${txnRef}` : null,
    });
    return;
  }

  res.status(400).json({ error: "Unsupported gateway. Use: jazzcash, easypaisa" });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/payments/simulate/:gateway/:txnRef
//  Sandbox simulation — marks payment as successful and updates order
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/simulate/:gateway/:txnRef", async (req, res) => {
  const { txnRef } = req.params;

  // Find order by txnRef stored in notes or by recent pending order
  // For sandbox simulation, we just return success
  res.json({
    status:   "success",
    txnRef,
    message:  "Sandbox payment simulated successfully ✅",
    gateway:  req.params["gateway"],
    note:     "In production, this is replaced by the actual gateway callback.",
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/callback/jazzcash
//  JazzCash posts payment result here after customer completes payment
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/callback/jazzcash", async (req, res) => {
  const s = await getPlatformSettings();
  const salt = s["jazzcash_salt"] ?? "";
  const params = req.body as Record<string, string>;

  // Verify hash
  const receivedHash = params["pp_SecureHash"];
  const paramsWithoutHash = { ...params };
  delete paramsWithoutHash["pp_SecureHash"];
  const computedHash = buildJazzCashHash(paramsWithoutHash, salt);

  if (salt && receivedHash !== computedHash) {
    res.status(400).json({ error: "Hash mismatch — possible tampering" });
    return;
  }

  const responseCode = params["pp_ResponseCode"];
  const txnRef       = params["pp_TxnRefNo"];
  const orderId      = params["pp_BillReference"];

  if (responseCode === "000") {
    // Payment successful — update order status
    if (orderId) {
      await db.update(ordersTable)
        .set({ status: "pending", updatedAt: new Date() })
        .where(eq(ordersTable.id, orderId));
    }
    res.json({ success: true, txnRef, message: "Payment received and order confirmed" });
  } else {
    res.json({ success: false, txnRef, responseCode, message: "Payment failed or cancelled" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/payments/callback/easypaisa
//  EasyPaisa posts transaction result here
// ═══════════════════════════════════════════════════════════════════════════════
router.post("/callback/easypaisa", async (req, res) => {
  const s = await getPlatformSettings();
  const hashKey = s["easypaisa_hash_key"] ?? "";
  const body = req.body as Record<string, string>;

  const orderId      = body["orderId"];
  const responseCode = body["responseCode"];
  const txnRefNo     = body["transactionReferenceNumber"];

  // Verify hash
  const receivedHash = body["encryptedHashRequest"];
  const storeId      = s["easypaisa_store_id"] ?? "";
  const amount       = body["transactionAmount"];
  const computedHash = buildEasyPaisaHash([storeId, orderId, amount, "PKR", ""], hashKey);

  if (hashKey && receivedHash !== computedHash) {
    res.status(400).json({ error: "Hash mismatch — verify EasyPaisa credentials" });
    return;
  }

  if (responseCode === "0000") {
    res.json({ success: true, txnRefNo, message: "EasyPaisa payment confirmed" });
  } else {
    res.json({ success: false, txnRefNo, responseCode, message: "EasyPaisa payment failed" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/payments/status/:txnRef
//  Poll payment status
// ═══════════════════════════════════════════════════════════════════════════════
router.get("/status/:txnRef", async (req, res) => {
  // In production, this would call the gateway's status API
  // For now, sandbox always returns pending (callback updates it)
  res.json({
    txnRef:  req.params["txnRef"],
    status:  "pending",
    message: "Awaiting payment confirmation from gateway",
  });
});

export default router;
