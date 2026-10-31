import React, { useState, useEffect, useRef } from 'react';
import { ScanLine, X, Check, Search, Barcode, Camera } from 'lucide-react';

export default function BarcodeModal({ products, onScanProduct, onClose }) {
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScanSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    processCode(code.trim());
  };

  const processCode = (rawCode) => {
    const found = products.find(
      (p) =>
        p.barcode?.toLowerCase() === rawCode.toLowerCase() ||
        p.sku?.toLowerCase() === rawCode.toLowerCase()
    );
    if (found) {
      onScanProduct(found);
      setFeedback({
        type: 'success',
        message: `Berhasil scan: ${found.name} (Rp ${found.price.toLocaleString('id-ID')})`
      });
      setCode('');
    } else {
      setFeedback({
        type: 'error',
        message: `Kode Barcode / SKU "${rawCode}" tidak ditemukan di katalog.`
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-[#0f2b5b] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ScanLine className="w-5 h-5 text-blue-300" />
            <div>
              <h3 className="font-bold text-base">Scan Barcode / SKU Produk</h3>
              <p className="text-xs text-blue-200">
                Mendukung USB/Bluetooth Barcode Scanner & Kamera
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

        <div className="p-5 space-y-4">
          {/* Simulated Camera Laser Viewfinder */}
          <div className="relative bg-slate-900 rounded-xl h-36 flex flex-col items-center justify-center overflow-hidden border border-slate-800">
            <div className="w-56 h-20 border-2 border-blue-400/70 rounded-lg relative flex items-center justify-center">
              <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />
              <Camera className="w-6 h-6 text-slate-500 absolute" />
            </div>
            <span className="text-[11px] text-slate-300 mt-2 font-medium">
              Arahkan barcode ke kamera atau gunakan Laser Scanner USB
            </span>
          </div>

          {/* Input Box */}
          <form onSubmit={handleScanSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ketik / Scan kode barcode (cth: 899100200104)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono-receipt focus:outline-none focus:border-[#0f2b5b] focus:ring-2 focus:ring-[#0f2b5b]/15"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#0f2b5b] hover:bg-[#163d7a] text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Tambah
            </button>
          </form>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Quick Test Barcode Cards */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Simulasi Cepat Scan Barcode Produk:
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {products.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => processCode(prod.barcode)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-[#0f2b5b] hover:bg-blue-50/40 text-left transition group cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-[#0f2b5b] truncate">
                      {prod.name}
                    </div>
                    <div className="text-[10px] font-mono-receipt text-slate-500">
                      {prod.barcode}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#0f2b5b] bg-slate-100 group-hover:bg-blue-100 px-2 py-1 rounded-lg shrink-0">
                    Scan
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

