import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = '/api'; // Use relative path so it works with Spring Boot proxy and Railway

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load products');
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { productId: product.id, name: product.name, price: product.price, quantity: 1 }]);
    }
  };

  const createPendingOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = cart.map(item => ({ productId: item.productId, quantity: item.quantity }));
      const response = await fetch(`${API_BASE_URL}/orders/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setOrder(data);
      setCart([]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const checkoutOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const response = await fetch(`${API_BASE_URL}/orders/${order.id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        }
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setOrder(data);
      fetchProducts(); // Refresh stock
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to checkout');
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (outcome) => {
    setLoading(true);
    setError(null);
    try {
      const idempotencyKey = crypto.randomUUID();
      const response = await fetch(`${API_BASE_URL}/payments/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ orderId: order.id, outcome })
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      // Fetch updated order to get the latest status
      const orderResponse = await fetch(`${API_BASE_URL}/orders/${order.id}`);
      const orderData = await orderResponse.json();
      setOrder(orderData);
      fetchProducts(); // Refresh stock if failed
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${order.id}/cancel`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setOrder(data);
      fetchProducts(); // Refresh stock
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to cancel order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>POS Order & Inventory System</h1>
      {error && <div className="error">{error}</div>}
      
      <div className="grid">
        <div className="products-section">
          <h2>Products</h2>
          <button onClick={fetchProducts}>Refresh Products</button>
          <div className="products">
            {products.map(p => (
              <div key={p.id} className="product-card">
                <h3>{p.name}</h3>
                <p>Price: ${p.price}</p>
                <p>Stock: {p.availableStock}</p>
                <button 
                  disabled={p.availableStock === 0} 
                  onClick={() => addToCart(p)}>
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="cart-order-section">
          {!order ? (
            <div className="cart">
              <h2>Cart</h2>
              {cart.length === 0 ? <p>Cart is empty</p> : (
                <>
                  <ul>
                    {cart.map((item, idx) => (
                      <li key={idx}>{item.name} - Qty: {item.quantity}</li>
                    ))}
                  </ul>
                  <button onClick={createPendingOrder} disabled={loading}>Create Order</button>
                </>
              )}
            </div>
          ) : (
            <div className="order-details">
              <h2>Order #{order.id}</h2>
              <p>Status: <strong>{order.status}</strong></p>
              <p>Total: ${order.totalAmount}</p>
              
              <div className="order-actions">
                {order.status === 'PENDING' && (
                  <>
                    <button onClick={checkoutOrder} disabled={loading}>Checkout (Reserve Stock)</button>
                    <button onClick={cancelOrder} disabled={loading}>Cancel Order</button>
                  </>
                )}
                
                {order.status === 'RESERVED' && (
                  <div className="payment-simulation">
                    <h3>Simulate Payment</h3>
                    <button onClick={() => processPayment('SUCCESS')} disabled={loading} className="success-btn">Pay SUCCESS</button>
                    <button onClick={() => processPayment('FAILURE')} disabled={loading} className="danger-btn">Pay FAILURE</button>
                    <button onClick={() => processPayment('TIMEOUT')} disabled={loading} className="warning-btn">Pay TIMEOUT</button>
                    <button onClick={cancelOrder} disabled={loading}>Cancel Order (Release Stock)</button>
                  </div>
                )}
                
                {(order.status === 'PAID' || order.status === 'FAILED' || order.status === 'EXPIRED' || order.status === 'CANCELLED') && (
                  <button onClick={() => setOrder(null)}>Start New Order</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
