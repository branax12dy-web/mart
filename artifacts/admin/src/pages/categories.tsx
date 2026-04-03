import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderTree, Plus, Pencil, Trash2, Save,
  ChevronRight, ChevronDown, ArrowUp, ArrowDown,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetcher } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/useLanguage";
import { tDual, type TranslationKey } from "@workspace/i18n";

interface Category {
  id: string;
  name: string;
  icon: string;
  type: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
}

const ICON_OPTIONS = [
  "grid-outline", "leaf-outline", "fish-outline", "egg-outline", "cafe-outline",
  "home-outline", "wine-outline", "pizza-outline", "heart-outline",
  "restaurant-outline", "fast-food-outline", "flame-outline", "nutrition-outline",
  "ice-cream-outline", "basket-outline", "cart-outline", "medical-outline",
  "fitness-outline", "paw-outline", "shirt-outline", "car-outline",
  "book-outline", "laptop-outline", "phone-portrait-outline", "gift-outline",
  "flower-outline", "color-palette-outline", "construct-outline", "diamond-outline",
];

const TYPE_OPTIONS = [
  { value: "mart", label: "Mart" },
  { value: "food", label: "Food" },
  { value: "pharmacy", label: "Pharmacy" },
];

const EMPTY_FORM = {
  name: "",
  icon: "grid-outline",
  type: "mart",
  parentId: "",
  sortOrder: 0,
  isActive: true,
};

