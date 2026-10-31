import React, { useState } from 'react';
import {
  ChefHat,
  Coffee,
  Clock,
  CheckCircle2,
  Play,
  Check,
  Printer,
  Utensils,
  Bell,
  Sparkles
} from 'lucide-react';

export default function KitchenBaristaView({
  transactions = [],
  draftOrders = [],
  activeStaff,
  onUpdateKitchenOrder,
  onPrintCupLabels
}) {
  const [stationFilter, setStationFilter] = useState('ALL'); // 'ALL' | 'BARISTA' | 'KITCHEN'
  const [showServed, setShowServed] = useState(false);

  // Combine active completed transactions + open bill draft orders into unified KDS tickets
  const rawOrders = [
    ...draftOrders.map((d) => ({
      ...d,
      isDraft: true,
      receiptNo: `OPEN-BILL / ${d.tableName}`,
      orderType: d.tableId === 'TAKE-AWAY' ? 'Take Away' : 'Dine In (Open Bill)',
      kitchenStatus: d.kitchenStatus || 'QUEUE'
    })),
    ...transactions
      .filter((t) => t.status === 'COMPLETED')
      .map((t) => ({
        ...t,
        isDraft: false,
        kitchenStatus: t.kitchenStatus || 'QUEUE'
      }))
  ];

  // Filter items by station if needed (preserving originalIndex so ticking works in any filter)
  const tickets = rawOrders
    .filter((ord) => (showServed ? true : ord.kitchenStatus !== 'SERVED'))
    .map((ord) => {
      const stationItems = (ord.items || [])
        .map((item, originalIndex) => ({ ...item, originalIndex }))
        .filter((item) => {
          if (stationFilter === 'ALL') return true;
          const isDrink =
            item.printCupLabel !== false ||
            item.category === 'Coffee' ||
            item.category === 'Non Coffee';
          return stationFilter === 'BARISTA' ? isDrink : !isDrink;
        });
      return { ...ord, stationItems };
    })
    .filter((ord) => ord.stationItems.length > 0);

  const countByStatus = (st) =>
    rawOrders.filter((o) => (o.kitchenStatus || 'QUEUE') === st).length;

  const getElapsedMinutes = (isoDate) => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const mins = Math.max(1, Math.floor(diffMs / 60000));
    return mins > 120 ? 'Baru saja' : `${mins} mnt lalu`;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
            <span>Antrian Baru (Queue)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-amber-900 mt-1">
            {countByStatus('QUEUE')} Pesanan
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-[#0f2b5b] text-xs font-bold">
            <span>Sedang Diracik / Dimasak</span>
            <Coffee className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#0f2b5b] mt-1">
            {countByStatus('PREPARING')} Pesanan
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
            <span>Siap Disajikan (Ready)</span>
            <Bell className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-900 mt-1">
            {countByStatus('READY')} Pesanan
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Selesai Diantar (Served)</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">
            {countByStatus('SERVED')} Pesanan
          </div>
        </div>
      </div>

      {/* Station Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStationFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              stationFilter === 'ALL'
                ? 'bg-[#0f2b5b] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Semua Stasiun (Barista & Dapur)
          </button>
          <button
            onClick={() => setStationFilter('BARISTA')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              stationFilter === 'BARISTA'
                ? 'bg-[#0f2b5b] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Coffee className="w-4 h-4" />
            Layar Barista (Minuman)
          </button>
          <button
            onClick={() => setStationFilter('KITCHEN')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              stationFilter === 'KITCHEN'
                ? 'bg-[#0f2b5b] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Utensils className="w-4 h-4" />
            Layar Kitchen (Makanan & Pastry)
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer pr-2">
          <input
            type="checkbox"
            checked={showServed}
            onChange={(e) => setShowServed(e.target.checked)}
            className="rounded text-[#0f2b5b]"
          />
          Tampilkan Pesanan yang Sudah Diantar
        </label>
      </div>

      {/* KDS Order Tickets Grid */}
      {tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
          <ChefHat className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="font-bold text-sm text-slate-700">
            Tidak Ada Antrian Pesanan Aktif
          </div>
          <p className="text-xs text-slate-400">
            Semua pesanan minuman & makanan sudah selesai disajikan ke pelanggan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => {
            const st = ticket.kitchenStatus || 'QUEUE';
            const headerStyles =
              st === 'QUEUE'
                ? 'bg-amber-500 text-slate-950'
                : st === 'PREPARING'
                ? 'bg-[#0f2b5b] text-white'
                : st === 'READY'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-600 text-white';

            return (
              <div
                key={ticket.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Ticket Header */}
                  <div className={`px-4 py-3 flex items-center justify-between ${headerStyles}`}>
                    <div>
                      <div className="font-extrabold text-sm flex items-center gap-2">
                        <span>{ticket.tableName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-black/20 text-white font-bold">
                          {ticket.isDraft ? 'OPEN BILL' : 'LUNAS'}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-90 font-semibold mt-0.5">
                        {ticket.customerName} • {ticket.receiptNo}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20">
                        {st === 'QUEUE'
                          ? 'MENUNGGU'
                          : st === 'PREPARING'
                          ? 'DIRACIK'
                          : st === 'READY'
                          ? 'SIAP SAJI'
                          : 'SELESAI'}
                      </div>
                      <div className="text-[10px] mt-1 opacity-85">
                        {getElapsedMinutes(ticket.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Ticket Items Checklist */}
                  <div className="p-4 divide-y divide-slate-100">
                    {ticket.stationItems.map((item) => (
                      <div
                        key={item.originalIndex}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onUpdateKitchenOrder(ticket.id, {
                            toggleItemIndex: item.originalIndex,
                            staffName: activeStaff.name
                          });
                        }}
                        className={`py-2.5 flex items-start justify-between gap-3 cursor-pointer rounded-lg px-2 -mx-2 transition ${
                          item.isDone ? 'bg-emerald-50/60 opacity-60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                              item.isDone
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {item.isDone && <Check className="w-3.5 h-3.5" />}
                          </div>

                          <div>
                            <div
                              className={`font-extrabold text-xs ${
                                item.isDone
                                  ? 'line-through text-slate-500'
                                  : 'text-slate-900'
                              }`}
                            >
                              {item.qty}x {item.name}
                            </div>

                            {((item.sugarLevel && item.sugarLevel !== '-') ||
                              (item.iceLevel && item.iceLevel !== '-')) && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.sugarLevel && item.sugarLevel !== '-' && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                    {item.sugarLevel}
                                  </span>
                                )}
                                {item.iceLevel && item.iceLevel !== '-' && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                                    {item.iceLevel}
                                  </span>
                                )}
                              </div>
                            )}

                            {item.notes && (
                              <div className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded mt-1">
                                Catatan: "{item.notes}"
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ticket Footer Action Buttons */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onPrintCupLabels(ticket)}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                    title="Cetak Stiker Label Cup"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#0f2b5b]" />
                    Label Cup
                  </button>

                  {st === 'QUEUE' && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateKitchenOrder(ticket.id, {
                          kitchenStatus: 'PREPARING',
                          staffName: activeStaff.name
                        })
                      }
                      className="flex-1 py-2 px-3 rounded-xl bg-[#0f2b5b] hover:bg-[#163d7a] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Mulai Racik / Masak
                    </button>
                  )}

                  {st === 'PREPARING' && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateKitchenOrder(ticket.id, {
                          kitchenStatus: 'READY',
                          staffName: activeStaff.name
                        })
                      }
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      Tandai Siap Saji
                    </button>
                  )}

                  {st === 'READY' && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateKitchenOrder(ticket.id, {
                          kitchenStatus: 'SERVED',
                          staffName: activeStaff.name
                        })
                      }
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Selesai Diantar
                    </button>
                  )}

                  {st === 'SERVED' && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateKitchenOrder(ticket.id, {
                          kitchenStatus: 'QUEUE',
                          staffName: activeStaff.name
                        })
                      }
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs cursor-pointer"
                    >
                      Kembalikan ke Antrian
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

