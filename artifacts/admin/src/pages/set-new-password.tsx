/**
 * Forced "set a new password" screen, shown to authenticated admins whose
 * access token carries the `mpc=true` claim. Calls
 * /api/admin/auth/change-password with the current + new password and, on
 * success, the auth context lifts the gate and the user is sent to the
 * dashboard.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, Lock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAuth } from "@/lib/adminAuthContext";
import { useToast } from "@/hooks/use-toast";

function validateStrength(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least 1 uppercase letter";
  if (!/[0-9]/.test(pw)) return "Password must contain at least 1 number";
  return null;
}

export default function SetNewPassword() {
  const [, setLocation] = useLocation();
  const { state, changePassword, logout } = useAdminAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the gate is already lifted (refresh fired in the background, or this
  // page is hit directly from a healthy session), bounce to the dashboard.
  useEffect(() => {
    if (!state.isLoading && state.accessToken && !state.mustChangePassword) {
      setLocation("/dashboard");
    }
  }, [state.isLoading, state.accessToken, state.mustChangePassword, setLocation]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("The two new passwords do not match.");
      return;
    }
    const strengthError = validateStrength(newPassword);
    if (strengthError) {
      setError(strengthError);
      return;
    }
    if (newPassword === currentPassword) {
      setError("Your new password must be different from your current password.");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast({
        title: "Password updated",
        description: "Welcome aboard. You're all set.",
      });
      setLocation("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    try {
      await logout();
    } finally {
      setLocation("/login");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-2xl shadow-xl p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Set a new password</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your account is using a temporary password. Choose a new one
                before continuing.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="current-password">
                Current password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="The temporary password you used to sign in"
                  className="pl-9 h-11"
                  required
                  data-testid="input-current-password"
                />
              </div>
            </div>

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
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="pl-9 pr-10 h-11"
                  required
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
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
                  data-testid="input-confirm-password"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive" data-testid="text-change-password-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11"
              disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
              data-testid="button-update-password"
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

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5"
              data-testid="button-sign-out"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out instead
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
