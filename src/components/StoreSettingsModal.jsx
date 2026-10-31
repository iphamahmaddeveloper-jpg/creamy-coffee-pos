import React, { useState } from 'react';
import { Store, Wifi, Percent, Users, X, Plus, Trash2, Check, ShieldCheck, Lock } from 'lucide-react';

export default function StoreSettingsModal({
  storeProfile,
  staffList = [],
  activeStaff,
  onSaveSettings,
  onClose
}) {
  const isSuperadmin = activeStaff?.accountType === 'SUPERADMIN';

  const [profile, setProfile] = useState(() => ({
    name: storeProfile?.name || 'CREAMY COFFEE',
    tagline: storeProfile?.tagline || 'Specialty Coffee, Artisan Pastry & Cozy Space',
    address: storeProfile?.address || 'Jl. Senopati No. 88, Jakarta Selatan',
    phone: storeProfile?.phone || '0812-8899-7766',
    wifiName: storeProfile?.wifiName || 'CreamyCoffee_5G',
    wifiPass: storeProfile?.wifiPass || 'kopidulu2026',
    taxPercent: Number(storeProfile?.taxPercent || 0),
    servicePercent: Number(storeProfile?.servicePercent || 0),
    receiptFooter:
      storeProfile?.receiptFooter ||
      'Terima kasih telah berkunjung ke Creamy Coffee!\nFollow IG @creamycoffee.id'
  }));

  const [staffs, setStaffs] = useState(() => structuredClone(staffList));
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('1234');
  const [newStaffRole, setNewStaffRole] = useState('Kasir & Barista');

  const handleAddStaff = () => {
    if (!isSuperadmin) return;
    if (!newStaffName.trim()) return;
    const cleanUsername =
      newStaffUsername.trim().toLowerCase().replace(/\s+/g, '') ||
      newStaffName.trim().toLowerCase().split(' ')[0];
    setStaffs([
      ...staffs,
      {
        id: `STF-${Date.now().toString().slice(-4)}`,
        username: cleanUsername,
        name: newStaffName.trim(),
        role: newStaffRole,
        accountType: 'KASIR',
        pin: newStaffPin || '1234',
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);
    setNewStaffName('');
    setNewStaffUsername('');
    setNewStaffPin('1234');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-[#0f2b5b] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Store className="w-5 h-5 text-blue-300" />
            <div>
              <h3 className="font-bold text-base">
                Pengaturan Profil Cafe, Pajak PB1, Wi-Fi Struk & Staf
              </h3>
              <p className="text-xs text-blue-200">
                Sesuaikan identitas cafe client yang tampil di layar kasir & cetakan struk thermal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Section 1: Store Branding */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-[#0f2b5b]" />
              1. Identitas & Alamat Cafe
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Brand Cafe</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-[#0f2b5b]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Telepon / WA</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Alamat Lengkap (Tercetak di Header Struk)
                </label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tax PB1 & Wi-Fi Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-[#0f2b5b]" />
                Info Wi-Fi Pelanggan di Struk
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nama SSID Wi-Fi</label>
                <input
                  type="text"
                  value={profile.wifiName}
                  onChange={(e) => setProfile({ ...profile, wifiName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Password Wi-Fi</label>
                <input
                  type="text"
                  value={profile.wifiPass}
                  onChange={(e) => setProfile({ ...profile, wifiPass: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono-receipt"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-emerald-600" />
                Pajak Resto (PB1) & Footer Struk
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Pajak PB1 Otomatis (%) — Isi 0 jika harga sudah nett
                </label>
                <div className="flex gap-2">
                  {[0, 5, 10, 11].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setProfile({ ...profile, taxPercent: pct })}
                      className={`flex-1 py-1.5 rounded-lg font-bold border transition cursor-pointer ${
                        Number(profile.taxPercent) === pct
                          ? 'bg-[#0f2b5b] text-white border-[#0f2b5b]'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Catatan Kaki Struk (Footer)
                </label>
                <textarea
                  rows={2}
                  value={profile.receiptFooter}
                  onChange={(e) => setProfile({ ...profile, receiptFooter: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Staff Management (Superadmin Exclusive) */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#0f2b5b]" />
                3. Daftar Akun Staf Kasir & Superadmin
              </h4>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Khusus Superadmin (Owner)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {staffs.map((stf) => (
                <div
                  key={stf.id}
                  className="p-2.5 rounded-xl border border-slate-200 flex items-center justify-between bg-slate-50"
                >
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{stf.name}</span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          stf.accountType === 'SUPERADMIN'
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-blue-100 text-[#0f2b5b]'
                        }`}
                      >
                        {stf.accountType === 'SUPERADMIN' ? 'OWNER' : 'KASIR'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      @{stf.username || stf.id} • {stf.role}
                    </div>
                  </div>
                  {isSuperadmin && stf.accountType !== 'SUPERADMIN' && staffs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setStaffs(staffs.filter((s) => s.id !== stf.id))}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isSuperadmin ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Nama kasir baru..."
                  className="px-3 py-2 rounded-xl border border-slate-300"
                />
                <input
                  type="text"
                  value={newStaffUsername}
                  onChange={(e) => setNewStaffUsername(e.target.value)}
                  placeholder="Username (cth: siska)"
                  className="px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
                <input
                  type="text"
                  value={newStaffPin}
                  onChange={(e) => setNewStaffPin(e.target.value)}
                  placeholder="PIN (cth: 1234)"
                  className="px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddStaff}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Kasir
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2 text-xs font-semibold">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Penambahan atau penghapusan akun kasir dikunci khusus untuk akun <b>Superadmin (Owner Cafe)</b>.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onSaveSettings({
                storeProfile: profile,
                staffList: isSuperadmin ? staffs : undefined,
                staffName: activeStaff?.name || 'Owner Cafe',
                actorAccountType: activeStaff?.accountType || 'KASIR'
              });
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-[#0f2b5b] hover:bg-[#163d7a] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Simpan Pengaturan Cafe
          </button>
        </div>
      </div>
    </div>
  );
}

