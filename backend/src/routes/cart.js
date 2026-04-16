import express from 'express';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const userId = req.auth.sub;
    const result = await query(
      `SELECT c.id AS cart_id, p.*, ci.quantity
       FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       JOIN products p ON ci.product_id = p.id
       WHERE c.user_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const userId = req.auth.sub;
    const { productId, quantity } = req.body;
    const cartResult = await query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    let cartId;

    if (cartResult.rows.length) {
      cartId = cartResult.rows[0].id;
    } else {
      const newCart = await query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
      cartId = newCart.rows[0].id;
    }

    await query(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [cartId, productId, quantity]
    );

    res.status(201).json({ cartId, productId, quantity });
  } catch (err) {
    next(err);
  }
});

router.delete('/:productId', async (req, res, next) => {
  try {
    const userId = req.auth.sub;
    const { productId } = req.params;
    const cart = await query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (!cart.rows.length) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    await query('DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2', [cart.rows[0].id, productId]);
    res.json({ message: 'Item removed' });
  } catch (err) {
    next(err);
  }
});

export default router;
