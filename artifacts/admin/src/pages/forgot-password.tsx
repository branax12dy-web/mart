/**
 * Public "Forgot password?" page.
 * Posts the email to /api/admin/auth/forgot-password and always shows the
 * same generic confirmation regardless of whether the email exists. The
 * server-side rate limiter handles abuse.
 */
import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!response.ok && response.status !== 200) {
        const data = await response.json().catch(() => ({}));
        // We still tell the user "if it exists you'll get a link" for
        // any 4xx response — except for blatantly invalid inputs (400 with
        // a useful error) which we surface so they can fix the typo.
        if (response.status === 400 && data?.error) {
          setError(String(data.error));
        } else {
          setSubmitted(true);
        }
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      // Network failure: still show the success screen so we don't leak
      // anything; surface a quiet message in console for ops.
      console.error("[forgot-password] network error:", err);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <Link href="/login">
              <a className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-to-login">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to sign in
              </a>
            </Link>
          </div>

          <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter the email associated with your admin account and we'll email
            you a single-use link to choose a new password. The link expires in
            30 minutes.
          </p>

          {submitted ? (
            <div className="space-y-4 text-center" data-testid="forgot-password-confirmation">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                If <span className="font-medium">{email}</span> matches an admin
                account, a password reset link has been sent. It expires in 30
                minutes and can only be used once.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                  Return to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-9 h-11"
                    required
                    data-testid="input-forgot-email"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive" data-testid="text-forgot-error">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-11"
                disabled={submitting || !email.trim()}
                data-testid="button-send-reset-link"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Send reset link
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
