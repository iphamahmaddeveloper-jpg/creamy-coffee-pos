import React, { useState } from 'react';
import {
  Package,
  ChefHat,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Layers,
  Barcode,
  RefreshCw,
  Download,
  Check,
  X
} from 'lucide-react';
import { downloadCsv } from '../utils/exportCsv.js';

export default function InventoryAndRecipeView({
  products,
  ingredients,
  activeStaff,
  onSaveProduct,
  onDeleteProduct,
  onSaveIngredient,
  onAdjustInventory
}) {
  const [subTab, setSubTab] = useState('recipes'); // 'recipes' | 'ingredients'
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [adjustModal, setAdjustModal] = useState(null);

  const lowStockIngredients = ingredients.filter((i) => Number(i.stock) <= Number(i.minStock));
  const totalInventoryValue = ingredients.reduce(
    (sum, i) => sum + Number(i.stock) * Number(i.costPerUnit),
    0
  );
  const avgMargin =
    products.length > 0
      ? Math.round(products.reduce((s, p) => s + (p.marginPercent || 0), 0) / products.length)
      : 0;

  const openNewProductModal = () => {
    setEditingProduct({
      id: null,
      name: '',
      sku: '',
      barcode: `899100${Math.floor(100000 + Math.random() * 900000)}`,
      category: 'Coffee',
      isFeatured: true,
      price: 22000,
      hasRecipe: true,
      printCupLabel: true,
      stock: 20,
      minStock: 5,
      manualHpp: 10000,
      image:
        'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
      recipe: [
        { ingredientId: ingredients[0]?.id || 'ING-01', qty: 18 },
        { ingredientId: ingredients[1]?.id || 'ING-02', qty: 150 }
      ]
    });
  };

  const openNewIngredientModal = () => {
    setEditingIngredient({
      id: null,
      name: '',
      sku: `BB-${Math.floor(100 + Math.random() * 900)}`,
      unit: 'gram',
      stock: 1000,
      minStock: 200,
      costPerUnit: 150,
      category: 'Bahan Minuman'
    });
  };

  // Compute live preview HPP inside Product Modal
  const computeModalHpp = (prod) => {
    if (!prod) return 0;
    if (!prod.hasRecipe) return Number(prod.manualHpp || 0);
    return (prod.recipe || []).reduce((sum, r) => {
      const ing = (ingredients || []).find((i) => i.id === r.ingredientId);
      const cost = ing ? Number(ing.costPerUnit || ing.unitCost || 0) : 0;
      const qty = Number(r.qty || r.amount || 0);
      return sum + (cost * qty);
    }, 0);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Menu & Produk</span>
            <ChefHat className="w-4 h-4 text-[#0f2b5b]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {products.length} Menu
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Tanpa batasan produk & resep
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Rata-Rata Margin Kotor</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{avgMargin}%</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Otomatis dihitung dari HPP Resep
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Valuasi Bahan Baku</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            Rp {Math.round(totalInventoryValue).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {ingredients.length} jenis bahan baku terdaftar
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Peringatan Stok Menipis</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {lowStockIngredients.length} Item
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {lowStockIngredients.length === 0
              ? 'Semua stok bahan baku aman'
              : 'Segera lakukan restock bahan'}
          </div>
        </div>
      </div>

      {/* Sub-navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab('recipes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'recipes'
                ? 'bg-[#0f2b5b] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            Produk, Resep (BOM) & HPP ({products.length})
          </button>
          <button
            onClick={() => setSubTab('ingredients')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'ingredients'
                ? 'bg-[#0f2b5b] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            Stok Bahan Baku & Inventori ({ingredients.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {subTab === 'recipes' ? (
            <>
              <button
                onClick={() => {
                  downloadCsv(
                    `Analisa-Menu-Resep-HPP-${new Date().toISOString().slice(0, 10)}.csv`,
                    [
                      'ID Produk',
                      'Nama Menu',
                      'Kategori',
                      'Barcode',
                      'Harga Jual (Rp)',
                      'HPP Otomatis (Rp)',
                      'Laba Kotor / Porsi (Rp)',
                      'Margin (%)',
                      'Stok Porsi Tersedia',
                      'Rincian Resep Bahan Baku'
                    ],
                    products.map((p) => [
                      p.id,
                      p.name,
                      p.category,
                      p.barcode,
                      p.price,
                      p.computedHpp,
                      p.grossMargin,
                      `${p.marginPercent}%`,
                      p.availablePortions,
                      p.hasRecipe
                        ? (p.detailedRecipe || [])
                            .map((r) => `${r.ingredientName} (${r.qty} ${r.unit})`)
                            .join(' + ')
                        : 'Produk Jadi Non-Resep'
                    ])
                  );
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#0f2b5b]" />
                Export HPP & Resep (.CSV / Excel)
              </button>
              <button
                onClick={openNewProductModal}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Menu / Resep Baru
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  downloadCsv(
                    `Laporan-Stok-Bahan-Baku-${new Date().toISOString().slice(0, 10)}.csv`,
                    [
                      'SKU',
                      'Nama Bahan Baku',
                      'Kategori',
                      'Stok Saat Ini',
                      'Batas Min. Stok',
                      'Satuan',
                      'HPP per Satuan (Rp)',
                      'Total Nilai Valuasi (Rp)',
                      'Status Stok'
                    ],
                    ingredients.map((i) => [
                      i.sku,
                      i.name,
                      i.category,
                      i.stock,
                      i.minStock,
                      i.unit,
                      i.costPerUnit,
                      Math.round(Number(i.stock) * Number(i.costPerUnit)),
                      Number(i.stock) <= Number(i.minStock) ? 'STOK MENIPIS' : 'AMAN'
                    ])
                  );
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#0f2b5b]" />
                Export Stok Inventori (.CSV / Excel)
              </button>
              <button
                onClick={openNewIngredientModal}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Bahan Baku Baru
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: PRODUCTS, RECIPES & HPP */}
      {subTab === 'recipes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="p-4 flex gap-3.5 border-b border-slate-100">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0f2b5b] text-[10px] font-bold">
                        {prod.category}
                      </span>
                      <span className="text-[10px] font-mono-receipt text-slate-400 flex items-center gap-1">
                        <Barcode className="w-3 h-3" />
                        {prod.barcode}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 truncate mt-1">
                      {prod.name}
                    </h4>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-sm font-extrabold text-[#0f2b5b]">
                        Rp {prod.price.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        Margin {prod.marginPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* HPP & Profit Breakdown */}
                <div className="grid grid-cols-3 bg-slate-50 px-4 py-2.5 border-b border-slate-100 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500">HPP / Porsi</div>
                    <div className="text-xs font-bold text-rose-600">
                      Rp {Number(prod.computedHpp || 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="border-x border-slate-200">
                    <div className="text-[10px] text-slate-500">Laba Kotor</div>
                    <div className="text-xs font-bold text-emerald-600">
                      +Rp {Number(prod.grossMargin || 0).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Stok Porsi</div>
                    <div className="text-xs font-bold text-slate-800">
                      {prod.availablePortions} porsi
                    </div>
                  </div>
                </div>

                {/* Recipe Ingredients List */}
                <div className="p-4">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>
                      {prod.hasRecipe ? 'Komposisi Resep Bahan Baku:' : 'Tipe: Produk Kemasan Jadi'}
                    </span>
                    {prod.printCupLabel && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
                        Cetak Label Cup
                      </span>
                    )}
                  </div>

                  {prod.hasRecipe ? (
                    <div className="space-y-1.5">
                      {prod.detailedRecipe?.map((r, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100"
                        >
                          <span className="text-slate-700 font-medium truncate pr-2">
                            {r.ingredientName || r.name || 'Bahan'}
                          </span>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-slate-900">
                              {r.qty || r.amount || 0} {r.unit}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1.5">
                              (Rp {Number(r.lineCost ?? r.lineHpp ?? 0).toLocaleString('id-ID')})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                      <span>Stok Fisik Langsung: {prod.stock} pcs</span>
                      <button
                        onClick={() =>
                          setAdjustModal({
                            targetType: 'product',
                            item: prod,
                            mode: 'RESTOCK',
                            qty: 10,
                            newCostPerUnit: prod.manualHpp,
                            reason: 'Tambah stok produk kemasan'
                          })
                        }
                        className="text-[11px] font-bold text-[#0f2b5b] underline cursor-pointer"
                      >
                        + Update Stok
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setEditingProduct(structuredClone(prod))}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-white border border-slate-200 hover:border-[#0f2b5b] text-xs font-bold text-slate-700 hover:text-[#0f2b5b] flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Resep & Harga
                </button>
                <button
                  onClick={() => onDeleteProduct(prod.id)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  title="Hapus Produk"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: RAW INGREDIENTS & INVENTORY */}
      {subTab === 'ingredients' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3.5 px-4">Kode & Nama Bahan Baku</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4 text-right">Stok Saat Ini</th>
                  <th className="py-3.5 px-4 text-right">Batas Min.</th>
                  <th className="py-3.5 px-4 text-right">HPP / Satuan</th>
                  <th className="py-3.5 px-4 text-right">Total Nilai Stok</th>
                  <th className="py-3.5 px-4 text-center">Aksi Stok & Opname</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {ingredients.map((ing) => {
                  const isLow = Number(ing.stock) <= Number(ing.minStock);
                  const totalVal = Math.round(Number(ing.stock) * Number(ing.costPerUnit));
                  return (
                    <tr key={ing.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{ing.name}</div>
                        <div className="text-[11px] font-mono-receipt text-slate-400">
                          {ing.sku}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {ing.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-extrabold px-2 py-0.5 rounded-md ${
                            isLow
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'text-slate-900'
                          }`}
                        >
                          {Number(ing.stock).toLocaleString('id-ID')} {ing.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {Number(ing.minStock).toLocaleString('id-ID')} {ing.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        Rp {Number(ing.costPerUnit).toLocaleString('id-ID')} / {ing.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#0f2b5b]">
                        Rp {totalVal.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() =>
                              setAdjustModal({
                                targetType: 'ingredient',
                                item: ing,
                                mode: 'RESTOCK',
                                qty: 1000,
                                newCostPerUnit: ing.costPerUnit,
                                reason: 'Belanja restock bahan baku'
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-[#0f2b5b] hover:bg-[#163d7a] text-white font-bold text-[11px] cursor-pointer"
                          >
                            + Restock
                          </button>
                          <button
                            onClick={() =>
                              setAdjustModal({
                                targetType: 'ingredient',
                                item: ing,
                                mode: 'OPNAME',
                                qty: ing.stock,
                                newCostPerUnit: ing.costPerUnit,
                                reason: 'Stock Opname harian'
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] cursor-pointer"
                          >
                            Opname
                          </button>
                          <button
                            onClick={() => setEditingIngredient(structuredClone(ing))}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT & RECIPE */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-[#0f2b5b] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingProduct.id ? 'Edit Menu & Resep (HPP)' : 'Tambah Menu Cafe Baru'}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Menu / Produk</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    placeholder="Contoh: Caramel Macchiato"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, category: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Coffee">Coffee</option>
                    <option value="Non Coffee">Non Coffee</option>
                    <option value="Makanan">Makanan</option>
                    <option value="Kemasan">Kemasan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Harga Jual Kasir (Rp)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-[#0f2b5b]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kode Barcode (EAN / SKU)
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcode}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, barcode: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono-receipt"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isFeatured}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })
                    }
                    className="rounded text-[#0f2b5b]"
                  />
                  Tampilkan di "Produk Unggulan"
                </label>
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.printCupLabel}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, printCupLabel: e.target.checked })
                    }
                    className="rounded text-[#0f2b5b]"
                  />
                  Cetak Stiker Label Minuman (Cup)
                </label>
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.hasRecipe}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, hasRecipe: e.target.checked })
                    }
                    className="rounded text-[#0f2b5b]"
                  />
                  Gunakan Resep Bahan Baku (BOM)
                </label>
              </div>

              {editingProduct.hasRecipe ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Takaran Resep Bahan Baku (Otomatis Potong Stok & Hitung HPP)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProduct({
                          ...editingProduct,
                          recipe: [
                            ...(editingProduct.recipe || []),
                            { ingredientId: ingredients[0]?.id || 'ING-01', qty: 10 }
                          ]
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-[#0f2b5b] text-white font-bold text-[11px] cursor-pointer"
                    >
                      + Tambah Bahan
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(editingProduct.recipe || []).map((r, idx) => {
                      const ing = ingredients.find((i) => i.id === r.ingredientId);
                      const subCost = ing ? Math.round(Number(r.qty) * Number(ing.costPerUnit)) : 0;
                      return (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                          <select
                            value={r.ingredientId}
                            onChange={(e) => {
                              const next = [...editingProduct.recipe];
                              next[idx].ingredientId = e.target.value;
                              setEditingProduct({ ...editingProduct, recipe: next });
                            }}
                            className="flex-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                          >
                            {ingredients.map((ingItem) => (
                              <option key={ingItem.id} value={ingItem.id}>
                                {ingItem.name} (Rp {ingItem.costPerUnit}/{ingItem.unit})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={r.qty}
                            onChange={(e) => {
                              const next = [...editingProduct.recipe];
                              next[idx].qty = Number(e.target.value);
                              setEditingProduct({ ...editingProduct, recipe: next });
                            }}
                            className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 text-right font-bold"
                          />
                          <span className="text-slate-500 w-10">{ing?.unit || ''}</span>
                          <span className="font-bold text-rose-600 w-24 text-right">
                            Rp {subCost.toLocaleString('id-ID')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = editingProduct.recipe.filter((_, i) => i !== idx);
                              setEditingProduct({ ...editingProduct, recipe: next });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Stok Produk Jadi (Pcs)
                    </label>
                    <input
                      type="number"
                      value={editingProduct.stock}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Harga Modal / HPP Manual (Rp)
                    </label>
                    <input
                      type="number"
                      value={editingProduct.manualHpp}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          manualHpp: Number(e.target.value)
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Live HPP & Margin Preview Box + Smart Pricing Calculator */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-blue-700 font-semibold">
                      Total HPP Otomatis per Porsi
                    </div>
                    <div className="text-base font-extrabold text-rose-600">
                      Rp {Math.round(computeModalHpp(editingProduct)).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-blue-700 font-semibold">
                      Estimasi Laba Kotor / Porsi
                    </div>
                    <div className="text-base font-extrabold text-emerald-700">
                      Rp{' '}
                      {Math.round(
                        editingProduct.price - computeModalHpp(editingProduct)
                      ).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-200/80 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#0f2b5b]">
                    Rekomendasi Harga Jual Cafe (Anti-Boncos):
                  </span>
                  <div className="flex gap-1.5">
                    {[50, 60, 70].map((targetMargin) => {
                      const hppVal = computeModalHpp(editingProduct) || 8000;
                      const suggested =
                        Math.ceil(hppVal / (1 - targetMargin / 100) / 1000) * 1000;
                      return (
                        <button
                          key={targetMargin}
                          type="button"
                          onClick={() =>
                            setEditingProduct({ ...editingProduct, price: suggested })
                          }
                          className="px-2 py-1 rounded-lg bg-white hover:bg-[#0f2b5b] text-[#0f2b5b] hover:text-white border border-blue-300 font-bold text-[10px] transition cursor-pointer"
                        >
                          Margin {targetMargin}%: Rp {suggested.toLocaleString('id-ID')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onSaveProduct({ ...editingProduct, staffName: activeStaff.name });
                  setEditingProduct(null);
                }}
                className="px-5 py-2 rounded-xl bg-[#0f2b5b] text-white text-xs font-bold cursor-pointer"
              >
                Simpan Produk & Resep
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT INGREDIENT */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-[#0f2b5b] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingIngredient.id ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
              </h3>
              <button onClick={() => setEditingIngredient(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Bahan Baku</label>
                <input
                  type="text"
                  value={editingIngredient.name}
                  onChange={(e) =>
                    setEditingIngredient({ ...editingIngredient, name: e.target.value })
                  }
                  placeholder="Misal: Oat Milk Barista Blend"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Satuan Takar</label>
                  <select
                    value={editingIngredient.unit}
                    onChange={(e) =>
                      setEditingIngredient({ ...editingIngredient, unit: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="gram">gram (g)</option>
                    <option value="ml">mililiter (ml)</option>
                    <option value="pcs">pcs / buah</option>
                    <option value="porsi">porsi</option>
                    <option value="butir">butir</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    HPP per Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    value={editingIngredient.costPerUnit}
                    onChange={(e) =>
                      setEditingIngredient({
                        ...editingIngredient,
                        costPerUnit: Number(e.target.value)
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    value={editingIngredient.stock}
                    onChange={(e) =>
                      setEditingIngredient({
                        ...editingIngredient,
                        stock: Number(e.target.value)
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batas Stok Minimum</label>
                  <input
                    type="number"
                    value={editingIngredient.minStock}
                    onChange={(e) =>
                      setEditingIngredient({
                        ...editingIngredient,
                        minStock: Number(e.target.value)
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setEditingIngredient(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onSaveIngredient({ ...editingIngredient, staffName: activeStaff.name });
                  setEditingIngredient(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#0f2b5b] text-white text-xs font-bold cursor-pointer"
              >
                Simpan Bahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESTOCK / STOCK OPNAME */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-[#0f2b5b] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">Update Inventori & Stock Opname</h3>
              <button onClick={() => setAdjustModal(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-sm text-slate-900">{adjustModal.item.name}</div>
                <div className="text-slate-500 mt-0.5">
                  Stok Tercatat Saat Ini:{' '}
                  <strong className="text-slate-800">
                    {adjustModal.item.stock} {adjustModal.item.unit || 'pcs'}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'RESTOCK', label: '+ Belanja / Restock' },
                  { id: 'OPNAME', label: 'Stock Opname Fisik' },
                  { id: 'WASTE', label: '- Rusak / Tumpah' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAdjustModal({ ...adjustModal, mode: m.id })}
                    className={`py-2 px-2 rounded-xl font-bold text-[11px] border transition cursor-pointer ${
                      adjustModal.mode === m.id
                        ? 'bg-[#0f2b5b] text-white border-[#0f2b5b]'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {adjustModal.mode === 'RESTOCK'
                    ? `Jumlah Masuk (${adjustModal.item.unit || 'pcs'})`
                    : adjustModal.mode === 'OPNAME'
                    ? `Total Stok Fisik Aktual (${adjustModal.item.unit || 'pcs'})`
                    : `Jumlah Terbuang / Waste (${adjustModal.item.unit || 'pcs'})`}
                </label>
                <input
                  type="number"
                  value={adjustModal.qty}
                  onChange={(e) =>
                    setAdjustModal({ ...adjustModal, qty: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-sm"
                />
              </div>

              {adjustModal.mode === 'RESTOCK' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Update HPP / Harga Beli per {adjustModal.item.unit || 'pcs'} (Rp)
                  </label>
                  <input
                    type="number"
                    value={adjustModal.newCostPerUnit}
                    onChange={(e) =>
                      setAdjustModal({
                        ...adjustModal,
                        newCostPerUnit: Number(e.target.value)
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Audit Inventori
                </label>
                <input
                  type="text"
                  value={adjustModal.reason}
                  onChange={(e) => setAdjustModal({ ...adjustModal, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setAdjustModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onAdjustInventory({
                    targetType: adjustModal.targetType,
                    targetId: adjustModal.item.id,
                    mode: adjustModal.mode,
                    qty: adjustModal.qty,
                    newCostPerUnit: adjustModal.newCostPerUnit,
                    reason: adjustModal.reason,
                    staffName: activeStaff.name
                  });
                  setAdjustModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#0f2b5b] text-white text-xs font-bold cursor-pointer"
              >
                Konfirmasi Perubahan Stok
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

