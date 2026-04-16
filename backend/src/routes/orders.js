import express from 'express';
import { query } from '../db.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    const userId = req.auth.sub;
    const { shippingAddress } = req.body;
    const cartResult = await query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (!cartResult.rows.length) {
      return res.status(400).json({ message: 'Cart is empty' });
    }
    const cartId = cartResult.rows[0].id;
    const orderResult = await query(
      'INSERT INTO orders (user_id, shipping_address, status) VALUES ($1, $2, $3) RETURNING id, created_at',
      [userId, shippingAddress, 'pending']
    );
    const orderId = orderResult.rows[0].id;
    const items = await query('SELECT product_id, quantity FROM cart_items WHERE cart_id = $1', [cartId]);

    await Promise.all(
      items.rows.map((item) =>
        query('INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)', [orderId, item.product_id, item.quantity])
      )
    );

    await query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    res.status(201).json({ orderId, createdAt: orderResult.rows[0].created_at });
  } catch (err) {
    next(err);
  }
});

router.get('/history', authenticate, async (req, res, next) => {
  try {
    const userId = req.auth.sub;
    const result = await query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, authorizeRole('admin'), async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
