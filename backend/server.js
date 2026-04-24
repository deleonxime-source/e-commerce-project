import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DataTypes, Sequelize } from 'sequelize';
import { pathToFileURL } from 'url';
import * as jose from 'jose';
import { HARDCODED_ADMIN_EMAIL, HARDCODED_ADMIN_SUB } from '../shared/hardcodedAdmin.js';

dotenv.config();

// Asgardeo JWKS for JWT verification (org must match frontend baseUrl, e.g. .../t/<ASGARDEO_ORG>)
const ASGARDEO_ORG = process.env.ASGARDEO_ORG || 'lukasximenaecommerce2';
const JWKS_URI = process.env.ASGARDEO_JWKS_URI || `https://api.asgardeo.io/t/${ASGARDEO_ORG}/oauth2/jwks`;
const ASGARDEO_ISSUER = (process.env.ASGARDEO_ISSUER || `https://api.asgardeo.io/t/${ASGARDEO_ORG}`).replace(
  /\/$/,
  ''
);
/** Comma- or semicolon-separated list of valid OAuth client IDs (and optional extra aud strings if your IdP uses them) */
const ASGARDEO_AUDIENCE = process.env.ASGARDEO_AUDIENCE || '51glAcKfG8PE6NsP8sJ9zr_UAEIa';

const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URI));

function acceptedIssuers() {
  const base = String(ASGARDEO_ISSUER || '').replace(/\/$/, '');
  const values = [
    base,
    `${base}/`,
    `${base}/oauth2/token`,
    `${base}/oauth2/token/`,
  ].filter(Boolean);
  return [...new Set(values)];
}

function listFromAudienceEnv() {
  return String(ASGARDEO_AUDIENCE)
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * WSO2 / Asgardeo may put `aud` on the access token as a string, an array, or a different resource id.
 * jose is strict; we verify signature + issuer, then require `aud` to overlap with ASGARDEO_AUDIENCE.
 */
function isAcceptedAudClaim(aud) {
  const allowed = listFromAudienceEnv();
  if (!allowed.length) return true;
  if (aud == null) return false;
  const auds = Array.isArray(aud) ? aud : [aud];
  return auds.some((a) => allowed.includes(String(a)));
}

async function verifyAsgardeoAccessToken(token) {
  const { payload } = await jose.jwtVerify(token, JWKS, {
    issuer: acceptedIssuers(),
    clockTolerance: 60,
  });
  if (!isAcceptedAudClaim(payload.aud)) {
    const e = new Error(
      `JWT aud not accepted. Got ${JSON.stringify(payload.aud)}; expected one of: ${listFromAudienceEnv().join(', ')}`
    );
    e.code = 'ERR_AUDIENCE';
    throw e;
  }
  return payload;
}

function isHardcodedAdminPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const sub = String(payload.sub || payload.id || '').trim();
  if (sub && (sub === HARDCODED_ADMIN_SUB || sub.includes(HARDCODED_ADMIN_SUB))) {
    return true;
  }
  const want = HARDCODED_ADMIN_EMAIL.toLowerCase();
  const email = String(
    payload.email
    || payload.preferred_username
    || payload['http://wso2.org/claims/username']
    || payload['http://wso2.org/claims/emailaddress']
    || ''
  )
    .toLowerCase()
    .trim();
  if (email === want) return true;
  return false;
}

// Required JWT auth: verify Bearer with Asgardeo JWKS, set req.userId from payload.sub (and req.auth = payload)
async function authMiddleware(req, res, next) {
  const authHeader = (req.headers.authorization || '').trim();

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing auth',
      detail: 'Send Authorization: Bearer <access_token>',
    });
  }

  const token = authHeader.slice(7).trim();
  const looksLikeJwt = token && token.split('.').length === 3;

  if (!looksLikeJwt) {
    return res.status(401).json({
      error: 'Access token is not a JWT. In Asgardeo, set your app to use JWT access tokens (Protocol tab).',
    });
  }

  try {
    const payload = await verifyAsgardeoAccessToken(token);
    req.userId = payload.sub;
    req.auth = payload;
    return next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({
      error: 'Invalid or expired token',
      detail: err.message,
    });
  }
}