export default function CategoriesPage() {
  const { language } = useLanguage();
  const T = (key: TranslationKey) => tDual(key, language);
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editing, setEditing] = useState<Category | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories-tree", filterType],
    queryFn: () => fetcher(`/categories/tree${filterType ? `?type=${filterType}` : ""}`),
    refetchInterval: 30000,
  });

  const categories: Category[] = data?.categories || [];

  const flatCategories = categories.flatMap(c => [c, ...(c.children || [])]);
  const topLevelCategories = categories;

  const saveMutation = useMutation({
    mutationFn: async (body: any) => {
      if (editing) return fetcher(`/categories/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      return fetcher("/categories", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories-tree"] });
      setDialogOpen(false);
      setEditing(null);
      setForm({ ...EMPTY_FORM });
      toast({ title: editing ? "Category updated" : "Category created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetcher(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories-tree"] });
      toast({ title: "Category deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetcher(`/categories/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories-tree"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      fetcher("/categories/reorder", { method: "POST", body: JSON.stringify({ items }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories-tree"] }),
  });

  const moveCategory = (catId: string, direction: "up" | "down", parentId?: string | null) => {
    const siblings = parentId
      ? categories.find(c => c.id === parentId)?.children ?? []
      : categories;
    const sorted = [...siblings].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(c => c.id === catId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const items = [
      { id: sorted[idx]!.id, sortOrder: sorted[swapIdx]!.sortOrder },
      { id: sorted[swapIdx]!.id, sortOrder: sorted[idx]!.sortOrder },
    ];
    reorderMutation.mutate(items);
  };

  const openNew = (parentId?: string) => {
    setEditing(null);
    const nextSort = parentId
      ? (categories.find(c => c.id === parentId)?.children?.length ?? 0)
      : categories.length;
    setForm({ ...EMPTY_FORM, parentId: parentId || "", sortOrder: nextSort });
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      icon: cat.icon,
      type: cat.type,
      parentId: cat.parentId || "",
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      name: form.name.trim(),
      icon: form.icon,
      type: form.type,
      parentId: form.parentId || null,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalActive = flatCategories.filter(c => c.isActive).length;
  const totalInactive = flatCategories.filter(c => !c.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{T("navCategories")}</h1>
            <p className="text-muted-foreground text-sm">
              {totalActive} active · {totalInactive} inactive
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="">All Types</option>
            {TYPE_OPTIONS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <Button onClick={() => openNew()} className="h-10 rounded-xl gap-2 shadow-md">
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <Card className="rounded-2xl border-border/50">
            <CardContent className="p-16 text-center">
              <FolderTree className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No categories yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Create your first category to get started</p>
              <Button onClick={() => openNew()} className="mt-4 rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Add Category
              </Button>
            </CardContent>
          </Card>
        ) : (
          categories.map(cat => {
            const hasChildren = (cat.children?.length ?? 0) > 0;
            const isExpanded = expandedIds.has(cat.id);
            return (
              <div key={cat.id}>
                <Card className={`rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-shadow ${!cat.isActive ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {hasChildren ? (
                          <button onClick={() => toggleExpand(cat.id)} className="p-1 hover:bg-muted rounded-md">
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        ) : (
                          <div className="w-6" />
                        )}
                      </div>

                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">📂</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground truncate">{cat.name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            cat.type === "mart" ? "bg-violet-100 text-violet-700"
                            : cat.type === "food" ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                          }`}>
                            {cat.type.toUpperCase()}
                          </span>
                          {!cat.isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Icon: {cat.icon} · Order: {cat.sortOrder}
                          {hasChildren && ` · ${cat.children!.length} sub-categories`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openNew(cat.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="Add sub-category"
                        >
                          <Plus className="w-4 h-4 text-indigo-600" />
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate({ id: cat.id, isActive: !cat.isActive })}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title={cat.isActive ? "Deactivate" : "Activate"}
                        >
                          {cat.isActive
                            ? <ToggleRight className="w-5 h-5 text-green-600" />
                            : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                        </button>
                        <button onClick={() => moveCategory(cat.id, "up", null)} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Move up">
                          <ArrowUp className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => moveCategory(cat.id, "down", null)} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Move down">
                          <ArrowDown className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => openEdit(cat)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${cat.name}"? This will also unparent any sub-categories.`)) {
                              deleteMutation.mutate(cat.id);
                            }
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {hasChildren && isExpanded && (
                  <div className="ml-10 mt-1 space-y-1">
                    {cat.children!.map(child => (
                      <Card key={child.id} className={`rounded-xl border-border/40 shadow-sm ${!child.isActive ? "opacity-60" : ""}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-4 flex-shrink-0" />
                            <div className="w-8 h-8 bg-indigo-50/60 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-sm">📄</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{child.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                Icon: {child.icon} · Order: {child.sortOrder}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => toggleMutation.mutate({ id: child.id, isActive: !child.isActive })}
                                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                              >
                                {child.isActive
                                  ? <ToggleRight className="w-4 h-4 text-green-600" />
                                  : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                              </button>
                              <button onClick={() => moveCategory(child.id, "up", cat.id)} className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Move up">
                                <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                              <button onClick={() => moveCategory(child.id, "down", cat.id)} className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Move down">
                                <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                              <button onClick={() => openEdit(child)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                                <Pencil className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete "${child.name}"?`)) deleteMutation.mutate(child.id);
                                }}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setEditing(null); setForm({ ...EMPTY_FORM }); } }}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-indigo-500" />
              {editing ? "Edit Category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Name <span className="text-red-500">*</span></label>
              <Input
                placeholder="e.g. Dairy & Eggs"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {TYPE_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Parent Category <span className="text-muted-foreground font-normal">(optional)</span></label>
              <select
                value={form.parentId}
                onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">— None (top level) —</option>
                {categories
                  .filter(c => c.id !== editing?.id)
                  .flatMap(c => [
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>,
                    ...(c.children || [])
                      .filter(ch => ch.id !== editing?.id)
                      .map(ch => (
                        <option key={ch.id} value={ch.id}>&nbsp;&nbsp;↳ {ch.name}</option>
                      ))
                  ])}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Icon</label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setForm(f => ({ ...f, icon }))}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                      form.icon === icon
                        ? "bg-indigo-500 text-white border-indigo-500"
                        : "bg-muted border-border text-muted-foreground hover:border-indigo-300"
                    }`}
                  >
                    {icon.replace("-outline", "")}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Sort Order</label>
              <Input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                className="h-11 rounded-xl"
              />
            </div>

            <div
              onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                form.isActive ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
              }`}
            >
              <span className="text-sm font-semibold">Active (visible to users)</span>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${form.isActive ? "bg-green-500" : "bg-gray-300"}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={saveMutation.isPending} className="flex-1 rounded-xl gap-2">
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? "Saving..." : (editing ? "Update" : "Create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
