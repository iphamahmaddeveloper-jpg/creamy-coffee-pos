import React, { useState } from 'react';
import { Printer, X, Receipt, Tag, CheckCircle2, Wifi, Coffee, MessageCircle, Leaf } from 'lucide-react';

export default function ReceiptAndLabelModal({ transaction, storeProfile, onClose }) {
  const [activeTab, setActiveTab] = useState('receipt'); // 'receipt' | 'labels'
  const [ecoMode, setEcoMode] = useState(false); // Mode Hemat Kertas Thermal 40%
  const [waPhone, setWaPhone] = useState('');

  if (!transaction) return null;

  const handleSendWhatsApp = () => {
    const itemsText = (transaction.items || [])
      .map(
        (i) =>
          `• ${i.qty}x ${i.name} (Rp ${(i.qty * i.price).toLocaleString('id-ID')})`
      )
      .join('\n');
    const text = `*STRUK DIGITAL ${storeProfile?.name || 'CREAMY COFFEE'}*\nNo: ${
      transaction.receiptNo
    }\nPelanggan: ${transaction.customerName}\nMeja: ${
      transaction.tableName
    }\n------------------\n${itemsText}\n------------------\n*TOTAL: Rp ${Number(
      transaction.total || 0
    ).toLocaleString('id-ID')} (${transaction.paymentMethod})*\nWi-Fi: ${
      storeProfile?.wifiName || 'CreamyCoffee_5G'
    } (Pass: ${storeProfile?.wifiPass || 'kopidulu2026'})\nTerima kasih kak ${
      transaction.customerName
    }!`;

    const cleanPhone = waPhone.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Build individual cup labels for items that have printCupLabel !== false
  const cupLabels = [];
  transaction.items.forEach((item) => {
    if (item.printCupLabel !== false) {
      const qty = Number(item.qty) || 1;
      for (let i = 1; i <= qty; i++) {
        cupLabels.push({
          name: item.name,
          cupIndex: i,
          totalItemQty: qty,
          sugarLevel: item.sugarLevel && item.sugarLevel !== '-' ? item.sugarLevel : 'Normal Sugar',
          iceLevel: item.iceLevel && item.iceLevel !== '-' ? item.iceLevel : 'Normal Ice',
          notes: item.notes || ''
        });
      }
    }
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-[#0f2b5b] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">Cetak Struk & Label Minuman</h3>
              <p className="text-xs text-blue-200">
                {transaction.receiptNo} • {transaction.tableName} ({transaction.paymentMethod})
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

        {/* Mode Switch Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('receipt')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeTab === 'receipt'
                ? 'bg-white text-[#0f2b5b] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Struk Kasir Thermal (58mm)
          </button>
          <button
            onClick={() => setActiveTab('labels')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              activeTab === 'labels'
                ? 'bg-white text-[#0f2b5b] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            Label Cup Minuman ({cupLabels.length} Cup)
          </button>
        </div>

        {/* Affordable / Eco & Paperless Bar */}
        {activeTab === 'receipt' && (
          <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <label className="flex items-center gap-2 font-bold text-emerald-900 cursor-pointer">
              <input
                type="checkbox"
                checked={ecoMode}
                onChange={(e) => setEcoMode(e.target.checked)}
                className="rounded text-emerald-600"
              />
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              Mode Hemat Kertas Thermal (40% Lebih Pendek)
            </label>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="No. WA Pelanggan (opsional)"
                className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-white text-[11px] w-40"
              />
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Struk WA (Tanpa Printer)
              </button>
            </div>
          </div>
        )}

        {/* Printable Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
          <div id="printable-area" className="w-full flex flex-col items-center">
            {activeTab === 'receipt' ? (
              /* Thermal Receipt 58mm/80mm Preview */
              <div
                className={`bg-white w-full max-w-[330px] ${
                  ecoMode ? 'p-3.5 text-[10px]' : 'p-5 text-xs'
                } rounded-xl shadow-md border border-slate-200 font-mono-receipt text-slate-800`}
              >
                <div className="text-center border-b border-dashed border-slate-300 pb-2 mb-2">
                  {!ecoMode && (
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#0f2b5b] text-white mb-1.5">
                      <Coffee className="w-5 h-5" />
                    </div>
                  )}
                  <h4 className="font-bold text-sm tracking-wider text-slate-900">
                    {storeProfile?.name || 'CREAMY COFFEE'}
                  </h4>
                  {!ecoMode && (
                    <>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {storeProfile?.address || 'Jl. Senopati No. 88, Jakarta'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Telp: {storeProfile?.phone || '0812-8899-7766'}
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3 mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">No. Struk:</span>
                    <span className="font-semibold">{transaction.receiptNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waktu:</span>
                    <span>{new Date(transaction.createdAt).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kasir:</span>
                    <span>{transaction.cashierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pelanggan:</span>
                    <span className="font-semibold">{transaction.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Meja / Tipe:</span>
                    <span className="font-bold text-[#0f2b5b]">
                      {transaction.tableName} ({transaction.orderType})
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2.5 border-b border-dashed border-slate-300 pb-3 mb-3">
                  {transaction.items.map((item, idx) => (
                    <div key={idx} className="text-[11px]">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{item.name}</span>
                        <span>Rp {(item.qty * item.price).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        {item.qty} x Rp {Number(item.price).toLocaleString('id-ID')}
                      </div>
                      {(item.sugarLevel && item.sugarLevel !== '-') ||
                      (item.iceLevel && item.iceLevel !== '-') ||
                      item.notes ? (
                        <div className="text-[10px] text-slate-600 italic pl-2 border-l-2 border-slate-300 mt-0.5">
                          {[
                            item.sugarLevel !== '-' ? item.sugarLevel : null,
                            item.iceLevel !== '-' ? item.iceLevel : null,
                            item.notes ? `"${item.notes}"` : null
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3 mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span>Rp {Number(transaction.subtotal).toLocaleString('id-ID')}</span>
                  </div>
                  {transaction.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Diskon Promo</span>
                      <span>-Rp {Number(transaction.discount).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {transaction.tax > 0 && (
                    <div className="flex justify-between">
                      <span>PB1 / Pajak</span>
                      <span>Rp {Number(transaction.tax).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1">
                    <span>TOTAL</span>
                    <span>Rp {Number(transaction.total).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Bayar ({transaction.paymentMethod})</span>
                    <span>Rp {Number(transaction.amountPaid).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-500">Kembali</span>
                    <span>Rp {Number(transaction.change || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Wifi & Footer */}
                <div className="text-center text-[10px] text-slate-500 space-y-1">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 flex items-center justify-center gap-1.5 text-slate-700 font-semibold">
                    <Wifi className="w-3.5 h-3.5 text-[#0f2b5b]" />
                    <span>
                      Wi-Fi: {storeProfile?.wifiName || 'CreamyCoffee_5G'} | Pass:{' '}
                      {storeProfile?.wifiPass || 'kopidulu2026'}
                    </span>
                  </div>
                  <p className="pt-1 whitespace-pre-line">
                    {storeProfile?.receiptFooter || 'Terima kasih telah berkunjung!'}
                  </p>
                </div>
              </div>
            ) : (
              /* Cup Label Sticker 40x30mm / 50x30mm Preview */
              <div className="w-full max-w-[340px] space-y-3">
                {cupLabels.length === 0 ? (
                  <div className="bg-white p-6 rounded-xl text-center text-slate-500 text-xs border border-slate-200">
                    Tidak ada item minuman berlabel cup pada transaksi ini.
                  </div>
                ) : (
                  cupLabels.map((cup, index) => (
                    <div
                      key={index}
                      className="bg-white p-3.5 rounded-xl shadow-sm border-2 border-dashed border-slate-300 font-mono-receipt text-slate-900 relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 border-b border-slate-200 pb-1 mb-1.5">
                        <span className="text-[#0f2b5b] font-extrabold">CREAMY COFFEE</span>
                        <span className="bg-[#0f2b5b] text-white px-2 py-0.5 rounded text-[10px]">
                          CUP {index + 1} / {cupLabels.length}
                        </span>
                      </div>

                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-sm uppercase tracking-tight text-slate-900">
                            {cup.name}
                          </h4>
                          <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                            • {cup.sugarLevel}
                          </p>
                          <p className="text-[11px] font-semibold text-blue-700">
                            • {cup.iceLevel}
                          </p>
                          {cup.notes && (
                            <p className="text-[10px] bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded mt-1 font-medium border border-amber-200">
                              Catatan: {cup.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-[10px] text-slate-500 shrink-0">
                          <div className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                            {transaction.tableName}
                          </div>
                          <div className="mt-1 truncate max-w-[90px] font-semibold text-slate-700">
                            {transaction.customerName}
                          </div>
                          <div className="text-[9px] mt-0.5">
                            {new Date(transaction.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
          >
            Tutup & Transaksi Baru
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-5 rounded-xl bg-[#0f2b5b] hover:bg-[#163d7a] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            {activeTab === 'receipt'
              ? 'Cetak Struk Kasir Sekarang'
              : `Cetak ${cupLabels.length} Label Stiker Cup`}
          </button>
        </div>
      </div>
    </div>
  );
}

