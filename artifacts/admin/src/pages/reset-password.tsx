/**
 * Public reset-password page.
 * Reads the `?token=` query param, posts the new password to
 * /api/admin/auth/reset-password and surfaces success / failure inline.
 * On success we drop the user back at the login page so they sign in with
 * the new credentials (every session was just revoked server-side).
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getTokenFromQuery(): string {
  if (typeof window === "undefined") return "";
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") ?? "";
  } catch {
    return "";
  }
}

function validateStrength(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least 1 uppercase letter";
  if (!/[0-9]/.test(pw)) return "Password must contain at least 1 number";
  return null;
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = useMemo(getTokenFromQuery, []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("This reset link is missing its token. Request a new one from the forgot-password page.");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }
    const strengthError = validateStrength(password);
    if (strengthError) {
      setError(strengthError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "We couldn't reset your password. Please try again.");
        return;
      }
      setSuccess(true);
      // Bounce to login after a short pause so the user can read the message.
      setTimeout(() => setLocation("/login"), 2200);
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
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

          <h1 className="text-2xl font-bold mb-2">Choose a new password</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Pick something you don't use anywhere else. Minimum 8 characters,
            with at least one uppercase letter and one number.
          </p>

          {success ? (
            <div className="space-y-4 text-center" data-testid="reset-password-success">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold">Password updated</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been changed. Redirecting you to the sign-in
                screen…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="new-password">
                  New password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pl-9 pr-10 h-11"
                    required
                    disabled={!token}
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="confirm-password">
                  Confirm new password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter the new password"
                    className="pl-9 h-11"
                    required
                    disabled={!token}
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive" data-testid="text-reset-error">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-11"
                disabled={submitting || !token || !password || !confirmPassword}
                data-testid="button-reset-password"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Update password
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
