import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initialData } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DB_PATH = path.join(__dirname, '..', 'data', 'pos-db.json');
const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'pos-db.json')
  : LOCAL_DB_PATH;

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

function loadDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      const seedSource = fs.existsSync(LOCAL_DB_PATH)
        ? JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'))
        : initialData;
      fs.writeFileSync(DB_PATH, JSON.stringify(seedSource, null, 2), 'utf8');
      return structuredClone(seedSource);
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    // Ensure Superadmin (Owner Cafe) & accountType fields exist on staffList
    if (Array.isArray(parsed.staffList)) {
      const hasSuperadmin = parsed.staffList.some((s) => s.accountType === 'SUPERADMIN');
      if (!hasSuperadmin) {
        parsed.staffList = structuredClone(initialData.staffList);
        fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf8');
      } else {
        parsed.staffList = parsed.staffList.map((s) => ({
          ...s,
          accountType: s.accountType || (s.id === 'STF-OWNER' ? 'SUPERADMIN' : 'KASIR'),
          username: s.username || s.name.split(' ')[0].toLowerCase()
        }));
      }
    }
    return parsed;
  } catch (err) {
    console.error('Error loading DB, using initialData:', err);
    return structuredClone(initialData);
  }
}

function saveDb(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function addAuditLog(db, { staffName = 'Nadia Putri', role = 'Kasir', action, category = 'GENERAL', severity = 'info', details }) {
  const entry = {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    staffName,
    role,
    action,
    category,
    severity,
    details
  };
  db.auditLogs.unshift(entry);
  return entry;
}

function enrichProducts(products, ingredients) {
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));
  return products.map((prod) => {
    if (prod.hasRecipe && Array.isArray(prod.recipe) && prod.recipe.length > 0) {
      let computedHpp = 0;
      let maxPortions = Infinity;
      const detailedRecipe = prod.recipe.map((r) => {
        const ing = ingMap.get(r.ingredientId);
        if (!ing) {
          maxPortions = 0;
          return { ...r, ingredientName: 'Bahan Tidak Ditemukan', unit: '-', cost: 0, availableStock: 0 };
        }
        const lineCost = Number(r.qty) * Number(ing.costPerUnit);
        computedHpp += lineCost;
        const possible = r.qty > 0 ? Math.floor(Number(ing.stock) / Number(r.qty)) : Infinity;
        if (possible < maxPortions) maxPortions = possible;
        return {
          ...r,
          ingredientName: ing.name,
          unit: ing.unit,
          costPerUnit: ing.costPerUnit,
          lineCost: Math.round(lineCost),
          availableStock: ing.stock
        };
      });
      const finalPortions = maxPortions === Infinity ? 0 : Math.max(0, maxPortions);
      const roundedHpp = Math.round(computedHpp);
      const grossMargin = prod.price - roundedHpp;
      const marginPercent = prod.price > 0 ? Math.round((grossMargin / prod.price) * 100) : 0;
      return {
        ...prod,
        computedHpp: roundedHpp,
        grossMargin,
        marginPercent,
        availablePortions: finalPortions,
        detailedRecipe
      };
    } else {
      const roundedHpp = Math.round(Number(prod.manualHpp || 0));
      const grossMargin = prod.price - roundedHpp;
      const marginPercent = prod.price > 0 ? Math.round((grossMargin / prod.price) * 100) : 0;
      return {
        ...prod,
        computedHpp: roundedHpp,
        grossMargin,
        marginPercent,
        availablePortions: Number(prod.stock || 0),
        detailedRecipe: []
      };
    }
  });
}

function buildStateResponse(db) {
  const enrichedProducts = enrichProducts(db.products, db.ingredients);
  const activeShift = db.shifts.find((s) => s.status === 'OPEN') || null;
  return {
    ...db,
    products: enrichedProducts,
    activeShift
  };
}

// GET full application state
app.get('/api/state', (req, res) => {
  const db = loadDb();
  res.json(buildStateResponse(db));
});

