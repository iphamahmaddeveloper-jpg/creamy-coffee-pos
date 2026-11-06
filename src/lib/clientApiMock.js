import { initialData } from '../data/seedData.js';
import { isSupabaseConfigured, syncOrderToSupabase } from './supabase.js';

const STORAGE_KEY = 'creamy_coffee_pos_db_v2';

function loadClientDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.products) && parsed.products.length > 0) {
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
        const unitCost = ing ? Number(ing.unitCost || 0) : 0;
        const lineHpp = unitCost * Number(r.amount || 0);
        computedHpp += lineHpp;

        let availableFromThis = 0;
        if (ing && Number(r.amount) > 0) {
          availableFromThis = Math.floor(Number(ing.stock || 0) / Number(r.amount));
        }
        if (availableFromThis < minPortions) {
          minPortions = availableFromThis;
        }

        return {
          ingredientId: r.ingredientId,
          name: ing ? ing.name : 'Bahan tidak ditemukan',
          amount: Number(r.amount || 0),
          unit: ing ? ing.unit : '',
          unitCost,
          lineHpp: Math.round(lineHpp),
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

  const pathname = url.split('?')[0];

  // 1. GET /api/state
  if (pathname === '/api/state' && method === 'GET') {
    return new Response(JSON.stringify(buildStateResponse(db)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. POST /api/auth/login
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { username, pin } = body;
    const staff = (db.staffList || []).find((s) => s.username === username && s.pin === pin && s.active !== false);
    if (!staff) {
      return new Response(JSON.stringify({ error: 'Username atau PIN salah!' }), {
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
      details: `Staf ${staff.name} berhasil login.`
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

    // Asynchronously sync to Supabase if configured
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

  // 6. POST /api/shifts/close
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

  // 7. POST /api/reset-demo
  if (pathname === '/api/reset-demo' && method === 'POST') {
    const fresh = structuredClone(initialData);
    saveClientDb(fresh);
    return new Response(JSON.stringify(buildStateResponse(fresh)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Default handler for all other routes: return current state
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
        // If server returns HTML (SPA 404 redirect on Netlify) or 404, fallback to client mock
        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || contentType.includes('text/html')) {
          return await handleClientApi(url, init);
        }
        return response;
      } catch (err) {
        // Network error / server not running -> use client API mock
        return await handleClientApi(url, init);
      }
    }
    return originalFetch(input, init);
  };
}
