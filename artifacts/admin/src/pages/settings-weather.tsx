import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CloudSun, Plus, X, Loader2, Save, MapPin } from "lucide-react";

function useWeatherConfig() {
  return useQuery({
    queryKey: ["admin-weather-config"],
    queryFn: () => fetcher("/weather-config"),
  });
}

export function WeatherSection() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useWeatherConfig();

  const [enabled, setEnabled] = useState(true);
  const [cities, setCities] = useState<string[]>([]);
  const [newCity, setNewCity] = useState("");

  useEffect(() => {
    if (data?.config) {
      setEnabled(data.config.widgetEnabled);
      setCities(data.config.cities ? data.config.cities.split(",").map((c: string) => c.trim()).filter(Boolean) : []);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (body: { widgetEnabled: boolean; cities: string }) =>
      fetcher("/weather-config", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-weather-config"] });
      toast({ title: "Weather config saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const addCity = () => {
    const city = newCity.trim();
    if (!city) return;
    if (cities.includes(city)) { toast({ title: "City already exists", variant: "destructive" }); return; }
    setCities(prev => [...prev, city]);
    setNewCity("");
  };

  const removeCity = (city: string) => {
    setCities(prev => prev.filter(c => c !== city));
  };

  const handleSave = () => {
    saveMutation.mutate({ widgetEnabled: enabled, cities: cities.join(",") });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CloudSun className="w-5 h-5 text-sky-500" />
          <div>
            <p className="text-sm font-bold">Weather Widget</p>
            <p className="text-xs text-muted-foreground">Toggle the weather widget and manage displayed cities</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Cities ({cities.length})</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {cities.map(city => (
            <Badge key={city} variant="secondary" className="text-sm py-1.5 px-3 gap-1.5">
              {city}
              <button onClick={() => removeCity(city)} className="hover:text-red-600 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {cities.length === 0 && <p className="text-sm text-muted-foreground">No cities configured</p>}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add a city..."
            value={newCity}
            onChange={e => setNewCity(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCity()}
            className="flex-1 rounded-xl"
          />
          <Button variant="outline" size="sm" className="rounded-xl" onClick={addCity} disabled={!newCity.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full rounded-xl gap-2">
        {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saveMutation.isPending ? "Saving..." : "Save Weather Config"}
      </Button>
    </div>
  );
}
