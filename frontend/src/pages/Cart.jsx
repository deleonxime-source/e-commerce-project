import { useEffect, useState } from 'react';
import api from '../api/api.js';

function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/cart')
      .then((response) => setItems(response.data))
      .catch(() => setError('Unable to load cart'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading cart…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h1>Your Cart</h1>
      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div className="cart-list">
          {items.map((item) => (
            <div key={item.product_id} className="cart-item">
              <div>{item.name}</div>
              <div>Qty: {item.quantity}</div>
              <div>${item.price}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Cart;
