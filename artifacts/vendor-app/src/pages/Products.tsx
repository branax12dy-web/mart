import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

function formatCurrency(n: number) { return `Rs. ${Math.round(n).toLocaleString()}`; }

interface Product {
  id: string; name: string; description?: string; price: number;
  originalPrice?: number; category?: string; image?: string;
  inStock: boolean; stock?: number;
}

const EMPTY: Omit<Product, "id" | "inStock"> = { name: "", description: "", price: 0, originalPrice: 0, category: "", stock: 0 };

export default function Products() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Product | null>(null);
  const [form, setForm]         = useState<typeof EMPTY>({ ...EMPTY });
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3000); };
  const field = (k: keyof typeof EMPTY, v: any) => setForm(f => ({ ...f, [k]: v }));

  const { data, isLoading } = useQuery({ queryKey: ["vendor-products"], queryFn: () => api.getProducts() });
  const products: Product[] = data?.products || [];

  const createMut = useMutation({
    mutationFn: () => api.createProduct(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-products"] }); setShowForm(false); setForm({ ...EMPTY }); showToast("✅ Product added!"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  const updateMut = useMutation({
    mutationFn: () => api.updateProduct(editing!.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-products"] }); setEditing(null); setShowForm(false); showToast("✅ Product updated!"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendor-products"] }); showToast("🗑️ Product deleted"); },
    onError: (e: any) => showToast("❌ " + e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) => api.toggleProduct(id, available),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-products"] }),
    onError: (e: any) => showToast("❌ " + e.message),
  });

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || "", price: p.price, originalPrice: p.originalPrice || 0, category: p.category || "", stock: p.stock || 0 });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); setForm({ ...EMPTY }); };

  if (showForm) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={closeForm} className="text-white text-xl">←</button>
          <h1 className="text-2xl font-bold text-white">{editing ? "Edit Product" : "Add Product"}</h1>
        </div>
      </div>
      <div className="px-4 py-4 space-y-4">
        {[
          { label: "Product Name *", key: "name", type: "text", placeholder: "e.g. Chicken Biryani" },
          { label: "Description", key: "description", type: "text", placeholder: "Brief description..." },
          { label: "Price (Rs.) *", key: "price", type: "number", placeholder: "0" },
          { label: "Original Price (Rs.)", key: "originalPrice", type: "number", placeholder: "0 (optional, for discount)" },
          { label: "Category", key: "category", type: "text", placeholder: "e.g. Food, Grocery, Medicine" },
          { label: "Stock", key: "stock", type: "number", placeholder: "0 (0 = unlimited)" },
        ].map(({ label, key, type, placeholder }) => (
          <div key={key}>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">{label}</label>
            <input
              type={type} placeholder={placeholder}
              value={(form as any)[key]}
              onChange={e => field(key as any, type === "number" ? Number(e.target.value) : e.target.value)}
              className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        ))}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Image URL (optional)</label>
          <input
            type="url" placeholder="https://..." value={(form as any).image || ""}
            onChange={e => field("image" as any, e.target.value)}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={closeForm} className="flex-1 h-12 border-2 border-gray-200 text-gray-600 font-bold rounded-xl">Cancel</button>
          <button
            onClick={() => editing ? updateMut.mutate() : createMut.mutate()}
            disabled={!form.name || form.price <= 0 || createMut.isPending || updateMut.isPending}
            className="flex-1 h-12 bg-orange-500 text-white font-bold rounded-xl disabled:opacity-60"
          >
            {createMut.isPending || updateMut.isPending ? "Saving..." : editing ? "Update" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Products</h1>
            <p className="text-orange-100 text-sm">{products.length} items in your menu</p>
          </div>
          <button onClick={() => setShowForm(true)} className="bg-white text-orange-500 font-bold px-4 py-2 rounded-xl text-sm">+ Add</button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          [1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse"/>)
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🍽️</p>
            <p className="font-bold text-gray-700">No products yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your first product to start selling</p>
            <button onClick={() => setShowForm(true)} className="mt-4 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold">+ Add Product</button>
          </div>
        ) : (
          products.map(p => (
            <div key={p.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${!p.inStock ? "opacity-60" : ""}`}>
              <div className="p-4 flex items-center gap-3">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0"/>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{p.name}</p>
                      {p.category && <p className="text-xs text-orange-500 font-semibold capitalize">{p.category}</p>}
                      {p.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-bold text-orange-600">{formatCurrency(p.price)}</p>
                      {p.originalPrice && p.originalPrice > p.price && (
                        <p className="text-xs text-gray-400 line-through">{formatCurrency(p.originalPrice)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => toggleMut.mutate({ id: p.id, available: !p.inStock })} className={`text-xs font-bold px-2 py-1 rounded-lg ${p.inStock ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {p.inStock ? "✓ Available" : "✗ Unavailable"}
                    </button>
                    <button onClick={() => openEdit(p)} className="text-xs bg-blue-50 text-blue-600 font-bold px-2 py-1 rounded-lg">Edit</button>
                    <button onClick={() => { if(window.confirm?.(`Delete "${p.name}"?`) !== false) deleteMut.mutate(p.id); }} className="text-xs bg-red-50 text-red-600 font-bold px-2 py-1 rounded-lg">Del</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {toastMsg && (
        <div className="fixed top-6 left-4 right-4 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-2xl text-center">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
