import React, { useState } from 'react';
import { Split, X, Check, ArrowRight, Wallet } from 'lucide-react';

export default function SplitBillModal({ cartItems, onConfirmSplit, onClose }) {
  // Track how many qty of each cartItemId are selected for the first split payment
  const [splitQtys, setSplitQtys] = useState(() => {
    const initial = {};
    cartItems.forEach((item, idx) => {
      initial[item.cartItemId] = idx === 0 ? 1 : 0;
    });
    return initial;
  });
  const [paymentMethod, setPaymentMethod] = useState('QRIS');

  const adjustSplitQty = (cartItemId, delta, maxQty) => {
    setSplitQtys((prev) => {
      const current = prev[cartItemId] || 0;
      const next = Math.max(0, Math.min(maxQty, current + delta));
      return { ...prev, [cartItemId]: next };
    });
  };

  const selectedItems = [];
  const remainingItems = [];

  cartItems.forEach((item) => {
    const splitQty = splitQtys[item.cartItemId] || 0;
    if (splitQty > 0) {
      selectedItems.push({ ...item, qty: splitQty });
    }
    const leftQty = item.qty - splitQty;
    if (leftQty > 0) {
      remainingItems.push({ ...item, qty: leftQty });
    }
  });

  const splitTotal = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const remainingTotal = remainingItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  const handleConfirm = () => {
    if (selectedItems.length === 0 || remainingItems.length === 0) return;
    onConfirmSplit({
      selectedItems,
      remainingItems,
      splitTotal,
      paymentMethod
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="bg-[#0f2b5b] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Split className="w-5 h-5 text-blue-300" />
            <div>
              <h3 className="font-bold text-base">Pisah Tagihan (Split Bill)</h3>
              <p className="text-xs text-blue-200">
                Pilih item yang akan dibayar terlebih dahulu oleh pelanggan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="space-y-2.5">
            {cartItems.map((item) => {
              const sQty = splitQtys[item.cartItemId] || 0;
              return (
                <div
                  key={item.cartItemId}
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    sQty > 0
                      ? 'border-[#0f2b5b] bg-blue-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-slate-800">{item.name}</div>
                    <div className="text-[11px] text-slate-500">
                      Rp {item.price.toLocaleString('id-ID')} • Total Pesanan: {item.qty}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 mr-1">Dibayar:</span>
                    <button
                      type="button"
                      onClick={() => adjustSplitQty(item.cartItemId, -1, item.qty)}
                      className="w-7 h-7 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-xs text-[#0f2b5b]">
                      {sQty} / {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustSplitQty(item.cartItemId, 1, item.qty)}
                      className="w-7 h-7 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Method for Split Bill */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
              Metode Pembayaran Tagihan Ini
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Tunai', 'QRIS', 'Debit / EDC'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    paymentMethod === m
                      ? 'bg-[#0f2b5b] text-white border-[#0f2b5b]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Split Summary */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <div className="text-[11px] text-blue-700 font-semibold">Dibayar Sekarang</div>
              <div className="text-base font-extrabold text-[#0f2b5b] mt-0.5">
                Rp {splitTotal.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5">
                {selectedItems.reduce((a, b) => a + b.qty, 0)} item dipilih
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
              <div className="text-[11px] text-slate-600 font-semibold">Sisa di Tagihan</div>
              <div className="text-base font-extrabold text-slate-800 mt-0.5">
                Rp {remainingTotal.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {remainingItems.reduce((a, b) => a + b.qty, 0)} item tersisa
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-white transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={selectedItems.length === 0 || remainingItems.length === 0}
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#0f2b5b] hover:bg-[#163d7a] disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            Bayar Tagihan Pisah Rp {splitTotal.toLocaleString('id-ID')}
          </button>
        </div>
      </div>
    </div>
  );
}

