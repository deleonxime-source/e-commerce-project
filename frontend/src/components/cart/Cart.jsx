import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api.js';

function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingProductId, setRemovingProductId] = useState(null);

  const loadCart = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/api/cart');
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError('Unable to load cart');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  async function handleRemove(productId) {
    try {
      setRemovingProductId(productId);
      setError('');

      await api.delete(`/api/cart/${productId}`);
      await loadCart();
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to remove item from cart';
      setError(message);
    } finally {
      setRemovingProductId(null);
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
        <div className="cart-list">
          {items.map((item) => (
            <div key={item.product_id || item.id} className="cart-item">
              <div>
                <p className="cart-item__name">{item.name || 'Item'}</p>
                <p className="cart-item__meta">Qty: {item.quantity || 1}</p>
                <p className="cart-item__meta">${item.price || '0.00'}</p>
              </div>

              <button
                type="button"
                className="admin-danger"
                onClick={() => handleRemove(item.product_id || item.id)}
                disabled={removingProductId === (item.product_id || item.id)}
              >
                {removingProductId === (item.product_id || item.id) ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="cart-note">Ordering/checkout is not enabled yet.</p>
    </main>
  );
}

export default Cart;
