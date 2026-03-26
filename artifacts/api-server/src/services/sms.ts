/**
 * SMS Service — supports Twilio, MSG91, and console (dev) modes.
 * Provider is selected via the `sms_provider` platform setting.
 *
 * Phone numbers are assumed to be Pakistani (03xxxxxxxxx format).
 * They are converted to E.164 (+92xxxxxxxxx) before sending.
 */

function toE164Pakistan(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("92")) return `+${digits}`;
  if (digits.startsWith("0"))  return `+92${digits.slice(1)}`;
  return `+92${digits}`;
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export interface SMSResult {
  sent: boolean;
  provider: string;
  error?: string;
}

export async function sendOtpSMS(
  phone: string,
  otp: string,
  settings: Record<string, string>
): Promise<SMSResult> {
  const integrationOn = settings["integration_sms"] === "on";
  const provider      = settings["sms_provider"] ?? "console";
  const template      = settings["sms_template_otp"] ?? "Your AJKMart OTP is {otp}. Valid for 5 minutes. Do not share with anyone.";
  const message       = applyTemplate(template, { otp });

  if (!integrationOn || provider === "console") {
    console.log(`[SMS:console] To: ${phone} | ${message}`);
    return { sent: true, provider: "console" };
  }

  const e164 = toE164Pakistan(phone);

  /* ── Twilio ── */
  if (provider === "twilio") {
    const accountSid = settings["sms_account_sid"]?.trim();
    const authToken  = settings["sms_api_key"]?.trim();
    const from       = settings["sms_sender_id"]?.trim();

    if (!accountSid || !authToken || !from) {
      console.log(`[SMS:twilio] Credentials not configured — logging: ${message}`);
      return { sent: false, provider: "twilio", error: "Twilio credentials not configured. Set sms_account_sid, sms_api_key, sms_sender_id in Integrations." };
    }

    try {
      const { default: twilio } = await import("twilio");
      const client = twilio(accountSid, authToken);
      await client.messages.create({ body: message, from, to: e164 });
      console.log(`[SMS:twilio] Sent OTP to ${e164}`);
      return { sent: true, provider: "twilio" };
    } catch (err: any) {
      console.error(`[SMS:twilio] Error:`, err.message);
      return { sent: false, provider: "twilio", error: err.message };
    }
  }

  /* ── MSG91 ── */
  if (provider === "msg91") {
    const authKey    = settings["sms_msg91_key"]?.trim();
    const senderId   = (settings["sms_sender_id"] ?? "AJKMAT").trim();

    if (!authKey) {
      console.log(`[SMS:msg91] Auth key not configured — logging: ${message}`);
      return { sent: false, provider: "msg91", error: "MSG91 auth key not configured. Set sms_msg91_key in Integrations." };
    }

    try {
      const mobile = e164.replace("+", "");
      const url    = `https://api.msg91.com/api/v5/otp?template_id=OTP&mobile=${mobile}&authkey=${authKey}&otp=${otp}&sender=${senderId}`;
      const resp   = await fetch(url, { method: "POST" });
      const body   = await resp.json() as any;
      if (body.type === "success") {
        return { sent: true, provider: "msg91" };
      }
      return { sent: false, provider: "msg91", error: JSON.stringify(body) };
    } catch (err: any) {
      console.error(`[SMS:msg91] Error:`, err.message);
      return { sent: false, provider: "msg91", error: err.message };
    }
  }

  console.log(`[SMS:unknown] Unknown provider "${provider}" — logging: ${message}`);
  return { sent: false, provider, error: `Unknown provider: ${provider}` };
}

export async function sendOrderSMS(
  phone: string,
  orderId: string,
  status: string,
  settings: Record<string, string>
): Promise<SMSResult> {
  const template = settings["sms_template_order"] ?? "Your order #{id} status: {status}. AJKMart";
  const message  = applyTemplate(template, { id: orderId, status });
  return sendOtpSMS(phone, message, { ...settings, sms_template_otp: message });
}