// Optional: same verification when a Bearer token is present; invalid/expired tokens are ignored (public catalog)
async function optionalAuthMiddleware(req, res, next) {
  req.userId = undefined;
  req.auth = undefined;
  const authHeader = (req.headers.authorization || '').trim();
  if (!authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.slice(7).trim();
  if (!token || token.split('.').length !== 3) {
    return next();
  }
  try {
    const payload = await verifyAsgardeoAccessToken(token);
    req.userId = payload.sub;
    req.auth = payload;
  } catch {
    // treat as unauthenticated
  }
  next();
}

function requireAdminRole(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({
      error: 'Missing auth',
      detail: 'Send Authorization: Bearer <access_token>',
    });
  }
  if (!isHardcodedAdminPayload(req.auth)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}

function getUserId(req) {
  if (!req.userId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  return String(req.userId);
}

const DB_SCHEMA = process.env.DB_SCHEMA || 'public';

const pgSsl = {
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const databaseUrl = (process.env.DATABASE_URL || '').trim();
const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      dialectOptions: pgSsl,
      define: { schema: DB_SCHEMA },
    })
  : new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      dialect: 'postgres',
      dialectOptions: pgSsl,
      define: { schema: DB_SCHEMA },
    });

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
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'categories', key: 'id' },
    },
    is_active: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
  },
  { tableName: 'products', timestamps: false }
);

const Category = sequelize.define(
  'Category',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.TEXT, allowNull: false, unique: true },
  },
  { tableName: 'categories', timestamps: false }
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
    size: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'M' },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  },
  {
    tableName: 'cart_items',
    timestamps: false,
    indexes: [{ unique: true, fields: ['cart_id', 'product_id', 'size'] }],
  }
);

const Order = sequelize.define(
  'Order',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.TEXT, allowNull: false },
    shipping_address: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'placed' },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
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
    size: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'M' },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  },
  { tableName: 'order_items', timestamps: false }
);

