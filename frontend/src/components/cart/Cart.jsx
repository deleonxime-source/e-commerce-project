import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api.js';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

const NO_IMAGE_PLACEHOLDER = 'https://via.placeholder.com/240x240?text=No+Image';

function Cart() {
  const [items, setItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [returningOrderId, setReturningOrderId] = useState(null);
  const [orderMessage, setOrderMessage] = useState('');
  const [removingProductId, setRemovingProductId] = useState(null);

  const apiErrorMessage = (err, fallback) => (
    err?.response?.data?.message
    || err?.response?.data?.error
    || err?.response?.data?.detail
    || fallback
  );

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

  const getCartItemImage = (item) => {
    const galleryImage = Array.isArray(item?.image_urls) ? item.image_urls.find(Boolean) : '';
    return item?.image_url || galleryImage || NO_IMAGE_PLACEHOLDER;
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
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load cart'));
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

  async function handleRemove(productId, sizeValue) {
    const size = String(sizeValue || '').toUpperCase();

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
      const message = apiErrorMessage(err, 'Unable to remove item from cart');
      setError(message);
    } finally {
      setRemovingProductId(null);
    }
  }

  async function handlePlaceOrder() {
    if (!items.length || placingOrder) return;

    try {
      setPlacingOrder(true);
      setError('');
      setOrderMessage('');

      const response = await api.post('/api/orders', {});
      const orderId = response.data?.id;
      const orderTotal = response.data?.total_amount;

      setOrderMessage(`Order #${orderId} placed. Total: $${currency(orderTotal)}.`);
      await Promise.all([loadCart(), loadOrders()]);
    } catch (err) {
      const message = apiErrorMessage(err, 'Unable to place order');
      setError(message);
    } finally {
      setPlacingOrder(false);
    }
  }

  async function handleReturnOrder(orderId) {
    try {
      setReturningOrderId(orderId);
      setError('');
      await api.post(`/api/orders/${orderId}/return`);
      await Promise.all([loadCart(), loadOrders()]);
    } catch (err) {
      const message = apiErrorMessage(err, 'Unable to return order');
      setError(message);
    } finally {
      setReturningOrderId(null);
    }
  }

  if (loading) return <main className="cart-page"><p className="grid-message">Loading cart...</p></main>;

  return (
    <main className="cart-page">
      <div className="detail-topbar">
        <Link to="/products" className="detail-back-link">← Back to products</Link>
      </div>

      {error && <p className="cart-note">{error}</p>}

      <h1 className="cart-title">Your Cart</h1>

      {items.length === 0 ? (
        <p className="cart-empty">Your cart is empty.</p>
      ) : (
        <>
          <div className="cart-list">
            {items.map((item) => (
              <div key={`${item.product_id || item.id}-${item.size || 'NA'}`} className="cart-item">
                <img
                  src={getCartItemImage(item)}
                  alt={item.name || 'Cart item'}
                  className="cart-item__image"
                />

                <div className="cart-item__content">
                  <p className="cart-item__name">{item.name || 'Item'}</p>
                  <p className="cart-item__meta">{item.category_name || 'Uncategorized'}</p>
                  <div className="cart-item__details">
                    <p className="cart-item__meta">Size: {item.size || 'M'}</p>
                    <p className="cart-item__meta">Qty: {item.quantity || 1}</p>
                    <p className="cart-item__meta">Unit: ${currency(item.price)}</p>
                    <p className="cart-item__line-total">Line total: ${currency(item.line_total || Number(item.price) * Number(item.quantity || 1))}</p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={() => handleRemove(item.product_id || item.id, item.size)}
                  disabled={removingProductId === `${item.product_id || item.id}-${item.size || 'M'}`}
                  sx={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '10px',
                    letterSpacing: '0.08em',
                    borderColor: 'rgba(0, 0, 0, 0.3)',
                    color: '#333333',
                    minWidth: 92,
                    '&:hover': { borderColor: '#111111', backgroundColor: 'rgba(0, 0, 0, 0.03)' },
                  }}
                >
                  {removingProductId === `${item.product_id || item.id}-${item.size || 'M'}` ? 'Removing...' : 'Remove'}
                </Button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <p className="cart-summary__total">Cart total: ${currency(cartTotal)}</p>
            <Button
              type="button"
              variant="contained"
              size="small"
              onClick={handlePlaceOrder}
              disabled={placingOrder || items.length === 0}
              sx={{
                fontFamily: '"Space Mono", monospace',
                fontSize: '10px',
                letterSpacing: '0.08em',
                backgroundColor: '#111111',
                '&:hover': { backgroundColor: '#111111' },
              }}
            >
              {placingOrder ? 'Placing Order...' : 'Place Order'}
            </Button>
          </div>
        </>
      )}

      {orderMessage && <p className="cart-note">{orderMessage}</p>}

      <section className="orders-section">
        <h2 className="orders-title">Orders</h2>
        {orders.length === 0 ? (
          <p className="cart-empty">No orders yet.</p>
        ) : (
          <TableContainer component={Paper} sx={{ border: '0.5px solid rgba(0, 0, 0, 0.12)', borderRadius: '10px', boxShadow: 'none' }}>
            <Table size="small" aria-label="orders table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontFamily: '"Space Mono", monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Order #</TableCell>
                  <TableCell sx={{ fontFamily: '"Space Mono", monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Date</TableCell>
                  <TableCell sx={{ fontFamily: '"Space Mono", monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Status</TableCell>
                  <TableCell sx={{ fontFamily: '"Space Mono", monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total</TableCell>
                  <TableCell sx={{ fontFamily: '"Space Mono", monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Details</TableCell>
                  <TableCell sx={{ fontFamily: '"Space Mono", monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                    <TableCell>{order.status_label || getOrderStatusLabel(order.status)}</TableCell>
                    <TableCell>${currency(order.total_amount)}</TableCell>
                    <TableCell>
                      {(order.items || []).map((item) => (
                        <div key={item.id} className="orders-table__detail">
                          {item.product_name} ({item.size || 'M'}) × {item.quantity} (${currency(item.unit_price)})
                        </div>
                      ))}
                    </TableCell>
                    <TableCell>
                      {String(order.status || '').toLowerCase() === 'returned' ? (
                        <span className="orders-table__muted">Already returned</span>
                      ) : (
                        <Button
                          type="button"
                          variant="outlined"
                          size="small"
                          onClick={() => handleReturnOrder(order.id)}
                          disabled={placingOrder || returningOrderId === order.id}
                          sx={{
                            fontFamily: '"Space Mono", monospace',
                            fontSize: '10px',
                            letterSpacing: '0.08em',
                            borderColor: 'rgba(0, 0, 0, 0.3)',
                            color: '#333333',
                            '&:hover': { borderColor: '#111111', backgroundColor: 'rgba(0, 0, 0, 0.03)' },
                          }}
                        >
                          {returningOrderId === order.id ? 'Returning...' : 'Return'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </section>
    </main>
  );
}

export default Cart;
