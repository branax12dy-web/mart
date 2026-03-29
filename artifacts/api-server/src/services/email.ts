import { createTransport, type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env["SMTP_HOST"];
  const port = parseInt(process.env["SMTP_PORT"] ?? "587", 10);
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];

  if (!host || !user || !pass) {
    return null;
  }

  transporter = createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export function resetTransporter(): void {
  transporter = null;
}

const FROM_ADDRESS = process.env["SMTP_FROM"] || "AJKMart <noreply@ajkmart.com>";

export interface EmailResult {
  sent: boolean;
  reason?: string;
  error?: string;
}

export async function sendVerificationEmail(
  to: string,
  verificationLink: string,
  name?: string,
): Promise<{ sent: boolean; reason?: string }> {
  const t = getTransporter();
  if (!t) {
    console.log(`[EMAIL] Verification email for ${to} — SMTP not configured. Link: ${verificationLink}`);
    return { sent: false, reason: "SMTP not configured" };
  }

  try {
    await t.sendMail({
      from: FROM_ADDRESS,
      to,
      subject: "Verify your AJKMart account",
      html: `
        <h2>Welcome to AJKMart${name ? `, ${name}` : ""}!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
        <p>Or copy and paste this link: <br/>${verificationLink}</p>
        <p>This link expires in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
      `,
      text: `Welcome to AJKMart! Verify your email: ${verificationLink} (expires in 24 hours)`,
    });
    return { sent: true };
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send verification email to ${to}:`, err?.message);
    return { sent: false, reason: err?.message };
  }
}

export async function sendPasswordResetEmail(
  to: string,
  otp: string,
  name?: string,
): Promise<{ sent: boolean; reason?: string }> {
  const t = getTransporter();
  if (!t) {
    console.log(`[EMAIL] Password reset OTP for ${to} — SMTP not configured.`);
    return { sent: false, reason: "SMTP not configured" };
  }

  try {
    await t.sendMail({
      from: FROM_ADDRESS,
      to,
      subject: "AJKMart Password Reset Code",
      html: `
        <h2>Password Reset${name ? ` for ${name}` : ""}</h2>
        <p>Your password reset code is:</p>
        <h1 style="font-size:32px;letter-spacing:8px;text-align:center;padding:16px;background:#f3f4f6;border-radius:8px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      `,
      text: `Your AJKMart password reset code is: ${otp} (expires in 10 minutes)`,
    });
    return { sent: true };
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send reset email to ${to}:`, err?.message);
    return { sent: false, reason: err?.message };
  }
}

export async function sendMagicLinkEmail(
  email: string,
  token: string,
  settings: Record<string, string>,
): Promise<EmailResult> {
  const appName = settings["app_name"] ?? "AJKMart";

  const baseUrl = process.env["APP_BASE_URL"]
    ?? (process.env["REPLIT_DEV_DOMAIN"]
      ? `https://${process.env["REPLIT_DEV_DOMAIN"]}`
      : "http://localhost:3000");
  const magicUrl = `${baseUrl}/auth/magic-link?token=${encodeURIComponent(token)}`;

  const subject = `${appName} — Your Login Link`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #2563eb;">${appName}</h2>
      <p>Click the button below to sign in to your account. This link expires in 15 minutes.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${magicUrl}" style="background: #2563eb; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Sign In
        </a>
      </div>
      <p style="color: #6b7280; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">— ${appName} Team</p>
    </div>
  `;

  const t = getTransporter();
  if (!t) {
    console.log(`[EMAIL] Magic link for ${email}: ${magicUrl}`);
    return { sent: false, error: "SMTP not configured — logged to console" };
  }

  try {
    await t.sendMail({
      from: FROM_ADDRESS,
      to: email,
      subject,
      html,
    });
    return { sent: true };
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send magic link to ${email}:`, err.message);
    return { sent: false, error: err.message };
  }
}
