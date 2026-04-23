/**
 * Roles & Permissions admin page.
 * Lists RBAC roles, allows editing the permissions on each role,
 * and creating new custom roles. Built-in roles can be edited but not deleted.
 *
 * Backend enforcement lives at /api/admin/system/rbac/* —
 * the UI here is gated by `system.roles.manage` for write actions.
 */
import { useEffect, useMemo, useState } from "react";
import { Shield, Plus, Save, Trash2, RefreshCw, Search, Lock } from "lucide-react";
import { fetchAdmin } from "@/lib/adminFetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionDef {
  id: string;
  category: string;
  description: string;
  highRisk?: boolean;
}

interface RbacRole {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isBuiltIn: boolean;
  permissions: string[];
}

export default function RolesPermissionsPage() {
  const { toast } = useToast();
  const { has, isSuper } = usePermissions();
  const canManage = isSuper || has("system.roles.manage");

  const [catalog, setCatalog] = useState<PermissionDef[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [draftPerms, setDraftPerms] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  const activeRole = useMemo(
    () => roles.find(r => r.id === activeRoleId) ?? null,
    [roles, activeRoleId],
  );

  const dirty = useMemo(() => {
    if (!activeRole) return false;
    if (activeRole.permissions.length !== draftPerms.size) return true;
    return activeRole.permissions.some(p => !draftPerms.has(p))
      || [...draftPerms].some(p => !activeRole.permissions.includes(p));
  }, [activeRole, draftPerms]);

  const reload = async () => {
    setLoading(true);
    try {
      const [catRes, rolesRes] = await Promise.all([
        fetchAdmin("/api/admin/system/rbac/permissions"),
        fetchAdmin("/api/admin/system/rbac/roles"),
      ]);
      const cat: PermissionDef[] = catRes?.data?.permissions ?? catRes?.permissions ?? [];
      const rls: RbacRole[] = rolesRes?.data?.roles ?? rolesRes?.roles ?? [];
      setCatalog(cat);
      setRoles(rls);
      if (rls.length && !activeRoleId) {
        setActiveRoleId(rls[0]!.id);
        setDraftPerms(new Set(rls[0]!.permissions));
      }
    } catch (err) {
      toast({ title: "Failed to load roles", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, []);

  const selectRole = (role: RbacRole) => {
    setActiveRoleId(role.id);
    setDraftPerms(new Set(role.permissions));
  };

  const togglePerm = (id: string) => {
    if (!canManage) return;
    setDraftPerms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!activeRole || !canManage) return;
    setSaving(true);
    try {
      await fetchAdmin(`/api/admin/system/rbac/roles/${activeRole.id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissions: [...draftPerms] }),
      });
      toast({ title: "Saved", description: `Permissions updated for ${activeRole.name}` });
      await reload();
    } catch (err) {
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const createRole = async () => {
    const slug = window.prompt("New role slug (letters, digits, underscores):")?.trim();
    if (!slug) return;
    const name = window.prompt("Display name:")?.trim() || slug;
    try {
      const res = await fetchAdmin("/api/admin/system/rbac/roles", {
        method: "POST",
        body: JSON.stringify({ slug, name }),
      });
      const role = (res?.data?.role ?? res?.role) as RbacRole | undefined;
      toast({ title: "Role created", description: name });
      await reload();
      if (role) setActiveRoleId(role.id);
    } catch (err) {
      toast({ title: "Create failed", description: String(err), variant: "destructive" });
    }
  };

  const removeRole = async () => {
    if (!activeRole || activeRole.isBuiltIn) return;
    if (!window.confirm(`Delete role "${activeRole.name}"?`)) return;
    try {
      await fetchAdmin(`/api/admin/system/rbac/roles/${activeRole.id}`, { method: "DELETE" });
      toast({ title: "Role deleted" });
      setActiveRoleId(null);
      await reload();
    } catch (err) {
      toast({ title: "Delete failed", description: String(err), variant: "destructive" });
    }
  };

  const filtered = useMemo(() => {
    if (!filter) return catalog;
    const q = filter.toLowerCase();
    return catalog.filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
    );
  }, [catalog, filter]);

  const grouped = useMemo(() => {
    const m = new Map<string, PermissionDef[]>();
    for (const p of filtered) {
      if (!m.has(p.category)) m.set(p.category, []);
      m.get(p.category)!.push(p);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700"><Shield className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-semibold">Roles &amp; Permissions</h1>
            <p className="text-sm text-muted-foreground">
              Fine-grained access control for admin users.
              {!canManage && " (read-only — system.roles.manage required to edit)"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reload} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Reload
          </Button>
          {canManage && (
            <Button onClick={createRole}>
              <Plus className="h-4 w-4 mr-2" /> New role
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Roles list */}
        <aside className="border rounded-lg bg-white">
          <div className="p-3 border-b text-xs uppercase tracking-wider text-muted-foreground">
            Roles ({roles.length})
          </div>
          <ul className="divide-y">
            {roles.map(r => (
              <li key={r.id}>
                <button
                  onClick={() => selectRole(r)}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${activeRoleId === r.id ? "bg-indigo-50" : ""}`}
                  data-testid={`role-${r.slug}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.isBuiltIn && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Lock className="h-3 w-3 mr-1" />built-in
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{r.slug} · {r.permissions.length} perms</div>
                </button>
              </li>
            ))}
            {!roles.length && !loading && (
              <li className="p-3 text-sm text-muted-foreground">No roles defined yet.</li>
            )}
          </ul>
        </aside>

        {/* Permission editor */}
        <section className="border rounded-lg bg-white">
          {!activeRole ? (
            <div className="p-6 text-sm text-muted-foreground">Select a role to view its permissions.</div>
          ) : (
            <>
              <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-semibold">{activeRole.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {activeRole.description || "No description"} · {draftPerms.size} of {catalog.length} permissions
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter permissions…"
                      className="pl-8 h-9 w-64"
                      value={filter}
                      onChange={e => setFilter(e.target.value)}
                    />
                  </div>
                  {canManage && !activeRole.isBuiltIn && (
                    <Button variant="ghost" onClick={removeRole}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  )}
                  {canManage && (
                    <Button onClick={save} disabled={!dirty || saving}>
                      <Save className="h-4 w-4 mr-2" /> {saving ? "Saving…" : "Save"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
                {grouped.map(([category, perms]) => (
                  <div key={category}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      {category}
                    </h3>
                    <ul className="space-y-1">
                      {perms.map(p => {
                        const checked = draftPerms.has(p.id);
                        return (
                          <li key={p.id}>
                            <label className={`flex items-start gap-3 px-3 py-2 rounded-md cursor-pointer ${checked ? "bg-indigo-50/50" : "hover:bg-slate-50"}`}>
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                onChange={() => togglePerm(p.id)}
                                disabled={!canManage}
                                data-testid={`perm-${p.id}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <code className="text-sm font-mono">{p.id}</code>
                                  {p.highRisk && (
                                    <Badge variant="destructive" className="text-[10px]">high-risk</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">{p.description}</div>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                {!grouped.length && (
                  <div className="text-sm text-muted-foreground">No permissions match the filter.</div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
