import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, RefreshCw, Phone, MapPin, Car, Clock } from "lucide-react";
import { fetcher } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type SosAlert = {
  id: string;
  userId: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function timeSince(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function parseBody(body: string) {
  const phoneMatch = body.match(/Phone: ([^\s·]+)/);
  const rideMatch = body.match(/Ride: #([A-F0-9]+)/);
  const locMatch = body.match(/Location: ([\d.,]+),([\d.,]+)/);
  const msgMatch = body.match(/"(.+?)"/);
  return {
    phone: phoneMatch?.[1],
    rideId: rideMatch?.[1],
    location: locMatch ? { lat: locMatch[1], lng: locMatch[2] } : null,
    message: msgMatch?.[1],
  };
}

export default function SosAlerts() {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadAlerts = useCallback(async (p = 1, append = false) => {
    setLoading(true);
    try {
      const data = await fetcher(`/sos/alerts?page=${p}&limit=20`);
      const newAlerts: SosAlert[] = data.alerts || [];
      setAlerts(prev => append ? [...prev, ...newAlerts] : newAlerts);
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
      setPage(p);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAlerts(1);
  }, [loadAlerts]);

  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(() => loadAlerts(1), 15000);
    return () => clearInterval(iv);
  }, [autoRefresh, loadAlerts]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-6 h-6" /> SOS Alerts
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} alert{total !== 1 ? "s" : ""} total · emergency requests from riders &amp; customers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(a => !a)}
            className="h-9 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => loadAlerts(1)} disabled={loading} className="h-9 text-xs gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {alerts.length === 0 && !loading && (
        <Card className="p-10 flex flex-col items-center gap-4 text-center rounded-2xl border-border/50">
          <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-green-500" />
          </div>
          <p className="font-semibold text-lg text-foreground">No SOS Alerts</p>
          <p className="text-sm text-muted-foreground max-w-xs">All clear — no emergency alerts have been triggered yet.</p>
        </Card>
      )}

      {loading && alerts.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="space-y-3">
        {alerts.map(alert => {
          const parsed = parseBody(alert.body);
          const isNew = (Date.now() - new Date(alert.createdAt).getTime()) < 300000;
          return (
            <Card key={alert.id} className={`p-4 rounded-2xl border-border/50 shadow-sm ${isNew ? "border-red-200 bg-red-50/40" : ""}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isNew ? "bg-red-100" : "bg-muted"}`}>
                  <AlertTriangle className={`w-5 h-5 ${isNew ? "text-red-600" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-sm text-foreground truncate">{alert.title.replace("🆘 SOS Alert — ", "")}</p>
                    {isNew && <Badge className="bg-red-600 text-white text-[10px] px-1.5 font-bold">NEW</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" /> {timeSince(alert.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {parsed.phone && (
                      <a href={`tel:${parsed.phone}`} className="flex items-center gap-1 text-blue-600 font-medium hover:underline">
                        <Phone className="w-3 h-3" /> {parsed.phone}
                      </a>
                    )}
                    {parsed.rideId && (
                      <span className="flex items-center gap-1 font-mono font-bold text-foreground">
                        <Car className="w-3 h-3" /> #{parsed.rideId}
                      </span>
                    )}
                    {parsed.location && (
                      <a
                        href={`https://www.google.com/maps?q=${parsed.location.lat},${parsed.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-emerald-600 font-medium hover:underline"
                      >
                        <MapPin className="w-3 h-3" /> View Location
                      </a>
                    )}
                  </div>
                  {parsed.message && (
                    <p className="text-xs text-red-700 bg-red-100 border border-red-200 rounded-lg px-2.5 py-1.5 mt-2 font-medium">
                      "{parsed.message}"
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1.5">{formatTime(alert.createdAt)}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => loadAlerts(page + 1, true)} disabled={loading} className="rounded-xl gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