export async function initDatabase() {
  await sequelize.authenticate();
  await sequelize.sync();

  await Category.bulkCreate(
    [{ name: 'shirt' }, { name: 'pants' }, { name: 'outerwear' }],
    { ignoreDuplicates: true }
  );

  const categoryRows = await Category.findAll({ attributes: ['id', 'name'] });
  const categoryIdByName = categoryRows.reduce((acc, row) => {
    acc[String(row.name).toLowerCase()] = Number(row.id);
    return acc;
  }, {});

  const fallbackCategoryId = categoryIdByName.shirt || categoryRows[0]?.id || null;

  const starterProducts = [
    {
      id: 1,
      name: 'Classic White Tee',
      category_name: 'shirt',
      description: 'Soft cotton T-shirt with a clean crewneck.',
      price: 24.99,
      image_url: '/images/products/product-1.jpg',
      image_urls: ['/images/products/product-1.jpg'],
      size_quantities: { XS: 4, S: 8, M: 12, L: 10, XL: 6 },
    },
    {
      id: 2,
      name: 'Blue Denim Jacket',
      category_name: 'outerwear',
      description: 'Structured denim jacket for everyday wear.',
      price: 79.99,
      image_url: '/images/products/product-2.jpg',
      image_urls: ['/images/products/product-2.jpg'],
      size_quantities: { XS: 3, S: 6, M: 8, L: 8, XL: 5 },
    },
    {
      id: 3,
      name: 'Black Skinny Jeans',
      category_name: 'pants',
      description: 'Stretch denim with a slim fit.',
      price: 59.99,
      image_url: '/images/products/product-3.jpg',
      image_urls: ['/images/products/product-3.jpg'],
      size_quantities: { XS: 5, S: 9, M: 12, L: 9, XL: 5 },
    },
    {
      id: 4,
      name: 'Long Sleeve Sweater',
      category_name: 'shirt',
      description: 'Cozy sweater with a relaxed fit.',
      price: 79.99,
      image_url: '/images/products/product-4.jpg',
      image_urls: ['/images/products/product-4.jpg'],
      size_quantities: { XS: 5, S: 9, M: 12, L: 9, XL: 5 },
    },
  ];

  for (const starterProduct of starterProducts) {
    const stock = Object.values(starterProduct.size_quantities).reduce((sum, quantity) => sum + quantity, 0);
    const productData = {
      name: starterProduct.name,
      description: starterProduct.description,
      price: starterProduct.price,
      image_url: starterProduct.image_url,
      image_urls: starterProduct.image_urls,
      size_quantities: starterProduct.size_quantities,
      category_id: categoryIdByName[starterProduct.category_name] || fallbackCategoryId,
      is_active: true,
      stock,
    };

    const existingById = await Product.findByPk(starterProduct.id);
    if (existingById) {
      await existingById.update(productData);
      continue;
    }

    await Product.create({ id: starterProduct.id, ...productData });
  }

  await query(
    `SELECT setval(
      pg_get_serial_sequence('"${DB_SCHEMA}".products', 'id'),
      COALESCE((SELECT MAX(id) FROM "${DB_SCHEMA}".products), 1),
      true
    )`,
    []
  );
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
  const category_id = Number(body.category_id ?? body.categoryId);

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

  if (!Number.isInteger(category_id) || category_id < 1) {
    const err = new Error('A valid category is required');
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
    category_id,
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

function normalizeSize(value) {
  const size = String(value || '').trim().toUpperCase();
  const allowedSizes = new Set(['XS', 'S', 'M', 'L', 'XL']);

  if (!allowedSizes.has(size)) {
    return null;
  }

  return size;
}

const ORDER_STATUS_VALUES = new Set(['placed', 'shipping', 'delivered', 'returned']);

function normalizeOrderStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return ORDER_STATUS_VALUES.has(status) ? status : null;
}

function getOrderStatusLabel(status) {
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

app.get('/api/auth/profile', authMiddleware, (req, res) => {
  res.json({ user: { sub: req.userId, isAdmin: isHardcodedAdminPayload(req.auth) } });
});

async function listProducts(req, res, next) {
  try {
    const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
    if (includeInactive) {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      if (!isHardcodedAdminPayload(req.auth)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    const result = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ($1::boolean OR p.is_active = TRUE)
       ORDER BY p.id`,
      [includeInactive]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
    if (includeInactive) {
      if (!req.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      if (!isHardcodedAdminPayload(req.auth)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    const result = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1 AND ($2::boolean OR p.is_active = TRUE)`,
      [id, includeInactive]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// Product routes: public for active catalog; includeInactive= requires admin.
app.get('/api/products', optionalAuthMiddleware, listProducts);
app.get('/api/products/:id', optionalAuthMiddleware, getProductById);

app.post('/api/products', authMiddleware, requireAdminRole, async (req, res, next) => {
  try {
    const product = normalizeProductPayload(req.body);

    const category = await query('SELECT id FROM categories WHERE id = $1', [product.category_id]);
    if (!category.rows.length) {
      return res.status(400).json({ message: 'Category does not exist' });
    }

    const result = await query(
      `INSERT INTO products
       (name, description, price, category_id, image_url, image_urls, size_quantities, stock, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING *`,
      [
        product.name,
        product.description,
        product.price,
        product.category_id,
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

app.put('/api/products/:id', authMiddleware, requireAdminRole, async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = normalizeProductPayload(req.body);

    const category = await query('SELECT id FROM categories WHERE id = $1', [product.category_id]);
    if (!category.rows.length) {
      return res.status(400).json({ message: 'Category does not exist' });
    }

    const result = await query(
      `UPDATE products
       SET name = $1,
           description = $2,
           price = $3,
           category_id = $4,
           image_url = $5,
           image_urls = $6,
           size_quantities = $7,
           stock = $8
       WHERE id = $9
       RETURNING *`,
      [
        product.name,
        product.description,
        product.price,
        product.category_id,
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

app.delete('/api/products/:id', authMiddleware, requireAdminRole, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING id, is_active',
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deactivated', id: Number(id), is_active: false });
  } catch (err) {
    next(err);
  }
});

app.get('/api/cart', authMiddleware, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const result = await query(
      `SELECT c.id AS cart_id,
              p.id AS product_id,
              p.*,
              cat.name AS category_name,
              ci.size,
              ci.quantity,
              (ci.quantity * p.price::numeric) AS line_total
       FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN categories cat ON cat.id = p.category_id
       WHERE c.user_id = $1`,
      [userId]
    );

    const total = result.rows.reduce(
      (sum, row) => sum + Number(row.line_total || Number(row.quantity) * Number(row.price || 0)),
      0
    );

    res.json({
      items: result.rows,
      total: Number(total.toFixed(2)),
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/cart', authMiddleware, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { productId, quantity } = req.body;
    const size = normalizeSize(req.body?.size);

    if (!productId || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || !size) {
      return res.status(400).json({ message: 'Valid productId, size, and quantity are required' });
    }

    const productCheck = await query('SELECT id, is_active, size_quantities FROM products WHERE id = $1', [productId]);
    if (!productCheck.rows.length) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!productCheck.rows[0].is_active) {
      return res.status(400).json({ message: 'Product is inactive and cannot be added to cart' });
    }

    const product = productCheck.rows[0];
    const sizeQuantities = product.size_quantities && typeof product.size_quantities === 'object'
      ? product.size_quantities
      : {};
    const availableForSize = Number(sizeQuantities[size] || 0);

    if (availableForSize < 1) {
      return res.status(400).json({ message: `Size ${size} is out of stock` });
    }

    const cartResult = await query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    let cartId;

    if (cartResult.rows.length) {
      cartId = cartResult.rows[0].id;
    } else {
      const newCart = await query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
      cartId = newCart.rows[0].id;
    }

    const existingLine = await query(
      'SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND size = $3',
      [cartId, productId, size]
    );

    const existingQty = existingLine.rows.length ? Number(existingLine.rows[0].quantity || 0) : 0;
    const nextQty = existingQty + Number(quantity);

    if (nextQty > availableForSize) {
      return res.status(400).json({
        message: `Only ${availableForSize} item(s) available for size ${size}`,
      });
    }

    await query(
      `INSERT INTO cart_items (cart_id, product_id, size, quantity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cart_id, product_id, size)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [cartId, productId, size, quantity]
    );

    res.status(201).json({ cartId, productId, size, quantity });
  } catch (err) {
    next(err);
  }
});

async function getOrderById(orderId) {
  const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (!orderResult.rows.length) return null;

  const itemsResult = await query(
    `SELECT oi.id,
            oi.order_id,
            oi.product_id,
            oi.size,
            oi.quantity,
            oi.unit_price,
            p.name AS product_name,
            p.category_id,
            c.name AS category_name,
            (oi.quantity * oi.unit_price::numeric) AS line_total
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE oi.order_id = $1
     ORDER BY oi.id`,
    [orderId]
  );

  return {
    ...orderResult.rows[0],
    status_label: getOrderStatusLabel(orderResult.rows[0].status),
    items: itemsResult.rows,
  };
}

async function restockOrderItems(orderId) {
  const orderItems = await query(
    `SELECT oi.product_id,
            oi.size,
            oi.quantity,
            p.size_quantities,
            p.stock
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );

  for (const item of orderItems.rows) {
    const sizeQuantities = item.size_quantities && typeof item.size_quantities === 'object'
      ? { ...item.size_quantities }
      : {};
    const normalizedSize = String(item.size || '').toUpperCase();
    const currentSizeQty = Number(sizeQuantities[normalizedSize] || 0);
    sizeQuantities[normalizedSize] = currentSizeQty + Number(item.quantity || 0);

    const updatedStock = Number(item.stock || 0) + Number(item.quantity || 0);

    await query(
      `UPDATE products
       SET size_quantities = $1,
           stock = $2
       WHERE id = $3`,
      [JSON.stringify(sizeQuantities), updatedStock, item.product_id]
    );
  }
}

async function updateOrderStatus(orderId, nextStatus) {
  const normalizedStatus = normalizeOrderStatus(nextStatus);
  if (!normalizedStatus) {
    const err = new Error('Invalid order status');
    err.status = 400;
    throw err;
  }

  const orderResult = await query('SELECT id, status FROM orders WHERE id = $1', [orderId]);
  if (!orderResult.rows.length) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  const currentStatus = String(orderResult.rows[0].status || '').toLowerCase();
  if (currentStatus === 'returned' && normalizedStatus !== 'returned') {
    const err = new Error('Returned orders cannot be moved to another status');
    err.status = 400;
    throw err;
  }

  await query('BEGIN', []);

  try {
    if (normalizedStatus === 'returned' && currentStatus !== 'returned') {
      await restockOrderItems(orderId);
    }

    await query('UPDATE orders SET status = $1 WHERE id = $2', [normalizedStatus, orderId]);
    await query('COMMIT', []);

    return await getOrderById(orderId);
  } catch (err) {
    try {
      await query('ROLLBACK', []);
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    throw err;
  }
}

app.post('/api/orders', authMiddleware, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const shippingAddress = String(req.body?.shippingAddress || 'Not provided').trim() || 'Not provided';

    const cartResult = await query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (!cartResult.rows.length) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const cartId = cartResult.rows[0].id;
    const cartItems = await query(
      `SELECT ci.product_id, ci.quantity, ci.size, p.name, p.price, p.is_active, p.size_quantities, p.stock
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1`,
      [cartId]
    );

    if (!cartItems.rows.length) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const inactiveProducts = cartItems.rows.filter((item) => !item.is_active);
    if (inactiveProducts.length) {
      return res.status(400).json({
        message: 'Cart contains inactive products. Remove them before ordering.',
      });
    }

    const unavailableSizes = cartItems.rows.filter((item) => {
      const sizeQuantities = item.size_quantities && typeof item.size_quantities === 'object'
        ? item.size_quantities
        : {};
      const availableForSize = Number(sizeQuantities[String(item.size || '').toUpperCase()] || 0);
      return availableForSize < Number(item.quantity || 0);
    });

    if (unavailableSizes.length) {
      return res.status(400).json({
        message: 'One or more size selections in cart are no longer available in requested quantity.',
      });
    }

    const totalAmount = cartItems.rows.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.price || 0),
      0
    );

    await query('BEGIN', []);

    const orderInsert = await query(
      `INSERT INTO orders (user_id, shipping_address, status, total_amount)
       VALUES ($1, $2, 'placed', $3)
       RETURNING id`,
      [userId, shippingAddress, Number(totalAmount.toFixed(2))]
    );

    const orderId = orderInsert.rows[0].id;

    for (const item of cartItems.rows) {
      await query(
        `INSERT INTO order_items (order_id, product_id, size, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.size, item.quantity, item.price]
      );

      const sizeQuantities = item.size_quantities && typeof item.size_quantities === 'object'
        ? { ...item.size_quantities }
        : {};

      const normalizedSize = String(item.size || '').toUpperCase();
      const currentSizeQty = Number(sizeQuantities[normalizedSize] || 0);
      const updatedSizeQty = Math.max(0, currentSizeQty - Number(item.quantity || 0));
      sizeQuantities[normalizedSize] = updatedSizeQty;

      const updatedStock = Math.max(0, Number(item.stock || 0) - Number(item.quantity || 0));

      await query(
        `UPDATE products
         SET size_quantities = $1,
             stock = $2
         WHERE id = $3`,
        [JSON.stringify(sizeQuantities), updatedStock, item.product_id]
      );
    }

    await query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    await query('COMMIT', []);

    const createdOrder = await getOrderById(orderId);
    res.status(201).json(createdOrder);
  } catch (err) {
    try {
      await query('ROLLBACK', []);
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    next(err);
  }
});

app.get('/api/orders', authMiddleware, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const ordersResult = await query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
      [userId]
    );

    const orders = [];
    for (const order of ordersResult.rows) {
      const detailedOrder = await getOrderById(order.id);
      if (detailedOrder) {
        orders.push(detailedOrder);
      }
    }

    res.json(orders);
  } catch (err) {
    next(err);
  }
});

app.post('/api/orders/:id/return', authMiddleware, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const orderResult = await query('SELECT id, user_id FROM orders WHERE id = $1', [id]);
    if (!orderResult.rows.length) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (String(orderResult.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({ message: 'You can only return your own orders' });
    }

    const updatedOrder = await updateOrderStatus(id, 'returned');
    res.json(updatedOrder);
  } catch (err) {
    next(err);
  }
});

app.get('/api/admin/orders', authMiddleware, requireAdminRole, async (req, res, next) => {
  try {
    const ordersResult = await query('SELECT * FROM orders ORDER BY created_at DESC, id DESC', []);
    const orders = [];

    for (const order of ordersResult.rows) {
      const detailedOrder = await getOrderById(order.id);
      if (detailedOrder) {
        orders.push(detailedOrder);
      }
    }

    res.json(orders);
  } catch (err) {
    next(err);
  }
});

app.put('/api/admin/orders/:id/status', authMiddleware, requireAdminRole, async (req, res, next) => {
  try {
    const { id } = req.params;
    const nextStatus = normalizeOrderStatus(req.body?.status);

    if (!nextStatus) {
      return res.status(400).json({ message: 'Valid order status is required' });
    }

    const updatedOrder = await updateOrderStatus(id, nextStatus);
    res.json(updatedOrder);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/cart/:productId', authMiddleware, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { productId } = req.params;
    const size = normalizeSize(req.query?.size);

    if (!size) {
      return res.status(400).json({ message: 'A valid size query parameter is required' });
    }

    const cartResult = await query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (!cartResult.rows.length) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const result = await query(
      'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND size = $3 RETURNING id',
      [cartResult.rows[0].id, productId, size]
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
  const port = Number(process.env.PORT) || 4001;
  await initDatabase();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Backend server listening on http://localhost:${port}`);
      resolve(server);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `Port ${port} is already in use. Stop the other process (e.g. another terminal running node server.js) or set PORT in .env to a free port.`
        );
      }
      reject(err);
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await startServer();
  } catch (err) {
    console.error(err.code === 'EADDRINUSE' ? 'Failed to bind port:' : 'Failed to initialize database:', err.message);
    process.exit(1);
  }
}

export default app;