// Process Payment / Create Transaction (supports regular & split bill)
app.post('/api/transactions', (req, res) => {
  const db = loadDb();
  const {
    cashierId = 'STF-01',
    cashierName = 'Nadia Putri',
    customerName = 'Pelanggan Umum',
    tableId = 'TAKE-AWAY',
    tableName = 'Take Away',
    orderType = 'Dine In',
    paymentMethod = 'Tunai',
    discount = 0,
    tax = 0,
    amountPaid = 0,
    items = [],
    draftId = null,
    isSplitBill = false,
    remainingDraftItems = []
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Keranjang transaksi kosong.' });
  }

  if (!customerName || !String(customerName).trim()) {
    return res.status(400).json({ error: 'Nama pelanggan wajib diisi sebelum pembayaran!' });
  }

  const targetTable = db.tables.find((t) => t.id === tableId);
  if (!draftId && targetTable && targetTable.id !== 'TAKE-AWAY' && targetTable.status === 'occupied') {
    return res.status(400).json({
      error: `${targetTable.name} sedang terisi (${targetTable.occupiedBy || 'Pelanggan'})! Pilih meja kosong lainnya atau Take Away.`
    });
  }

  const enrichedProducts = enrichProducts(db.products, db.ingredients);
  const prodMap = new Map(enrichedProducts.map((p) => [p.id, p]));
  const rawProdMap = new Map(db.products.map((p) => [p.id, p]));
  const ingMap = new Map(db.ingredients.map((i) => [i.id, i]));

  let subtotal = 0;
  let totalHpp = 0;

  const processedItems = items.map((item) => {
    const qty = Number(item.qty) || 1;
    const price = Number(item.price) || 0;
    const lineSubtotal = qty * price;
    subtotal += lineSubtotal;

    const enrichedProd = prodMap.get(item.productId);
    const unitHpp = enrichedProd ? enrichedProd.computedHpp : Math.round(price * 0.45);
    totalHpp += unitHpp * qty;

    // Deduct stock from recipe ingredients or direct product stock
    const rawProd = rawProdMap.get(item.productId);
    if (rawProd) {
      if (rawProd.hasRecipe && Array.isArray(rawProd.recipe)) {
        rawProd.recipe.forEach((r) => {
          const ing = ingMap.get(r.ingredientId);
          if (ing) {
            ing.stock = Math.max(0, Number((ing.stock - Number(r.qty) * qty).toFixed(2)));
          }
        });
      } else {
        rawProd.stock = Math.max(0, Number(rawProd.stock || 0) - qty);
      }
    }

    return {
      productId: item.productId || `MANUAL-${Date.now()}`,
      name: item.name,
      category: enrichedProd?.category || 'Coffee',
      qty,
      price,
      unitHpp,
      subtotal: lineSubtotal,
      sugarLevel: item.sugarLevel || 'Normal Sugar',
      iceLevel: item.iceLevel || 'Normal Ice',
      notes: item.notes || '',
      printCupLabel: item.printCupLabel !== undefined ? item.printCupLabel : true,
      isDone: false
    };
  });

  const cleanDiscount = Math.max(0, Number(discount) || 0);
  const cleanTax = Math.max(0, Number(tax) || 0);
  const total = Math.max(0, subtotal - cleanDiscount + cleanTax);
  const grossProfit = total - totalHpp;
  const paid = Math.max(total, Number(amountPaid) || total);
  const change = Math.max(0, paid - total);

  const seq = String(db.transactions.length + 1).padStart(3, '0');
  const now = new Date();
  const dateCode = now.toISOString().slice(2, 10).replace(/-/g, '');
  const receiptNo = `INV/${dateCode}/${seq}`;

  const newTx = {
    id: `TRX-${Date.now()}`,
    receiptNo,
    createdAt: now.toISOString(),
    cashierId,
    cashierName,
    customerName,
    tableId,
    tableName,
    orderType: tableId === 'TAKE-AWAY' ? 'Take Away' : orderType,
    paymentMethod,
    subtotal,
    discount: cleanDiscount,
    tax: cleanTax,
    total,
    totalHpp,
    grossProfit,
    amountPaid: paid,
    change,
    isSplitBill,
    status: 'COMPLETED',
    kitchenStatus: 'QUEUE',
    items: processedItems
  };

  db.transactions.unshift(newTx);

  // Update customer loyalty points
  const customer = db.customers.find((c) => c.name.toLowerCase() === customerName.toLowerCase());
  if (customer && customer.id !== 'CUST-GENERAL') {
    customer.visits = (customer.visits || 0) + 1;
    customer.points = (customer.points || 0) + Math.floor(total / 10000);
  }

  // Handle draft order / table status
  // When a dine-in order is paid, the table becomes OCCUPIED until the customer finishes / leaves
  if (draftId) {
    if (isSplitBill && Array.isArray(remainingDraftItems) && remainingDraftItems.length > 0) {
      const draftIdx = db.draftOrders.findIndex((d) => d.id === draftId);
      if (draftIdx !== -1) {
        db.draftOrders[draftIdx].items = remainingDraftItems;
      }
    } else {
      db.draftOrders = db.draftOrders.filter((d) => d.id !== draftId);
    }
  }

  const table = db.tables.find((t) => t.id === tableId);
  if (table && table.id !== 'TAKE-AWAY') {
    table.status = 'occupied';
    table.occupiedBy = String(customerName).trim();
  }

  addAuditLog(db, {
    staffName: cashierName,
    action: isSplitBill ? 'SPLIT_BILL_BAYAR' : 'TRANSAKSI_BAYAR',
    category: 'SALES',
    severity: 'info',
    details: `${isSplitBill ? '[Split Bill] ' : ''}Transaksi ${receiptNo} Rp ${total.toLocaleString('id-ID')} (${paymentMethod} - ${tableName}) berhasil dibayar. HPP: Rp ${totalHpp.toLocaleString('id-ID')}`
  });

  saveDb(db);
  res.json({ transaction: newTx, state: buildStateResponse(db) });
});

