import React, { useState } from 'react';
import {
  ShieldCheck,
  Wallet,
  History,
  FileText,
  Printer,
  AlertOctagon,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  Download,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { downloadCsv } from '../utils/exportCsv.js';

export default function CashierAuditView({
  activeShift,
  shifts,
  auditLogs,
  transactions,
  activeStaff,
  onOpenShift,
  onCashMovement,
  onCloseShift,
  onVoidTransaction,
  onPrintTransaction
}) {
  const isSuperadmin = activeStaff?.accountType === 'SUPERADMIN';
  const [subTab, setSubTab] = useState('shift'); // 'shift' | 'audit' | 'transactions'
  const [openingCashInput, setOpeningCashInput] = useState(300000);
  const [closingCashInput, setClosingCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [cashMoveModal, setCashMoveModal] = useState(null); // { type: 'IN'|'OUT', amount: 25000, reason: '' }
  const [voidModal, setVoidModal] = useState(null); // { tx, reason: '' }
  const [auditFilter, setAuditFilter] = useState('ALL');

  const completedTx = transactions.filter((t) => t.status === 'COMPLETED');
  const totalOmzet = completedTx.reduce((s, t) => s + Number(t.total), 0);
  const totalHpp = completedTx.reduce((s, t) => s + Number(t.totalHpp || 0), 0);
  const totalGrossProfit = totalOmzet - totalHpp;

  // Calculate live cash in drawer for activeShift
  let liveExpectedCash = 0;
  let shiftCashSales = 0;
  let shiftCashIn = 0;
  let shiftCashOut = 0;

  if (activeShift) {
    const startMs = new Date(activeShift.openedAt).getTime();
    shiftCashSales = completedTx
      .filter(
        (t) => t.paymentMethod === 'Tunai' && new Date(t.createdAt).getTime() >= startMs
      )
      .reduce((s, t) => s + Number(t.total), 0);
    shiftCashIn = (activeShift.cashMovements || [])
      .filter((m) => m.type === 'IN')
      .reduce((s, m) => s + Number(m.amount), 0);
    shiftCashOut = (activeShift.cashMovements || [])
      .filter((m) => m.type === 'OUT')
      .reduce((s, m) => s + Number(m.amount), 0);
    liveExpectedCash =
      Number(activeShift.openingCash) + shiftCashSales + shiftCashIn - shiftCashOut;
  }

  const filteredLogs =
    auditFilter === 'ALL'
      ? auditLogs
      : auditLogs.filter((l) => l.category === auditFilter || l.severity === auditFilter);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Banner Info Mode Terbatas Kasir */}
      {!isSuperadmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-[#0f2b5b]">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 shrink-0 text-[#0f2b5b]" />
            <span>
              <b>Mode Akses Kasir Terbatas ({activeStaff?.name}):</b> Anda hanya dapat membuka/menutup shift laci kas, mencatat kas masuk/keluar operasional, dan mencetak ulang struk. Data Laba/HPP, Void Transaksi, dan Export Laporan dikunci khusus <b>Superadmin (Owner)</b>.
            </span>
          </div>
        </div>
      )}

      {/* Summary KPIs (Owner sees full HPP & Profit; Kasir only sees Shift Status & Transaction Count) */}
      {isSuperadmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Total Penjualan Bersih</div>
            <div className="text-2xl font-extrabold text-[#0f2b5b] mt-1">
              Rp {totalOmzet.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {completedTx.length} Transaksi Selesai
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Total HPP Bahan Terpakai</div>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">
              Rp {totalHpp.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Akumulasi biaya resep otomatis
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Laba Kotor (Gross Profit)</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              Rp {totalGrossProfit.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">
              Margin Bersih:{' '}
              {totalOmzet > 0 ? Math.round((totalGrossProfit / totalOmzet) * 100) : 0}%
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Status Audit Kasir</div>
            <div className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  activeShift ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              {activeShift ? `Shift Aktif (${activeShift.cashierName})` : 'Shift Ditutup'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {auditLogs.length} Aktivitas Staf Tercatat
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Status Shift Laci Kasir</div>
            <div className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  activeShift ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              {activeShift ? `Shift Aktif (${activeShift.cashierName})` : 'Shift Belum Dibuka'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Kasir Login: {activeStaff?.name}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Struk Transaksi Tercatat</div>
            <div className="text-2xl font-extrabold text-[#0f2b5b] mt-1">
              {completedTx.length} Struk
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Cetak ulang struk pelanggan tersedia di tab Riwayat Struk
            </div>
          </div>
        </div>
      )}

      {/* Sub Navigation & Export Excel/CSV Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubTab('shift')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'shift'
                ? 'bg-[#0f2b5b] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Buka / Tutup Shift & Kas Laci
          </button>

          {isSuperadmin && (
            <button
              onClick={() => setSubTab('audit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                subTab === 'audit'
                  ? 'bg-[#0f2b5b] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Log Audit Staf Kasir ({auditLogs.length})
            </button>
          )}

          <button
            onClick={() => setSubTab('transactions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              subTab === 'transactions'
                ? 'bg-[#0f2b5b] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            {isSuperadmin
              ? `Riwayat Transaksi & Void (${transactions.length})`
              : `Cetak Ulang Struk Pelanggan (${transactions.length})`}
          </button>
        </div>

        {isSuperadmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                downloadCsv(
                  `Laporan-Penjualan-HPP-CreamyCoffee-${new Date().toISOString().slice(0, 10)}.csv`,
                  [
                    'No. Struk',
                    'Waktu Transaksi',
                    'Kasir',
                    'Meja',
                    'Tipe Pesanan',
                    'Pelanggan',
                    'Rincian Menu',
                    'Metode Bayar',
                    'Subtotal (Rp)',
                    'Diskon (Rp)',
                    'Pajak PB1 (Rp)',
                    'Total Omzet (Rp)',
                    'Total HPP Resep (Rp)',
                    'Laba Kotor (Rp)',
                    'Status'
                  ],
                  transactions.map((t) => [
                    t.receiptNo,
                    new Date(t.createdAt).toLocaleString('id-ID'),
                    t.cashierName,
                    t.tableName,
                    t.orderType,
                    t.customerName,
                    (t.items || []).map((i) => `${i.qty}x ${i.name}`).join('; '),
                    t.paymentMethod,
                    t.subtotal,
                    t.discount || 0,
                    t.tax || 0,
                    t.total,
                    t.totalHpp || 0,
                    t.grossProfit || 0,
                    t.status
                  ])
                );
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Penjualan & Laba HPP (.CSV / Excel)
            </button>

            <button
              onClick={() => {
                downloadCsv(
                  `Log-Audit-Kasir-${new Date().toISOString().slice(0, 10)}.csv`,
                  ['Waktu', 'Nama Staf', 'Jabatan', 'Kategori', 'Aksi', 'Level', 'Detail Aktivitas'],
                  auditLogs.map((l) => [
                    new Date(l.timestamp).toLocaleString('id-ID'),
                    l.staffName,
                    l.role,
                    l.category,
                    l.action,
                    l.severity,
                    l.details
                  ])
                );
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#0f2b5b]" />
              Export Log Audit (.CSV)
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: SHIFT & CASH DRAWER RECONCILIATION */}
      {subTab === 'shift' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Kontrol Laci Kasir (Cash Drawer)
                </h3>
                <p className="text-xs text-slate-500">
                  Audit uang tunai masuk/keluar dan selisih kas per pergantian staf
                </p>
              </div>
              {activeShift ? (
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5" /> SHIFT BUKA
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> SHIFT TUTUP
                </span>
              )}
            </div>

            {activeShift ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500">Staf Kasir Bertugas:</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {activeShift.cashierName}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Waktu Buka Shift:</span>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {new Date(activeShift.openedAt).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Modal Awal Laci:</span>
                    <div className="font-bold text-slate-900">
                      Rp {Number(activeShift.openingCash).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Penjualan Tunai Shift Ini:</span>
                    <div className="font-bold text-emerald-600">
                      +Rp {shiftCashSales.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Kas Masuk / Keluar:</span>
                    <div className="font-semibold text-slate-800">
                      +Rp {shiftCashIn.toLocaleString('id-ID')} / -Rp{' '}
                      {shiftCashOut.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Ekspektasi Uang Tunai di Laci:</span>
                    {isSuperadmin ? (
                      <div className="font-extrabold text-[#0f2b5b] text-sm">
                        Rp {liveExpectedCash.toLocaleString('id-ID')}
                      </div>
                    ) : (
                      <div className="font-bold text-amber-700 text-xs mt-0.5 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Blind Count (Hitung Fisik)
                      </div>
                    )}
                  </div>
                </div>

                {/* Cash In / Cash Out Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCashMoveModal({
                        type: 'IN',
                        amount: 50000,
                        reason: 'Tambah uang kembalian receh'
                      })
                    }
                    className="flex-1 py-2.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowDownLeft className="w-4 h-4" />+ Kas Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCashMoveModal({
                        type: 'OUT',
                        amount: 25000,
                        reason: 'Beli es batu / galon operasional'
                      })
                    }
                    className="flex-1 py-2.5 px-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />- Kas Keluar
                  </button>
                </div>

                {/* Close Shift Form */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <h4 className="font-bold text-xs text-slate-800 uppercase">
                    Tutup Shift & Rekonsiliasi Uang Fisik
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Hitung Uang Fisik Aktual di Laci (Rp) *
                      </label>
                      <input
                        type="number"
                        value={closingCashInput}
                        onChange={(e) => setClosingCashInput(e.target.value)}
                        placeholder={
                          isSuperadmin
                            ? `Ekspektasi: ${liveExpectedCash}`
                            : 'Masukkan total uang tunai fisik di laci...'
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Catatan Tutup Kasir
                      </label>
                      <input
                        type="text"
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                        placeholder="Misal: Diserahkan ke shift berikutnya"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSuperadmin && closingCashInput === '') {
                        alert('Wajib masukkan jumlah uang tunai fisik aktual yang dihitung di laci!');
                        return;
                      }
                      const actual =
                        closingCashInput === '' ? liveExpectedCash : Number(closingCashInput);
                      onCloseShift({
                        closingCashActual: actual,
                        notes: closingNotes,
                        staffName: activeStaff.name
                      });
                      setClosingCashInput('');
                      setClosingNotes('');
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Tutup Shift Kasir & Simpan Laporan Audit
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  Saat ini tidak ada shift kasir yang terbuka. Silakan masukkan modal awal uang
                  kembalian di laci untuk memulai shift.
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Modal Awal Laci Kasir (Rp)
                  </label>
                  <input
                    type="number"
                    value={openingCashInput}
                    onChange={(e) => setOpeningCashInput(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onOpenShift({
                      cashierId: activeStaff.id,
                      cashierName: activeStaff.name,
                      openingCash: openingCashInput,
                      notes: 'Shift Baru'
                    })
                  }
                  className="w-full py-3 rounded-xl bg-[#0f2b5b] hover:bg-[#163d7a] text-white font-bold text-xs cursor-pointer"
                >
                  Buka Shift Kasir ({activeStaff.name})
                </button>
              </div>
            )}
          </div>

          {/* Shift History & Cash Movements */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Riwayat Rekonsiliasi Shift & Kas Keluar/Masuk
            </h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {shifts.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{s.cashierName}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'OPEN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Buka: {new Date(s.openedAt).toLocaleString('id-ID')}
                    {s.closedAt && ` • Tutup: ${new Date(s.closedAt).toLocaleString('id-ID')}`}
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/80">
                    <div>
                      <div className="text-[10px] text-slate-500">Modal Awal</div>
                      <div className="font-bold">
                        Rp {Number(s.openingCash).toLocaleString('id-ID')}
                      </div>
                    </div>
                    {s.status === 'CLOSED' && (
                      <>
                        <div>
                          <div className="text-[10px] text-slate-500">Fisik Aktual</div>
                          <div className="font-bold">
                            Rp {Number(s.closingCashActual).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Selisih (Variance)</div>
                          <div
                            className={`font-extrabold ${
                              s.variance === 0
                                ? 'text-emerald-600'
                                : s.variance < 0
                                ? 'text-rose-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {s.variance === 0
                              ? 'Klop (Rp 0)'
                              : `Rp ${Number(s.variance).toLocaleString('id-ID')}`}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {s.cashMovements?.length > 0 && (
                    <div className="pt-1.5 space-y-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">
                        Mutasi Kas Laci:
                      </div>
                      {s.cashMovements.map((m) => (
                        <div
                          key={m.id}
                          className="flex justify-between text-[11px] bg-white px-2.5 py-1 rounded border border-slate-200"
                        >
                          <span>
                            [{m.type === 'IN' ? 'KAS MASUK' : 'KAS KELUAR'}] {m.reason}
                          </span>
                          <span
                            className={`font-bold ${
                              m.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {m.type === 'IN' ? '+' : '-'}Rp{' '}
                            {Number(m.amount).toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF AUDIT LOGS */}
      {subTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Rekam Jejak Audit Staf Kasir (Anti-Fraud Log)
              </h3>
              <p className="text-xs text-slate-500">
                Mencatat otomatis seluruh aktivitas transaksi, hapus draft, void, kas keluar, dan
                opname stok
              </p>
            </div>
            <div className="flex gap-1.5">
              {['ALL', 'SALES', 'CASH', 'INVENTORY', 'AUDIT_ALERT'].map((f) => (
                <button
                  key={f}
                  onClick={() => setAuditFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    auditFilter === f
                      ? 'bg-[#0f2b5b] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'ALL' ? 'Semua' : f}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        log.severity === 'danger'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : log.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-50 text-[#0f2b5b] border border-blue-200'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="font-bold text-slate-900">{log.staffName}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 text-[11px]">{log.role}</span>
                  </div>
                  <p className="text-slate-700">{log.details}</p>
                </div>
                <div className="text-[11px] font-mono-receipt text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTIONS HISTORY & VOID */}
      {subTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3.5 px-4">No. Struk & Waktu</th>
                  <th className="py-3.5 px-4">Meja & Pelanggan</th>
                  <th className="py-3.5 px-4">Kasir & Metode</th>
                  <th className="py-3.5 px-4 text-right">Total Bayar</th>
                  {isSuperadmin && (
                    <>
                      <th className="py-3.5 px-4 text-right">HPP Resep</th>
                      <th className="py-3.5 px-4 text-right">Laba Kotor</th>
                    </>
                  )}
                  <th className="py-3.5 px-4 text-center">Status & Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-bold font-mono-receipt text-slate-900">
                        {tx.receiptNo}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0f2b5b]">{tx.tableName}</div>
                      <div className="text-[11px] text-slate-500">{tx.customerName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{tx.cashierName}</div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      Rp {Number(tx.total).toLocaleString('id-ID')}
                    </td>
                    {isSuperadmin && (
                      <>
                        <td className="py-3 px-4 text-right font-semibold text-rose-600">
                          Rp {Number(tx.totalHpp || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          +Rp {Number(tx.grossProfit || 0).toLocaleString('id-ID')}
                        </td>
                      </>
                    )}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {tx.status === 'VOID' ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                            VOID ({tx.voidReason})
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => onPrintTransaction(tx)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#0f2b5b] hover:bg-[#163d7a] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Struk & Label
                            </button>
                            {isSuperadmin ? (
                              <button
                                onClick={() =>
                                  setVoidModal({
                                    tx,
                                    reason: 'Pesanan dibatalkan pelanggan'
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-[11px] cursor-pointer"
                              >
                                Void
                              </button>
                            ) : (
                              <span
                                title="Pembatalan struk (Void) hanya dapat dilakukan oleh Superadmin (Owner)"
                                className="px-2 py-1 rounded-lg bg-slate-100 text-slate-400 font-semibold text-[10px] flex items-center gap-1 cursor-not-allowed"
                              >
                                <Lock className="w-3 h-3" /> Void (Owner)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CASH MOVEMENT */}
      {cashMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-[#0f2b5b] text-white px-5 py-4 font-bold text-sm">
              {cashMoveModal.type === 'IN'
                ? 'Catat Kas Masuk Laci Kasir'
                : 'Catat Kas Keluar Operasional'}
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal Uang (Rp)</label>
                <input
                  type="number"
                  value={cashMoveModal.amount}
                  onChange={(e) =>
                    setCashMoveModal({ ...cashMoveModal, amount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-sm"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Keterangan / Keperluan Audit
                </label>
                <input
                  type="text"
                  value={cashMoveModal.reason}
                  onChange={(e) =>
                    setCashMoveModal({ ...cashMoveModal, reason: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setCashMoveModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onCashMovement({
                    ...cashMoveModal,
                    staffName: activeStaff.name
                  });
                  setCashMoveModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#0f2b5b] text-white text-xs font-bold cursor-pointer"
              >
                Simpan Catatan Kas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VOID TRANSACTION */}
      {voidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-rose-600 text-white px-5 py-4 font-bold text-sm flex items-center gap-2">
              <AlertOctagon className="w-5 h-5" />
              Konfirmasi VOID / Pembatalan Transaksi
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">
                Membatalkan struk <strong>{voidModal.tx.receiptNo}</strong> senilai{' '}
                <strong>Rp {Number(voidModal.tx.total).toLocaleString('id-ID')}</strong> akan
                mengembalikan stok bahan baku resep dan mencatat log peringatan di Audit Kasir.
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alasan Void Transaksi (Wajib)
                </label>
                <input
                  type="text"
                  value={voidModal.reason}
                  onChange={(e) => setVoidModal({ ...voidModal, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setVoidModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onVoidTransaction(voidModal.tx.id, voidModal.reason, activeStaff.name);
                  setVoidModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                Konfirmasi Void & Kembalikan Stok
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

