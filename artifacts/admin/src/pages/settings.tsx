import { useState, useEffect } from "react";
import { Settings2, Save, RefreshCw, Truck, Car, BarChart3, ShoppingCart, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetcher } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Setting {
  key: string;
  value: string;
  label: string;
  category: string;
}

interface GroupedSettings {
  delivery: Setting[];
  rides: Setting[];
  finance: Setting[];
  orders: Setting[];
  general: Setting[];
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  delivery: { label: "Delivery Charges",  icon: Truck,        color: "text-blue-600",   bg: "bg-blue-100" },
  rides:    { label: "Ride Pricing",       icon: Car,          color: "text-green-600",  bg: "bg-green-100" },
  finance:  { label: "Finance & Margins",  icon: BarChart3,    color: "text-purple-600", bg: "bg-purple-100" },
  orders:   { label: "Order Rules",        icon: ShoppingCart, color: "text-orange-600", bg: "bg-orange-100" },
  general:  { label: "General Settings",   icon: Globe,        color: "text-gray-600",   bg: "bg-gray-100" },
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetcher("/platform-settings");
      setSettings(data.settings || []);
      const vals: Record<string, string> = {};
      for (const s of data.settings || []) vals[s.key] = s.value;
      setLocalValues(vals);
      setDirtyKeys(new Set());
    } catch (e: any) {
      toast({ title: "Failed to load settings", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

  const handleChange = (key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
    setDirtyKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changed = Array.from(dirtyKeys).map(key => ({ key, value: localValues[key] ?? "" }));
      await fetcher("/platform-settings", {
        method: "PUT",
        body: JSON.stringify({ settings: changed }),
      });
      setDirtyKeys(new Set());
      toast({ title: "Settings saved! ✅", description: "Changes take effect immediately across the app." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleReset = async () => {
    await loadSettings();
    toast({ title: "Settings reloaded" });
  };

  // Group settings by category
  const grouped: Partial<GroupedSettings> = {};
  for (const s of settings) {
    if (!grouped[s.category as keyof GroupedSettings]) {
      (grouped as any)[s.category] = [];
    }
    (grouped as any)[s.category].push(s);
  }

  const getInputType = (key: string): string => {
    if (key === "app_status" || key === "app_name" || key === "support_phone") return "text";
    return "number";
  };

  const getInputSuffix = (key: string): string => {
    if (key.includes("pct")) return "%";
    if (key.includes("phone")) return "";
    if (key === "app_name" || key === "app_status") return "";
    return "Rs.";
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded-lg" />
        {[1,2,3].map(i => <div key={i} className="h-40 bg-muted rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
            <Settings2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">App Settings</h1>
            <p className="text-muted-foreground text-sm">Control pricing, fees, and platform behavior</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset} disabled={loading} className="h-10 rounded-xl gap-2">
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || dirtyKeys.size === 0}
            className="h-10 rounded-xl gap-2 shadow-md"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : `Save${dirtyKeys.size > 0 ? ` (${dirtyKeys.size})` : ""}`}
          </Button>
        </div>
      </div>

      {dirtyKeys.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-amber-800 text-sm font-medium">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          {dirtyKeys.size} unsaved change{dirtyKeys.size > 1 ? "s" : ""} — click Save to apply
        </div>
      )}

      {Object.entries(CATEGORY_CONFIG).map(([cat, cfg]) => {
        const catSettings = (grouped as any)[cat] as Setting[] | undefined;
        if (!catSettings || catSettings.length === 0) return null;
        const Icon = cfg.icon;

        return (
          <Card key={cat} className="rounded-2xl border-border/50 shadow-sm">
            <div className="p-5 border-b border-border/50 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <h2 className="font-bold text-foreground">{cfg.label}</h2>
            </div>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {catSettings.map((s) => {
                  const isDirty = dirtyKeys.has(s.key);
                  const suffix = getInputSuffix(s.key);
                  return (
                    <div key={s.key} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-foreground">{s.label}</label>
                        {isDirty && (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">
                            CHANGED
                          </Badge>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type={getInputType(s.key)}
                          value={localValues[s.key] ?? s.value}
                          onChange={e => handleChange(s.key, e.target.value)}
                          className={`h-11 rounded-xl pr-12 ${isDirty ? 'border-amber-300 bg-amber-50/50 ring-1 ring-amber-200' : ''}`}
                          min={0}
                        />
                        {suffix && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                            {suffix}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{s.key}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Info Card */}
      <Card className="rounded-2xl border-blue-200 bg-blue-50/50">
        <CardContent className="p-5">
          <h3 className="font-bold text-blue-800 mb-2">How Settings Work</h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Changes take effect <strong>immediately</strong> — no app restart needed</li>
            <li>Delivery fees are automatically applied to new orders in the user app</li>
            <li>Ride fares are calculated using bike/car base fare + per-km rate</li>
            <li>Free delivery kicks in when order total exceeds the threshold</li>
            <li>Platform commission is tracked in revenue reports</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