// Void / Refund Transaction (restores stock + logs audit trail)
app.post('/api/transactions/:id/void', (req, res) => {
  const db = loadDb();
  const { id } = req.params;
  const { reason = 'Kesalahan input kasir', staffName = 'Dimas Aditya' } = req.body;

  const tx = db.transactions.find((t) => t.id === id);
  if (!tx) {
    return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
  }
  if (tx.status === 'VOID') {
    return res.status(400).json({ error: 'Transaksi sudah dibatalkan (VOID).' });
  }

  const rawProdMap = new Map(db.products.map((p) => [p.id, p]));
  const ingMap = new Map(db.ingredients.map((i) => [i.id, i]));

  tx.items.forEach((item) => {
    const rawProd = rawProdMap.get(item.productId);
    if (rawProd) {
      if (rawProd.hasRecipe && Array.isArray(rawProd.recipe)) {
        rawProd.recipe.forEach((r) => {
          const ing = ingMap.get(r.ingredientId);
          if (ing) {
            ing.stock = Number((ing.stock + Number(r.qty) * Number(item.qty)).toFixed(2));
          }
        });
      } else {
        rawProd.stock = Number(rawProd.stock || 0) + Number(item.qty);
      }
    }
  });

  tx.status = 'VOID';
  tx.voidReason = reason;
  tx.voidAt = new Date().toISOString();
  tx.voidBy = staffName;

  addAuditLog(db, {
    staffName,
    role: 'Supervisor / Kasir',
    action: 'VOID_TRANSAKSI',
    category: 'AUDIT_ALERT',
    severity: 'danger',
    details: `VOID Transaksi ${tx.receiptNo} senilai Rp ${tx.total.toLocaleString('id-ID')}. Alasan: "${reason}". Stok bahan baku telah dikembalikan.`
  });

  saveDb(db);
  res.json({ transaction: tx, state: buildStateResponse(db) });
});

// Save or Update Draft (Open Bill)
app.post('/api/drafts', (req, res) => {
  const db = loadDb();
  const {
    id,
    tableId = 'M-01',
    tableName = 'Meja 01',
    customerName = 'Pelanggan Umum',
    cashierName = 'Nadia Putri',
    items = []
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Pilih minimal 1 produk untuk disimpan ke Draft.' });
  }

  if (!customerName || !String(customerName).trim()) {
    return res.status(400).json({ error: 'Nama pelanggan wajib diisi sebelum menyimpan Open Bill!' });
  }

  const targetTable = db.tables.find((t) => t.id === tableId);
  if (!id && targetTable && targetTable.id !== 'TAKE-AWAY' && targetTable.status === 'occupied') {
    return res.status(400).json({
      error: `${targetTable.name} sudah terisi! Tidak bisa menginput Open Bill baru di meja yang sedang terisi.`
    });
  }

  const totalDraft = items.reduce((acc, i) => acc + Number(i.price) * Number(i.qty), 0);

  if (id) {
    const idx = db.draftOrders.findIndex((d) => d.id === id);
    if (idx !== -1) {
      db.draftOrders[idx] = {
        ...db.draftOrders[idx],
        tableId,
        tableName,
        customerName: String(customerName).trim(),
        cashierName,
        updatedAt: new Date().toISOString(),
        items
      };
    }
  } else {
    db.draftOrders.unshift({
      id: `DRF-${Date.now()}`,
      tableId,
      tableName,
      customerName: String(customerName).trim(),
      cashierName,
      createdAt: new Date().toISOString(),
      kitchenStatus: 'QUEUE',
      items
    });
  }

  if (targetTable && targetTable.id !== 'TAKE-AWAY') {
    targetTable.status = 'occupied';
    targetTable.occupiedBy = String(customerName).trim();
  }

  addAuditLog(db, {
    staffName: cashierName,
    action: 'SIMPAN_DRAFT',
    category: 'ORDER',
    severity: 'info',
    details: `Simpan pesanan Open Bill (${tableName} - ${customerName}) sebesar Rp ${totalDraft.toLocaleString('id-ID')}`
  });

  saveDb(db);
  res.json(buildStateResponse(db));
});

// Delete Draft Order
app.delete('/api/drafts/:id', (req, res) => {
  const db = loadDb();
  const draft = db.draftOrders.find((d) => d.id === req.params.id);
  if (draft) {
    const table = db.tables.find((t) => t.id === draft.tableId);
    if (table) table.status = 'available';
    db.draftOrders = db.draftOrders.filter((d) => d.id !== req.params.id);

    addAuditLog(db, {
      staffName: req.query.staffName || 'Nadia Putri',
      action: 'HAPUS_DRAFT',
      category: 'AUDIT_ALERT',
      severity: 'warning',
      details: `Menghapus Open Bill / Draft ${draft.tableName} (${draft.customerName})`
    });
    saveDb(db);
  }
  res.json(buildStateResponse(db));
});

// Create or Update Product (with Recipe / BOM)
app.post('/api/products', (req, res) => {
  const db = loadDb();
  const {
    id,
    name,
    sku,
    barcode,
    category = 'Coffee',
    isFeatured = false,
    price = 20000,
    hasRecipe = true,
    printCupLabel = true,
    stock = 0,
    minStock = 5,
    manualHpp = 0,
    image = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
    recipe = [],
    staffName = 'Nadia Putri'
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nama produk wajib diisi.' });
  }

  if (id) {
    const idx = db.products.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    db.products[idx] = {
      ...db.products[idx],
      name,
      sku: sku || db.products[idx].sku,
      barcode: barcode || db.products[idx].barcode,
      category,
      isFeatured: Boolean(isFeatured),
      price: Number(price),
      hasRecipe: Boolean(hasRecipe),
      printCupLabel: Boolean(printCupLabel),
      stock: Number(stock || 0),
      minStock: Number(minStock || 0),
      manualHpp: Number(manualHpp || 0),
      image: image || db.products[idx].image,
      recipe: Array.isArray(recipe) ? recipe : []
    };

    addAuditLog(db, {
      staffName,
      action: 'UPDATE_PRODUK',
      category: 'INVENTORY',
      severity: 'info',
      details: `Memperbarui produk & resep "${name}" (Harga Jual: Rp ${Number(price).toLocaleString('id-ID')})`
    });
  } else {
    const newProd = {
      id: `PRD-${Date.now()}`,
      name,
      sku: sku || `SKU-${Date.now().toString().slice(-4)}`,
      barcode: barcode || `899100${Math.floor(100000 + Math.random() * 900000)}`,
      category,
      isFeatured: Boolean(isFeatured),
      price: Number(price),
      hasRecipe: Boolean(hasRecipe),
      printCupLabel: Boolean(printCupLabel),
      stock: Number(stock || 0),
      minStock: Number(minStock || 0),
      manualHpp: Number(manualHpp || 0),
      image: image || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
      recipe: Array.isArray(recipe) ? recipe : []
    };
    db.products.push(newProd);

    addAuditLog(db, {
      staffName,
      action: 'TAMBAH_PRODUK',
      category: 'INVENTORY',
      severity: 'info',
      details: `Menambahkan menu produk baru "${name}" (${category}) - Rp ${Number(price).toLocaleString('id-ID')}`
    });
  }

  saveDb(db);
  res.json(buildStateResponse(db));
});

