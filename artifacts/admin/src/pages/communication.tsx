import { useState, useEffect } from "react";
import { fetcher } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle, Phone, Mic, Settings2, Shield, Bot, Flag, Download,
  Users, BarChart2, Eye, CheckCircle, Sparkles, Search,
  Crown, Pencil,
} from "lucide-react";

interface DashboardStats {
  activeConversations: number;
  messagesToday: number;
  callsToday: number;
  voiceNotesToday: number;
  flaggedMessages: number;
  aiUsageToday: number;
}

interface ConversationUser {
  name: string | null;
  ajkId: string | null;
}

interface ConversationItem {
  id: string;
  status: string;
  lastMessageAt: string | null;
  participant1?: ConversationUser;
  participant2?: ConversationUser;
}

interface MessageItem {
  id: string;
  content: string;
  originalContent?: string | null;
  maskedContent?: string | null;
  messageType: string;
  isFlagged: boolean;
  createdAt?: string;
  created_at?: string;
  sender?: ConversationUser;
}

interface CallItem {
  id: string;
  status: string;
  duration: number | null;
  startedAt?: string;
  started_at?: string;
  caller?: ConversationUser;
  callee?: ConversationUser;
}

interface AILogItem {
  id: string;
  actionType?: string;
  action_type?: string;
  inputText?: string | null;
  input_text?: string | null;
  outputText?: string | null;
  output_text?: string | null;
  tokensUsed?: number;
  tokens_used?: number;
  createdAt?: string;
  created_at?: string;
  user?: ConversationUser;
}

interface FlagItem {
  id: string;
  reason: string;
  keyword: string | null;
  resolvedAt?: string | null;
  resolved_at?: string | null;
  createdAt?: string;
  created_at?: string;
  message?: { content?: string; original_content?: string };
}

interface RolePermissions {
  chat: boolean;
  voiceCall: boolean;
  voiceNote: boolean;
  fileSharing: boolean;
}

interface RolePairRules {
  customer_vendor: boolean;
  customer_rider: boolean;
  vendor_rider: boolean;
  customer_customer: boolean;
  vendor_vendor: boolean;
  rider_rider: boolean;
}

interface RoleItem {
  id: string;
  name: string;
  description: string;
  permissions: RolePermissions;
  rolePairRules?: RolePairRules;
  categoryRules?: Record<string, boolean>;
  timeWindows?: { start: string; end: string };
  messageLimits?: { maxTextLength: number; maxVoiceDuration: number; dailyLimit: number };
  isPreset: boolean;
  createdByAI: boolean;
}

