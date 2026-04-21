import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DataTypes, Sequelize } from 'sequelize';
import { pathToFileURL } from 'url';

dotenv.config();

const DB_SCHEMA = process.env.DB_SCHEMA || 'public';
const useSsl = process.env.PGSSLMODE === "require";
const databaseUrl = (process.env.DATABASE_URL || '').trim();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      define: {
        schema: DB_SCHEMA,
      },
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        dialectOptions: useSsl
          ? {
              ssl: {
                require: true,
                rejectUnauthorized: false,
              },
            }
          : undefined,
        define: {
          schema: DB_SCHEMA,
        },
      }
    );

// Sequelize table definitions.
const Product = sequelize.define(
  'Product',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.TEXT, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    image_url: { type: DataTypes.TEXT, allowNull: true },
    image_urls: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    size_quantities: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
  },
  { tableName: 'products', timestamps: false }
);

const Cart = sequelize.define(
  'Cart',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.TEXT, allowNull: false, unique: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
  },
  { tableName: 'carts', timestamps: false }
);

const CartItem = sequelize.define(
  'CartItem',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cart_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'carts', key: 'id' },
      onDelete: 'CASCADE',
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'products', key: 'id' },
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  },
  {
    tableName: 'cart_items',
    timestamps: false,
    indexes: [{ unique: true, fields: ['cart_id', 'product_id'] }],
  }
);

const Order = sequelize.define(
  'Order',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.TEXT, allowNull: false },
    shipping_address: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'pending' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
  },
  { tableName: 'orders', timestamps: false }
);

const OrderItem = sequelize.define(
  'OrderItem',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE',
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'products', key: 'id' },
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  },
  { tableName: 'order_items', timestamps: false }
);

export async function initDatabase() {
  await sequelize.authenticate();
  await sequelize.sync();

  // Keep legacy databases compatible by adding newer product columns when missing.
  await query(`ALTER TABLE "${DB_SCHEMA}".products ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb`, []);
  await query(`ALTER TABLE "${DB_SCHEMA}".products ADD COLUMN IF NOT EXISTS size_quantities JSONB DEFAULT '{}'::jsonb`, []);

  const starterProducts = [
    {
      name: 'Classic White Tee',
      description: 'Soft cotton T-shirt with a clean crewneck.',
      price: 24.99,
      image_url: 'https://via.placeholder.com/400x400?text=White+Tee',
      image_urls: ['https://via.placeholder.com/400x400?text=White+Tee'],
      size_quantities: { XS: 4, S: 8, M: 12, L: 10, XL: 6 },
    },
    {
      name: 'Blue Denim Jacket',
      description: 'Structured denim jacket for everyday wear.',
      price: 79.99,
      image_url: 'https://via.placeholder.com/400x400?text=Denim+Jacket',
      image_urls: ['https://via.placeholder.com/400x400?text=Denim+Jacket'],
      size_quantities: { XS: 3, S: 6, M: 8, L: 8, XL: 5 },
    },
    {
      name: 'Black Skinny Jeans',
      description: 'Stretch denim with a slim fit.',
      price: 59.99,
      image_url: 'https://via.placeholder.com/400x400?text=Skinny+Jeans',
      image_urls: ['https://via.placeholder.com/400x400?text=Skinny+Jeans'],
      size_quantities: { XS: 5, S: 9, M: 12, L: 9, XL: 5 },
    },
  ];

  for (const starterProduct of starterProducts) {
    const stock = Object.values(starterProduct.size_quantities).reduce((sum, quantity) => sum + quantity, 0);
    const existingProduct = await Product.findOne({ where: { name: starterProduct.name } });

    const productData = {
      ...starterProduct,
      stock,
    };

    if (existingProduct) {
      await existingProduct.update(productData);
      continue;
    }

    await Product.create(productData);
  }
}