app.delete('/api/products/:id', (req, res) => {
  const db = loadDb();
  const prod = db.products.find((p) => p.id === req.params.id);
  if (prod) {
    db.products = db.products.filter((p) => p.id !== req.params.id);
    addAuditLog(db, {
      staffName: req.query.staffName || 'Dimas Aditya',
      action: 'HAPUS_PRODUK',
      category: 'INVENTORY',
      severity: 'warning',
      details: `Menghapus produk "${prod.name}" dari katalog`
    });
    saveDb(db);
  }
  res.json(buildStateResponse(db));
});

// Create or Update Ingredient (Bahan Baku)
app.post('/api/ingredients', (req, res) => {
  const db = loadDb();
  const {
    id,
    name,
    sku,
    unit = 'gram',
    stock = 0,
    minStock = 100,
    costPerUnit = 100,
    category = 'Bahan Minuman',
    staffName = 'Nadia Putri'
  } = req.body;

  if (!name) return res.status(400).json({ error: 'Nama bahan baku wajib diisi.' });

  if (id) {
    const idx = db.ingredients.findIndex((i) => i.id === id);
    if (idx !== -1) {
      db.ingredients[idx] = {
        ...db.ingredients[idx],
        name,
        sku: sku || db.ingredients[idx].sku,
        unit,
        stock: Number(stock),
        minStock: Number(minStock),
        costPerUnit: Number(costPerUnit),
        category
      };
    }
  } else {
    db.ingredients.push({
      id: `ING-${Date.now()}`,
      name,
      sku: sku || `BB-${Date.now().toString().slice(-4)}`,
      unit,
      stock: Number(stock),
      minStock: Number(minStock),
      costPerUnit: Number(costPerUnit),
      category
    });
  }

  addAuditLog(db, {
    staffName,
    action: id ? 'UPDATE_BAHAN_BAKU' : 'TAMBAH_BAHAN_BAKU',
    category: 'INVENTORY',
    severity: 'info',
    details: `${id ? 'Update' : 'Tambah'} bahan baku "${name}" (Stok: ${stock} ${unit}, HPP/${unit}: Rp ${Number(costPerUnit).toLocaleString('id-ID')})`
  });

  saveDb(db);
  res.json(buildStateResponse(db));
});

// Restock or Stock Opname (Adjustment) for Ingredient or Retail Product
app.post('/api/inventory/adjust', (req, res) => {
  const db = loadDb();
  const {
    targetType = 'ingredient', // 'ingredient' | 'product'
    targetId,
    mode = 'RESTOCK', // 'RESTOCK' | 'OPNAME' | 'WASTE'
    qty = 0,
    newCostPerUnit = null,
    reason = 'Belanja stok rutin',
    staffName = 'Nadia Putri'
  } = req.body;

  if (targetType === 'ingredient') {
    const ing = db.ingredients.find((i) => i.id === targetId);
    if (!ing) return res.status(404).json({ error: 'Bahan baku tidak ditemukan.' });

    const prevStock = Number(ing.stock);
    const numQty = Number(qty);

    if (mode === 'RESTOCK') {
      ing.stock = Number((prevStock + numQty).toFixed(2));
      if (newCostPerUnit !== null && Number(newCostPerUnit) > 0) {
        ing.costPerUnit = Number(newCostPerUnit);
      }
    } else if (mode === 'WASTE') {
      ing.stock = Math.max(0, Number((prevStock - numQty).toFixed(2)));
    } else if (mode === 'OPNAME') {
      ing.stock = Math.max(0, numQty);
    }

    addAuditLog(db, {
      staffName,
      action: `STOK_${mode}`,
      category: 'INVENTORY',
      severity: mode === 'WASTE' ? 'warning' : 'info',
      details: `[${mode}] Bahan "${ing.name}": ${prevStock} ${ing.unit} -> ${ing.stock} ${ing.unit}. Catatan: ${reason}`
    });
  } else {
    const prod = db.products.find((p) => p.id === targetId);
    if (!prod) return res.status(404).json({ error: 'Produk tidak ditemukan.' });

    const prevStock = Number(prod.stock || 0);
    const numQty = Number(qty);

    if (mode === 'RESTOCK') {
      prod.stock = prevStock + numQty;
      if (newCostPerUnit !== null && Number(newCostPerUnit) > 0) {
        prod.manualHpp = Number(newCostPerUnit);
      }
    } else if (mode === 'WASTE') {
      prod.stock = Math.max(0, prevStock - numQty);
    } else if (mode === 'OPNAME') {
      prod.stock = Math.max(0, numQty);
    }

    addAuditLog(db, {
      staffName,
      action: `PRODUK_${mode}`,
      category: 'INVENTORY',
      severity: mode === 'WASTE' ? 'warning' : 'info',
      details: `[${mode}] Produk Kemasan "${prod.name}": ${prevStock} pcs -> ${prod.stock} pcs. Catatan: ${reason}`
    });
  }

  saveDb(db);
  res.json(buildStateResponse(db));
});