interface UserItem {
  id: string;
  name: string | null;
  phone: string;
  ajkId: string | null;
  roles: string[] | string;
  commBlocked: boolean;
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`p-3 rounded-xl bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  useEffect(() => {
    fetcher("/communication/dashboard").then(setStats).catch(() => {});
  }, []);

  if (!stats) return <div className="flex items-center justify-center p-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard title="Active Conversations" value={stats.activeConversations} icon={MessageCircle} color="blue" />
      <StatCard title="Messages Today" value={stats.messagesToday} icon={MessageCircle} color="green" />
      <StatCard title="Calls Today" value={stats.callsToday} icon={Phone} color="purple" />
      <StatCard title="Voice Notes Today" value={stats.voiceNotesToday} icon={Mic} color="orange" />
      <StatCard title="Flagged Messages" value={stats.flaggedMessages} icon={Flag} color="red" />
      <StatCard title="AI Usage Today" value={stats.aiUsageToday} icon={Bot} color="cyan" />
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetcher("/communication/settings").then(setSettings).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetcher("/communication/settings", { method: "PUT", body: JSON.stringify(settings) });
    } catch {}
    setSaving(false);
  };

  const toggle = (key: string) => setSettings(s => ({ ...s, [key]: s[key] === "on" ? "off" : "on" }));
  const set = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Global Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "comm_enabled", label: "Communication System" },
            { key: "comm_chat_enabled", label: "Chat Messaging" },
            { key: "comm_voice_calls_enabled", label: "Voice Calls" },
            { key: "comm_voice_notes_enabled", label: "Voice Notes" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch checked={settings[key] === "on"} onCheckedChange={() => toggle(key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Content Moderation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "comm_hide_phone", label: "Hide Phone Numbers" },
            { key: "comm_hide_email", label: "Hide Email Addresses" },
            { key: "comm_hide_cnic", label: "Hide CNIC Numbers" },
            { key: "comm_hide_bank", label: "Hide Bank Accounts" },
            { key: "comm_hide_address", label: "Hide Addresses" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch checked={settings[key] !== "off"} onCheckedChange={() => toggle(key)} />
            </div>
          ))}
          <div>
            <Label>Auto-Flag Keywords (comma separated)</Label>
            <Input value={settings.comm_flag_keywords || ""} onChange={e => set("comm_flag_keywords", e.target.value)} placeholder="scam, fraud, police" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> AI Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "comm_translation_enabled", label: "Translation" },
            { key: "comm_chat_assist_enabled", label: "Chat Compose Assist" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch checked={settings[key] !== "off"} onCheckedChange={() => toggle(key)} />
            </div>
          ))}
          <div>
            <Label>Daily AI Limit per User</Label>
            <Input type="number" value={settings.comm_daily_ai_limit || "50"} onChange={e => set("comm_daily_ai_limit", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message Limits</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Max Message Length</Label>
            <Input type="number" value={settings.comm_max_message_length || "2000"} onChange={e => set("comm_max_message_length", e.target.value)} />
          </div>
          <div>
            <Label>Max Voice Duration (seconds)</Label>
            <Input type="number" value={settings.comm_max_voice_duration || "60"} onChange={e => set("comm_max_voice_duration", e.target.value)} />
          </div>
          <div>
            <Label>Max File Size (bytes)</Label>
            <Input type="number" value={settings.comm_max_file_size || "5242880"} onChange={e => set("comm_max_file_size", e.target.value)} />
          </div>
          <div>
            <Label>Daily Message Limit</Label>
            <Input type="number" value={settings.comm_daily_message_limit || "500"} onChange={e => set("comm_daily_message_limit", e.target.value)} />
          </div>
          <div>
            <Label>Request Expiry (hours)</Label>
            <Input type="number" value={settings.comm_request_expiry_hours || "72"} onChange={e => set("comm_request_expiry_hours", e.target.value)} />
          </div>
          <div>
            <Label>Allowed File Types</Label>
            <Input value={settings.comm_allowed_file_types || ""} onChange={e => set("comm_allowed_file_types", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time Window</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Start Time</Label>
            <Input type="time" value={settings.comm_time_window_start || "00:00"} onChange={e => set("comm_time_window_start", e.target.value)} />
          </div>
          <div>
            <Label>End Time</Label>
            <Input type="time" value={settings.comm_time_window_end || "23:59"} onChange={e => set("comm_time_window_end", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WebRTC Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>STUN Servers</Label>
            <Input value={settings.comm_stun_servers || ""} onChange={e => set("comm_stun_servers", e.target.value)} />
          </div>
          <div>
            <Label>TURN Server</Label>
            <Input value={settings.comm_turn_server || ""} onChange={e => set("comm_turn_server", e.target.value)} placeholder="turn:server:3478" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>TURN Username</Label>
              <Input value={settings.comm_turn_user || ""} onChange={e => set("comm_turn_user", e.target.value)} />
            </div>
            <div>
              <Label>TURN Password</Label>
              <Input type="password" value={settings.comm_turn_pass || ""} onChange={e => set("comm_turn_pass", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving..." : "Save Settings"}</Button>
    </div>
  );
}

function ConversationsTab() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);

  useEffect(() => {
    fetcher(`/communication/conversations?search=${encodeURIComponent(search)}`).then((d: ConversationItem[] | { data: ConversationItem[] }) => setConversations(Array.isArray(d) ? d : d.data)).catch(() => {});
  }, [search]);

  const viewMessages = async (conv: ConversationItem) => {
    setSelectedConv(conv);
    const data: MessageItem[] | { data: MessageItem[] } = await fetcher(`/communication/conversations/${conv.id}/messages`);
    setMessages(Array.isArray(data) ? data : data.data);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Search by AJK ID or name..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
        <Button variant="outline" onClick={() => window.open(`/api/admin/communication/export/messages`, "_blank")}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>

      {selectedConv ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedConv.participant1?.name || "User"} ↔ {selectedConv.participant2?.name || "User"}
              </CardTitle>
              <Button variant="ghost" onClick={() => setSelectedConv(null)}>Back</Button>
            </div>
            <CardDescription>
              {selectedConv.participant1?.ajkId} ↔ {selectedConv.participant2?.ajkId}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`p-3 rounded-lg ${msg.sender?.ajkId === selectedConv.participant1?.ajkId ? "bg-blue-50 ml-0 mr-12" : "bg-gray-50 ml-12 mr-0"}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium">{msg.sender?.name || "Unknown"} ({msg.sender?.ajkId})</span>
                    <span className="text-xs text-muted-foreground">{new Date(msg.createdAt || msg.created_at || "").toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{msg.content}</p>
                  {msg.originalContent && msg.originalContent !== msg.content && (
                    <p className="text-xs text-muted-foreground mt-1">Original (admin only): {msg.originalContent}</p>
                  )}
                  {msg.messageType !== "text" && <Badge variant="secondary" className="mt-1">{msg.messageType}</Badge>}
                  {msg.isFlagged && <Badge variant="destructive" className="mt-1 ml-1">Flagged</Badge>}
                </div>
              ))}
              {messages.length === 0 && <p className="text-center text-muted-foreground py-4">No messages</p>}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Message</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.map((conv) => (
              <TableRow key={conv.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{conv.participant1?.name || "Unknown"}</span>
                    <span className="text-muted-foreground"> ({conv.participant1?.ajkId})</span>
                    <span className="mx-2">↔</span>
                    <span className="font-medium">{conv.participant2?.name || "Unknown"}</span>
                    <span className="text-muted-foreground"> ({conv.participant2?.ajkId})</span>
                  </div>
                </TableCell>
                <TableCell><Badge variant={conv.status === "active" ? "default" : "secondary"}>{conv.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleString() : "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => viewMessages(conv)}><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {conversations.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No conversations found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function CallHistoryTab() {
  const [calls, setCalls] = useState<CallItem[]>([]);
  useEffect(() => {
    fetcher("/communication/calls").then((d: CallItem[] | { data: CallItem[] }) => setCalls(Array.isArray(d) ? d : d.data)).catch(() => {});
  }, []);

  const statusColor: Record<string, string> = { completed: "default", missed: "destructive", rejected: "secondary", answered: "default", initiated: "outline" };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => window.open(`/api/admin/communication/export/calls`, "_blank")}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Caller</TableHead>
            <TableHead>Callee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => (
            <TableRow key={call.id}>
              <TableCell>{call.caller?.name || "Unknown"} <span className="text-xs text-muted-foreground">({call.caller?.ajkId})</span></TableCell>
              <TableCell>{call.callee?.name || "Unknown"} <span className="text-xs text-muted-foreground">({call.callee?.ajkId})</span></TableCell>
              <TableCell><Badge variant={(statusColor[call.status] || "secondary") as "default" | "destructive" | "secondary" | "outline"}>{call.status}</Badge></TableCell>
              <TableCell>{call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, "0")}` : "—"}</TableCell>
              <TableCell className="text-sm">{new Date(call.startedAt || call.started_at || "").toLocaleString()}</TableCell>
            </TableRow>
          ))}
          {calls.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No call history</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

function AILogsTab() {
  const [logs, setLogs] = useState<AILogItem[]>([]);
  useEffect(() => {
    fetcher("/communication/ai-logs").then((d: AILogItem[] | { data: AILogItem[] }) => setLogs(Array.isArray(d) ? d : d.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => window.open(`/api/admin/communication/export/ai-logs`, "_blank")}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Input</TableHead>
            <TableHead>Output</TableHead>
            <TableHead>Tokens</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{log.user?.name || "Unknown"} <span className="text-xs text-muted-foreground">({log.user?.ajkId})</span></TableCell>
              <TableCell><Badge variant="outline">{log.actionType || log.action_type}</Badge></TableCell>
              <TableCell className="max-w-48 truncate text-sm">{log.inputText || log.input_text || "—"}</TableCell>
              <TableCell className="max-w-48 truncate text-sm">{log.outputText || log.output_text || "—"}</TableCell>
              <TableCell>{log.tokensUsed || log.tokens_used || 0}</TableCell>
              <TableCell className="text-sm">{new Date(log.createdAt || log.created_at || "").toLocaleString()}</TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No AI logs</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

function FlaggedTab() {
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    fetcher(`/communication/flags?status=${status}`).then((d: FlagItem[] | { data: FlagItem[] }) => setFlags(Array.isArray(d) ? d : d.data)).catch(() => {});
  }, [status]);

  const resolve = async (id: string) => {
    await fetcher(`/communication/flags/${id}/resolve`, { method: "PATCH" });
    setFlags(f => f.filter(fl => fl.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={status === "pending" ? "default" : "outline"} onClick={() => setStatus("pending")}>Pending</Button>
        <Button variant={status === "resolved" ? "default" : "outline"} onClick={() => setStatus("resolved")}>Resolved</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reason</TableHead>
            <TableHead>Keyword</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flags.map((flag) => (
            <TableRow key={flag.id}>
              <TableCell>{flag.reason}</TableCell>
              <TableCell>{flag.keyword || "—"}</TableCell>
              <TableCell className="max-w-64 truncate text-sm">{flag.message?.content || flag.message?.original_content || "—"}</TableCell>
              <TableCell className="text-sm">{new Date(flag.createdAt || flag.created_at || "").toLocaleString()}</TableCell>
              <TableCell>
                {!flag.resolvedAt && !flag.resolved_at && (
                  <Button variant="ghost" size="sm" onClick={() => resolve(flag.id)}><CheckCircle className="h-4 w-4 text-green-600" /></Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {flags.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No flagged messages</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

const ROLE_PAIR_LABELS: Record<string, string> = {
  customer_vendor: "Customer ↔ Vendor",
  customer_rider: "Customer ↔ Rider",
  vendor_rider: "Vendor ↔ Rider",
  customer_customer: "Customer ↔ Customer",
  vendor_vendor: "Vendor ↔ Vendor",
  rider_rider: "Rider ↔ Rider",
};

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  mart: "Mart",
  pharmacy: "Pharmacy",
  parcel: "Parcel",
};

const DEFAULT_ROLE_PAIR_RULES: RolePairRules = {
  customer_vendor: true,
  customer_rider: false,
  vendor_rider: false,
  customer_customer: false,
  vendor_vendor: false,
  rider_rider: false,
};

const DEFAULT_CATEGORY_RULES: Record<string, boolean> = {
  food: true,
  mart: true,
  pharmacy: true,
  parcel: true,
};

function RoleTemplatesTab() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    permissions: { chat: true, voiceCall: false, voiceNote: false, fileSharing: false } as RolePermissions,
    rolePairRules: { ...DEFAULT_ROLE_PAIR_RULES } as RolePairRules,
    categoryRules: { ...DEFAULT_CATEGORY_RULES } as Record<string, boolean>,
    timeWindows: { start: "08:00", end: "22:00" },
    messageLimits: { maxTextLength: 2000, maxVoiceDuration: 60, dailyLimit: 500 },
  });

  useEffect(() => {
    fetcher("/communication/roles").then((d: RoleItem[] | { data: RoleItem[] }) => setRoles(Array.isArray(d) ? d : d.data)).catch(() => {});
  }, []);

  const resetForm = () => {
    setNewRole({
      name: "",
      description: "",
      permissions: { chat: true, voiceCall: false, voiceNote: false, fileSharing: false },
      rolePairRules: { ...DEFAULT_ROLE_PAIR_RULES },
      categoryRules: { ...DEFAULT_CATEGORY_RULES },
      timeWindows: { start: "08:00", end: "22:00" },
      messageLimits: { maxTextLength: 2000, maxVoiceDuration: 60, dailyLimit: 500 },
    });
    setAiDescription("");
  };

  const createRole = async () => {
    await fetcher("/communication/roles", { method: "POST", body: JSON.stringify(newRole) });
    setCreating(false);
    resetForm();
    const data: RoleItem[] | { data: RoleItem[] } = await fetcher("/communication/roles");
    setRoles(Array.isArray(data) ? data : data.data);
  };

  const deleteRole = async (id: string) => {
    await fetcher(`/communication/roles/${id}`, { method: "DELETE" });
    setRoles(r => r.filter(rl => rl.id !== id));
  };

  const generateWithAI = async () => {
    if (!aiDescription) return;
    setAiGenerating(true);
    try {
      const result = await fetcher("/communication/roles/ai-generate", { method: "POST", body: JSON.stringify({ description: aiDescription }) });
      const data = (result as { data?: Partial<RoleItem> }).data || result;
      setNewRole(prev => ({
        ...prev,
        name: data.name || prev.name,
        description: aiDescription,
        permissions: data.permissions || prev.permissions,
        rolePairRules: data.rolePairRules || prev.rolePairRules,
        categoryRules: data.categoryRules || prev.categoryRules,
        timeWindows: data.timeWindows || prev.timeWindows,
        messageLimits: data.messageLimits || prev.messageLimits,
      }));
    } catch {}
    setAiGenerating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Communication Role Templates</h3>
        <Dialog open={creating} onOpenChange={(open) => { setCreating(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>Create Role</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Communication Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <div className="p-4 rounded-lg border bg-muted/50">
                <Label className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4" /> AI-Assisted Creation</Label>
                <Textarea placeholder="Describe the role in plain language, e.g., 'Customer can only chat with vendor during active order, no calls allowed'" value={aiDescription} onChange={e => setAiDescription(e.target.value)} />
                <Button variant="outline" size="sm" className="mt-2" onClick={generateWithAI} disabled={aiGenerating}>{aiGenerating ? "Generating..." : "Generate with AI"}</Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input value={newRole.name} onChange={e => setNewRole(r => ({ ...r, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={newRole.description} onChange={e => setNewRole(r => ({ ...r, description: e.target.value }))} />
                </div>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Feature Permissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(Object.entries(newRole.permissions) as [keyof RolePermissions, boolean][]).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                      <Switch checked={val} onCheckedChange={v => setNewRole(r => ({ ...r, permissions: { ...r.permissions, [key]: v } }))} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Role-Pair Communication Rules</CardTitle>
                  <CardDescription>Which user types can communicate with each other</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(Object.entries(newRole.rolePairRules) as [keyof RolePairRules, boolean][]).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">{ROLE_PAIR_LABELS[key] || key}</span>
                      <Switch checked={val} onCheckedChange={v => setNewRole(r => ({ ...r, rolePairRules: { ...r.rolePairRules, [key]: v } }))} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Category Rules</CardTitle>
                  <CardDescription>Which order categories this role applies to</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(newRole.categoryRules).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">{CATEGORY_LABELS[key] || key}</span>
                      <Switch checked={val} onCheckedChange={v => setNewRole(r => ({ ...r, categoryRules: { ...r.categoryRules, [key]: v } }))} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Time Window & Limits</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Start Time</Label>
                    <Input type="time" value={newRole.timeWindows.start} onChange={e => setNewRole(r => ({ ...r, timeWindows: { ...r.timeWindows, start: e.target.value } }))} />
                  </div>
                  <div>
                    <Label className="text-xs">End Time</Label>
                    <Input type="time" value={newRole.timeWindows.end} onChange={e => setNewRole(r => ({ ...r, timeWindows: { ...r.timeWindows, end: e.target.value } }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Max Text Length</Label>
                    <Input type="number" value={newRole.messageLimits.maxTextLength} onChange={e => setNewRole(r => ({ ...r, messageLimits: { ...r.messageLimits, maxTextLength: parseInt(e.target.value) || 0 } }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Max Voice Duration (s)</Label>
                    <Input type="number" value={newRole.messageLimits.maxVoiceDuration} onChange={e => setNewRole(r => ({ ...r, messageLimits: { ...r.messageLimits, maxVoiceDuration: parseInt(e.target.value) || 0 } }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Daily Message Limit</Label>
                    <Input type="number" value={newRole.messageLimits.dailyLimit} onChange={e => setNewRole(r => ({ ...r, messageLimits: { ...r.messageLimits, dailyLimit: parseInt(e.target.value) || 0 } }))} />
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button onClick={createRole}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{role.name}</CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </div>
                <div className="flex gap-1">
                  {role.isPreset && <Badge variant="secondary">Preset</Badge>}
                  {role.createdByAI && <Badge variant="outline">AI</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Features</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions && Object.entries(role.permissions).filter(([, v]) => v).map(([k]) => (
                    <Badge key={k} variant="outline" className="text-xs capitalize">{k.replace(/([A-Z])/g, " $1")}</Badge>
                  ))}
                </div>
              </div>
              {role.rolePairRules && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Allowed Pairs</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(role.rolePairRules).filter(([, v]) => v).map(([k]) => (
                      <Badge key={k} variant="secondary" className="text-xs">{ROLE_PAIR_LABELS[k] || k}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {role.categoryRules && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Categories</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(role.categoryRules).filter(([, v]) => v).map(([k]) => (
                      <Badge key={k} className="text-xs bg-blue-100 text-blue-700">{CATEGORY_LABELS[k] || k}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {role.timeWindows && (
                <p className="text-xs text-muted-foreground">Time: {role.timeWindows.start} – {role.timeWindows.end}</p>
              )}
              {!role.isPreset && (
                <Button variant="destructive" size="sm" onClick={() => deleteRole(role.id)}>Delete</Button>
              )}
            </CardContent>
          </Card>
        ))}
        {roles.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">No role templates</p>}
      </div>
    </div>
  );
}

function AjkIdsTab() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [editId, setEditId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadUsers = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    fetcher(`/communication/ajk-ids?${params.toString()}`).then(setUsers).catch(() => {});
  };

  useEffect(() => { loadUsers(); }, [search, roleFilter]);

  const searchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const data = await fetcher(`/communication/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(data as UserItem[]);
    } catch { setSearchResults([]); }
  };

  const saveAjkId = async () => {
    if (!editUser || !editId.trim()) return;
    setSaving(true);
    setError("");
    try {
      await fetcher(`/communication/ajk-ids/${editUser.id}`, {
        method: "PUT",
        body: JSON.stringify({ ajkId: editId.trim() }),
      });
      setEditUser(null);
      setEditId("");
      loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /> Gold / Custom AJK IDs</CardTitle>
          <CardDescription>Assign custom or "gold" AJK IDs to any user, vendor, rider, or admin. Search by name, phone, or current AJK ID.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or AJK ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="h-10 px-3 rounded-md border text-sm"
            >
              <option value="">All Roles</option>
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="rider">Rider</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Current AJK ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{u.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{Array.isArray(u.roles) ? u.roles.join(", ") : u.roles || "customer"}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-bold text-primary">{u.ajkId}</span>
                  </TableCell>
                  <TableCell>
                    {u.commBlocked ? <Badge variant="destructive">Blocked</Badge> : <Badge className="bg-green-100 text-green-700">Active</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => { setEditUser(u); setEditId(u.ajkId || ""); setError(""); }}>
                      <Pencil className="h-3 w-3 mr-1" />Edit ID
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /> Assign Gold Number</CardTitle>
          <CardDescription>Search for any user and assign them a custom AJK ID — like a "gold number" (e.g., AJK-AHMED1, AJK-VIP001, AJK-GOLD99)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search user by name, phone, or AJK ID..."
              value={searchQuery}
              onChange={e => searchUsers(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
              {searchResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setEditUser(u); setEditId(u.ajkId || ""); setError(""); setSearchResults([]); setSearchQuery(""); }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 text-left"
                >
                  <div>
                    <p className="font-medium">{u.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{u.phone} &middot; {Array.isArray(u.roles) ? u.roles.join(", ") : u.roles}</p>
                  </div>
                  <span className="font-mono text-sm text-primary">{u.ajkId || "No AJK ID"}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editUser} onOpenChange={open => { if (!open) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /> Edit AJK ID</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{editUser.name || "Unknown"}</p>
                <p className="text-sm text-muted-foreground">{editUser.phone} &middot; {Array.isArray(editUser.roles) ? editUser.roles.join(", ") : editUser.roles}</p>
                {editUser.ajkId && <p className="text-sm mt-1">Current: <span className="font-mono font-bold">{editUser.ajkId}</span></p>}
              </div>
              <div className="space-y-2">
                <Label>New AJK ID (Gold Number)</Label>
                <Input
                  value={editId}
                  onChange={e => { setEditId(e.target.value.toUpperCase()); setError(""); }}
                  placeholder="e.g. AJK-AHMED1, AJK-VIP001, AJK-GOLD99"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Only uppercase letters, numbers, and hyphens. 3-20 characters.</p>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={saveAjkId} disabled={saving || !editId.trim()}>
              {saving ? "Saving..." : "Save Gold ID"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Communication() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Communication System</h1>
        <p className="text-muted-foreground">Manage chat, calls, voice notes, AI features, and moderation</p>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full">
          <TabsTrigger value="dashboard"><BarChart2 className="h-4 w-4 mr-1 hidden sm:block" />Dashboard</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 className="h-4 w-4 mr-1 hidden sm:block" />Settings</TabsTrigger>
          <TabsTrigger value="ajk-ids"><Crown className="h-4 w-4 mr-1 hidden sm:block" />AJK IDs</TabsTrigger>
          <TabsTrigger value="conversations"><MessageCircle className="h-4 w-4 mr-1 hidden sm:block" />Conversations</TabsTrigger>
          <TabsTrigger value="calls"><Phone className="h-4 w-4 mr-1 hidden sm:block" />Calls</TabsTrigger>
          <TabsTrigger value="ai-logs"><Bot className="h-4 w-4 mr-1 hidden sm:block" />AI Logs</TabsTrigger>
          <TabsTrigger value="flagged"><Flag className="h-4 w-4 mr-1 hidden sm:block" />Flagged</TabsTrigger>
          <TabsTrigger value="roles"><Users className="h-4 w-4 mr-1 hidden sm:block" />Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
        <TabsContent value="ajk-ids"><AjkIdsTab /></TabsContent>
        <TabsContent value="conversations"><ConversationsTab /></TabsContent>
        <TabsContent value="calls"><CallHistoryTab /></TabsContent>
        <TabsContent value="ai-logs"><AILogsTab /></TabsContent>
        <TabsContent value="flagged"><FlaggedTab /></TabsContent>
        <TabsContent value="roles"><RoleTemplatesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