function normalizeProductPayload(body) {
  const allowedSizes = new Set(['XS', 'S', 'M', 'L', 'XL']);
  const maxNameLength = 120;
  const maxDescriptionLength = 2000;
  const maxImageCount = 10;
  const maxImageRefLength = 2000000;
  const maxPrice = 100000;
  const maxPerSizeQuantity = 9999;
  const maxTotalStock = 50000;
  const imagePattern = /^(https?:\/\/|data:image\/)/i;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const err = new Error('Request body must be a valid product object');
    err.status = 400;
    throw err;
  }

  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const price = Number(body.price);

  if (!name) {
    const err = new Error('Name is required');
    err.status = 400;
    throw err;
  }

  if (name.length < 3 || name.length > maxNameLength) {
    const err = new Error(`Name must be between 3 and ${maxNameLength} characters`);
    err.status = 400;
    throw err;
  }

  if (description.length > maxDescriptionLength) {
    const err = new Error(`Description must be ${maxDescriptionLength} characters or fewer`);
    err.status = 400;
    throw err;
  }

  if (!Number.isFinite(price) || price < 0 || price > maxPrice) {
    const err = new Error(`Price must be between 0 and ${maxPrice}`);
    err.status = 400;
    throw err;
  }

  let image_url = body.image_url ? String(body.image_url).trim() : '';
  if (image_url) {
    if (!imagePattern.test(image_url)) {
      const err = new Error('Primary image must be an http(s) URL or data:image reference');
      err.status = 400;
      throw err;
    }

    if (image_url.length > maxImageRefLength) {
      const err = new Error('Primary image reference is too large');
      err.status = 400;
      throw err;
    }
  }

  const image_urls = Array.isArray(body.image_urls)
    ? body.image_urls.map((url) => String(url).trim()).filter(Boolean)
    : [];

  if (image_urls.length > maxImageCount) {
    const err = new Error(`Only ${maxImageCount} gallery images are allowed`);
    err.status = 400;
    throw err;
  }

  image_urls.forEach((imageRef, index) => {
    if (!imagePattern.test(imageRef)) {
      const err = new Error(`Gallery image at index ${index} must be an http(s) URL or data:image reference`);
      err.status = 400;
      throw err;
    }

    if (imageRef.length > maxImageRefLength) {
      const err = new Error(`Gallery image at index ${index} is too large`);
      err.status = 400;
      throw err;
    }
  });

  if (!image_url && image_urls.length) {
    image_url = image_urls[0];
  }

  if (image_url && !image_urls.includes(image_url)) {
    image_urls.unshift(image_url);
  }

  const rawSizeQuantities = body.size_quantities && typeof body.size_quantities === 'object'
    ? body.size_quantities
    : {};

  const size_quantities = Object.entries(rawSizeQuantities).reduce((acc, [size, qty]) => {
    const normalizedSize = String(size).trim().toUpperCase();
    if (!normalizedSize) return acc;

    if (!allowedSizes.has(normalizedSize)) {
      const err = new Error(`Unsupported size key: ${normalizedSize}`);
      err.status = 400;
      throw err;
    }

    const normalizedQty = Number(qty);

    if (!Number.isFinite(normalizedQty) || normalizedQty < 0 || !Number.isInteger(normalizedQty)) {
      const err = new Error(`Size quantity for ${normalizedSize} must be a non-negative whole number`);
      err.status = 400;
      throw err;
    }

    if (normalizedQty > maxPerSizeQuantity) {
      const err = new Error(`Size quantity for ${normalizedSize} cannot exceed ${maxPerSizeQuantity}`);
      err.status = 400;
      throw err;
    }

    acc[normalizedSize] = Math.floor(normalizedQty);
    return acc;
  }, {});

  const stockFromSizes = Object.values(size_quantities).reduce((sum, qty) => sum + Number(qty || 0), 0);
  const explicitStock = Number(body.stock);
  const stock = Number.isFinite(explicitStock) ? Math.max(0, Math.floor(explicitStock)) : stockFromSizes;

  if (stock > maxTotalStock) {
    const err = new Error(`Stock cannot exceed ${maxTotalStock}`);
    err.status = 400;
    throw err;
  }

  return {
    name,
    description,
    price,
    image_url: image_url || null,
    image_urls,
    size_quantities,
    stock,
  };
}

export { normalizeProductPayload };

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

async function listProducts(req, res, next) {
  try {
    const result = await query('SELECT * FROM products ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function getProductById(req, res, next) {
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
}

// Product routes.
app.get('/api/products', listProducts);
app.get('/api/products/:id', getProductById);

// Auth/admin guard disabled for MVP; restore middleware arguments later.
app.post('/api/products', async (req, res, next) => {
  try {
    const product = normalizeProductPayload(req.body);
    const result = await query(
      'INSERT INTO products (name, description, price, image_url, image_urls, size_quantities, stock) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        product.name,
        product.description,
        product.price,
        product.image_url,
        JSON.stringify(product.image_urls),
        JSON.stringify(product.size_quantities),
        product.stock,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Auth/admin guard disabled for MVP; restore middleware arguments later.
app.put('/api/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = normalizeProductPayload(req.body);

    const result = await query(
      'UPDATE products SET name = $1, description = $2, price = $3, image_url = $4, image_urls = $5, size_quantities = $6, stock = $7 WHERE id = $8 RETURNING *',
      [
        product.name,
        product.description,
        product.price,
        product.image_url,
        JSON.stringify(product.image_urls),
        JSON.stringify(product.size_quantities),
        product.stock,
        id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Auth/admin guard disabled for MVP; restore middleware arguments later.
app.delete('/api/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await query('BEGIN', []);
    await query('DELETE FROM cart_items WHERE product_id = $1', [id]);
    await query('DELETE FROM order_items WHERE product_id = $1', [id]);
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);

    if (!result.rows.length) {
      await query('ROLLBACK', []);
      return res.status(404).json({ message: 'Product not found' });
    }

    await query('COMMIT', []);

    res.json({ message: 'Product deleted', id: Number(id) });
  } catch (err) {
    try {
      await query('ROLLBACK', []);
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    next(err);
  }
});

// Cart routes (auth disabled for MVP).
app.get('/api/cart', async (req, res, next) => {
  try {
    const userId = getMvpUserId(req);
    const result = await query(
      `SELECT c.id AS cart_id, p.id AS product_id, p.*, ci.quantity
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

    if (!productId || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      return res.status(400).json({ message: 'Valid productId and quantity are required' });
    }

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

    const cartResult = await query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (!cartResult.rows.length) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const result = await query(
      'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 RETURNING id',
      [cartResult.rows[0].id, productId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    next(err);
  }
});


app.get('/api/categories', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    if (err?.original?.code === '42P01') {
      return res.json([]);
    }
    next(err);
  }
});

app.use(errorHandler);

export async function startServer() {
  const port = process.env.PORT || 4001;
  await initDatabase();

  return app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await startServer();
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

export default app;
