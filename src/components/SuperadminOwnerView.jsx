import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Activity,
  LayoutGrid,
  Search,
  Download,
  Lock,
  Unlock,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  KeyRound,
  Plus,
  Utensils,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Filter
} from 'lucide-react';
import { downloadCsv } from '../utils/exportCsv';

const formatIDR = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

export default function SuperadminOwnerView({
  appData,
  loggedInUser,
  onStateUpdate
}) {
  const [activeSubTab, setActiveSubTab] = useState('ACTIVITY_LOGS'); // 'ACTIVITY_LOGS' | 'CASHIER_ACCOUNTS' | 'TABLE_MANAGER'

  // Filter states for Activity Log
  const [selectedCashierFilter, setSelectedCashierFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for Adding / Editing Cashier Account
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffName, setStaffName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffRole, setStaffRole] = useState('Kasir Shift Pagi/Malam');
  const [staffAccountType, setStaffAccountType] = useState('KASIR');
  const [staffPin, setStaffPin] = useState('');
  const [showPins, setShowPins] = useState({});
  const [staffFormError, setStaffFormError] = useState('');
  const [staffFormSuccess, setStaffFormSuccess] = useState('');

  // Form states for Adding New Cafe Table
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableZone, setNewTableZone] = useState('Indoor');
  const [tableFeedback, setTableFeedback] = useState('');

  const staffList = appData.staffList || [];
  const auditLogs = appData.auditLogs || [];
  const transactions = appData.transactions || [];
  const tables = appData.tables || [];

  const isSuperadmin = loggedInUser?.accountType === 'SUPERADMIN';

  // Compute per-cashier metrics from transactions & audit logs
  const cashierStatsMap = useMemo(() => {
    const map = {};
    staffList.forEach((s) => {
      const staffTrx = transactions.filter(
        (t) => t.cashierName?.toLowerCase() === s.name.toLowerCase()
      );
      const completedTrx = staffTrx.filter((t) => t.status === 'COMPLETED');
      const voidTrx = staffTrx.filter((t) => t.status === 'VOIDED');
      const totalSales = completedTrx.reduce((sum, t) => sum + Number(t.total || 0), 0);

      const staffLogs = auditLogs.filter(
        (l) => l.staffName?.toLowerCase() === s.name.toLowerCase()
      );
      const alertLogs = staffLogs.filter(
        (l) => l.severity === 'danger' || l.severity === 'warning'
      );

      map[s.id] = {
        completedCount: completedTrx.length,
        voidCount: voidTrx.length,
        totalSales,
        totalLogs: staffLogs.length,
        alertCount: alertLogs.length
      };
    });
    return map;
  }, [staffList, transactions, auditLogs]);

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (selectedCashierFilter !== 'ALL') {
        if ((log.staffName || '').toLowerCase() !== selectedCashierFilter.toLowerCase()) {
          return false;
        }
      }
      if (selectedCategoryFilter !== 'ALL' && log.category !== selectedCategoryFilter) {
        return false;
      }
      if (selectedSeverityFilter !== 'ALL' && log.severity !== selectedSeverityFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchStaff = (log.staffName || '').toLowerCase().includes(q);
        const matchAction = (log.action || '').toLowerCase().includes(q);
        const matchDetails = (log.details || '').toLowerCase().includes(q);
        if (!matchStaff && !matchAction && !matchDetails) return false;
      }
      return true;
    });
  }, [auditLogs, selectedCashierFilter, selectedCategoryFilter, selectedSeverityFilter, searchQuery]);

  // Unique staff names in logs + staffList for filter dropdown
  const allKnownStaffNames = useMemo(() => {
    const set = new Set();
    staffList.forEach((s) => set.add(s.name));
    auditLogs.forEach((l) => {
      if (l.staffName) set.add(l.staffName);
    });
    return Array.from(set);
  }, [staffList, auditLogs]);

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setStaffFormError('');
    setStaffFormSuccess('');

    if (!isSuperadmin) {
      setStaffFormError('Akses Ditolak! Hanya Superadmin (Owner Cafe) yang dapat mengelola akun kasir.');
      return;
    }

    if (!staffName.trim() || !staffUsername.trim() || !staffPin.trim()) {
      setStaffFormError('Nama lengkap, Username login, dan PIN wajib diisi.');
      return;
    }

    try {
      const res = await fetch('/api/superadmin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: loggedInUser.id,
          actorAccountType: loggedInUser.accountType,
          actorName: loggedInUser.name,
          id: editingStaffId,
          name: staffName,
          username: staffUsername,
          role: staffRole,
          accountType: staffAccountType,
          pin: staffPin,
          active: true
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setStaffFormError(data.error || 'Gagal menyimpan akun kasir.');
        return;
      }
      onStateUpdate(data);
      setStaffFormSuccess(
        editingStaffId
          ? `Akun "${staffName}" berhasil diperbarui!`
          : `Akun kasir baru "${staffName}" (@${staffUsername}) berhasil ditambahkan!`
      );
      setEditingStaffId(null);
      setStaffName('');
      setStaffUsername('');
      setStaffRole('Kasir Shift Pagi/Malam');
      setStaffAccountType('KASIR');
      setStaffPin('');
    } catch (err) {
      setStaffFormError('Kesalahan jaringan: ' + err.message);
    }
  };

  const handleEditClick = (staff) => {
    setEditingStaffId(staff.id);
    setStaffName(staff.name);
    setStaffUsername(staff.username || '');
    setStaffRole(staff.role || 'Kasir');
    setStaffAccountType(staff.accountType || 'KASIR');
    setStaffPin(staff.pin || '');
    setStaffFormError('');
    setStaffFormSuccess('');
  };

  const handleToggleStaffActive = async (staff) => {
    try {
      const res = await fetch(`/api/superadmin/staff/${staff.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorAccountType: loggedInUser?.accountType,
          actorName: loggedInUser?.name
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal mengubah status akun.');
        return;
      }
      onStateUpdate(data);
    } catch (err) {
      alert('Gagal mengubah status akun: ' + err.message);
    }
  };

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`Hapus permanen akun kasir "${staff.name}" (@${staff.username})?`)) return;
    try {
      const res = await fetch(
        `/api/superadmin/staff/${staff.id}?actorAccountType=${encodeURIComponent(
          loggedInUser?.accountType || ''
        )}&actorName=${encodeURIComponent(loggedInUser?.name || '')}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menghapus akun.');
        return;
      }
      onStateUpdate(data);
    } catch (err) {
      alert('Gagal menghapus akun: ' + err.message);
    }
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    setTableFeedback('');
    if (!newTableName.trim()) {
      alert('Masukkan nama meja baru (misal: Meja 09, VIP 01, Gazebo 02).');
      return;
    }
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTableName.trim(),
          capacity: Number(newTableCapacity || 4),
          zone: newTableZone,
          staffName: loggedInUser?.name || 'Owner Cafe'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menambah meja.');
        return;
      }
      onStateUpdate(data.state);
      setTableFeedback(`Meja "${data.table.name}" (${data.table.zone} • ${data.table.capacity} Kursi) berhasil ditambahkan!`);
      setNewTableName('');
    } catch (err) {
      alert('Gagal menambah meja: ' + err.message);
    }
  };

  const handleDeleteTable = async (table) => {
    if (!window.confirm(`Hapus "${table.name}" dari daftar meja cafe?`)) return;
    try {
      const res = await fetch(
        `/api/tables/${table.id}?staffName=${encodeURIComponent(loggedInUser?.name || 'Owner Cafe')}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menghapus meja.');
        return;
      }
      onStateUpdate(data);
    } catch (err) {
      alert('Gagal menghapus meja: ' + err.message);
    }
  };

  const handleReleaseTable = async (table) => {
    try {
      const res = await fetch(`/api/tables/${table.id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffName: loggedInUser?.name || 'Owner Cafe' })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal mengosongkan meja.');
        return;
      }
      onStateUpdate(data);
    } catch (err) {
      alert('Gagal mengosongkan meja: ' + err.message);
    }
  };

  const handleExportAuditCsv = () => {
    const headers = [
      'Waktu Rekam',
      'Nama Staf / Kasir',
      'Role / Jabatan',
      'Kategori',
      'Kode Aksi',
      'Tingkat Risiko',
      'Detail Rekam Jejak'
    ];
    const rows = filteredLogs.map((l) => [
      new Date(l.timestamp).toLocaleString('id-ID'),
      l.staffName,
      l.role || '-',
      l.category,
      l.action,
      l.severity,
      l.details
    ]);
    downloadCsv(`log-aktivitas-kasir-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  if (!isSuperadmin) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-rose-200 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Area Khusus Superadmin (Owner Cafe)</h2>
        <p className="text-sm text-slate-600 mt-2">
          Akun Anda saat ini (<b>{loggedInUser?.name}</b>) berstatus sebagai <b>KASIR</b>. Hanya <b>Superadmin (Owner Cafe)</b> yang memiliki izin untuk menambah akun kasir baru dan membuka pusat kendali Owner.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner Superadmin */}
      <div className="bg-gradient-to-r from-[#1B3156] via-[#152847] to-[#0f1e36] rounded-3xl p-6 text-white shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border border-amber-400/20">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950">
                SUPERADMIN • OWNER CAFE EXCLUSIVE
              </span>
              <span className="text-xs text-amber-200 font-semibold">
                Login Aktif: {loggedInUser?.name} (@{loggedInUser?.username})
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
              Panel Kendali Owner: Rekam Jejak Kasir, Akun Staf & Manajemen Meja
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 mt-0.5">
              Pantau seluruh aktivitas kasir secara transparan (CCTV Log Digital), kelola hak akses akun kasir, dan atur kapasitas meja cafe.
            </p>
          </div>
        </div>

        {/* Sub-navigation Pills */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setActiveSubTab('ACTIVITY_LOGS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'ACTIVITY_LOGS'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Activity className="w-4 h-4" />
            Log Aktivitas Kasir ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveSubTab('CASHIER_ACCOUNTS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'CASHIER_ACCOUNTS'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Users className="w-4 h-4" />
            Kelola Akun Kasir ({staffList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('TABLE_MANAGER')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeSubTab === 'TABLE_MANAGER'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Tambah & Kelola Meja ({tables.length - 1} Meja)
          </button>
        </div>
      </div>

      {/* TAB 1: LOG AKTIVITAS KASIR (REKAM JEJAK LENGKAP) */}
      {activeSubTab === 'ACTIVITY_LOGS' && (
        <div className="space-y-5">
          {/* Quick Summary Cards per Cashier */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {staffList.map((staff) => {
              const st = cashierStatsMap[staff.id] || {
                completedCount: 0,
                voidCount: 0,
                totalSales: 0,
                totalLogs: 0,
                alertCount: 0
              };
              const isSelected = selectedCashierFilter.toLowerCase() === staff.name.toLowerCase();

              return (
                <div
                  key={staff.id}
                  onClick={() =>
                    setSelectedCashierFilter(isSelected ? 'ALL' : staff.name)
                  }
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 border-[#1B3156] shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                          staff.accountType === 'SUPERADMIN'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-[#1B3156] text-white'
                        }`}
                      >
                        {staff.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">{staff.name}</p>
                        <p className="text-[11px] text-slate-500">
                          @{staff.username} • {staff.role}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-[#1B3156] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isSelected ? 'Sedang Difilter' : 'Klik Filter Log'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <p className="text-[10px] text-slate-500 font-semibold">Transaksi</p>
                      <p className="text-sm font-black text-slate-900">{st.completedCount} Struk</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <p className="text-[10px] text-slate-500 font-semibold">Aktivitas Log</p>
                      <p className="text-sm font-black text-[#1B3156]">{st.totalLogs} Aksi</p>
                    </div>
                    <div className="bg-rose-50/70 p-2 rounded-xl">
                      <p className="text-[10px] text-rose-600 font-semibold">Alert / Void</p>
                      <p className="text-sm font-black text-rose-700">{st.alertCount} Log</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#1B3156]" />
                  Rekam Jejak Aktivitas Kasir Real-Time (Audit Trail)
                </h2>
                <p className="text-xs text-slate-500">
                  Mencatat otomatis jam login/logout, transaksi pembayaran, buka/tutup shift, kas keluar, hapus draft, void, hingga ceklis barista.
                </p>
              </div>
              <button
                onClick={handleExportAuditCsv}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Log ke Excel / CSV ({filteredLogs.length})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {/* Filter by Cashier */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Filter Nama Kasir / Staf
                </label>
                <select
                  value={selectedCashierFilter}
                  onChange={(e) => setSelectedCashierFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50"
                >
                  <option value="ALL">Semua Kasir & Staf ({auditLogs.length})</option>
                  {allKnownStaffNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Kategori Aktivitas
                </label>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50"
                >
                  <option value="ALL">Semua Kategori</option>
                  <option value="AUTH">LOGIN / LOGOUT & AKUN (AUTH)</option>
                  <option value="SALES">PENJUALAN & SPLIT BILL (SALES)</option>
                  <option value="AUDIT_ALERT">PERINGATAN / VOID / HAPUS DRAFT</option>
                  <option value="SHIFT">BUKA & TUTUP SHIFT (SHIFT)</option>
                  <option value="CASH">KAS MASUK / KELUAR LACI (CASH)</option>
                  <option value="ORDER">MEJA, DRAFT & DAPUR (ORDER)</option>
                  <option value="INVENTORY">STOK, RESEP & OPNAME (INVENTORY)</option>
                  <option value="SETTINGS">PENGATURAN TOKO & MEJA (SETTINGS)</option>
                </select>
              </div>

              {/* Filter by Severity */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Tingkat Risiko Audit
                </label>
                <select
                  value={selectedSeverityFilter}
                  onChange={(e) => setSelectedSeverityFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50"
                >
                  <option value="ALL">Semua Level</option>
                  <option value="info">Normal / Info</option>
                  <option value="warning">Perhatian (Warning)</option>
                  <option value="danger">Kritis / Bahaya (Void / Selisih / Gagal Login)</option>
                </select>
              </div>

              {/* Search input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Cari Kata Kunci Log
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nomor struk, meja, void..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:border-[#1B3156]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Waktu Rekam</th>
                    <th className="py-3.5 px-4">Pelaku (Kasir / Staf)</th>
                    <th className="py-3.5 px-4">Kategori & Kode Aksi</th>
                    <th className="py-3.5 px-4">Detail Aktivitas Lengkap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-semibold">
                        Tidak ada rekam jejak aktivitas kasir yang sesuai dengan filter di atas.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const badgeStyle =
                        log.severity === 'danger'
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : log.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-[#1B3156] border-blue-200';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(log.timestamp).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <p className="font-bold text-slate-900">{log.staffName}</p>
                            <p className="text-[10px] text-slate-400">{log.role || 'Staf POS'}</p>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${badgeStyle}`}
                            >
                              {log.severity === 'danger' && <XCircle className="w-3 h-3" />}
                              {log.severity === 'warning' && <AlertTriangle className="w-3 h-3" />}
                              {log.severity === 'info' && <CheckCircle2 className="w-3 h-3" />}
                              {log.action}
                            </span>
                            <span className="ml-1.5 text-[10px] font-bold text-slate-400">
                              [{log.category}]
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium leading-relaxed">
                            {log.details}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAJEMEN AKUN KASIR (EKSKLUSIF SUPERADMIN OWNER) */}
      {activeSubTab === 'CASHIER_ACCOUNTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Form Tambah / Edit Akun Kasir */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs h-fit">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-[#1B3156] text-white flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {editingStaffId ? 'Edit Akun Staf / Kasir' : 'Tambah Akun Kasir Baru'}
                </h2>
                <p className="text-xs text-slate-500">
                  Hanya Superadmin (Owner) yang dapat membuat & mengatur PIN kasir.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Kasir *
                </label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Contoh: Siska Amelia"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-[#1B3156]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username Login *
                  </label>
                  <input
                    type="text"
                    value={staffUsername}
                    onChange={(e) =>
                      setStaffUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))
                    }
                    placeholder="Contoh: siska"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:outline-none focus:border-[#1B3156]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PIN Login (4-6 Angka) *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 5566"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-black tracking-widest focus:outline-none focus:border-[#1B3156]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jabatan / Shift
                  </label>
                  <input
                    type="text"
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                    placeholder="Kasir Shift Pagi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-[#1B3156]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Level Hak Akses
                  </label>
                  <select
                    value={staffAccountType}
                    onChange={(e) => setStaffAccountType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-slate-50 focus:outline-none focus:border-[#1B3156]"
                  >
                    <option value="KASIR">KASIR (Operasional POS)</option>
                    <option value="SUPERADMIN">SUPERADMIN (Owner Cafe)</option>
                  </select>
                </div>
              </div>

              {staffFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {staffFormError}
                </div>
              )}

              {staffFormSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                  {staffFormSuccess}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {editingStaffId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStaffId(null);
                      setStaffName('');
                      setStaffUsername('');
                      setStaffPin('');
                      setStaffAccountType('KASIR');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Batal Edit
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#1B3156] hover:bg-[#13233f] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  {editingStaffId ? 'Simpan Perubahan Akun' : 'Tambahkan Akun Kasir'}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Daftar Akun Kasir & Superadmin */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Daftar Akun Terdaftar ({staffList.length} Akun)
                </h2>
                <p className="text-xs text-slate-500">
                  Kelola status aktif/nonaktif akun kasir jika staf sedang cuti atau resign.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {staffList.map((staff) => {
                const isOwnerAccount = staff.accountType === 'SUPERADMIN';
                const stats = cashierStatsMap[staff.id] || {};
                const pinVisible = showPins[staff.id];

                return (
                  <div
                    key={staff.id}
                    className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      staff.active === false
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : isOwnerAccount
                        ? 'bg-amber-50/40 border-amber-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900">{staff.name}</span>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                            isOwnerAccount
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-blue-100 text-[#1B3156]'
                          }`}
                        >
                          {isOwnerAccount ? 'SUPERADMIN (OWNER)' : 'KASIR'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            staff.active === false
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {staff.active === false ? 'NONAKTIF' : 'AKTIF'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>
                          Username: <b className="font-mono text-slate-800">@{staff.username}</b>
                        </span>
                        <span>•</span>
                        <span>Jabatan: {staff.role}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          PIN:{' '}
                          <b className="font-mono text-slate-900">
                            {pinVisible ? staff.pin : '••••'}
                          </b>
                          <button
                            type="button"
                            onClick={() =>
                              setShowPins((prev) => ({ ...prev, [staff.id]: !prev[staff.id] }))
                            }
                            className="text-slate-400 hover:text-slate-700 ml-1"
                          >
                            {pinVisible ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                        <span>
                          Transaksi: <b>{stats.completedCount || 0} struk</b> ({formatIDR(stats.totalSales || 0)})
                        </span>
                        <span>•</span>
                        <span>
                          Log Aktivitas: <b>{stats.totalLogs || 0} aksi</b>
                        </span>
                        {staff.lastLoginAt && (
                          <>
                            <span>•</span>
                            <span>
                              Login Terakhir:{' '}
                              {new Date(staff.lastLoginAt).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditClick(staff)}
                        className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit / PIN
                      </button>

                      {!isOwnerAccount && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleStaffActive(staff)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                              staff.active === false
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                          >
                            {staff.active === false ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                Aktifkan
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                Nonaktifkan
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(staff)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                            title="Hapus Akun Kasir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MANAJEMEN MEJA CAFE (TAMBAHAN MEJA BARU) */}
      {activeSubTab === 'TABLE_MANAGER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Form Tambah Meja Baru */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs h-fit">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-[#1B3156] text-white flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Tambah Meja Cafe Baru
                </h2>
                <p className="text-xs text-slate-500">
                  Ada tambahan kursi/meja baru? Tambahkan langsung tanpa batas.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddTable} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama / Nomor Meja *
                </label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="Contoh: Meja 09, Gazebo 01, VIP Room"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-[#1B3156]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kapasitas Kursi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:border-[#1B3156]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Area / Zona Cafe
                  </label>
                  <select
                    value={newTableZone}
                    onChange={(e) => setNewTableZone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-slate-50"
                  >
                    <option value="Indoor">Indoor (AC)</option>
                    <option value="Outdoor">Outdoor / Taman</option>
                    <option value="Smoking Area">Smoking Area</option>
                    <option value="VIP / Meeting">VIP / Meeting Room</option>
                    <option value="Rooftop">Rooftop / Balkon</option>
                    <option value="Coffee Bar">Coffee Bar</option>
                  </select>
                </div>
              </div>

              {tableFeedback && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                  {tableFeedback}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#1B3156] hover:bg-[#13233f] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambahkan Meja ke Denah POS
              </button>
            </form>
          </div>

          {/* Right: Daftar Meja Cafe */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Denah & Status Meja Cafe Saat Ini ({tables.length - 1} Meja Dine-In)
                </h2>
                <p className="text-xs text-slate-500">
                  Meja yang sedang terisi otomatis terkunci dari input ganda sampai dikosongkan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {tables
                .filter((t) => t.id !== 'TAKE-AWAY')
                .map((table) => {
                  const isOccupied = table.status === 'occupied';
                  const openDraft = (appData.draftOrders || []).find(
                    (d) => d.tableId === table.id
                  );

                  return (
                    <div
                      key={table.id}
                      className={`p-4 rounded-2xl border-2 flex flex-col justify-between gap-3 ${
                        isOccupied
                          ? 'bg-amber-50/70 border-amber-300'
                          : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {table.name}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              isOccupied
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isOccupied ? 'TERISI' : 'TERSEDIA'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Area: <b>{table.zone || 'Indoor'}</b> • Kapasitas:{' '}
                          <b>{table.capacity || 4} Kursi</b>
                        </p>
                        {isOccupied && (
                          <p className="text-xs font-bold text-amber-800 mt-1.5 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                            Pelanggan: {openDraft?.customerName || table.occupiedBy || 'Tamu Dine-In'}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/70">
                        {isOccupied && !openDraft && (
                          <button
                            type="button"
                            onClick={() => handleReleaseTable(table)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Kosongkan Meja
                          </button>
                        )}
                        {!isOccupied && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTable(table)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus Meja
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
