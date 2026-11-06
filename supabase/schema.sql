-- ====================================================================
-- SKEMA DATABASE POSTGRESQL UNTUK SUPABASE
-- Aplikasi: CREAMY COFFEE POS (Point of Sale & Kitchen Management)
-- ====================================================================

-- 1. Tabel Profil Toko / Kafe
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY DEFAULT 'STORE-01',
  name TEXT NOT NULL DEFAULT 'CREAMY COFFEE',
  tagline TEXT DEFAULT 'Artisan Coffee & Bakery',
  address TEXT DEFAULT 'Jl. Margonda Raya No. 88, Depok',
  phone TEXT DEFAULT '0812-3456-7890',
  wifi_name TEXT DEFAULT 'CreamyCoffee_Guest',
  wifi_pass TEXT DEFAULT 'kopienak2026',
  tax_rate NUMERIC(5,2) DEFAULT 10.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabel Staf & Karyawan (RBAC)
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  pin TEXT NOT NULL DEFAULT '1234',
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'Head Barista & Kasir', 'Barista', 'Owner Cafe'
  account_type TEXT NOT NULL, -- 'KASIR', 'BARISTA', 'SUPERADMIN'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabel Meja Pelanggan
CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INT DEFAULT 4,
  zone TEXT DEFAULT 'Indoor',
  status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'OCCUPIED'
  current_customer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabel Kategori Menu
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'coffee',
  sort_order INT DEFAULT 0
);

-- 5. Tabel Bahan Baku Mentah (Inventory Ingredients)
CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- 'gram', 'ml', 'pcs'
  stock NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_stock NUMERIC(10,2) NOT NULL DEFAULT 100,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabel Master Produk Menu
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  cost_estimate NUMERIC(12,2) DEFAULT 0,
  barcode TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Tabel Resep / Bill of Materials (BOM)
CREATE TABLE IF NOT EXISTS product_recipes (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id TEXT REFERENCES ingredients(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  UNIQUE(product_id, ingredient_id)
);

-- 8. Tabel Sesi Shift Kasir
CREATE TABLE IF NOT EXISTS cash_shifts (
  id TEXT PRIMARY KEY,
  cashier_id TEXT REFERENCES staff(id),
  cashier_name TEXT NOT NULL,
  opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(12,2),
  expected_cash NUMERIC(12,2),
  variance NUMERIC(12,2) DEFAULT 0,
  variance_notes TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- 9. Tabel Transaksi / Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  cashier_id TEXT REFERENCES staff(id),
  cashier_name TEXT NOT NULL,
  table_id TEXT,
  table_name TEXT,
  customer_name TEXT DEFAULT 'Pelanggan Walk-in',
  order_type TEXT DEFAULT 'Dine In', -- 'Dine In', 'Take Away'
  subtotal NUMERIC(12,2) NOT NULL,
  discount NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL, -- 'Tunai', 'QRIS', 'Debit/EDC'
  cash_tendered NUMERIC(12,2) DEFAULT 0,
  change_returned NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PAID', -- 'PAID', 'VOID'
  kitchen_status TEXT NOT NULL DEFAULT 'IN_PROGRESS', -- 'IN_PROGRESS', 'READY', 'COMPLETED'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. Tabel Rincian Item Transaksi
CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  product_name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  sugar_level TEXT DEFAULT 'Normal Sugar',
  ice_level TEXT DEFAULT 'Normal Ice',
  notes TEXT,
  total_price NUMERIC(12,2) NOT NULL
);

-- 11. Tabel Log Audit Staf Kasir (Anti-Fraud)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  staff_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  category TEXT DEFAULT 'TRANSACTION',
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- DATABASE TRIGGER: Pemotongan Stok Otomatis Saat Transaksi PAID
-- ====================================================================

CREATE OR REPLACE FUNCTION deduct_inventory_on_order_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Kurangi stok bahan mentah berdasarkan tabel product_recipes
  UPDATE ingredients ing
  SET stock = ing.stock - (r.amount * oi.quantity)
  FROM order_items oi
  JOIN product_recipes r ON r.product_id = oi.product_id
  WHERE oi.order_id = NEW.id
    AND r.ingredient_id = ing.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_inventory ON orders;
CREATE TRIGGER trigger_deduct_inventory
AFTER INSERT ON orders
FOR EACH ROW
WHEN (NEW.status = 'PAID')
EXECUTE FUNCTION deduct_inventory_on_order_paid();

