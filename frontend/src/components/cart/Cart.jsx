import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api.js';

function Cart() {
  const [items, setItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');
  const [removingProductId, setRemovingProductId] = useState(null);

  const currency = (value) => Number(value || 0).toFixed(2);

  const calculateFallbackTotal = (cartItems) => cartItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
    0
  );

  const getOrderStatusLabel = (status) => {
    switch (String(status || '').toLowerCase()) {
      case 'placed':
        return 'Order Placed';
      case 'shipping':
        return 'Shipping In Progress';
      case 'delivered':
        return 'Delivered';
      case 'returned':
        return 'Returned';
      default:
        return 'Order Placed';
    }
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/api/cart');
      const cartItems = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.items)
          ? response.data.items
          : [];
      const total = Number(response.data?.total);

      setItems(cartItems);
      setCartTotal(Number.isFinite(total) ? total : calculateFallbackTotal(cartItems));
    } catch {
      setError('Unable to load cart');
      setItems([]);
      setCartTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await api.get('/api/orders');
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch {
      setOrders([]);
    }
  };

  useEffect(() => {
    loadCart();
    loadOrders();
  }, []);

  async function handleRemove(productId) {
    const size = String(arguments[1] || '').toUpperCase();

    if (!size) {
      setError('Missing size for selected cart item.');
      return;
    }

    try {
      setRemovingProductId(`${productId}-${size}`);
      setError('');

      await api.delete(`/api/cart/${productId}`, { params: { size } });
      await loadCart();
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to remove item from cart';
      setError(message);
    } finally {
      setRemovingProductId(null);
    }
  }

  async function handlePlaceOrder() {
    if (!items.length || ordering) return;

    try {
      setOrdering(true);
      setError('');
      setOrderMessage('');

      const response = await api.post('/api/orders', {});
      const orderId = response.data?.id;
      const orderTotal = response.data?.total_amount;

      setOrderMessage(`Order #${orderId} placed. Total: $${currency(orderTotal)}.`);
      await Promise.all([loadCart(), loadOrders()]);
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to place order';
      setError(message);
    } finally {
      setOrdering(false);
    }
  }

  async function handleReturnOrder(orderId) {
    try {
      setOrdering(true);
      setError('');
      await api.post(`/api/orders/${orderId}/return`);
      await Promise.all([loadCart(), loadOrders()]);
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to return order';
      setError(message);
    } finally {
      setOrdering(false);
    }
  }

  if (loading) return <main className="cart-page"><p className="grid-message">Loading cart...</p></main>;
  if (error) return <main className="cart-page"><p className="grid-message">{error}</p></main>;

  return (
    <main className="cart-page">
      <div className="detail-topbar">
        <Link to="/products" className="detail-back-link">← Back to products</Link>
      </div>

      <h1 className="cart-title">Your Cart</h1>

      {items.length === 0 ? (
        <p className="cart-empty">Your cart is empty.</p>
      ) : (
        <>
          <div className="cart-list">
            {items.map((item) => (
              <div key={`${item.product_id || item.id}-${item.size || 'NA'}`} className="cart-item">
                <div>
                  <p className="cart-item__name">{item.name || 'Item'}</p>
                  <p className="cart-item__meta">Size: {item.size || 'M'}</p>
                  <p className="cart-item__meta">Qty: {item.quantity || 1}</p>
                  <p className="cart-item__meta">Unit: ${currency(item.price)}</p>
                  <p className="cart-item__meta">Line total: ${currency(item.line_total || Number(item.price) * Number(item.quantity || 1))}</p>
                </div>

                <button
                  type="button"
                  className="admin-danger"
                  onClick={() => handleRemove(item.product_id || item.id, item.size)}
                  disabled={removingProductId === `${item.product_id || item.id}-${item.size || 'M'}`}
                >
                  {removingProductId === `${item.product_id || item.id}-${item.size || 'M'}` ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <p className="cart-summary__total">Cart total: ${currency(cartTotal)}</p>
            <button
              type="button"
              className="admin-primary"
              onClick={handlePlaceOrder}
              disabled={ordering || items.length === 0}
            >
              {ordering ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </>
      )}

      {orderMessage && <p className="cart-note">{orderMessage}</p>}

      <section className="orders-section">
        <h2 className="orders-title">Orders</h2>
        {orders.length === 0 ? (
          <p className="cart-empty">No orders yet.</p>
        ) : (
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Details</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{new Date(order.created_at).toLocaleString()}</td>
                    <td>{order.status_label || getOrderStatusLabel(order.status)}</td>
                    <td>${currency(order.total_amount)}</td>
                    <td>
                      {(order.items || []).map((item) => (
                        <div key={item.id} className="orders-table__detail">
                          {item.product_name} ({item.size || 'M'}) × {item.quantity} (${currency(item.unit_price)})
                        </div>
                      ))}
                    </td>
                    <td>
                      {String(order.status || '').toLowerCase() === 'returned' ? (
                        <span className="orders-table__muted">Already returned</span>
                      ) : (
                        <button
                          type="button"
                          className="admin-secondary"
                          onClick={() => handleReturnOrder(order.id)}
                          disabled={ordering}
                        >
                          Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default Cart;
