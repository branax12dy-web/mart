import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

function fc(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }

const EMPTY_PRODUCT = { name: "", description: "", price: "", originalPrice: "", category: "", unit: "", stock: "", image: "", type: "mart" };
const EMPTY_ROW = { name: "", price: "", category: "", unit: "", stock: "" };

const CATEGORIES = ["food","grocery","bakery","pharmacy","electronics","clothing","mart","general"];
const TYPES = ["mart","food","pharmacy","parcel"];

export default function Products() {
  const qc = useQueryClient();
  const [view, setView]         = useState<"list"|"bulk">("list");
  const [search, setSearch]     = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [showAdd, setShowAdd]   = useState(false);
  const [editProd, setEditProd] = useState<any | null>(null);
  const [form, setForm]         = useState({ ...EMPTY_PRODUCT });
  const [bulkRows, setBulkRows] = useState([{ ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW }]);
  const [toast, setToast]       = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };
  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const { data, isLoading } = useQuery({ queryKey: ["vendor-products", search, filterCat], queryFn: () => api.getProducts(search || undefined, filterCat !== "all" ? filterCat : undefined), refetchInterval: 60000 });
  const products: any[] = data?.products || [];

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => p.category && cats.add(p.category));
    return ["all", ...Array.from(cats)];
  }, [products]);

  const lowStock = products.filter(p => p.stock !== null && p.stock !== undefined && p.stock < 10 && p.stock >= 0);

  const createMut = useMutation({
    mutationFn: () => api.createProduct({ ...form, price: Number(form.price), originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined, stock: form.stock ? Number(form.stock) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-products"] }); setShowAdd(false); setForm({ ...EMPTY_PRODUCT }); showToast("✅ Product added!"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  const updateMut = useMutation({
    mutationFn: () => api.updateProduct(editProd.id, { ...form, price: Number(form.price), originalPrice: form.originalPrice ? Number(form.originalPrice) : null, stock: form.stock !== "" ? Number(form.stock) : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-products"] }); setEditProd(null); setShowAdd(false); showToast("✅ Product updated!"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-products"] }); showToast("🗑️ Deleted"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, inStock }: { id: string; inStock: boolean }) => api.updateProduct(id, { inStock }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-products"] }),
    onError: (e: any) => showToast("❌ " + e.message),
  });

  const bulkMut = useMutation({
    mutationFn: () => {
      const valid = bulkRows.filter(r => r.name.trim() && r.price);
      return api.bulkAddProducts(valid.map(r => ({ name: r.name.trim(), price: Number(r.price), category: r.category || "general", unit: r.unit || null, stock: r.stock ? Number(r.stock) : null })));
    },
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["vendor-products"] }); setView("list"); setBulkRows([{...EMPTY_ROW},{...EMPTY_ROW},{...EMPTY_ROW}]); showToast(`✅ ${res.inserted} products added!`); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  const openEdit = (p: any) => {
    setEditProd(p);
    setForm({ name: p.name, description: p.description||"", price: String(p.price), originalPrice: p.originalPrice ? String(p.originalPrice) : "", category: p.category||"", unit: p.unit||"", stock: p.stock !== null && p.stock !== undefined ? String(p.stock) : "", image: p.image||"", type: p.type||"mart" });
    setShowAdd(true);
  };

  const closeForm = () => { setShowAdd(false); setEditProd(null); setForm({ ...EMPTY_PRODUCT }); };

  /* ── Add/Edit Form ── */
  if (showAdd) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={closeForm} className="text-white text-xl">←</button>
          <h1 className="text-xl font-bold text-white">{editProd ? "Edit Product" : "Add Product"}</h1>
        </div>
      </div>
      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Product Name *</label>
            <input value={form.name} onChange={e => f("name", e.target.value)} placeholder="e.g. Chicken Biryani" className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Price (Rs.) *</label>
            <input type="number" value={form.price} onChange={e => f("price", e.target.value)} placeholder="0" className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Original Price</label>
            <input type="number" value={form.originalPrice} onChange={e => f("originalPrice", e.target.value)} placeholder="0 (for discount)" className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Category</label>
            <select value={form.category} onChange={e => f("category", e.target.value)} className="w-full h-12 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">Select...</option>
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Type</label>
            <select value={form.type} onChange={e => f("type", e.target.value)} className="w-full h-12 px-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              {TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Unit</label>
            <input value={form.unit} onChange={e => f("unit", e.target.value)} placeholder="kg, pcs, ltr..." className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Stock Qty</label>
            <input type="number" value={form.stock} onChange={e => f("stock", e.target.value)} placeholder="Leave blank = unlimited" className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Description</label>
            <textarea value={form.description} onChange={e => f("description", e.target.value)} placeholder="Short description..." rows={2} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"/>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">Image URL</label>
            <input type="url" value={form.image} onChange={e => f("image", e.target.value)} placeholder="https://..." className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={closeForm} className="flex-1 h-12 border-2 border-gray-200 text-gray-600 font-bold rounded-xl">Cancel</button>
          <button
            onClick={() => editProd ? updateMut.mutate() : createMut.mutate()}
            disabled={!form.name || !form.price || createMut.isPending || updateMut.isPending}
            className="flex-1 h-12 bg-orange-500 text-white font-bold rounded-xl disabled:opacity-60"
          >{createMut.isPending || updateMut.isPending ? "Saving..." : editProd ? "Update" : "Add Product"}</button>
        </div>
      </div>
    </div>
  );

  /* ── Bulk Add Form ── */
  if (view === "bulk") return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-12 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className="text-white text-xl">←</button>
          <div><h1 className="text-xl font-bold text-white">Bulk Add Products</h1><p className="text-orange-100 text-xs">Add up to 50 products at once</p></div>
        </div>
      </div>
      <div className="px-4 py-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="grid grid-cols-12 gap-0 px-3 py-2 bg-gray-50 border-b border-gray-100">
            <p className="col-span-4 text-[10px] font-bold text-gray-500 uppercase">Name*</p>
            <p className="col-span-2 text-[10px] font-bold text-gray-500 uppercase">Price*</p>
            <p className="col-span-3 text-[10px] font-bold text-gray-500 uppercase">Category</p>
            <p className="col-span-2 text-[10px] font-bold text-gray-500 uppercase">Stock</p>
            <p className="col-span-1 text-[10px] font-bold text-gray-500 uppercase"></p>
          </div>
          {bulkRows.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-1 px-2 py-2 border-b border-gray-50 last:border-0">
              <input className="col-span-4 h-9 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" value={row.name} onChange={e => setBulkRows(rows => rows.map((r,j) => j===i ? {...r,name:e.target.value} : r))} placeholder="Product name"/>
              <input className="col-span-2 h-9 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" type="number" value={row.price} onChange={e => setBulkRows(rows => rows.map((r,j) => j===i ? {...r,price:e.target.value} : r))} placeholder="Rs."/>
              <input className="col-span-3 h-9 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" value={row.category} onChange={e => setBulkRows(rows => rows.map((r,j) => j===i ? {...r,category:e.target.value} : r))} placeholder="category"/>
              <input className="col-span-2 h-9 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" type="number" value={row.stock} onChange={e => setBulkRows(rows => rows.map((r,j) => j===i ? {...r,stock:e.target.value} : r))} placeholder="qty"/>
              <button onClick={() => setBulkRows(rows => rows.filter((_,j) => j !== i))} className="col-span-1 text-red-400 text-xs font-bold flex items-center justify-center">✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mb-4">
          <button onClick={() => setBulkRows(rows => [...rows, {...EMPTY_ROW}])} className="flex-1 h-10 border-2 border-dashed border-orange-300 text-orange-500 font-bold rounded-xl text-sm">+ Add Row</button>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setView("list")} className="flex-1 h-12 border-2 border-gray-200 text-gray-600 font-bold rounded-xl">Cancel</button>
          <button
            onClick={() => bulkMut.mutate()}
            disabled={bulkMut.isPending || bulkRows.filter(r => r.name && r.price).length === 0}
            className="flex-1 h-12 bg-orange-500 text-white font-bold rounded-xl disabled:opacity-60"
          >{bulkMut.isPending ? "Adding..." : `Add ${bulkRows.filter(r => r.name && r.price).length} Products`}</button>
        </div>
      </div>
    </div>
  );

  /* ── Product List ── */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-12 pb-5">
        <div className="flex items-center justify-between mb-3">
          <div><h1 className="text-2xl font-bold text-white">Products</h1><p className="text-orange-100 text-sm">{products.length} items</p></div>
          <div className="flex gap-2">
            <button onClick={() => setView("bulk")} className="bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl">Bulk Add</button>
            <button onClick={() => setShowAdd(true)} className="bg-white text-orange-500 text-sm font-bold px-3 py-2 rounded-xl">+ Add</button>
          </div>
        </div>
        <div className="flex gap-2">
          <input type="search" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 h-10 px-4 bg-white/20 text-white placeholder-orange-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:text-gray-800 transition-colors"/>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto">
        {categories.map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap capitalize transition-colors ${filterCat === c ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600"}`}
          >{c}</button>
        ))}
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <p className="text-sm text-red-700 font-medium">{lowStock.length} product{lowStock.length > 1 ? "s" : ""} running low on stock</p>
        </div>
      )}

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          [1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse"/>)
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🍽️</p>
            <p className="font-bold text-gray-700">{search ? "No matching products" : "No products yet"}</p>
            <p className="text-gray-400 text-sm mt-1">{search ? "Try a different search" : "Add your first product"}</p>
            {!search && <button onClick={() => setShowAdd(true)} className="mt-4 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold">+ Add Product</button>}
          </div>
        ) : (
          products.map(p => (
            <div key={p.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${!p.inStock ? "opacity-60" : ""}`}>
              <div className="p-4 flex items-start gap-3">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0"/>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{p.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {p.category && <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-1.5 py-0.5 rounded-full capitalize">{p.category}</span>}
                        {p.unit && <span className="text-[10px] text-gray-400">/{p.unit}</span>}
                        {p.stock !== null && p.stock !== undefined && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.stock < 10 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                            {p.stock < 10 ? `⚠️ ${p.stock} left` : `${p.stock} in stock`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-orange-600 text-sm">{fc(p.price)}</p>
                      {p.originalPrice && p.originalPrice > p.price && (
                        <p className="text-[10px] text-gray-400 line-through">{fc(p.originalPrice)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <button onClick={() => toggleMut.mutate({ id: p.id, inStock: !p.inStock })} className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${p.inStock ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.inStock ? "✓ Available" : "✗ Unavailable"}
                    </button>
                    <button onClick={() => openEdit(p)} className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-1 rounded-lg">✏️ Edit</button>
                    <button onClick={() => deleteMut.mutate(p.id)} className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-1 rounded-lg">🗑️ Del</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {toast && <div className="fixed top-6 left-4 right-4 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-2xl text-center">{toast}</div>}
    </div>
  );
}
