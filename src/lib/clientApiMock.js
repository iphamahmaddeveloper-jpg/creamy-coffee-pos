import { initialData } from '../data/seedData.js';
import { isSupabaseConfigured, syncOrderToSupabase } from './supabase.js';

const STORAGE_KEY = 'creamy_coffee_pos_db_v3';

function loadClientDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.products) && parsed.products.length > 0) {
        // Ensure staffList is up-to-date with initialData staff accounts
        if (!Array.isArray(parsed.staffList) || parsed.staffList.length === 0) {
          parsed.staffList = structuredClone(initialData.staffList);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading localStorage DB:', e);
  }
  const cloned = structuredClone(initialData);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cloned));
  return cloned;
}

function saveClientDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Error saving localStorage DB:', e);
  }
}

function enrichProducts(products = [], ingredients = []) {
  const ingMap = new Map((ingredients || []).map((i) => [i.id, i]));

  return (products || []).map((prod) => {
    if (prod.hasRecipe && Array.isArray(prod.recipe) && prod.recipe.length > 0) {
      let computedHpp = 0;
      let minPortions = Infinity;
      const detailedRecipe = prod.recipe.map((r) => {
        const ing = ingMap.get(r.ingredientId);
        const unitCost = ing ? Number(ing.costPerUnit || ing.unitCost || 0) : 0;
        const qty = Number(r.qty || r.amount || 0);
        const lineCost = unitCost * qty;
        computedHpp += lineCost;

        let availableFromThis = 0;
        if (ing && qty > 0) {
          availableFromThis = Math.floor(Number(ing.stock || 0) / qty);
        }
        if (availableFromThis < minPortions) {
          minPortions = availableFromThis;
        }

        return {
          ...r,
          ingredientId: r.ingredientId,
          ingredientName: ing ? ing.name : 'Bahan tidak ditemukan',
          name: ing ? ing.name : 'Bahan tidak ditemukan',
          qty,
          amount: qty,
          unit: ing ? ing.unit : '',
          costPerUnit: unitCost,
          unitCost,
          lineCost: Math.round(lineCost),
          lineHpp: Math.round(lineCost),
          availableStock: ing ? ing.stock : 0
        };
      });

      const finalPortions = minPortions === Infinity ? 0 : Math.max(0, minPortions);
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
  const activeShift = (db.shifts || []).find((s) => s.status === 'OPEN') || null;
  return {
    ...db,
    products: enrichedProducts,
    activeShift,
    isSupabaseActive: isSupabaseConfigured
  };
}

function addAuditLog(db, { staffName = 'Nadia Putri', role = 'Kasir', action, category = 'GENERAL', severity = 'info', details }) {
  if (!Array.isArray(db.auditLogs)) db.auditLogs = [];
  const logEntry = {
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    staffName,
    role,
    action,
    category,
    severity,
    details
  };
  db.auditLogs.unshift(logEntry);
  if (db.auditLogs.length > 500) db.auditLogs.pop();
}

/**
 * Client-Side API Dispatcher for seamless offline/Netlify operation
 */
export async function handleClientApi(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const db = loadClientDb();
  let body = {};
  if (options.body) {
    try {
      body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch {
      body = {};
    }
  }

  const [pathname, queryString] = url.split('?');
  const searchParams = new URLSearchParams(queryString || '');

  // 1. GET /api/state
  if (pathname === '/api/state' && method === 'GET') {
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. POST /api/auth/login
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { identifier = '', username = '', pin = '' } = body;
    const cleanId = String(identifier || username).trim().toLowerCase();
    const cleanPin = String(pin).trim();

    const staff = (db.staffList || []).find(
      (s) =>
        (s.id && s.id.toLowerCase() === cleanId) ||
        (s.username && s.username.toLowerCase() === cleanId) ||
        (s.name && s.name.toLowerCase() === cleanId)
    );

    if (!staff) {
      addAuditLog(db, {
        staffName: identifier || 'Unknown',
        role: 'Unauthenticated',
        action: 'LOGIN_GAGAL',
        category: 'AUTH',
        severity: 'warning',
        details: `Percobaan login gagal: Akun "${cleanId}" tidak ditemukan.`
      });
      saveClientDb(db);
      return new Response(JSON.stringify({ error: 'Akun tidak ditemukan. Periksa kembali pilihan akun / username.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (staff.active === false) {
      return new Response(JSON.stringify({ error: 'Akun kasir ini sedang dinonaktifkan oleh Superadmin.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (String(staff.pin).trim() !== cleanPin) {
      addAuditLog(db, {
        staffName: staff.name,
        role: staff.role,
        action: 'LOGIN_GAGAL',
        category: 'AUTH',
        severity: 'danger',
        details: `Percobaan login gagal untuk "${staff.name}": PIN salah!`
      });
      saveClientDb(db);
      return new Response(JSON.stringify({ error: 'PIN Keamanan salah! Periksa kembali PIN Anda.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    staff.lastLoginAt = new Date().toISOString();
    addAuditLog(db, {
      staffName: staff.name,
      role: staff.role,
      action: 'LOGIN_SUCCESS',
      category: 'AUTH',
      severity: 'info',
      details: `Staf ${staff.name} (${staff.accountType}) berhasil login.`
    });
    saveClientDb(db);
    return new Response(JSON.stringify({ success: true, user: staff, state: buildStateResponse(db) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. POST /api/auth/logout
  if (pathname === '/api/auth/logout' && method === 'POST') {
    addAuditLog(db, {
      staffName: body.staffName || 'Staf',
      role: body.role || 'Kasir',
      action: 'LOGOUT',
      category: 'AUTH',
      severity: 'info',
      details: `Staf keluar dari sistem.`
    });
    saveClientDb(db);
    return new Response(JSON.stringify({ success: true, state: buildStateResponse(db) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 4. POST /api/transactions
  if (pathname === '/api/transactions' && method === 'POST') {
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
    } = body;

    const enrichedProducts = enrichProducts(db.products, db.ingredients);
    const prodMap = new Map(enrichedProducts.map((p) => [p.id, p]));
    const rawProdMap = new Map(db.products.map((p) => [p.id, p]));
    const ingMap = new Map(db.ingredients.map((i) => [i.id, i]));

    let subtotal = 0;
    let totalHpp = 0;

    const processedItems = items.map((item) => {
      const qty = Number(item.qty) || 1;
      const price = Number(item.price) || 0;
      subtotal += qty * price;
      const enrichedProd = prodMap.get(item.productId);
      const unitHpp = enrichedProd ? enrichedProd.computedHpp : Math.round(price * 0.45);
      totalHpp += unitHpp * qty;

      const rawProd = rawProdMap.get(item.productId);
      if (rawProd) {
        if (rawProd.hasRecipe && Array.isArray(rawProd.recipe)) {
          rawProd.recipe.forEach((r) => {
            const ing = ingMap.get(r.ingredientId);
            if (ing) {
              ing.stock = Math.max(0, Math.round((Number(ing.stock) - Number(r.amount) * qty) * 100) / 100);
            }
          });
        } else {
          rawProd.stock = Math.max(0, Number(rawProd.stock || 0) - qty);
        }
      }

      return {
        ...item,
        qty,
        price,
        unitHpp,
        lineSubtotal: qty * price,
        lineHpp: unitHpp * qty
      };
    });

    const finalTotal = Math.max(0, subtotal - discount + tax);
    const change = Math.max(0, amountPaid - finalTotal);
    const txId = `TX-${Date.now().toString().slice(-6)}`;
    const invoiceNumber = `INV/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${txId}`;

    const newTx = {
      id: txId,
      invoiceNumber,
      timestamp: new Date().toISOString(),
      cashierId,
      cashierName,
      customerName,
      tableId,
      tableName,
      orderType,
      paymentMethod,
      subtotal,
      discount,
      tax,
      total: finalTotal,
      amountPaid: Number(amountPaid || finalTotal),
      change,
      totalHpp,
      grossProfit: finalTotal - totalHpp,
      isSplitBill: Boolean(isSplitBill),
      status: 'PAID',
      items: processedItems
    };

    if (!Array.isArray(db.transactions)) db.transactions = [];
    db.transactions.unshift(newTx);

    // Active shift update
    const activeShift = (db.shifts || []).find((s) => s.status === 'OPEN');
    if (activeShift) {
      activeShift.totalTransactions = (activeShift.totalTransactions || 0) + 1;
      activeShift.totalSales = (activeShift.totalSales || 0) + finalTotal;
      if (paymentMethod === 'Tunai') {
        activeShift.cashSales = (activeShift.cashSales || 0) + finalTotal;
      } else if (paymentMethod === 'QRIS') {
        activeShift.qrisSales = (activeShift.qrisSales || 0) + finalTotal;
      } else {
        activeShift.edcSales = (activeShift.edcSales || 0) + finalTotal;
      }
    }

    // Add to Kitchen Orders
    if (!Array.isArray(db.kitchenOrders)) db.kitchenOrders = [];
    const kitchenItems = processedItems.filter((i) => !i.productId.startsWith('PRD-07'));
    if (kitchenItems.length > 0) {
      db.kitchenOrders.unshift({
        id: `KOT-${Date.now().toString().slice(-5)}`,
        transactionId: txId,
        invoiceNumber,
        tableId,
        tableName,
        customerName,
        orderType,
        createdAt: new Date().toISOString(),
        status: 'IN_PROGRESS',
        completedAt: null,
        items: kitchenItems.map((item, idx) => ({
          itemRefId: `${txId}-${idx}`,
          name: item.name,
          qty: item.qty,
          sugarLevel: item.sugarLevel || 'Normal Sugar',
          iceLevel: item.iceLevel || 'Normal Ice',
          notes: item.notes || '',
          cupLabelText: `${tableName} | ${customerName}`
        }))
      });
    }

    // Clean up drafts & tables
    if (draftId) {
      if (isSplitBill && remainingDraftItems.length > 0) {
        const drf = (db.draftOrders || []).find((d) => d.id === draftId);
        if (drf) drf.items = remainingDraftItems;
      } else {
        db.draftOrders = (db.draftOrders || []).filter((d) => d.id !== draftId);
        const tbl = (db.tables || []).find((t) => t.id === tableId);
        if (tbl && tbl.id !== 'TAKE-AWAY') {
          tbl.status = 'available';
          tbl.occupiedBy = null;
          tbl.occupiedSince = null;
        }
      }
    }

    addAuditLog(db, {
      staffName: cashierName,
      role: 'Kasir',
      action: isSplitBill ? 'SPLIT_BILL_PAID' : 'PAYMENT_SUCCESS',
      category: 'TRANSACTION',
      severity: 'info',
      details: `${invoiceNumber}: Total Rp ${finalTotal.toLocaleString('id-ID')} via ${paymentMethod}`
    });

    saveClientDb(db);
    syncOrderToSupabase(newTx);

    return new Response(JSON.stringify({ success: true, transaction: newTx, state: buildStateResponse(db) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 5. POST /api/shifts/open
  if (pathname === '/api/shifts/open' && method === 'POST') {
    const { cashierId, cashierName, openingCash } = body;
    const shiftId = `SHF-${Date.now().toString().slice(-6)}`;
    const newShift = {
      id: shiftId,
      cashierId,
      cashierName,
      startTime: new Date().toISOString(),
      endTime: null,
      openingCash: Number(openingCash || 0),
      totalSales: 0,
      cashSales: 0,
      qrisSales: 0,
      edcSales: 0,
      cashIn: 0,
      cashOut: 0,
      totalTransactions: 0,
      status: 'OPEN',
      cashMovements: []
    };
    if (!Array.isArray(db.shifts)) db.shifts = [];
    db.shifts.unshift(newShift);
    addAuditLog(db, {
      staffName: cashierName,
      role: 'Kasir',
      action: 'SHIFT_OPENED',
      category: 'SHIFT',
      severity: 'info',
      details: `Buka shift dengan modal awal Rp ${Number(openingCash).toLocaleString('id-ID')}`
    });
    saveClientDb(db);
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 6. POST /api/shifts/cash-movement
  if (pathname === '/api/shifts/cash-movement' && method === 'POST') {
    const { type, amount, reason, staffName = 'Kasir' } = body;
    const activeShift = (db.shifts || []).find((s) => s.status === 'OPEN');
    if (activeShift) {
      if (!Array.isArray(activeShift.cashMovements)) activeShift.cashMovements = [];
      activeShift.cashMovements.push({
        id: `CM-${Date.now()}`,
        time: new Date().toISOString(),
        type,
        amount: Number(amount),
        reason,
        staffName
      });
      if (type === 'IN') {
        activeShift.cashIn = (activeShift.cashIn || 0) + Number(amount);
      } else {
        activeShift.cashOut = (activeShift.cashOut || 0) + Number(amount);
      }
      addAuditLog(db, {
        staffName,
        role: 'Kasir',
        action: type === 'IN' ? 'KAS_MASUK' : 'KAS_KELUAR',
        category: 'SHIFT',
        severity: 'info',
        details: `Kas ${type}: Rp ${Number(amount).toLocaleString('id-ID')} (${reason})`
      });
      saveClientDb(db);
    }
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 7. POST /api/shifts/close
  if (pathname === '/api/shifts/close' && method === 'POST') {
    const { shiftId, actualCash, notes = '', cashierName = 'Kasir' } = body;
    const shift = (db.shifts || []).find((s) => s.id === shiftId);
    if (shift) {
      const expectedCash = (shift.openingCash || 0) + (shift.cashSales || 0) + (shift.cashIn || 0) - (shift.cashOut || 0);
      const variance = Number(actualCash) - expectedCash;
      shift.status = 'CLOSED';
      shift.endTime = new Date().toISOString();
      shift.actualCash = Number(actualCash);
      shift.expectedCash = expectedCash;
      shift.variance = variance;
      shift.varianceNotes = notes;
      addAuditLog(db, {
        staffName: cashierName,
        role: 'Kasir',
        action: 'SHIFT_CLOSED',
        category: 'SHIFT',
        severity: variance !== 0 ? 'warning' : 'info',
        details: `Tutup shift. Fisik: Rp ${Number(actualCash).toLocaleString('id-ID')}, Selisih: Rp ${variance.toLocaleString('id-ID')}`
      });
      saveClientDb(db);
    }
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 8. POST /api/tables
  if (pathname === '/api/tables' && method === 'POST') {
    const { name, capacity = 4, zone = 'Indoor' } = body;
    const newTable = {
      id: `M-${Date.now().toString().slice(-4)}`,
      name,
      capacity: Number(capacity),
      zone,
      status: 'available',
      occupiedBy: null,
      occupiedSince: null
    };
    if (!Array.isArray(db.tables)) db.tables = [];
    db.tables.push(newTable);
    saveClientDb(db);
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 9. POST /api/tables/:id/release
  if (pathname.startsWith('/api/tables/') && pathname.endsWith('/release') && method === 'POST') {
    const tableId = pathname.replace('/api/tables/', '').replace('/release', '');
    const table = (db.tables || []).find((t) => t.id === tableId);
    if (table) {
      table.status = 'available';
      table.occupiedBy = null;
      table.occupiedSince = null;
      saveClientDb(db);
    }
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 10. POST /api/drafts
  if (pathname === '/api/drafts' && method === 'POST') {
    const { id, tableId, tableName, customerName = 'Pelanggan Walk-in', cashierName = 'Kasir', items = [] } = body;
    if (id) {
      const idx = (db.draftOrders || []).findIndex((d) => d.id === id);
      if (idx !== -1) {
        db.draftOrders[idx] = {
          ...db.draftOrders[idx],
          tableId,
          tableName,
          customerName,
          cashierName,
          updatedAt: new Date().toISOString(),
          items
        };
      }
    } else {
      if (!Array.isArray(db.draftOrders)) db.draftOrders = [];
      db.draftOrders.unshift({
        id: `DRF-${Date.now().toString().slice(-6)}`,
        tableId,
        tableName,
        customerName,
        cashierName,
        createdAt: new Date().toISOString(),
        items
      });
      const table = (db.tables || []).find((t) => t.id === tableId);
      if (table && table.id !== 'TAKE-AWAY') {
        table.status = 'occupied';
        table.occupiedBy = customerName;
        table.occupiedSince = new Date().toISOString();
      }
    }
    saveClientDb(db);
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 11. DELETE /api/drafts/:id
  if (pathname.startsWith('/api/drafts/') && method === 'DELETE') {
    const draftId = pathname.replace('/api/drafts/', '');
    db.draftOrders = (db.draftOrders || []).filter((d) => d.id !== draftId);
    saveClientDb(db);
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 12. POST /api/products
  if (pathname === '/api/products' && method === 'POST') {
    const product = body;
    if (product.id) {
      const idx = (db.products || []).findIndex((p) => p.id === product.id);
      if (idx !== -1) {
        db.products[idx] = { ...db.products[idx], ...product };
      }
    } else {
      product.id = `PRD-${Date.now().toString().slice(-4)}`;
      if (!Array.isArray(db.products)) db.products = [];
      db.products.push(product);
    }
    saveClientDb(db);
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 13. DELETE /api/products/:id
  if (pathname.startsWith('/api/products/') && method === 'DELETE') {
    const prodId = pathname.replace('/api/products/', '');
    db.products = (db.products || []).filter((p) => p.id !== prodId);
    saveClientDb(db);
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 14. POST /api/ingredients
  if (pathname === '/api/ingredients' && method === 'POST') {
    const ing = body;
    if (ing.id) {
      const idx = (db.ingredients || []).findIndex((i) => i.id === ing.id);
      if (idx !== -1) {
        db.ingredients[idx] = { ...db.ingredients[idx], ...ing };
      }
    } else {
      ing.id = `ING-${Date.now().toString().slice(-4)}`;
      if (!Array.isArray(db.ingredients)) db.ingredients = [];
      db.ingredients.push(ing);
    }
    saveClientDb(db);
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 15. POST /api/inventory/adjust
  if (pathname === '/api/inventory/adjust' && method === 'POST') {
    const { ingredientId, type, amount, reason, staffName = 'Kasir' } = body;
    const ing = (db.ingredients || []).find((i) => i.id === ingredientId);
    if (ing) {
      const delta = Number(amount || 0);
      if (type === 'RESTOCK' || type === 'IN') {
        ing.stock = Number(ing.stock || 0) + delta;
      } else if (type === 'OPNAME') {
        ing.stock = delta;
      } else {
        ing.stock = Math.max(0, Number(ing.stock || 0) - delta);
      }
      addAuditLog(db, {
        staffName,
        role: 'Kasir',
        action: `INVENTORY_${type}`,
        category: 'INVENTORY',
        severity: 'info',
        details: `${ing.name}: ${type} ${delta} ${ing.unit} (${reason})`
      });
      saveClientDb(db);
    }
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 16. PATCH /api/kitchen/:id
  if (pathname.startsWith('/api/kitchen/') && method === 'PATCH') {
    const kotId = pathname.replace('/api/kitchen/', '');
    const { status } = body;
    const order = (db.kitchenOrders || []).find((k) => k.id === kotId);
    if (order) {
      order.status = status;
      if (status === 'READY') {
        order.completedAt = new Date().toISOString();
      }
      saveClientDb(db);
    }
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 17. PUT /api/store-profile
  if (pathname === '/api/store-profile' && method === 'PUT') {
    const { storeProfile, staffList, staffName = 'Owner' } = body;
    if (storeProfile) {
      db.storeProfile = { ...db.storeProfile, ...storeProfile };
    }
    if (Array.isArray(staffList)) {
      db.staffList = staffList;
    }
    addAuditLog(db, {
      staffName,
      role: 'Owner Cafe',
      action: 'UPDATE_STORE_PROFILE',
      category: 'SETTINGS',
      severity: 'info',
      details: 'Memperbarui profil kafe dan staf.'
    });
    saveClientDb(db);
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 18. POST /api/transactions/:id/void
  if (pathname.startsWith('/api/transactions/') && pathname.endsWith('/void') && method === 'POST') {
    const txId = pathname.replace('/api/transactions/', '').replace('/void', '');
    const { reason = 'Kesalahan Kasir', staffName = 'Kasir' } = body;
    const tx = (db.transactions || []).find((t) => t.id === txId);
    if (tx) {
      tx.status = 'VOID';
      tx.voidReason = reason;
      tx.voidedBy = staffName;
      tx.voidedAt = new Date().toISOString();

      // Return ingredient stocks
      const ingMap = new Map((db.ingredients || []).map((i) => [i.id, i]));
      const prodMap = new Map((db.products || []).map((p) => [p.id, p]));
      (tx.items || []).forEach((item) => {
        const prod = prodMap.get(item.productId);
        if (prod && prod.hasRecipe && Array.isArray(prod.recipe)) {
          prod.recipe.forEach((r) => {
            const ing = ingMap.get(r.ingredientId);
            if (ing) {
              ing.stock = Math.round((Number(ing.stock) + Number(r.amount) * Number(item.qty)) * 100) / 100;
            }
          });
        }
      });

      addAuditLog(db, {
        staffName,
        role: 'Kasir',
        action: 'VOID_TRANSACTION',
        category: 'TRANSACTION',
        severity: 'danger',
        details: `Void Transaksi ${tx.invoiceNumber}: ${reason}`
      });
      saveClientDb(db);
    }
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 19. POST /api/reset-demo
  if (pathname === '/api/reset-demo' && method === 'POST') {
    const fresh = structuredClone(initialData);
    saveClientDb(fresh);
    return new Response(JSON.stringify(buildStateResponse(fresh)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 20. POST /api/customers
  if (pathname === '/api/customers' && method === 'POST') {
    const { name, phone = '-' } = body;
    const newCust = {
      id: `CST-${Date.now().toString().slice(-4)}`,
      name,
      phone
    };
    if (!Array.isArray(db.customers)) db.customers = [];
    db.customers.push(newCust);
    saveClientDb(db);
    return new Response(JSON.stringify({ customer: newCust, state: buildStateResponse(db) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Default fallback
  return new Response(JSON.stringify(buildStateResponse(db)), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Install fetch hook that gracefully falls back to client mock on Netlify static hosting
 */
export function setupClientApiBridge() {
  if (typeof window === 'undefined') return;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    if (url.startsWith('/api/') || url.includes('/api/')) {
      try {
        const response = await originalFetch(input, init);
        const contentType = response.headers.get('content-type') || '';
        // If server returns HTML (e.g. Netlify 404 SPA redirect) or 404/502
        if (!response.ok || contentType.includes('text/html')) {
          return await handleClientApi(url, init);
        }
        return response;
      } catch (err) {
        // Network error -> use client API mock
        return await handleClientApi(url, init);
      }
    }
    return originalFetch(input, init);
  };
}
