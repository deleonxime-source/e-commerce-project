import { useEffect, useState } from 'react';
import api from '../api/api.js';

function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/orders')
      .then((response) => setOrders(response.data))
      .catch(() => setError('Unable to load orders'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading orders…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <div className="order-list">
        {orders.map((order) => (
          <div key={order.id} className="card order-card">
            <div>Order #{order.id}</div>
            <div>Status: {order.status}</div>
            <div>Shipping: {order.shipping_address}</div>
            <div>Created: {new Date(order.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
