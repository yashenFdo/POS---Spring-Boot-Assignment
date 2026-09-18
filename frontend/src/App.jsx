import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API = '/api';

/* ─────────── helpers ─────────── */
const fmt = (n) => `$${Number(n).toFixed(2)}`;
const uuid = () => crypto.randomUUID();

const STATUS_COLOR = {
  PENDING: '#f59e0b', RESERVED: '#3b82f6',
  PAID: '#10b981', FAILED: '#ef4444',
  EXPIRED: '#6b7280', CANCELLED: '#6b7280',
};

function Badge({ status }) {
  return (
    <span className="badge" style={{ '--c': STATUS_COLOR[status] || '#6b7280' }}>
      {status}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   TAB 1 — Products CRUD
═══════════════════════════════ */
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', availableStock: '' });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    const r = await fetch(`${API}/products`);
    setProducts(await r.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ name: '', price: '', availableStock: '' });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({ name: p.name, price: p.price, availableStock: p.availableStock });
    setEditId(p.id);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = { name: form.name, price: parseFloat(form.price), availableStock: parseInt(form.availableStock) };
    const url = editId ? `${API}/products/${editId}` : `${API}/products`;
    const method = editId ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) {
      notify(editId ? 'Product updated!' : 'Product created!');
      setShowForm(false);
      load();
    } else {
      notify('Failed to save product', 'error');
    }
  };

  const remove = async (id) => {
    const r = await fetch(`${API}/products/${id}`, { method: 'DELETE' });
    if (r.ok) { notify('Product deleted.', 'error'); load(); }
    setDeleteConfirm(null);
  };

  return (
    <div className="tab-content">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="section-header">
        <h2>Products</h2>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ New Product</button>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📦</span>
          <p>No products yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th><th>Name</th><th>Price</th><th>Stock</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td className="id-col">{p.id}</td>
                  <td><strong>{p.name}</strong></td>
                  <td>{fmt(p.price)}</td>
                  <td>
                    <span className={`stock-chip ${p.availableStock === 0 ? 'out' : p.availableStock < 5 ? 'low' : 'ok'}`}>
                      {p.availableStock}
                    </span>
                  </td>
                  <td className="actions-col">
                    <button className="btn btn-ghost btn-xs" onClick={() => openEdit(p)}>✏️ Edit</button>
                    <button className="btn btn-danger btn-xs" onClick={() => setDeleteConfirm(p)}>🗑 Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <Modal title={editId ? 'Edit Product' : 'New Product'} onClose={() => setShowForm(false)}>
          <form className="form" onSubmit={submit}>
            <label>Name</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Apple" />
            <label>Price ($)</label>
            <input className="input" type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required placeholder="e.g. 1.99" />
            <label>Stock</label>
            <input className="input" type="number" min="0" value={form.availableStock} onChange={e => setForm({ ...form, availableStock: e.target.value })} required placeholder="e.g. 100" />
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editId ? 'Save Changes' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <Modal title="Delete Product" onClose={() => setDeleteConfirm(null)}>
          <div className="confirm-body">
            <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => remove(deleteConfirm.id)}>Yes, Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════
   TAB 2 — POS / Order Flow
