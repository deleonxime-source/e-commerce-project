import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

const DB_SCHEMA = process.env.DB_SCHEMA || "app";
const useSsl = process.env.PGSSLMODE === "require";

const app = express();
app.use(cors());
app.use(express.json());

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: "postgres",
    dialectOptions: useSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : undefined,
  }
);

// Helper for running SQL queries with a return shape similar to pg.
async function query(text, params) {
  const [rows] = await sequelize.query(text, { bind: params });
  return { rows: Array.isArray(rows) ? rows : [] };
}

// AUTH TEMPORARILY DISABLED FOR MVP.
// Re-enable later by restoring express-jwt/jwks-rsa imports and these middleware functions.
/*
import expressJwt from 'express-jwt';
import jwksRsa from 'jwks-rsa';

const getJwtMiddleware = expressJwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    jwksUri: `${process.env.ASGARDEO_ISSUER.replace(/\/oauth2\/token$/, '')}/.well-known/jwks.json`,
  }),
  audience: process.env.ASGARDEO_AUDIENCE,
  issuer: process.env.ASGARDEO_ISSUER,
  algorithms: ['RS256'],
});

function authenticate(req, res, next) {
  getJwtMiddleware(req, res, (err) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized', details: err.message });
    }
    next();
  });
}

function authorizeRole(requiredRole) {
  return (req, res, next) => {
    const roles = (req.auth && req.auth.roles) || [];
    if (!roles.includes(requiredRole)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
*/

// MVP user identification helper while auth is disabled.
function getMvpUserId(req) {
  return req.headers['x-user-id'] || req.body.userId || req.query.userId || 'demo-user';
}

// Centralized API error handler used by all routes.
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}



app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Ecommerce backend is running' });
});

// AUTH TEMPORARILY DISABLED FOR MVP.
// app.get('/api/auth/profile', authenticate, (req, res) => {
//   res.json({ user: req.auth });
// });

// Product routes.
app.get('/api/products', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM products ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.get('/api/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Auth/admin guard disabled for MVP; restore middleware arguments later.
app.post('/api/products', async (req, res, next) => {
  try {
    const { name, description, price, image_url, stock } = req.body;
    const result = await query(
      'INSERT INTO products (name, description, price, image_url, stock) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, price, image_url, stock]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Cart routes (auth disabled for MVP).
app.get('/api/cart', async (req, res, next) => {
  try {
    const userId = getMvpUserId(req);
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

app.post('/api/cart', async (req, res, next) => {
  try {
    const userId = getMvpUserId(req);
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

app.delete('/api/cart/:productId', async (req, res, next) => {
  try {
    const userId = getMvpUserId(req);
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

// Order routes.
app.post('/api/orders/checkout', async (req, res, next) => {
  try {
    const userId = getMvpUserId(req);
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

app.get('/api/orders/history', async (req, res, next) => {
  try {
    const userId = getMvpUserId(req);
    const result = await query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Auth/admin guard disabled for MVP; restore middleware arguments later.
app.get('/api/orders', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});


app.get('/api/categories', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});


app.use(errorHandler);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