// Shift & Cashier Audit Endpoints
app.post('/api/shifts/open', (req, res) => {
  const db = loadDb();
  const { cashierId = 'STF-01', cashierName = 'Nadia Putri', openingCash = 300000, notes = 'Shift Reguler' } = req.body;

  const existingOpen = db.shifts.find((s) => s.status === 'OPEN');
  if (existingOpen) {
    return res.status(400).json({ error: 'Masih ada shift kasir yang aktif. Tutup shift terlebih dahulu.' });
  }

  const newShift = {
    id: `SHF-${Date.now()}`,
    cashierId,
    cashierName,
    openedAt: new Date().toISOString(),
    closedAt: null,
    status: 'OPEN',
    openingCash: Number(openingCash),
    cashMovements: [],
    closingCashActual: null,
    closingCashExpected: null,
    variance: null,
    notes
  };

  db.shifts.unshift(newShift);

  addAuditLog(db, {
    staffName: cashierName,
    action: 'BUKA_SHIFT',
    category: 'SHIFT',
    severity: 'info',
    details: `Membuka shift kasir baru dengan Modal Awal Laci Rp ${Number(openingCash).toLocaleString('id-ID')}`
  });

  saveDb(db);
  res.json(buildStateResponse(db));
});

app.post('/api/shifts/cash-movement', (req, res) => {
  const db = loadDb();
  const { type = 'OUT', amount = 0, reason = 'Keperluan operasional', staffName = 'Nadia Putri' } = req.body;

  const activeShift = db.shifts.find((s) => s.status === 'OPEN');
  if (!activeShift) {
    return res.status(400).json({ error: 'Tidak ada shift kasir yang sedang terbuka.' });
  }

  const movement = {
    id: `CM-${Date.now()}`,
    type,
    amount: Number(amount),
    reason,
    createdAt: new Date().toISOString(),
    staffName
  };

  activeShift.cashMovements.push(movement);

  addAuditLog(db, {
    staffName,
    action: type === 'IN' ? 'KAS_MASUK' : 'KAS_KELUAR',
    category: 'CASH',
    severity: type === 'OUT' ? 'warning' : 'info',
    details: `${type === 'IN' ? 'Kas Masuk' : 'Kas Keluar'} laci kasir sebesar Rp ${Number(amount).toLocaleString('id-ID')} — ${reason}`
  });

  saveDb(db);
  res.json(buildStateResponse(db));
});

app.post('/api/shifts/close', (req, res) => {
  const db = loadDb();
  const { closingCashActual = 0, notes = '', staffName = 'Nadia Putri' } = req.body;

  const activeShift = db.shifts.find((s) => s.status === 'OPEN');
  if (!activeShift) {
    return res.status(400).json({ error: 'Tidak ada shift aktif untuk ditutup.' });
  }

  // Compute expected cash in drawer:
  // Opening Cash + Cash Sales since shift opened + Cash IN - Cash OUT
  const shiftStart = new Date(activeShift.openedAt).getTime();
  const cashSales = db.transactions
    .filter(
      (t) =>
        t.status === 'COMPLETED' &&
        t.paymentMethod === 'Tunai' &&
        new Date(t.createdAt).getTime() >= shiftStart
    )
    .reduce((sum, t) => sum + Number(t.total), 0);

  const cashIn = activeShift.cashMovements
    .filter((m) => m.type === 'IN')
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const cashOut = activeShift.cashMovements
    .filter((m) => m.type === 'OUT')
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const expected = Number(activeShift.openingCash) + cashSales + cashIn - cashOut;
  const actual = Number(closingCashActual);
  const variance = actual - expected;

  activeShift.status = 'CLOSED';
  activeShift.closedAt = new Date().toISOString();
  activeShift.closingCashExpected = expected;
  activeShift.closingCashActual = actual;
  activeShift.variance = variance;
  activeShift.cashSalesTotal = cashSales;
  if (notes) activeShift.notes = `${activeShift.notes || ''} | ${notes}`;

  addAuditLog(db, {
    staffName,
    action: 'TUTUP_SHIFT',
    category: 'SHIFT',
    severity: variance === 0 ? 'info' : variance < 0 ? 'danger' : 'warning',
    details: `Tutup Shift Kasir. Ekspektasi Sistem: Rp ${expected.toLocaleString('id-ID')}, Uang Fisik Aktual: Rp ${actual.toLocaleString('id-ID')}, Selisih: Rp ${variance.toLocaleString('id-ID')}`
  });

  saveDb(db);
  res.json(buildStateResponse(db));
});

// Add Customer
app.post('/api/customers', (req, res) => {
  const db = loadDb();
  const { name, phone = '-' } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama pelanggan wajib diisi.' });
  const newCust = {
    id: `CUST-${Date.now()}`,
    name,
    phone,
    points: 10,
    visits: 1
  };
  db.customers.push(newCust);
  saveDb(db);
  res.json({ customer: newCust, state: buildStateResponse(db) });
});