═══════════════════════════════ */
function POSTab() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [view, setView] = useState('pos'); // 'pos' | 'orders'

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadProducts = useCallback(async () => {
    const r = await fetch(`${API}/products`);
    setProducts(await r.json());
  }, []);

  const loadOrders = useCallback(async () => {
    const r = await fetch(`${API}/orders`);
    setOrders(await r.json());
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const addToCart = (p) => {
    if (p.availableStock === 0) return;
    setCart(prev => {
      const ex = prev.find(i => i.productId === p.id);
      return ex
        ? prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { productId: p.id, name: p.name, price: p.price, quantity: 1 }];
    });
    notify(`${p.name} added`);
  };

  const changeQty = (productId, delta) => {
    setCart(prev => prev
      .map(i => i.productId === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0));
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const apiCall = async (fn) => {
    setLoading(true); setError(null);
    try { await fn(); }
    catch (e) { setError(e.message || 'Request failed'); }
    finally { setLoading(false); }
  };

  const createOrder = () => apiCall(async () => {
    const r = await fetch(`${API}/orders/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })) })
    });
    if (!r.ok) throw new Error(await r.text());
    setOrder(await r.json()); setCart([]);
    notify('Order created!');
  });

  const checkout = () => apiCall(async () => {
    const r = await fetch(`${API}/orders/${order.id}/checkout`, {
      method: 'POST', headers: { 'Idempotency-Key': uuid() }
    });
    if (!r.ok) throw new Error(await r.text());
    setOrder(await r.json()); loadProducts();
    notify('Stock reserved! Proceed to payment.');
  });

  const pay = (outcome) => apiCall(async () => {
    const r = await fetch(`${API}/payments/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': uuid() },
      body: JSON.stringify({ orderId: order.id, outcome })
    });
    if (!r.ok) throw new Error(await r.text());
    const upd = await fetch(`${API}/orders/${order.id}`);
    setOrder(await upd.json()); loadProducts();
    notify(outcome === 'SUCCESS' ? '🎉 Payment successful!' : `Payment ${outcome.toLowerCase()}.`,
      outcome === 'SUCCESS' ? 'success' : 'error');
  });

  const cancel = () => apiCall(async () => {
    const r = await fetch(`${API}/orders/${order.id}/cancel`, { method: 'POST' });
    if (!r.ok) throw new Error(await r.text());
    setOrder(await r.json()); loadProducts();
    notify('Order cancelled.', 'error');
  });

  const isTerminal = order && ['PAID', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(order.status);

  return (
    <div className="tab-content">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Sub-nav */}
      <div className="subnav">
        <button className={`subnav-btn ${view === 'pos' ? 'active' : ''}`} onClick={() => setView('pos')}>🛒 Point of Sale</button>
        <button className={`subnav-btn ${view === 'orders' ? 'active' : ''}`} onClick={() => { setView('orders'); loadOrders(); }}>📋 Orders History</button>
      </div>

      {view === 'orders' ? (
        /* ── Orders History ── */
        <div>
          <div className="section-header">
            <h2>All Orders</h2>
            <button className="btn btn-ghost btn-sm" onClick={loadOrders}>↻ Refresh</button>
          </div>
          {orders.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">📋</span><p>No orders yet.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>#</th><th>Status</th><th>Total</th><th>Created</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td className="id-col">{o.id}</td>
                      <td><Badge status={o.status} /></td>
                      <td>{fmt(o.totalAmount)}</td>
                      <td className="muted">{new Date(o.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ── POS ── */
        <div className="pos-layout">
          {/* Products */}
          <div className="pos-products">
            <div className="section-header">
              <h2>Products</h2>
              <button className="btn btn-ghost btn-sm" onClick={loadProducts}>↻</button>
            </div>
            {products.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">📦</span><p>No products. Add them in the Products tab.</p></div>
            ) : (
              <div className="product-grid">
                {products.map(p => (
                  <button
                    key={p.id}
                    className={`product-tile ${p.availableStock === 0 ? 'disabled' : ''}`}
                    onClick={() => addToCart(p)}
                    disabled={p.availableStock === 0}
                  >
                    <span className="tile-emoji">{p.availableStock === 0 ? '🚫' : '📦'}</span>
                    <span className="tile-name">{p.name}</span>
                    <span className="tile-price">{fmt(p.price)}</span>
                    <span className={`tile-stock ${p.availableStock < 5 ? 'low' : ''}`}>
                      {p.availableStock === 0 ? 'Out of stock' : `${p.availableStock} left`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart / Order panel */}
          <div className="pos-sidebar">
            {!order ? (
              <div className="panel">
                <div className="panel-header">
                  <h2>Cart</h2>
                  {cart.length > 0 && <span className="count-badge">{cart.reduce((s,i)=>s+i.quantity,0)}</span>}
                </div>

                {error && <div className="inline-error">⚠️ {error}</div>}

                {cart.length === 0 ? (
                  <div className="empty-state sm">
                    <span className="empty-icon">🛍️</span>
                    <p>Tap a product to add it</p>
                  </div>
                ) : (
                  <>
                    <div className="cart-list">
                      {cart.map(item => (
                        <div key={item.productId} className="cart-row">
                          <div className="cart-name">{item.name}</div>
                          <div className="cart-controls">
                            <button className="qty-btn" onClick={() => changeQty(item.productId, -1)}>−</button>
                            <span className="qty-val">{item.quantity}</span>
                            <button className="qty-btn" onClick={() => changeQty(item.productId, +1)}>+</button>
                          </div>
                          <div className="cart-sub">{fmt(item.price * item.quantity)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="cart-footer">
                      <div className="cart-total-row">
                        <span>Total</span>
                        <span className="big-price">{fmt(cartTotal)}</span>
                      </div>
                      <button className="btn btn-primary btn-full" onClick={createOrder} disabled={loading}>
                        {loading ? 'Creating…' : 'Create Order →'}
                      </button>
                      <button className="btn btn-ghost btn-full" onClick={() => setCart([])}>Clear Cart</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="panel">
                <div className="panel-header">
                  <h2>Order #{order.id}</h2>
                  <Badge status={order.status} />
                </div>

                {error && <div className="inline-error">⚠️ {error}</div>}

                <div className="order-info">
                  <div className="order-info-row"><span>Total</span><span className="big-price">{fmt(order.totalAmount)}</span></div>
                </div>

                <div className="order-btns">
                  {order.status === 'PENDING' && (<>
                    <button className="btn btn-primary btn-full" onClick={checkout} disabled={loading}>
                      🔒 Checkout &amp; Reserve Stock
                    </button>
                    <button className="btn btn-danger btn-full" onClick={cancel} disabled={loading}>Cancel Order</button>
                  </>)}

                  {order.status === 'RESERVED' && (
                    <div className="pay-section">
                      <p className="section-label">Simulate Payment</p>
                      <button className="btn btn-success btn-full" onClick={() => pay('SUCCESS')} disabled={loading}>✅ Pay — SUCCESS</button>
                      <button className="btn btn-danger btn-full" onClick={() => pay('FAILURE')} disabled={loading}>❌ Pay — FAILURE</button>
                      <button className="btn btn-warning btn-full" onClick={() => pay('TIMEOUT')} disabled={loading}>⏱ Pay — TIMEOUT</button>
                      <button className="btn btn-ghost btn-full" onClick={cancel} disabled={loading}>Cancel &amp; Release Stock</button>
                    </div>
                  )}

                  {isTerminal && (
                    <div className="terminal-box">
                      <div className="terminal-icon">
                        {order.status === 'PAID' ? '🎉' : order.status === 'CANCELLED' ? '🚫' : '⚠️'}
                      </div>
                      <p>Order <strong>{order.status}</strong></p>
                      <button className="btn btn-primary btn-full" onClick={() => { setOrder(null); loadProducts(); }}>
                        New Sale
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════
   ROOT APP
═══════════════════════════════ */
export default function App() {
  const [tab, setTab] = useState('pos');

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span>🛒</span>
            <span className="logo-text">TechLoom <em>POS</em></span>
          </div>
          <nav className="tabs">
            <button className={`tab-btn ${tab === 'pos' ? 'active' : ''}`} onClick={() => setTab('pos')}>
              POS &amp; Orders
            </button>
            <button className={`tab-btn ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
              Products
            </button>
            <a href="/swagger-ui.html" target="_blank" className="tab-btn external">API Docs ↗</a>
          </nav>
        </div>
      </header>

      <main className="main">
        {tab === 'pos' && <POSTab />}
        {tab === 'products' && <ProductsTab />}
      </main>
    </div>
  );
}
