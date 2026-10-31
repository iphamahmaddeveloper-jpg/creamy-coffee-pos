# CREAMY COFFEE — Aplikasi Web POS Kasir Cafe & F&B

Aplikasi Point of Sale (POS) Kasir berbasis Web yang dirancang khusus untuk operasional **Cafe, Coffee Shop, Resto & Retail F&B** dengan seluruh fitur inti sesuai referensi:

## Fitur Utama

1. **Kasir Penjualan (POS) Cepat & Simpel (`CREAMY COFFEE - Penjualan`)**
   - Tampilan identik dengan referensi: Katalog menu bergambar dengan kategori (`Produk Unggulan`, `Coffee`, `Makanan`, `Non Coffee`, `Kemasan`), pencarian & filter harga, pilih **Meja** (`Meja 01` - `Meja 08`, `Take Away`) dan **Pelanggan**.
   - Kustomisasi pesanan minuman cafe: Level Gula (`Normal Sugar`, `Less Sugar`, `No Sugar`), Level Es (`Normal Ice`, `Less Ice`, `Hot / Panas`), dan catatan khusus.
   - Tombol **Simpan** (Open Bill / Draft pesanan meja), **Pisah** (**Split Bill** untuk pisah bayar per item), dan **Bayar** (Tunai, QRIS, Debit/EDC).
2. **Produk Resep (Bill of Materials / BOM) & Bahan Baku**
   - Setiap menu memiliki komposisi resep bahan baku (contoh: *Matcha* menggunakan `15g Bubuk Matcha Uji`, `150ml Susu Fresh Milk`, `20ml Simple Syrup`, `1 pcs Cup 16oz`).
   - Saat transaksi dibayar, stok masing-masing bahan baku otomatis terpotong sesuai takaran resep.
3. **Tracking Stok Inventori & Kalkulasi HPP Otomatis**
   - Menghitung **HPP (Harga Pokok Penjualan)** dan **Margin Laba Kotor (%)** secara otomatis dari harga satuan bahan baku di resep.
   - Menampilkan estimasi berapa porsi maksimal yang bisa dibuat dari sisa stok bahan baku saat ini.
   - Fitur **Restock Belanja Bahan**, **Stock Opname Fisik**, dan pencatatan **Barang Rusak / Waste**.
4. **Cetak Struk Kasir Thermal & Label Minuman (Cup Sticker)**
   - **Struk Kasir Thermal (58mm/80mm)** lengkap dengan rincian pesanan, kembalian, dan info Wi-Fi Cafe.
   - **Label Stiker Cup Minuman** otomatis per gelas (`CUP 1/2`, nama menu, takaran gula/es, catatan khusus, nomor meja, nama pelanggan, dan jam pesanan).
5. **Scan Barcode Produk & Input Manual**
   - Mendukung pemindaian kode barcode (EAN/SKU) dengan scanner USB/Bluetooth maupun simulasi cepat di layar.
6. **Audit Staf Kasir & Rekonsiliasi Shift Laci Kas**
   - **Manajemen Shift Kasir**: Buka Shift (Modal Awal), Kas Masuk / Kas Keluar operasional, dan Tutup Shift dengan perhitungan otomatis **Selisih Kas (Variance)** antara uang fisik aktual dan ekspektasi sistem.
   - **Log Audit Staf Kasir (Anti-Fraud Trail)**: Mencatat seluruh aktivitas sensitif staf (Transaksi, Split Bill, Simpan/Hapus Draft, Void Transaksi beserta pengembalian stok, Opname Inventori, dan Kas Keluar).

## Cara Menjalankan

```bash
npm install
npm run dev
```
- **Frontend Web App**: http://localhost:5175
- **Backend REST API**: http://localhost:3005