// Update Store Profile & Tax / Wi-Fi / Staff Settings
app.put('/api/store-profile', (req, res) => {
  const db = loadDb();
  const { storeProfile, staffList, staffName = 'Hendra Wijaya (Owner Cafe)', actorAccountType = 'SUPERADMIN' } = req.body;

  if (storeProfile) {
    db.storeProfile = {
      ...db.storeProfile,
      ...storeProfile,
      taxPercent: Number(storeProfile.taxPercent || 0),
      servicePercent: Number(storeProfile.servicePercent || 0)
    };
  }

  if (Array.isArray(staffList) && actorAccountType === 'SUPERADMIN') {
    db.staffList = staffList;
  }

  addAuditLog(db, {
    staffName,
    role: actorAccountType === 'SUPERADMIN' ? 'Owner Cafe (Superadmin)' : 'Kasir',
    action: 'UPDATE_PROFIL_TOKO',
    category: 'SETTINGS',
    severity: 'info',
    details: `Memperbarui Pengaturan Profil Cafe "${db.storeProfile.name}" (PB1: ${db.storeProfile.taxPercent}%, Wi-Fi: ${db.storeProfile.wifiName})`
  });

  saveDb(db);
  res.json(buildStateResponse(db));
});

// Authentication: Login with Username/ID & PIN
app.post('/api/auth/login', (req, res) => {
  const db = loadDb();
  const { identifier = '', pin = '' } = req.body || {};

  const cleanId = String(identifier).trim().toLowerCase();
  const cleanPin = String(pin).trim();

  const staff = db.staffList.find(
    (s) =>
      s.id.toLowerCase() === cleanId ||
      (s.username && s.username.toLowerCase() === cleanId) ||
      s.name.toLowerCase() === cleanId
  );

  if (!staff) {
    addAuditLog(db, {
      staffName: identifier || 'Unknown',
      role: 'Unauthenticated',
      action: 'LOGIN_GAGAL',
      category: 'AUDIT_ALERT',
      severity: 'warning',
      details: `Percobaan login gagal: Akun "${identifier}" tidak ditemukan.`
    });
    saveDb(db);
    return res.status(401).json({ error: 'Akun tidak ditemukan. Periksa kembali pilih akun / username.' });
  }

  if (staff.active === false) {
    addAuditLog(db, {
      staffName: staff.name,
      role: staff.role,
      action: 'LOGIN_DITOLAK',
      category: 'AUDIT_ALERT',
      severity: 'danger',
      details: `Percobaan login ke akun nonaktif "${staff.name}" (${staff.username}) ditolak.`
    });
    saveDb(db);
    return res.status(403).json({ error: 'Akun kasir ini sedang dinonaktifkan oleh Superadmin (Owner).' });
  }

  if (String(staff.pin) !== cleanPin) {
    addAuditLog(db, {
      staffName: staff.name,
      role: staff.role,
      action: 'LOGIN_GAGAL',
      category: 'AUDIT_ALERT',
      severity: 'danger',
      details: `Percobaan login gagal untuk "${staff.name}" (${staff.username}): PIN salah!`
    });
    saveDb(db);
    return res.status(401).json({ error: 'PIN Keamanan salah! Percobaan ini tercatat di Log Audit Owner.' });
  }

  staff.lastLoginAt = new Date().toISOString();

  addAuditLog(db, {
    staffName: staff.name,
    role: staff.role,
    action: 'LOGIN_BERHASIL',
    category: 'AUTH',
    severity: 'info',
    details: `Login berhasil sebagai ${staff.accountType === 'SUPERADMIN' ? 'SUPERADMIN (Owner Cafe)' : 'Staf Kasir'} (@${staff.username})`
  });

  saveDb(db);
  res.json({
    user: staff,
    state: buildStateResponse(db)
  });
});

// Authentication: Logout
app.post('/api/auth/logout', (req, res) => {
  const db = loadDb();
  const { staffName = 'Kasir', role = 'Kasir', username = '' } = req.body || {};

  addAuditLog(db, {
    staffName,
    role,
    action: 'LOGOUT_AKUN',
    category: 'AUTH',
    severity: 'info',
    details: `Logout dari sesi aplikasi POS${username ? ` (@${username})` : ''}`
  });

  saveDb(db);
  res.json(buildStateResponse(db));
});

