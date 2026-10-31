import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  SlidersHorizontal,
  FileText,
  ScanLine,
  Calculator,
  UserPlus,
  Armchair,
  Trash2,
  Plus,
  Minus,
  Check,
  X,
  Coffee,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Split,
  Save,
  CreditCard,
  QrCode,
  Banknote,
  RefreshCw,
  Edit3,
  ChefHat,
  Settings,
  LogOut,
  Lock
} from 'lucide-react';
import ReceiptAndLabelModal from './components/ReceiptAndLabelModal.jsx';
import BarcodeModal from './components/BarcodeModal.jsx';
import SplitBillModal from './components/SplitBillModal.jsx';
import InventoryAndRecipeView from './components/InventoryAndRecipeView.jsx';
import CashierAuditView from './components/CashierAuditView.jsx';
import KitchenBaristaView from './components/KitchenBaristaView.jsx';
import StoreSettingsModal from './components/StoreSettingsModal.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import SuperadminOwnerView from './components/SuperadminOwnerView.jsx';

export default function App() {
  const [appState, setAppState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggedInUser, setLoggedInUserState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('creamy_logged_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const setLoggedInUser = (user) => {
    if (user) {
      sessionStorage.setItem('creamy_logged_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('creamy_logged_user');
    }
    setLoggedInUserState(user);
  };

  const [activeNav, setActiveNavState] = useState(
    () => sessionStorage.getItem('creamy_active_nav') || 'pos'
  );
  const setActiveNav = (nav) => {
    sessionStorage.setItem('creamy_active_nav', nav);
    setActiveNavState(nav);
  };
  const [drawerOpen, setDrawerOpen] = useState(false);

  // POS State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Produk Unggulan');
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'price-asc' | 'price-desc'
  const [selectedTable, setSelectedTable] = useState({ id: 'M-04', name: 'Meja 04' });
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [quickTableName, setQuickTableName] = useState('');
  const [quickTableCap, setQuickTableCap] = useState(4);
  const [quickTableZone, setQuickTableZone] = useState('Indoor');

  const activeStaff = loggedInUser || {
    id: 'STF-01',
    username: 'nadia',
    name: 'Nadia Putri',
    role: 'Head Barista & Kasir',
    accountType: 'KASIR'
  };

  // Pre-populated with Matcha (Rp 25.000) + Croissant (Rp 20.000) = Rp 45.000 like screenshot!
  const [cart, setCart] = useState([
    {
      cartItemId: 'init-matcha',
      productId: 'PRD-04',
      name: 'Matcha',
      price: 25000,
      qty: 1,
      sugarLevel: 'Normal Sugar',
      iceLevel: 'Normal Ice',
      notes: '',
      printCupLabel: true
    },
    {
      cartItemId: 'init-croissant',
      productId: 'PRD-05',
      name: 'Croissant',
      price: 20000,
      qty: 1,
      sugarLevel: '-',
      iceLevel: '-',
      notes: '',
      printCupLabel: false
    }
  ]);

  // Modals
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [draftsModalOpen, setDraftsModalOpen] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [manualItemModalOpen, setManualItemModalOpen] = useState(false);
  const [manualItemForm, setManualItemForm] = useState({
    name: 'Custom Espresso Extra Shot',
    price: 15000,
    qty: 1,
    printCupLabel: true
  });
  const [splitBillModalOpen, setSplitBillModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [discountInput, setDiscountInput] = useState(0);
  const [cashReceived, setCashReceived] = useState('');
  const [receiptModalTx, setReceiptModalTx] = useState(null);
  const [storeSettingsOpen, setStoreSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      setAppState(data);
    } catch (err) {
      console.error('Failed to load POS state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  if (loading || !appState) {
    return (
      <div className="min-h-screen bg-[#0f2b5b] text-white flex flex-col items-center justify-center gap-3">
        <Coffee className="w-10 h-10 animate-bounce text-blue-300" />
        <div className="font-bold text-base tracking-wide">CREAMY COFFEE POS</div>
        <div className="text-xs text-blue-200">Memuat katalog menu, resep HPP & laci kasir...</div>
      </div>
    );
  }

  const {
    products = [],
    ingredients = [],
    draftOrders = [],
    transactions = [],
    shifts = [],
    activeShift = null,
    auditLogs = [],
    tables = [],
    customers = [],
    staffList = [],
    storeProfile = {}
  } = appState;

  if (!loggedInUser) {
    return (
      <LoginScreen
        storeProfile={storeProfile}
        staffList={staffList}
        onLoginSuccess={(user, newState) => {
          setLoggedInUser(user);
          if (newState) setAppState(newState);
          if (user.accountType !== 'SUPERADMIN' && (activeNav === 'superadmin' || activeNav === 'inventory')) {
            setActiveNav('pos');
          }
          showToast(`Selamat bertugas, ${user.name} (${user.accountType === 'SUPERADMIN' ? 'Owner / Superadmin' : 'Akses Kasir Terbatas'})!`);
        }}
      />
    );
  }

  const isSuperadmin = activeStaff.accountType === 'SUPERADMIN';

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffName: activeStaff.name,
          role: activeStaff.role,
          username: activeStaff.username
        })
      });
      if (res.ok) {
        setAppState(await res.json());
      }
    } catch {
      // ignore network error on logout
    }
    setLoggedInUser(null);
    setDrawerOpen(false);
  };

  const handleQuickAddTable = async (e) => {
    e.preventDefault();
    if (!quickTableName.trim()) {
      showToast('Masukkan nama meja baru (misal: Meja 09, VIP 01, Gazebo).', 'error');
      return;
    }
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickTableName.trim(),
          capacity: Number(quickTableCap || 4),
          zone: quickTableZone || 'Indoor',
          staffName: activeStaff.name
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal menambah meja baru.', 'error');
        return;
      }
      setAppState(data.state);
      setSelectedTable({ id: data.table.id, name: data.table.name });
      setQuickTableName('');
      setTableModalOpen(false);
      showToast(`${data.table.name} (${data.table.zone}) berhasil ditambahkan & dipilih!`);
    } catch {
      showToast('Gagal menambah meja baru.', 'error');
    }
  };

  // Categories matching the screenshot
  const categories = ['Produk Unggulan', 'Coffee', 'Makanan', 'Non Coffee', 'Kemasan', 'Semua'];

  // Filter & Sort Products
  const filteredProducts = products
    .filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (selectedCategory === 'Semua') return true;
      if (selectedCategory === 'Produk Unggulan') return Boolean(p.isFeatured);
      return p.category === selectedCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return 0;
    });

  // Cart Calculations (with automatic PB1 Tax from Store Settings)
  const subtotal = cart.reduce((sum, i) => sum + Number(i.price) * Number(i.qty), 0);
  const netBeforeTax = Math.max(0, subtotal - Number(discountInput || 0));
  const taxPercent = Number(storeProfile.taxPercent || 0);
  const taxAmount = Math.round(netBeforeTax * (taxPercent / 100));
  const total = netBeforeTax + taxAmount;
  const totalItemsCount = cart.reduce((sum, i) => sum + Number(i.qty), 0);

  // Active Kitchen / Barista Orders Count
  const activeKitchenCount =
    draftOrders.filter((d) => (d.kitchenStatus || 'QUEUE') !== 'SERVED').length +
    transactions.filter(
      (t) => t.status === 'COMPLETED' && (t.kitchenStatus || 'QUEUE') !== 'SERVED'
    ).length;

  // Add Product to Cart
  const addToCart = (product) => {
    if (product.availablePortions <= 0) {
      showToast(`Stok bahan baku untuk ${product.name} habis!`, 'error');
      return;
    }

    const isDrink = product.category === 'Coffee' || product.category === 'Non Coffee';
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.productId === product.id &&
          item.sugarLevel === (isDrink ? 'Normal Sugar' : '-') &&
          item.iceLevel === (isDrink ? 'Normal Ice' : '-') &&
          !item.notes
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: updated[existingIdx].qty + 1
        };
        return updated;
      }
      return [
        ...prev,
        {
          cartItemId: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          qty: 1,
          sugarLevel: isDrink ? 'Normal Sugar' : '-',
          iceLevel: isDrink ? 'Normal Ice' : '-',
          notes: '',
          printCupLabel: Boolean(product.printCupLabel)
        }
      ];
    });
  };

  const pickNextAvailableTable = (updatedTables = []) => {
    const emptyTable = updatedTables.find(
      (t) => t.id !== 'TAKE-AWAY' && t.status === 'available'
    );
    if (emptyTable) {
      setSelectedTable({ id: emptyTable.id, name: emptyTable.name });
    } else {
      setSelectedTable({ id: 'TAKE-AWAY', name: 'Take Away' });
    }
  };

  // Release / Clear Occupied Table
  const handleReleaseTable = async (tableId) => {
    try {
      const res = await fetch(`/api/tables/${tableId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffName: activeStaff.name })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal mengosongkan meja.', 'error');
        return;
      }
      setAppState(data);
      showToast('Meja berhasil dikosongkan dan siap diisi pelanggan baru!');
    } catch (err) {
      showToast('Gagal mengosongkan meja.', 'error');
    }
  };

  // Save Cart to Draft (Open Bill)
  const handleSaveDraft = async () => {
    if (cart.length === 0) {
      showToast('Keranjang masih kosong.', 'error');
      return;
    }
    if (!selectedCustomer.trim()) {
      showToast('Wajib isi Nama Pelanggan terlebih dahulu sebelum menyimpan Open Bill!', 'error');
      return;
    }
    const currentTableObj = tables.find((t) => t.id === selectedTable.id);
    if (
      !activeDraftId &&
      currentTableObj &&
      currentTableObj.id !== 'TAKE-AWAY' &&
      currentTableObj.status === 'occupied'
    ) {
      showToast(
        `${currentTableObj.name} sudah terisi! Pilih meja kosong lainnya terlebih dahulu.`,
        'error'
      );
      setTableModalOpen(true);
      return;
    }

    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeDraftId,
          tableId: selectedTable.id,
          tableName: selectedTable.name,
          customerName: selectedCustomer.trim(),
          cashierName: activeStaff.name,
          items: cart
        })
      });
      const newState = await res.json();
      if (!res.ok) {
        showToast(newState.error || 'Gagal menyimpan draft.', 'error');
        return;
      }
      setAppState(newState);
      setCart([]);
      setActiveDraftId(null);
      setSelectedCustomer('');
      pickNextAvailableTable(newState.tables);
      showToast(`Pesanan disimpan ke Draft (${selectedTable.name} kini Terisi)`);
    } catch (err) {
      showToast('Gagal menyimpan draft.', 'error');
    }
  };

  // Process Checkout Payment
  const handleProcessPayment = async () => {
    if (cart.length === 0) return;
    if (!selectedCustomer.trim()) {
      showToast('Wajib input Nama Pelanggan sebelum menyelesaikan pembayaran!', 'error');
      return;
    }

    const currentTableObj = tables.find((t) => t.id === selectedTable.id);
    if (
      !activeDraftId &&
      currentTableObj &&
      currentTableObj.id !== 'TAKE-AWAY' &&
      currentTableObj.status === 'occupied'
    ) {
      showToast(
        `${currentTableObj.name} sedang terisi! Pilih meja kosong lainnya atau Take Away.`,
        'error'
      );
      setPaymentModalOpen(false);
      setTableModalOpen(true);
      return;
    }

    const paidAmount =
      paymentMethod === 'Tunai' && Number(cashReceived) >= total ? Number(cashReceived) : total;

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId: activeStaff.id,
          cashierName: activeStaff.name,
          customerName: selectedCustomer.trim(),
          tableId: selectedTable.id,
          tableName: selectedTable.name,
          orderType: selectedTable.id === 'TAKE-AWAY' ? 'Take Away' : 'Dine In',
          paymentMethod,
          discount: Number(discountInput || 0),
          tax: taxAmount,
          amountPaid: paidAmount,
          items: cart,
          draftId: activeDraftId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal memproses pembayaran.', 'error');
        return;
      }
      setAppState(data.state);
      setPaymentModalOpen(false);
      setCart([]);
      setActiveDraftId(null);
      setSelectedCustomer('');
      setDiscountInput(0);
      setCashReceived('');
      pickNextAvailableTable(data.state.tables);
      setReceiptModalTx(data.transaction);
      showToast(`Transaksi ${data.transaction.receiptNo} berhasil! Stok resep otomatis terpotong.`);
    } catch (err) {
      showToast('Gagal memproses pembayaran.', 'error');
    }
  };

  // Process Split Bill Payment
  const handleConfirmSplitBill = async ({
    selectedItems,
    remainingItems,
    splitTotal,
    paymentMethod: splitPayMethod
  }) => {
    if (!selectedCustomer.trim()) {
      showToast('Wajib isi Nama Pelanggan terlebih dahulu untuk Split Bill!', 'error');
      return;
    }
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId: activeStaff.id,
          cashierName: activeStaff.name,
          customerName: `${selectedCustomer.trim()} (Split Bill)`,
          tableId: selectedTable.id,
          tableName: selectedTable.name,
          orderType: selectedTable.id === 'TAKE-AWAY' ? 'Take Away' : 'Dine In',
          paymentMethod: splitPayMethod,
          discount: 0,
          tax: 0,
          amountPaid: splitTotal,
          items: selectedItems,
          draftId: activeDraftId,
          isSplitBill: true,
          remainingDraftItems: remainingItems
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Gagal memproses Split Bill.', 'error');
        return;
      }
      setAppState(data.state);
      setCart(remainingItems);
      setSplitBillModalOpen(false);
      setReceiptModalTx(data.transaction);
      showToast('Tagihan pisah (Split Bill) berhasil dibayar!');
    } catch (err) {
      showToast('Gagal memproses Split Bill.', 'error');
    }
  };

  // API Handlers for Inventory & Audit views
  const handleSaveProduct = async (productPayload) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productPayload)
    });
    if (res.ok) {
      setAppState(await res.json());
      showToast('Produk & Resep HPP berhasil disimpan!');
    }
  };

  const handleDeleteProduct = async (productId) => {
    const res = await fetch(
      `/api/products/${productId}?staffName=${encodeURIComponent(activeStaff.name)}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      setAppState(await res.json());
      showToast('Produk dihapus dari katalog.');
    }
  };

  const handleSaveIngredient = async (ingPayload) => {
    const res = await fetch('/api/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ingPayload)
    });
    if (res.ok) {
      setAppState(await res.json());
      showToast('Bahan baku berhasil disimpan!');
    }
  };

  const handleAdjustInventory = async (adjustPayload) => {
    const res = await fetch('/api/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adjustPayload)
    });
    if (res.ok) {
      setAppState(await res.json());
      showToast('Stok inventori & log opname berhasil diperbarui!');
    }
  };

  const handleOpenShift = async (payload) => {
    const res = await fetch('/api/shifts/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setAppState(await res.json());
      showToast('Shift kasir berhasil dibuka!');
    }
  };

  const handleCashMovement = async (payload) => {
    const res = await fetch('/api/shifts/cash-movement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setAppState(await res.json());
      showToast('Mutasi kas laci berhasil dicatat!');
    }
  };

  const handleCloseShift = async (payload) => {
    const res = await fetch('/api/shifts/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setAppState(await res.json());
      showToast('Shift kasir ditutup & laporan audit tersimpan!');
    }
  };

  const handleVoidTransaction = async (txId, reason, staffName) => {
    const res = await fetch(`/api/transactions/${txId}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, staffName })
    });
    if (res.ok) {
      const data = await res.json();
      setAppState(data.state);
      showToast('Transaksi dibatalkan (VOID) & stok bahan baku dikembalikan.');
    }
  };

  const handleSaveStoreSettings = async (payload) => {
    const res = await fetch('/api/store-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setAppState(await res.json());
      showToast('Pengaturan Profil Cafe, Pajak PB1 & Wi-Fi berhasil disimpan!');
    }
  };

  const handleUpdateKitchenOrder = async (orderId, payload) => {
    const res = await fetch(`/api/kitchen/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setAppState(await res.json());
      if (payload.kitchenStatus) {
        showToast(`Status pesanan diperbarui menjadi ${payload.kitchenStatus}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 select-none">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 border transition ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-emerald-600 text-white border-emerald-700'
          }`}
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* TOP NAVY HEADER BAR (Matches Screenshot) */}
      <header className="bg-[#0f2b5b] text-white h-14 px-4 flex items-center justify-between shadow-md shrink-0 z-30">
        {/* Left: Hamburger + Module Switcher Pills */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Menu Navigasi & Staf"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:flex items-center bg-[#091d3e] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveNav('pos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeNav === 'pos'
                  ? 'bg-white text-[#0f2b5b] shadow-xs'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Kasir Penjualan
            </button>
            <button
              onClick={() => setActiveNav('kitchen')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeNav === 'kitchen'
                  ? 'bg-white text-[#0f2b5b] shadow-xs'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              Barista & Dapur
              {activeKitchenCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px]">
                  {activeKitchenCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveNav('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeNav === 'audit'
                  ? 'bg-white text-[#0f2b5b] shadow-xs'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Shift & Kas Laci
            </button>

            {isSuperadmin && (
              <>
                <button
                  onClick={() => setActiveNav('inventory')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    activeNav === 'inventory'
                      ? 'bg-white text-[#0f2b5b] shadow-xs'
                      : 'text-blue-200 hover:text-white'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  Resep, Stok & HPP
                </button>
                <button
                  onClick={() => setActiveNav('superadmin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                    activeNav === 'superadmin'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-amber-300 hover:bg-amber-400/20'
                  }`}
                  title="Pusat Kendali Superadmin Owner: Kelola Akun Kasir, Log CCTV Kasir & Meja"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Superadmin (Owner)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Center Title: CREAMY COFFEE / Penjualan (Exact Screenshot Match) */}
        <div className="text-center">
          <div className="text-[10px] font-bold tracking-[0.2em] text-blue-200 uppercase leading-tight">
            {storeProfile.name || 'CREAMY COFFEE'}
          </div>
          <div className="text-sm font-extrabold tracking-wide leading-tight">
            {activeNav === 'pos'
              ? 'Penjualan'
              : activeNav === 'kitchen'
              ? 'Layar Barista & Dapur (KDS)'
              : activeNav === 'inventory' && isSuperadmin
              ? 'Inventori, Resep & HPP'
              : activeNav === 'superadmin' && isSuperadmin
              ? 'Superadmin (Owner Cafe)'
              : 'Shift Kasir & Laci Kas'}
          </div>
        </div>

        {/* Right: Authenticated User Badge, Logout, Settings & Meja Button */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 bg-[#173a73] px-3 py-1.5 rounded-xl border border-white/15">
            <span
              className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                isSuperadmin
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-blue-200 text-[#0f2b5b]'
              }`}
            >
              {isSuperadmin ? 'SUPERADMIN' : 'KASIR'}
            </span>
            <span className="text-xs font-bold text-white truncate max-w-[140px]">
              {activeStaff.name}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 border border-rose-400/30 text-rose-100 text-xs font-bold transition cursor-pointer"
            title="Ganti Akun / Logout POS"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>

          {isSuperadmin && (
            <button
              onClick={() => setStoreSettingsOpen(true)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Pengaturan Profil Cafe, Pajak PB1 & Wi-Fi Struk (Khusus Owner)"
            >
              <Settings className="w-4 h-4 text-blue-200" />
            </button>
          )}

          <button
            onClick={() => setTableModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
          >
            <Armchair className="w-4 h-4 text-blue-200" />
            <span>{selectedTable.name}</span>
          </button>
        </div>
      </header>

      {/* SIDEBAR NAVIGATION DRAWER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-72 bg-[#0f2b5b] text-white h-full flex flex-col justify-between p-5 z-10 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/15 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white text-[#0f2b5b] flex items-center justify-center font-extrabold">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm">
                      {storeProfile.name || 'CREAMY COFFEE'}
                    </div>
                    <div className="text-[11px] text-blue-200">POS Kasir Cafe & F&B</div>
                  </div>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="p-1 hover:bg-white/10 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    setActiveNav('pos');
                    setDrawerOpen(false);
                  }}
                  className={`w-full py-3 px-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition ${
                    activeNav === 'pos'
                      ? 'bg-white text-[#0f2b5b]'
                      : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Kasir Penjualan (POS)
                </button>
                <button
                  onClick={() => {
                    setActiveNav('kitchen');
                    setDrawerOpen(false);
                  }}
                  className={`w-full py-3 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                    activeNav === 'kitchen'
                      ? 'bg-white text-[#0f2b5b]'
                      : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <ChefHat className="w-4 h-4" />
                    Layar Barista & Dapur (KDS)
                  </span>
                  {activeKitchenCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px]">
                      {activeKitchenCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveNav('audit');
                    setDrawerOpen(false);
                  }}
                  className={`w-full py-3 px-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition ${
                    activeNav === 'audit'
                      ? 'bg-white text-[#0f2b5b]'
                      : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Shift Kasir & Laci Kas
                </button>

                {isSuperadmin ? (
                  <>
                    <div className="pt-2 pb-1 px-2 text-[10px] font-extrabold uppercase tracking-wider text-amber-300/80">
                      Menu Khusus Superadmin (Owner)
                    </div>
                    <button
                      onClick={() => {
                        setActiveNav('inventory');
                        setDrawerOpen(false);
                      }}
                      className={`w-full py-3 px-3.5 rounded-xl text-xs font-bold flex items-center gap-3 transition ${
                        activeNav === 'inventory'
                          ? 'bg-white text-[#0f2b5b]'
                          : 'text-blue-100 hover:bg-white/10'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      Produk, Resep & Stok HPP
                    </button>
                    <button
                      onClick={() => {
                        setActiveNav('superadmin');
                        setDrawerOpen(false);
                      }}
                      className={`w-full py-3 px-3.5 rounded-xl text-xs font-extrabold flex items-center justify-between transition ${
                        activeNav === 'superadmin'
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-amber-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Lock className="w-4 h-4" />
                        Superadmin (Owner Cafe)
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 font-black">
                        OWNER
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setDrawerOpen(false);
                        setStoreSettingsOpen(true);
                      }}
                      className="w-full py-3 px-3.5 rounded-xl text-xs font-bold flex items-center gap-3 text-blue-100 hover:bg-white/10 transition"
                    >
                      <Settings className="w-4 h-4" />
                      Pengaturan Profil Cafe & Pajak PB1
                    </button>
                  </>
                ) : (
                  <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-blue-200 space-y-1">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Mode Akses Kasir Terbatas
                    </div>
                    <p className="text-[10px] leading-relaxed text-blue-200/80">
                      Menu <b>Resep & HPP</b>, <b>Tambah Akun Kasir</b>, <b>Log CCTV Kasir</b>, <b>Void</b>, dan <b>Pengaturan Pajak/Toko</b> dikunci khusus untuk <b>Superadmin (Owner)</b>.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-white/15 pt-4 text-xs">
              <div className="bg-white/10 p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-blue-200 text-[11px]">Akun Login Aktif</span>
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      isSuperadmin
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-blue-200 text-[#0f2b5b]'
                    }`}
                  >
                    {isSuperadmin ? 'SUPERADMIN' : 'KASIR'}
                  </span>
                </div>
                <div className="font-bold text-sm mt-1">{activeStaff.name}</div>
                <div className="text-[11px] text-emerald-300">
                  @{activeStaff.username || activeStaff.id} • {activeStaff.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-100 flex items-center justify-center gap-2 font-bold transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Ganti Akun / Logout POS
              </button>
              {isSuperadmin && (
                <button
                  onClick={async () => {
                    const res = await fetch('/api/reset-demo', { method: 'POST' });
                    if (res.ok) {
                      setAppState(await res.json());
                      setDrawerOpen(false);
                      showToast('Data demo berhasil di-reset ke awal!');
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-white/20 hover:bg-white/10 text-blue-200 hover:text-white flex items-center justify-center gap-2 font-semibold transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Data Demo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {activeNav === 'superadmin' && isSuperadmin ? (
        <div className="flex-1 overflow-y-auto">
          <SuperadminOwnerView
            appData={appState}
            loggedInUser={activeStaff}
            onStateUpdate={(newState) => setAppState(newState)}
          />
        </div>
      ) : activeNav === 'kitchen' ? (
        <div className="flex-1 overflow-y-auto">
          <KitchenBaristaView
            transactions={transactions}
            draftOrders={draftOrders}
            activeStaff={activeStaff}
            onUpdateKitchenOrder={handleUpdateKitchenOrder}
            onPrintCupLabels={(ticket) => setReceiptModalTx(ticket)}
          />
        </div>
      ) : activeNav === 'inventory' && isSuperadmin ? (
        <div className="flex-1 overflow-y-auto">
          <InventoryAndRecipeView
            products={products}
            ingredients={ingredients}
            activeStaff={activeStaff}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onSaveIngredient={handleSaveIngredient}
            onAdjustInventory={handleAdjustInventory}
          />
        </div>
      ) : activeNav === 'audit' ? (
        <div className="flex-1 overflow-y-auto">
          <CashierAuditView
            activeShift={activeShift}
            shifts={shifts}
            auditLogs={auditLogs}
            transactions={transactions}
            activeStaff={activeStaff}
            onOpenShift={handleOpenShift}
            onCashMovement={handleCashMovement}
            onCloseShift={handleCloseShift}
            onVoidTransaction={handleVoidTransaction}
            onPrintTransaction={(tx) => setReceiptModalTx(tx)}
          />
        </div>
      ) : (
        /* POS KASIR SPLIT SCREEN (EXACT REPLICA OF SCREENSHOT) */
        <div className="flex-1 flex overflow-hidden relative">
          {/* LEFT / MAIN CATALOG PANEL */}
          <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
            {/* Search & Category Bar */}
            <div className="p-3.5 pb-2 space-y-2.5 bg-slate-100 shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari produk atau scan kode barcode..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200/90 text-xs text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:border-[#0f2b5b]"
                  />
                </div>
                <button
                  onClick={() =>
                    setSortBy((prev) =>
                      prev === 'default'
                        ? 'price-asc'
                        : prev === 'price-asc'
                        ? 'price-desc'
                        : 'default'
                    )
                  }
                  className="px-3.5 py-2.5 bg-white rounded-xl border border-slate-200/90 text-slate-600 hover:text-[#0f2b5b] flex items-center gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
                  title="Urutkan Harga"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {sortBy !== 'default' && (
                    <span className="text-[10px] font-bold text-[#0f2b5b]">
                      {sortBy === 'price-asc' ? 'Termurah' : 'Termahal'}
                    </span>
                  )}
                </button>
              </div>

              {/* Category Pills (Produk Unggulan, Coffee, Makanan, Non Coffee) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        active
                          ? 'bg-[#0f2b5b] text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product Grid (Matches Screenshot 4-col desktop, 3-col mobile/tablet) */}
            <div className="flex-1 overflow-y-auto px-3.5 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((prod) => {
                  const inCartQty = cart
                    .filter((c) => c.productId === prod.id)
                    .reduce((s, c) => s + c.qty, 0);
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => addToCart(prod)}
                      className="bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-[#0f2b5b]/40 transition overflow-hidden flex flex-col text-left group relative cursor-pointer"
                    >
                      {/* Qty Badge if in Cart */}
                      {inCartQty > 0 && (
                        <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-[#0f2b5b] text-white text-xs font-extrabold flex items-center justify-center shadow-md">
                          {inCartQty}
                        </div>
                      )}

                      {/* Portions Stock Badge */}
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-semibold">
                        {prod.availablePortions} porsi
                      </div>

                      <div className="h-32 sm:h-36 w-full overflow-hidden bg-slate-100">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>

                      <div className="p-2.5 text-center flex-1 flex flex-col justify-center">
                        <div className="font-bold text-xs text-slate-800 truncate">
                          {prod.name}
                        </div>
                        <div className="text-xs font-semibold text-slate-500 mt-0.5">
                          Rp {prod.price.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BOTTOM NAVY BAR ON CATALOG PANEL: Draft | Scan Barcode | Manual (Matches Screenshot) */}
            <div className="bg-[#0f2b5b] text-white h-14 px-4 grid grid-cols-3 items-center shrink-0 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDraftsModalOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 hover:text-blue-200 transition relative cursor-pointer"
              >
                <div className="relative">
                  <FileText className="w-4 h-4" />
                  {draftOrders.length > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px]">
                      {draftOrders.length}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold">Draft</span>
              </button>

              <button
                type="button"
                onClick={() => setBarcodeModalOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 hover:text-blue-200 transition cursor-pointer"
              >
                <ScanLine className="w-4 h-4" />
                <span className="text-[11px] font-semibold">Scan Barcode</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isSuperadmin) {
                    showToast(
                      'Input harga manual dikunci khusus Superadmin (Owner) untuk mencegah manipulasi harga.',
                      'error'
                    );
                    return;
                  }
                  setManualItemModalOpen(true);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                  isSuperadmin ? 'hover:text-blue-200' : 'opacity-60 hover:text-amber-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Calculator className="w-4 h-4" />
                  {!isSuperadmin && <Lock className="w-3 h-3 text-amber-300" />}
                </div>
                <span className="text-[11px] font-semibold">
                  {isSuperadmin ? 'Manual' : 'Manual (Owner)'}
                </span>
              </button>
            </div>
          </div>

          {/* RIGHT TRANSACTION PANEL (Matches Screenshot) */}
          <div
            className={`${
              mobileCartOpen ? 'fixed inset-0 z-40 flex' : 'hidden lg:flex'
            } w-full lg:w-[370px] xl:w-[400px] bg-white border-l border-slate-200 flex-col justify-between shrink-0`}
          >
            {/* Top Transaction Header with Direct Customer Name Input */}
            <div className="p-3.5 border-b border-slate-200 space-y-2.5 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0f2b5b]" />
                  <div>
                    <span className="font-bold text-sm text-slate-900">Transaksi</span>
                    <button
                      type="button"
                      onClick={() => setTableModalOpen(true)}
                      className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-[#0f2b5b] font-bold text-[10px] hover:bg-blue-200 cursor-pointer"
                    >
                      {selectedTable.name}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerModalOpen(true)}
                    className="text-xs font-bold text-[#0f2b5b] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Pilih Member
                  </button>
                  {mobileCartOpen && (
                    <button
                      onClick={() => setMobileCartOpen(false)}
                      className="lg:hidden p-1 rounded-lg bg-slate-100 text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Direct Mandatory Customer Name Input */}
              <div className="relative">
                <input
                  type="text"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  placeholder="Ketik Nama Pelanggan (Wajib untuk Struk & Cup)..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition ${
                    !selectedCustomer.trim()
                      ? 'border-amber-300 bg-amber-50/50 placeholder:text-amber-700/70 focus:border-[#0f2b5b] focus:bg-white'
                      : 'border-emerald-300 bg-emerald-50/30 text-slate-900 focus:border-[#0f2b5b]'
                  }`}
                />
                {selectedCustomer.trim() && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Siap
                  </span>
                )}
              </div>
            </div>

            {/* Cart Items List (Matches Screenshot Blue Circle Qty + Name + Unit Price + Line Price) */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400">
                  <ShoppingBag className="w-10 h-10 stroke-1 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">Belum ada item dipilih</p>
                  <p className="text-[11px] mt-0.5">
                    Klik menu di sebelah kiri atau scan barcode produk
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.cartItemId}
                    onClick={() => setEditingCartItem(structuredClone(item))}
                    className="py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/80 -mx-2 px-2 rounded-xl transition cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[#0f2b5b] text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {item.qty}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-800 group-hover:text-[#0f2b5b] flex items-center gap-1.5">
                          <span>{item.name}</span>
                          <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400" />
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.qty} x Rp {Number(item.price).toLocaleString('id-ID')}
                        </div>
                        {((item.sugarLevel && item.sugarLevel !== '-') ||
                          (item.iceLevel && item.iceLevel !== '-') ||
                          item.notes) && (
                          <div className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {[
                              item.sugarLevel !== '-' ? item.sugarLevel : null,
                              item.iceLevel !== '-' ? item.iceLevel : null,
                              item.notes ? `"${item.notes}"` : null
                            ]
                              .filter(Boolean)
                              .join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-xs text-slate-800">
                        Rp {(item.qty * item.price).toLocaleString('id-ID')}
                      </div>
                      <div
                        className="flex items-center justify-end gap-1 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (item.qty <= 1) {
                              setCart(cart.filter((c) => c.cartItemId !== item.cartItemId));
                            } else {
                              setCart(
                                cart.map((c) =>
                                  c.cartItemId === item.cartItemId
                                    ? { ...c, qty: c.qty - 1 }
                                    : c
                                )
                              );
                            }
                          }}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCart(
                              cart.map((c) =>
                                c.cartItemId === item.cartItemId ? { ...c, qty: c.qty + 1 } : c
                              )
                            )
                          }
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Summary & Action Buttons (Simpan, Pisah, Bayar Rp 45.000) */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-3">
              {taxPercent > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Subtotal: Rp {subtotal.toLocaleString('id-ID')}</span>
                  <span>
                    PB1 ({taxPercent}%): +Rp {taxAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-700">Total</span>
                <span className="font-extrabold text-base text-slate-900">
                  Rp {total.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={handleSaveDraft}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 hover:border-[#0f2b5b] disabled:opacity-40 text-xs font-bold text-[#0f2b5b] bg-white hover:bg-blue-50/30 transition cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  disabled={cart.length === 0 || totalItemsCount < 2}
                  onClick={() => setSplitBillModalOpen(true)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 hover:border-[#0f2b5b] disabled:opacity-40 text-xs font-bold text-[#0f2b5b] bg-white hover:bg-blue-50/30 transition cursor-pointer"
                >
                  Pisah
                </button>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => {
                  setCashReceived(String(total));
                  setPaymentModalOpen(true);
                }}
                className="w-full py-3.5 px-5 rounded-xl bg-[#0f2b5b] hover:bg-[#163d7a] disabled:opacity-40 text-white font-bold text-sm shadow-md transition cursor-pointer"
              >
                Bayar Rp {total.toLocaleString('id-ID')}
              </button>
            </div>
          </div>

          {/* Mobile Floating Cart Button */}
          {!mobileCartOpen && cart.length > 0 && (
            <button
              onClick={() => setMobileCartOpen(true)}
              className="lg:hidden fixed bottom-16 right-4 z-30 bg-[#0f2b5b] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold border border-white/15"
            >
              <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-extrabold flex items-center justify-center">
                {totalItemsCount}
              </span>
              <span>Bayar Rp {total.toLocaleString('id-ID')}</span>
            </button>
          )}
        </div>
      )}

      {/* MODAL: EDIT CART ITEM (Varian Gula, Es, Catatan Cup Label) */}
      {editingCartItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-[#0f2b5b] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{editingCartItem.name}</h3>
                <p className="text-[11px] text-blue-200">
                  Kustomisasi Takaran Gula, Es & Catatan Stiker Cup
                </p>
              </div>
              <button onClick={() => setEditingCartItem(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">Jumlah Pesanan (Qty)</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCartItem({
                        ...editingCartItem,
                        qty: Math.max(1, editingCartItem.qty - 1)
                      })
                    }
                    className="w-8 h-8 rounded-lg border border-slate-300 bg-white font-bold"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-sm w-6 text-center">
                    {editingCartItem.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCartItem({
                        ...editingCartItem,
                        qty: editingCartItem.qty + 1
                      })
                    }
                    className="w-8 h-8 rounded-lg border border-slate-300 bg-white font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Level Gula (Sugar)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['Normal Sugar', 'Less Sugar', 'No Sugar', '-'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEditingCartItem({ ...editingCartItem, sugarLevel: lvl })}
                      className={`py-2 px-2 rounded-lg font-semibold text-[11px] border ${
                        editingCartItem.sugarLevel === lvl
                          ? 'bg-[#0f2b5b] text-white border-[#0f2b5b]'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Level Es (Ice)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['Normal Ice', 'Less Ice', 'Hot / Panas', '-'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEditingCartItem({ ...editingCartItem, iceLevel: lvl })}
                      className={`py-2 px-2 rounded-lg font-semibold text-[11px] border ${
                        editingCartItem.iceLevel === lvl
                          ? 'bg-[#0f2b5b] text-white border-[#0f2b5b]'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Khusus (Tercetak di Stiker Label Cup & Struk)
                </label>
                <input
                  type="text"
                  value={editingCartItem.notes}
                  onChange={(e) =>
                    setEditingCartItem({ ...editingCartItem, notes: e.target.value })
                  }
                  placeholder="Contoh: Extra shot, ganti Oat Milk, saus pisah..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setCart(cart.filter((c) => c.cartItemId !== editingCartItem.cartItemId));
                  setEditingCartItem(null);
                }}
                className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Item
              </button>
              <button
                type="button"
                onClick={() => {
                  setCart(
                    cart.map((c) =>
                      c.cartItemId === editingCartItem.cartItemId ? editingCartItem : c
                    )
                  );
                  setEditingCartItem(null);
                }}
                className="px-5 py-2 rounded-xl bg-[#0f2b5b] text-white font-bold text-xs"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PILIH MEJA CAFE (Meja Terisi Dikunci & Tidak Bisa Diinput Lagi) */}
      {tableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-[#0f2b5b] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Pilih Nomor Meja / Tipe Pesanan Cafe</h3>
                <p className="text-[11px] text-blue-200">
                  Meja yang sudah terisi terkunci otomatis agar tidak terjadi double-input
                </p>
              </div>
              <button onClick={() => setTableModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[75vh] overflow-y-auto">
              {tables.map((t) => {
                const isOccupied = t.id !== 'TAKE-AWAY' && t.status === 'occupied';
                const hasUnpaidDraft = draftOrders.some((d) => d.tableId === t.id);
                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      isOccupied
                        ? 'bg-rose-50/70 border-rose-200 text-rose-900 opacity-90'
                        : selectedTable.id === t.id
                        ? 'bg-[#0f2b5b] text-white border-[#0f2b5b] shadow-sm'
                        : 'bg-white border-slate-200 hover:border-[#0f2b5b]'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={isOccupied}
                      onClick={() => {
                        if (isOccupied) return;
                        setSelectedTable({ id: t.id, name: t.name });
                        setTableModalOpen(false);
                      }}
                      className={`w-full text-left ${
                        isOccupied ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs">{t.name}</span>
                        {isOccupied ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-extrabold text-[9px]">
                            TERISI
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                            KOSONG
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[10px] mt-1 ${
                          selectedTable.id === t.id && !isOccupied
                            ? 'text-blue-200'
                            : 'text-slate-500'
                        }`}
                      >
                        {t.zone} {t.capacity > 0 ? `• ${t.capacity} Kursi` : ''}
                      </div>
                      {isOccupied && (
                        <div className="text-[10px] font-bold text-rose-700 mt-1 truncate">
                          {hasUnpaidDraft
                            ? 'Ada Open Bill Aktif'
                            : `Dipakai: ${t.occupiedBy || 'Pelanggan'}`}
                        </div>
                      )}
                    </button>

                    {isOccupied && !hasUnpaidDraft && (
                      <button
                        type="button"
                        onClick={() => handleReleaseTable(t.id)}
                        className="mt-2 w-full py-1 px-2 rounded-lg bg-white hover:bg-emerald-600 text-rose-700 hover:text-white border border-rose-300 font-bold text-[10px] transition cursor-pointer"
                      >
                        Kosongkan Meja
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Form Tambahan Meja Baru (Khusus Superadmin Owner) */}
            {isSuperadmin ? (
              <form
                onSubmit={handleQuickAddTable}
                className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 text-xs"
              >
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>+ Ada Tambahan Meja Baru? Tambahkan Langsung:</span>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                    Akses Superadmin (Owner)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={quickTableName}
                    onChange={(e) => setQuickTableName(e.target.value)}
                    placeholder="Nama meja (cth: Meja 09, VIP 1, Gazebo)"
                    className="sm:col-span-5 px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                  />
                  <select
                    value={quickTableZone}
                    onChange={(e) => setQuickTableZone(e.target.value)}
                    className="sm:col-span-3 px-2.5 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="Indoor">Indoor</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="VIP">VIP Room</option>
                    <option value="Smoking Area">Smoking</option>
                    <option value="Rooftop">Rooftop</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={quickTableCap}
                    onChange={(e) => setQuickTableCap(e.target.value)}
                    title="Kapasitas Kursi"
                    placeholder="Kursi"
                    className="sm:col-span-2 px-2.5 py-2 rounded-xl border border-slate-300 bg-white font-bold text-center"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-2 py-2 px-3 rounded-xl bg-[#0f2b5b] hover:bg-[#163d7a] text-white font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  Penambahan atau penghapusan meja baru hanya dapat dilakukan oleh <b>Superadmin (Owner)</b>.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: PILIH / TAMBAH PELANGGAN */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-[#0f2b5b] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Pilih Pelanggan / Member Cafe</h3>
              <button onClick={() => setCustomerModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c.name);
                      setCustomerModalOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between ${
                      selectedCustomer === c.name
                        ? 'border-[#0f2b5b] bg-blue-50/50 font-bold text-[#0f2b5b]'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="text-[11px] text-slate-500">{c.points} Poin</span>
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="font-bold text-slate-700">Tambah Pelanggan Baru</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Nama pelanggan..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newCustomerName.trim()) return;
                      const res = await fetch('/api/customers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: newCustomerName.trim(),
                          phone: newCustomerPhone || '-'
                        })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setAppState(data.state);
                        setSelectedCustomer(data.customer.name);
                        setNewCustomerName('');
                        setCustomerModalOpen(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0f2b5b] text-white font-bold"
                  >
                    Pilih
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DRAFT ORDERS (OPEN BILLS) */}
      {draftsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-[#0f2b5b] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                Daftar Pesanan Tersimpan / Open Bill ({draftOrders.length})
              </h3>
              <button onClick={() => setDraftsModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-96 overflow-y-auto text-xs">
              {draftOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Belum ada pesanan Draft / Open Bill yang disimpan.
                </div>
              ) : (
                draftOrders.map((drf) => {
                  const drfTotal = drf.items.reduce((s, i) => s + i.price * i.qty, 0);
                  return (
                    <div
                      key={drf.id}
                      className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 bg-slate-50"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {drf.tableName} • {drf.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {drf.items.length} jenis menu • Total Rp{' '}
                          {drfTotal.toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCart(drf.items);
                            setSelectedTable({ id: drf.tableId, name: drf.tableName });
                            setSelectedCustomer(drf.customerName);
                            setActiveDraftId(drf.id);
                            setDraftsModalOpen(false);
                            showToast(`Memuat Open Bill ${drf.tableName}`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#0f2b5b] text-white font-bold cursor-pointer"
                        >
                          Buka Tagihan
                        </button>
                        {isSuperadmin ? (
                          <button
                            onClick={async () => {
                              const res = await fetch(
                                `/api/drafts/${drf.id}?staffName=${encodeURIComponent(
                                  activeStaff.name
                                )}`,
                                { method: 'DELETE' }
                              );
                              if (res.ok) setAppState(await res.json());
                            }}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Hapus Open Bill (Khusus Owner)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span
                            title="Penghapusan Open Bill dikunci khusus Superadmin (Owner) untuk mencegah kecurangan"
                            className="px-2 py-1 rounded-lg bg-slate-200/70 text-slate-500 font-bold text-[10px] flex items-center gap-1 cursor-not-allowed"
                          >
                            <Lock className="w-3 h-3" /> Hapus (Owner)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INPUT ITEM MANUAL */}
      {manualItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-[#0f2b5b] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Input Item / Nominal Manual Kasir</h3>
              <button onClick={() => setManualItemModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Item / Pesanan</label>
                <input
                  type="text"
                  value={manualItemForm.name}
                  onChange={(e) =>
                    setManualItemForm({ ...manualItemForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    value={manualItemForm.price}
                    onChange={(e) =>
                      setManualItemForm({ ...manualItemForm, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qty</label>
                  <input
                    type="number"
                    value={manualItemForm.qty}
                    onChange={(e) =>
                      setManualItemForm({
                        ...manualItemForm,
                        qty: Math.max(1, Number(e.target.value))
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 font-semibold text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={manualItemForm.printCupLabel}
                  onChange={(e) =>
                    setManualItemForm({ ...manualItemForm, printCupLabel: e.target.checked })
                  }
                />
                Cetak Stiker Label Minuman (Cup)
              </label>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setManualItemModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setCart([
                    ...cart,
                    {
                      cartItemId: `manual-${Date.now()}`,
                      productId: `MANUAL-${Date.now()}`,
                      name: manualItemForm.name,
                      price: Number(manualItemForm.price),
                      qty: Number(manualItemForm.qty),
                      sugarLevel: 'Normal Sugar',
                      iceLevel: 'Normal Ice',
                      notes: 'Input Manual',
                      printCupLabel: manualItemForm.printCupLabel
                    }
                  ]);
                  setManualItemModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#0f2b5b] text-white text-xs font-bold"
              >
                Masukkan ke Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PEMBAYARAN KASIR (Wajib Input Nama Pelanggan) */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="bg-[#0f2b5b] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Pembayaran Kasir</h3>
                <p className="text-xs text-blue-200">
                  {selectedTable.name} •{' '}
                  {selectedCustomer.trim() || 'Wajib Input Nama Pelanggan'}
                </p>
              </div>
              <button onClick={() => setPaymentModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                <div className="text-slate-500 font-semibold">Total Tagihan</div>
                <div className="text-2xl font-extrabold text-[#0f2b5b] mt-0.5">
                  Rp {total.toLocaleString('id-ID')}
                </div>
              </div>

              {/* Mandatory Customer Name Field inside Payment Modal */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                <label className="block font-extrabold text-slate-800">
                  Nama Pelanggan <span className="text-rose-600">* (Wajib Diisi)</span>
                </label>
                <input
                  type="text"
                  autoFocus={!selectedCustomer.trim()}
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  placeholder="Ketik nama pelanggan (cth: Kak Rina / Budi)..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:border-[#0f2b5b]"
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {customers
                    .filter((c) => c.id !== 'CUST-GENERAL')
                    .slice(0, 4)
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCustomer(c.name)}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-[10px] font-bold text-[#0f2b5b] cursor-pointer"
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Metode Pembayaran</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Tunai', icon: Banknote },
                    { id: 'QRIS', icon: QrCode },
                    { id: 'Debit / EDC', icon: CreditCard }
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`py-2.5 px-3 rounded-xl font-bold flex flex-col items-center gap-1 border transition cursor-pointer ${
                          paymentMethod === m.id
                            ? 'bg-[#0f2b5b] text-white border-[#0f2b5b]'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{m.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Potongan Diskon Promo (Rp)
                  </label>
                  {!isSuperadmin && (
                    <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Diskon Bebas Khusus Owner
                    </span>
                  )}
                </div>
                {isSuperadmin ? (
                  <input
                    type="number"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscountInput(0)}
                      className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
                        Number(discountInput) === 0
                          ? 'bg-[#0f2b5b] text-white border-[#0f2b5b]'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Tanpa Diskon (Rp 0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountInput(5000)}
                      className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer ${
                        Number(discountInput) === 5000
                          ? 'bg-[#0f2b5b] text-white border-[#0f2b5b]'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      Voucher Member (-Rp 5.000)
                    </button>
                  </div>
                )}
              </div>

              {paymentMethod === 'Tunai' && (
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700">Uang Tunai Diterima (Rp)</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-extrabold text-sm text-[#0f2b5b]"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {[total, 50000, 100000].map((nom, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCashReceived(String(nom))}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-[11px] text-slate-700 cursor-pointer"
                      >
                        {nom === total ? 'Uang Pas' : `Rp ${nom.toLocaleString('id-ID')}`}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-sm">
                    <span className="text-slate-600">Uang Kembalian:</span>
                    <span className="text-emerald-600">
                      Rp {Math.max(0, Number(cashReceived || 0) - total).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                disabled={!selectedCustomer.trim()}
                onClick={handleProcessPayment}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0f2b5b] hover:bg-[#163d7a] disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
              >
                {!selectedCustomer.trim()
                  ? 'Isi Nama Pelanggan Dulu'
                  : 'Selesaikan & Cetak Struk / Label Cup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BARCODE SCANNER */}
      {barcodeModalOpen && (
        <BarcodeModal
          products={products}
          onScanProduct={(prod) => addToCart(prod)}
          onClose={() => setBarcodeModalOpen(false)}
        />
      )}

      {/* MODAL: SPLIT BILL */}
      {splitBillModalOpen && (
        <SplitBillModal
          cartItems={cart}
          onConfirmSplit={handleConfirmSplitBill}
          onClose={() => setSplitBillModalOpen(false)}
        />
      )}

      {/* MODAL: RECEIPT & CUP STICKER LABEL PRINT */}
      {receiptModalTx && (
        <ReceiptAndLabelModal
          transaction={receiptModalTx}
          storeProfile={storeProfile}
          onClose={() => setReceiptModalTx(null)}
        />
      )}

      {/* MODAL: STORE SETTINGS (PROFIL CAFE, PAJAK PB1, WIFI & STAF) */}
      {storeSettingsOpen && (
        <StoreSettingsModal
          storeProfile={storeProfile}
          staffList={staffList}
          activeStaff={activeStaff}
          onSaveSettings={handleSaveStoreSettings}
          onClose={() => setStoreSettingsOpen(false)}
        />
      )}
    </div>
  );
}

