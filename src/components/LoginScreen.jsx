import React, { useState } from 'react';
import {
  Coffee,
  ShieldCheck,
  UserCheck,
  Lock,
  KeyRound,
  LogIn,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  Delete
} from 'lucide-react';

export default function LoginScreen({ storeProfile, staffList = [], onLoginSuccess }) {
  const activeStaff = staffList.filter((s) => s.active !== false);
  const defaultOwner = activeStaff.find((s) => s.accountType === 'SUPERADMIN') || activeStaff[0];

  const [selectedIdentifier, setSelectedIdentifier] = useState(
    defaultOwner ? defaultOwner.username || defaultOwner.id : 'owner'
  );
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedAccount = staffList.find(
    (s) =>
      s.username?.toLowerCase() === selectedIdentifier.toLowerCase() ||
      s.id?.toLowerCase() === selectedIdentifier.toLowerCase()
  );

  const handleDigitClick = (digit) => {
    setErrorMsg('');
    if (pin.length < 6) {
      setPin((prev) => prev + String(digit));
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedIdentifier.trim()) {
      setErrorMsg('Pilih akun atau masukkan username terlebih dahulu.');
      return;
    }
    if (!pin.trim()) {
      setErrorMsg('Masukkan PIN Keamanan Anda.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: selectedIdentifier,
          pin
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Login gagal. Periksa kembali akun dan PIN Anda.');
        setPin('');
        return;
      }
      onLoginSuccess(data.user, data.state);
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server POS: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFillDemo = (staff) => {
    setSelectedIdentifier(staff.username || staff.id);
    setPin(staff.pin || '');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1f38] via-[#1B3156] to-[#13233f] flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-white/20">
        {/* Left Column: Cafe Branding & Account Selection */}
        <div className="lg:col-span-7 bg-slate-50 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200">
          <div>
            {/* Brand Header */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1B3156] text-white flex items-center justify-center shadow-lg">
                  <Coffee className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Sistem Kasir & Audit Terpadu
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                    {storeProfile?.name || 'CREAMY COFFEE'}
                  </h1>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#1B3156]" />
                Pilih Akun Login (Superadmin Owner / Kasir)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Setiap aktivitas login, transaksi, buka/tutup laci, hingga void tercatat otomatis di CCTV Log Aktivitas Owner.
              </p>
            </div>

            {/* Account Cards Grid */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {staffList.map((staff) => {
                const isSuperadmin = staff.accountType === 'SUPERADMIN';
                const isSelected =
                  selectedIdentifier.toLowerCase() === (staff.username || '').toLowerCase() ||
                  selectedIdentifier.toLowerCase() === staff.id.toLowerCase();
                const isDisabled = staff.active === false;

                return (
                  <div
                    key={staff.id}
                    onClick={() => {
                      if (!isDisabled) {
                        setSelectedIdentifier(staff.username || staff.id);
                        setPin('');
                        setErrorMsg('');
                      }
                    }}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isDisabled
                        ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                        : isSelected
                        ? isSuperadmin
                          ? 'bg-amber-50/90 border-amber-500 shadow-sm'
                          : 'bg-blue-50/90 border-[#1B3156] shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                          isSuperadmin
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : isSelected
                            ? 'bg-[#1B3156] text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isSuperadmin ? <ShieldCheck className="w-6 h-6" /> : staff.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-slate-900 truncate">{staff.name}</p>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isSuperadmin
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-blue-100 text-[#1B3156]'
                            }`}
                          >
                            {isSuperadmin ? 'SUPERADMIN (OWNER)' : 'AKUN KASIR'}
                          </span>
                          {isDisabled && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                              NONAKTIF
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Username: <span className="font-mono font-bold text-slate-700">@{staff.username || staff.id}</span> • Jabatan: {staff.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isDisabled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickFillDemo(staff);
                          }}
                          title="Isi Otomatis PIN Demo untuk pengujian cepat"
                          className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200"
                        >
                          PIN: {staff.pin}
                        </button>
                      )}
                      {isSelected && (
                        <CheckCircle2
                          className={`w-5 h-5 ${isSuperadmin ? 'text-amber-600' : 'text-[#1B3156]'}`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer info */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Hanya <b>Superadmin (Owner)</b> yang dapat menambah akun kasir baru.</span>
            </div>
            <span className="font-semibold text-slate-400">Creamy Coffee POS v2.5</span>
          </div>
        </div>

        {/* Right Column: PIN Keypad & Authentication */}
        <div className="lg:col-span-5 p-6 sm:p-8 bg-white flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center">
              <div
                className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-md ${
                  selectedAccount?.accountType === 'SUPERADMIN'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-[#1B3156] text-white'
                }`}
              >
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {selectedAccount ? `Masuk sebagai ${selectedAccount.name}` : 'Autentikasi Akun POS'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedAccount?.accountType === 'SUPERADMIN'
                  ? 'Hak Akses Penuh: Kelola Akun Kasir, Monitor Log CCTV Kasir, Tambah Meja & Laporan'
                  : 'Hak Akses Kasir: Transaksi Penjualan, Pilih/Tambah Meja, Dapur & Shift Kas'}
              </p>
            </div>

            {/* Username / Identifier Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Username / ID Akun
              </label>
              <input
                type="text"
                value={selectedIdentifier}
                onChange={(e) => {
                  setSelectedIdentifier(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Contoh: owner, nadia, rizky"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#1B3156]"
              />
            </div>

            {/* PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-[#1B3156]" />
                  PIN Keamanan
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPin ? 'Sembunyikan' : 'Lihat PIN'}
                </button>
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="••••"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 text-center text-2xl font-black tracking-[0.5em] text-[#1B3156] bg-slate-50 focus:bg-white focus:outline-none focus:border-[#1B3156]"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Touch Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigitClick(num)}
                  className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-extrabold text-lg transition shadow-xs"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setPin('');
                  setErrorMsg('');
                }}
                className="py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs uppercase transition"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => handleDigitClick(0)}
                className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-extrabold text-lg transition shadow-xs"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                selectedAccount?.accountType === 'SUPERADMIN'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-[#1B3156] hover:bg-[#13233f] text-white'
              } disabled:opacity-50`}
            >
              <LogIn className="w-4 h-4" />
              {loading
                ? 'Memverifikasi Akses...'
                : selectedAccount?.accountType === 'SUPERADMIN'
                ? 'Masuk sebagai Superadmin (Owner)'
                : 'Masuk ke Kasir POS'}
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Klik tombol <b>PIN: 9999</b> (Owner) atau <b>PIN: 1234</b> (Kasir) di kiri untuk demo cepat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

