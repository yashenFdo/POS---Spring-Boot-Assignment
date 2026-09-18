import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = '/api';

const STATUS_COLORS = {
  PENDING: '#f59e0b',
  RESERVED: '#3b82f6',
  PAID: '#10b981',
  FAILED: '#ef4444',
  EXPIRED: '#6b7280',
  CANCELLED: '#6b7280',
};

function StatusBadge({ status }) {
  return (
    <span className="status-badge" style={{ '--status-color': STATUS_COLORS[status] || '#6b7280' }}>
      {status}
    </span>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError('Failed to load products. Is the backend running?');
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { productId: product.id, name: product.name, price: product.price, quantity: 1 }]);
    }
    showToast(`${product.name} added to cart`);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const createPendingOrder = async () => {
    setLoading(true); setError(null);
    try {
      const items = cart.map(item => ({ productId: item.productId, quantity: item.quantity }));
      const response = await fetch(`${API_BASE_URL}/orders/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setOrder(data); setCart([]);
      showToast('Order created! Ready to checkout.');
    } catch (err) {
      setError(err.message || 'Failed to create order');
    } finally { setLoading(false); }
  };

  const checkoutOrder = async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${order.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }
      });
      if (!response.ok) throw new Error(await response.text());
      setOrder(await response.json());
      fetchProducts();
      showToast('Stock reserved! Proceed to payment.');
    } catch (err) {
      setError(err.message || 'Failed to checkout');
    } finally { setLoading(false); }
  };

  const processPayment = async (outcome) => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ orderId: order.id, outcome })
      });
      if (!response.ok) throw new Error(await response.text());
      const orderResponse = await fetch(`${API_BASE_URL}/orders/${order.id}`);
      setOrder(await orderResponse.json());
      fetchProducts();
      showToast(outcome === 'SUCCESS' ? '🎉 Payment successful!' : `Payment ${outcome.toLowerCase()}.`, outcome === 'SUCCESS' ? 'success' : 'error');
    } catch (err) {
      setError(err.message || 'Failed to process payment');
    } finally { setLoading(false); }
  };

  const cancelOrder = async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${order.id}/cancel`, { method: 'POST' });
      if (!response.ok) throw new Error(await response.text());
      setOrder(await response.json());
      fetchProducts();
      showToast('Order cancelled. Stock released.', 'error');
    } catch (err) {
      setError(err.message || 'Failed to cancel order');
    } finally { setLoading(false); }
  };

  const isTerminal = order && ['PAID', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(order.status);

  return (
    <div className="app">
      {/* Toast */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🛒</span>
            <span className="logo-text">TechLoom <span>POS</span></span>
          </div>
          <div className="header-meta">
            <span className="badge-live">● LIVE</span>
            <a href="/swagger-ui.html" target="_blank" className="api-link">API Docs ↗</a>
          </div>
        </div>
      </header>

      <main className="main">
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className="layout">
          {/* Products Panel */}
          <section className="panel products-panel">
            <div className="panel-header">
              <h2>Products</h2>
              <button className="btn btn-ghost btn-sm" onClick={fetchProducts}>↻ Refresh</button>
            </div>
            {products.length === 0 ? (
              <div className="empty-state">
                <p>No products found.</p>
                <p className="hint">Seed the database via Swagger or check the backend connection.</p>
              </div>
            ) : (
              <div className="product-grid">
                {products.map(p => (
                  <div key={p.id} className={`product-card ${p.availableStock === 0 ? 'out-of-stock' : ''}`}>
                    <div className="product-emoji">{p.availableStock === 0 ? '🚫' : '📦'}</div>
                    <div className="product-info">
                      <h3>{p.name}</h3>
                      <div className="product-meta">
                        <span className="price">${Number(p.price).toFixed(2)}</span>
                        <span className={`stock ${p.availableStock < 3 ? 'low' : ''}`}>
                          {p.availableStock === 0 ? 'Out of stock' : `${p.availableStock} left`}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm add-btn"
                      disabled={p.availableStock === 0}
                      onClick={() => addToCart(p)}
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Cart / Order Panel */}
          <section className="panel side-panel">
            {!order ? (
              <div className="cart-view">
                <div className="panel-header">
                  <h2>Cart</h2>
                  {cart.length > 0 && (
                    <span className="cart-count">{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
                  )}
                </div>
                {cart.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">🛍️</span>
                    <p>Your cart is empty</p>
                    <p className="hint">Add products from the left panel</p>
                  </div>
                ) : (
                  <>
                    <div className="cart-items">
                      {cart.map((item) => (
                        <div key={item.productId} className="cart-item">
                          <div>
                            <div className="cart-item-name">{item.name}</div>
                            <div className="cart-item-sub">Qty: {item.quantity} × ${Number(item.price).toFixed(2)}</div>
                          </div>
                          <div className="cart-item-right">
                            <span className="cart-item-total">${(item.price * item.quantity).toFixed(2)}</span>
                            <button className="btn-remove" onClick={() => removeFromCart(item.productId)}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="cart-footer">
                      <div className="cart-total">
                        <span>Total</span>
                        <span className="total-amount">${cartTotal.toFixed(2)}</span>
                      </div>
                      <button className="btn btn-primary btn-full" onClick={createPendingOrder} disabled={loading}>
                        {loading ? 'Creating...' : 'Create Order →'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="order-view">
                <div className="panel-header">
                  <h2>Order #{order.id}</h2>
                  <StatusBadge status={order.status} />
                </div>

                <div className="order-summary">
                  <div className="summary-row">
                    <span>Total Amount</span>
                    <span className="total-amount">${Number(order.totalAmount).toFixed(2)}</span>
                  </div>
                </div>

                <div className="order-actions">
                  {order.status === 'PENDING' && (
                    <>
                      <button className="btn btn-primary btn-full" onClick={checkoutOrder} disabled={loading}>
                        {loading ? 'Reserving...' : '🔒 Checkout & Reserve Stock'}
                      </button>
                      <button className="btn btn-danger btn-full" onClick={cancelOrder} disabled={loading}>
                        Cancel Order
                      </button>
                    </>
                  )}

                  {order.status === 'RESERVED' && (
                    <div className="payment-section">
                      <h3>Simulate Payment</h3>
                      <p className="hint">Stock is reserved. Choose a payment outcome:</p>
                      <button className="btn btn-success btn-full" onClick={() => processPayment('SUCCESS')} disabled={loading}>
                        ✅ Pay — SUCCESS
                      </button>
                      <button className="btn btn-danger btn-full" onClick={() => processPayment('FAILURE')} disabled={loading}>
                        ❌ Pay — FAILURE
                      </button>
                      <button className="btn btn-warning btn-full" onClick={() => processPayment('TIMEOUT')} disabled={loading}>
                        ⏱ Pay — TIMEOUT
                      </button>
                      <button className="btn btn-ghost btn-full" onClick={cancelOrder} disabled={loading}>
                        Cancel & Release Stock
                      </button>
                    </div>
                  )}

                  {isTerminal && (
                    <div className="terminal-state">
                      <div className="terminal-icon">
                        {order.status === 'PAID' ? '🎉' : order.status === 'CANCELLED' ? '🚫' : '⚠️'}
                      </div>
                      <p>Order is <strong>{order.status}</strong></p>
                      <button className="btn btn-primary btn-full" onClick={() => setOrder(null)}>
                        Start New Order
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