// SUPERADMIN ONLY: Create or Update Cashier / Staff Account
app.post('/api/superadmin/staff', (req, res) => {
  const db = loadDb();
  const {
    actorId,
    actorAccountType,
    actorName = 'Hendra Wijaya (Owner Cafe)',
    id = null,
    username = '',
    name = '',
    role = 'Kasir',
    accountType = 'KASIR',
    pin = '1234',
    active = true
  } = req.body || {};

  // Verify Superadmin authorization
  const actor = db.staffList.find((s) => s.id === actorId);
  if (actorAccountType !== 'SUPERADMIN' && (!actor || actor.accountType !== 'SUPERADMIN')) {
    addAuditLog(db, {
      staffName: actorName,
      role: 'Unauthorized',
      action: 'AKSES_DITOLAK',
      category: 'AUDIT_ALERT',
      severity: 'danger',
      details: `Percobaan menambah/mengubah akun kasir tanpa hak akses Superadmin (Owner)!`
    });
    saveDb(db);
    return res.status(403).json({
      error: 'Akses Ditolak! Hanya Superadmin (Owner Cafe) yang dapat menambahkan atau mengubah akun kasir.'
    });
  }

  if (!name.trim() || !username.trim() || !String(pin).trim()) {
    return res.status(400).json({ error: 'Nama lengkap, Username, dan PIN wajib diisi!' });
  }

  const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');

  const duplicateUsername = db.staffList.find(
    (s) => s.username && s.username.toLowerCase() === cleanUsername && s.id !== id
  );
  if (duplicateUsername) {
    return res.status(400).json({ error: `Username "@${cleanUsername}" sudah digunakan oleh ${duplicateUsername.name}.` });
  }

  if (id) {
    const idx = db.staffList.findIndex((s) => s.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Akun staf tidak ditemukan.' });

    db.staffList[idx] = {
      ...db.staffList[idx],
      username: cleanUsername,
      name: name.trim(),
      role: role.trim() || 'Kasir',
      accountType: accountType === 'SUPERADMIN' ? 'SUPERADMIN' : 'KASIR',
      pin: String(pin).trim(),
      active: Boolean(active)
    };

    addAuditLog(db, {
      staffName: actorName,
      role: 'Owner Cafe (Superadmin)',
      action: 'UPDATE_AKUN_KASIR',
      category: 'AUTH',
      severity: 'info',
      details: `Superadmin memperbarui akun "${name.trim()}" (@${cleanUsername} - ${role})`
    });
  } else {
    const newStaff = {
      id: `STF-${Date.now().toString().slice(-5)}`,
      username: cleanUsername,
      name: name.trim(),
      role: role.trim() || 'Kasir',
      accountType: accountType === 'SUPERADMIN' ? 'SUPERADMIN' : 'KASIR',
      pin: String(pin).trim(),
      active: true,
      createdAt: new Date().toISOString()
    };
    db.staffList.push(newStaff);

    addAuditLog(db, {
      staffName: actorName,
      role: 'Owner Cafe (Superadmin)',
      action: 'TAMBAH_AKUN_KASIR',
      category: 'AUTH',
      severity: 'info',
      details: `Superadmin menambahkan akun kasir baru: "${newStaff.name}" (@${newStaff.username}, Role: ${newStaff.role})`
    });
  }

  saveDb(db);
  res.json(buildStateResponse(db));
});

// SUPERADMIN ONLY: Toggle Active/Inactive Status of Cashier Account
app.patch('/api/superadmin/staff/:id/toggle', (req, res) => {
  const db = loadDb();
  const { actorAccountType, actorName = 'Hendra Wijaya (Owner Cafe)' } = req.body || {};

  if (actorAccountType !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Hanya Superadmin (Owner Cafe) yang dapat menonaktifkan/mengaktifkan akun kasir.' });
  }

  const target = db.staffList.find((s) => s.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Akun kasir tidak ditemukan.' });

  if (target.accountType === 'SUPERADMIN') {
    const activeSuperadmins = db.staffList.filter((s) => s.accountType === 'SUPERADMIN' && s.active !== false);
    if (activeSuperadmins.length <= 1 && target.active !== false) {
      return res.status(400).json({ error: 'Akun Superadmin utama tidak boleh dinonaktifkan.' });
    }
  }

  target.active = target.active === false ? true : false;

  addAuditLog(db, {
    staffName: actorName,
    role: 'Owner Cafe (Superadmin)',
    action: target.active ? 'AKTIFKAN_AKUN_KASIR' : 'NONAKTIFKAN_AKUN_KASIR',
    category: 'AUTH',
    severity: target.active ? 'info' : 'warning',
    details: `Superadmin ${target.active ? 'mengaktifkan kembali' : 'menonaktifkan'} akses login akun "${target.name}" (@${target.username})`
  });

  saveDb(db);
  res.json(buildStateResponse(db));
});

// SUPERADMIN ONLY: Delete Cashier Account
app.delete('/api/superadmin/staff/:id', (req, res) => {
  const db = loadDb();
  const actorAccountType = req.query.actorAccountType;
  const actorName = req.query.actorName || 'Hendra Wijaya (Owner Cafe)';

  if (actorAccountType !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Hanya Superadmin (Owner Cafe) yang dapat menghapus akun kasir.' });
  }

  const target = db.staffList.find((s) => s.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Akun kasir tidak ditemukan.' });

  if (target.accountType === 'SUPERADMIN') {
    return res.status(400).json({ error: 'Akun Superadmin Owner tidak dapat dihapus.' });
  }

  db.staffList = db.staffList.filter((s) => s.id !== req.params.id);

  addAuditLog(db, {
    staffName: actorName,
    role: 'Owner Cafe (Superadmin)',
    action: 'HAPUS_AKUN_KASIR',
    category: 'AUDIT_ALERT',
    severity: 'warning',
    details: `Superadmin menghapus akun kasir "${target.name}" (@${target.username})`
  });

  saveDb(db);
  res.json(buildStateResponse(db));
});

// Add New Cafe Table (Tambahan Meja)
app.post('/api/tables', (req, res) => {
  const db = loadDb();
  const { name = '', capacity = 4, zone = 'Indoor', staffName = 'Owner / Kasir' } = req.body || {};

  if (!String(name).trim()) {
    return res.status(400).json({ error: 'Nama meja wajib diisi (contoh: Meja 09, VIP 01, Gazebo 02).' });
  }

  const cleanName = String(name).trim();
  const exists = db.tables.find((t) => t.name.toLowerCase() === cleanName.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: `"${cleanName}" sudah terdaftar di daftar meja cafe.` });
  }

  const newTable = {
    id: `TBL-${Date.now().toString().slice(-5)}`,
    name: cleanName,
    capacity: Math.max(1, Number(capacity || 2)),
    zone: String(zone || 'Indoor').trim(),
    status: 'available'
  };

  db.tables.push(newTable);

  addAuditLog(db, {
    staffName,
    action: 'TAMBAH_MEJA',
    category: 'SETTINGS',
    severity: 'info',
    details: `Menambahkan meja baru "${newTable.name}" (Kapasitas: ${newTable.capacity} kursi, Area: ${newTable.zone})`
  });

  saveDb(db);
  res.json({ table: newTable, state: buildStateResponse(db) });
});

// Delete Cafe Table
app.delete('/api/tables/:tableId', (req, res) => {
  const db = loadDb();
  const { tableId } = req.params;
  const staffName = req.query.staffName || 'Hendra Wijaya (Owner Cafe)';

  if (tableId === 'TAKE-AWAY') {
    return res.status(400).json({ error: 'Opsi dasar Take Away tidak dapat dihapus.' });
  }

  const table = db.tables.find((t) => t.id === tableId);
  if (!table) {
    return res.status(404).json({ error: 'Meja tidak ditemukan.' });
  }

  if (table.status === 'occupied') {
    return res.status(400).json({ error: `${table.name} sedang terisi pelanggan. Kosongkan meja terlebih dahulu sebelum menghapus.` });
  }

  db.tables = db.tables.filter((t) => t.id !== tableId);

  addAuditLog(db, {
    staffName,
    action: 'HAPUS_MEJA',
    category: 'SETTINGS',
    severity: 'warning',
    details: `Menghapus meja "${table.name}" dari denah meja cafe`
  });

  saveDb(db);
  res.json(buildStateResponse(db));
});

// Update Kitchen / Barista Display (KDS) Order Status & Item Checklist
app.patch('/api/kitchen/:orderId', (req, res) => {
  const db = loadDb();
  const { orderId } = req.params;
  const { kitchenStatus, toggleItemIndex = null, staffName = 'Barista' } = req.body;

  let targetOrder = db.transactions.find((t) => t.id === orderId);

  if (!targetOrder) {
    targetOrder = db.draftOrders.find((d) => d.id === orderId);
  }

  if (!targetOrder) {
    return res.status(404).json({ error: 'Pesanan tidak ditemukan di antrian Barista/Dapur.' });
  }

  if (kitchenStatus) {
    targetOrder.kitchenStatus = kitchenStatus;
    addAuditLog(db, {
      staffName,
      role: 'Barista & Kitchen',
      action: `DAPUR_${kitchenStatus}`,
      category: 'ORDER',
      severity: 'info',
      details: `Update status pesanan ${targetOrder.receiptNo || targetOrder.tableName} (${targetOrder.customerName || 'Pelanggan'}) menjadi ${kitchenStatus}`
    });
  }

  if (toggleItemIndex !== null && targetOrder.items && targetOrder.items[toggleItemIndex]) {
    targetOrder.items[toggleItemIndex].isDone = !targetOrder.items[toggleItemIndex].isDone;
    const toggledItem = targetOrder.items[toggleItemIndex];
    addAuditLog(db, {
      staffName,
      role: 'Barista & Kitchen',
      action: toggledItem.isDone ? 'CEKLIS_MENU_SELESAI' : 'BATAL_CEKLIS_MENU',
      category: 'ORDER',
      severity: 'info',
      details: `${toggledItem.isDone ? 'Menyelesaikan' : 'Membatalkan ceklis'} pembuatan "${toggledItem.qty}x ${toggledItem.name}" untuk ${targetOrder.tableName} (${targetOrder.customerName || 'Pelanggan'})`
    });
  }

  saveDb(db);
  res.json(buildStateResponse(db));
});

// Release / Clear Occupied Table (Kosongkan Meja setelah pelanggan selesai)
app.post('/api/tables/:tableId/release', (req, res) => {
  const db = loadDb();
  const { tableId } = req.params;
  const { staffName = 'Nadia Putri' } = req.body || {};

  const table = db.tables.find((t) => t.id === tableId);
  if (!table) {
    return res.status(404).json({ error: 'Meja tidak ditemukan.' });
  }

  const hasOpenDraft = db.draftOrders.some((d) => d.tableId === tableId);
  if (hasOpenDraft) {
    return res.status(400).json({
      error: `${table.name} masih memiliki tagihan Open Bill (Draft) yang belum dibayar!`
    });
  }

  table.status = 'available';
  delete table.occupiedBy;

  addAuditLog(db, {
    staffName,
    role: 'Kasir / Floor Staff',
    action: 'KOSONGKAN_MEJA',
    category: 'ORDER',
    severity: 'info',
    details: `Mengosongkan ${table.name} (Pelanggan telah selesai, meja siap digunakan kembali)`
  });

  saveDb(db);
  res.json(buildStateResponse(db));
});

// Reset Demo Data
app.post('/api/reset-demo', (req, res) => {
  saveDb(structuredClone(initialData));
  const db = loadDb();
  res.json(buildStateResponse(db));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Creamy Coffee POS Server running at http://localhost:${PORT}`);
  });
}

export default app;


