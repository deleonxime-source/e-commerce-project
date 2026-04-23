import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api.js';
import AdminImageInputRow from '../components/admin/AdminImageInputRow.jsx';
import AdminSizeQuantities from '../components/admin/AdminSizeQuantities.jsx';
import AdminProductListItem from '../components/admin/AdminProductListItem.jsx';

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL'];
const ORDER_STATUS_OPTIONS = [
  { value: 'placed', label: 'Order Placed' },
  { value: 'shipping', label: 'Shipping In Progress' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'returned', label: 'Returned' },
];
const MAX_IMAGES = 10;
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_VALUE_LENGTH = 2000000;

const createEmptyForm = () => ({
  id: null,
  name: '',
  description: '',
  price: '',
  category_id: '',
  image_url: '',
  image_urls: [],
  size_quantities: {
    XS: 0,
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
  },
});

function toNumeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createEmptyFieldErrors() {
  return {
    name: '',
    price: '',
    category_id: '',
    description: '',
    image_url: '',
    image_urls: {},
    size_quantities: {},
  };
}

function getTotalStock(sizeQuantities) {
  return Object.values(sizeQuantities).reduce((sum, qty) => sum + toNumeric(qty), 0);
}

function isValidImageReference(value) {
  if (!value) return true;
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image/');
}

function validateForm(form) {
  const fieldErrors = createEmptyFieldErrors();

  const normalizedName = form.name.trim();
  if (!normalizedName) {
    fieldErrors.name = 'Product name is required.';
  }

  const price = Number(form.price);
  if (!Number.isFinite(price)) {
    fieldErrors.price = 'Price must be a valid number.';
  } else if (price < 0) {
    fieldErrors.price = 'Price cannot be negative.';
  }

  const categoryId = Number(form.category_id);
  if (!Number.isInteger(categoryId) || categoryId < 1) {
    fieldErrors.category_id = 'Category is required.';
  }

  const normalizedImages = form.image_urls.map((url) => url.trim()).filter(Boolean);
  if (normalizedImages.length > MAX_IMAGES) {
    fieldErrors.image_url = `You can add up to ${MAX_IMAGES} gallery images.`;
  }

  normalizedImages.forEach((imageRef, index) => {
    if (!isValidImageReference(imageRef)) {
      fieldErrors.image_urls[index] = 'Use an http(s) URL or a data:image upload.';
      return;
    }

    if (imageRef.length > MAX_IMAGE_VALUE_LENGTH) {
      fieldErrors.image_urls[index] = 'Image reference is too large.';
    }
  });

  const normalizedPrimaryImage = form.image_url.trim();
  if (!isValidImageReference(normalizedPrimaryImage)) {
    fieldErrors.image_url = 'Primary image must be an http(s) URL or data:image upload.';
  }

  SIZE_OPTIONS.forEach((size) => {
    const quantity = toNumeric(form.size_quantities[size]);
    if (!Number.isInteger(quantity) || quantity < 0) {
      fieldErrors.size_quantities[size] = 'Use a non-negative whole number.';
    }
  });

  const totalStock = getTotalStock(form.size_quantities);

  const hasError =
    Boolean(fieldErrors.name) ||
    Boolean(fieldErrors.price) ||
    Boolean(fieldErrors.category_id) ||
    Boolean(fieldErrors.description) ||
    Boolean(fieldErrors.image_url) ||
    Object.keys(fieldErrors.image_urls).length > 0 ||
    Object.keys(fieldErrors.size_quantities).length > 0;

  return {
    isValid: !hasError,
    fieldErrors,
    normalizedImages,
    normalizedPrimaryImage,
    totalStock,
  };
}

function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState(createEmptyFieldErrors());
  const [form, setForm] = useState(createEmptyForm());
  const totalStock = getTotalStock(form.size_quantities);

  async function fetchProducts() {
    try {
      setLoading(true);
      const response = await api.get('/api/products?includeInactive=true');
      setProducts(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to load products';
      setError(message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const response = await api.get('/api/categories');
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch {
      setCategories([]);
    }
  }

  async function fetchOrders() {
    try {
      setOrdersLoading(true);
      const response = await api.get('/api/admin/orders');
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchOrders();
  }, []);

  function resetForm() {
    setForm(createEmptyForm());
    setFieldErrors(createEmptyFieldErrors());
  }

  function startEdit(product) {
    const rawSizes = product.size_quantities && typeof product.size_quantities === 'object'
      ? product.size_quantities
      : {};

    const normalizedSizes = SIZE_OPTIONS.reduce((acc, size) => {
      acc[size] = toNumeric(rawSizes[size]);
      return acc;
    }, {});

    const imageUrls = Array.isArray(product.image_urls)
      ? product.image_urls.filter(Boolean)
      : [];

    setForm({
      id: product.id,
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      category_id: product.category_id ?? '',
      image_url: product.image_url || imageUrls[0] || '',
      image_urls: imageUrls,
      size_quantities: normalizedSizes,
    });
    setFieldErrors(createEmptyFieldErrors());
    setError('');
  }

  function updateField(field, value) {
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateImageAt(index, value) {
    setFieldErrors((prev) => {
      const imageErrors = { ...prev.image_urls };
      delete imageErrors[index];
      return { ...prev, image_url: '', image_urls: imageErrors };
    });

    setForm((prev) => {
      const nextImages = [...prev.image_urls];
      nextImages[index] = value;

      // For brand new products, any newly added non-empty image becomes image #1.
      if (!prev.id && String(value || '').trim()) {
        const nonEmptyImages = nextImages.filter(Boolean);
        const reorderedImages = [
          value,
          ...nonEmptyImages.filter((imageRef) => imageRef !== value),
        ];

        return {
          ...prev,
          image_url: value,
          image_urls: reorderedImages.length ? reorderedImages : [''],
        };
      }

      return {
        ...prev,
        image_url: index === 0 ? value : prev.image_url,
        image_urls: nextImages,
      };
    });
  }

  function addImageInput() {
    setForm((prev) => ({ ...prev, image_urls: [...prev.image_urls, ''] }));
  }

  function removeImageInput(index) {
    setForm((prev) => {
      const nextImages = prev.image_urls.filter((_, imageIndex) => imageIndex !== index);
      return { ...prev, image_urls: nextImages };
    });
  }

  function updateSize(size, value) {
    setFieldErrors((prev) => ({
      ...prev,
      size_quantities: {
        ...prev.size_quantities,
        [size]: '',
      },
    }));

    setForm((prev) => ({
      ...prev,
      size_quantities: {
        ...prev.size_quantities,
        [size]: value,
      },
    }));
  }

  function handleUpload(index, file) {
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      setError('Only image files can be uploaded.');
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError('Uploaded image is too large. Max size is 5MB.');
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      setError('Unable to read the selected image file.');
    };

    reader.onload = () => {
      if (typeof reader.result !== 'string') return;

      if (reader.result.length > MAX_IMAGE_VALUE_LENGTH) {
        setError('Encoded image payload is too large. Choose a smaller image.');
        return;
      }

      setError('');
      setFieldErrors((prev) => {
        const imageErrors = { ...prev.image_urls };
        delete imageErrors[index];
        return { ...prev, image_url: '', image_urls: imageErrors };
      });

      setForm((prev) => {
        const nextImages = [...prev.image_urls];
        nextImages[index] = reader.result;

        // For brand new products, any uploaded image becomes image #1 (primary).
        if (!prev.id) {
          const nonEmptyImages = nextImages.filter(Boolean);
          const reorderedImages = [
            reader.result,
            ...nonEmptyImages.filter((imageRef) => imageRef !== reader.result),
          ];

          return {
            ...prev,
            image_url: reader.result,
            image_urls: reorderedImages.length ? reorderedImages : [''],
          };
        }

        return {
          ...prev,
          image_url: index === 0 ? reader.result : prev.image_url,
          image_urls: nextImages,
        };
      });
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validation = validateForm(form);
    setFieldErrors(validation.fieldErrors);

    if (!validation.isValid) {
      setError('Please fix the highlighted form errors and try again.');
      return;
    }

    const primaryImage = validation.normalizedPrimaryImage || validation.normalizedImages[0] || '';

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category_id: Number(form.category_id),
      image_url: primaryImage,
      image_urls: validation.normalizedImages,
      size_quantities: SIZE_OPTIONS.reduce((acc, size) => {
        acc[size] = Math.max(0, Math.floor(toNumeric(form.size_quantities[size])));
        return acc;
      }, {}),
      stock: validation.totalStock,
    };

    try {
      setSaving(true);
      setError('');

      if (form.id) {
        await api.put(`/api/products/${form.id}`, payload);
      } else {
        await api.post('/api/products', payload);
      }

      await fetchProducts();
      resetForm();
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to save product';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(productId) {
    const confirmed = window.confirm('Deactivate this product? It will be hidden from shoppers but kept for order history.');
    if (!confirmed) return;

    try {
      setError('');
      await api.delete(`/api/products/${productId}`);
      await fetchProducts();
      if (form.id === productId) {
        resetForm();
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to deactivate product';
      setError(message);
    }
  }

  async function handleUpdateOrderStatus(orderId, status) {
    try {
      setUpdatingOrderId(orderId);
      setError('');
      await api.put(`/api/admin/orders/${orderId}/status`, { status });
      await fetchOrders();
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to update order status';
      setError(message);
    } finally {
      setUpdatingOrderId(null);
    }
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

  return (
    <main className="admin-page">
      <div className="admin-page__header">
        <div>
          <p className="admin-kicker">Store Management</p>
          <h1>Admin Dashboard</h1>
        </div>
        <Link to="/products" className="admin-link">Back to storefront</Link>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <section className="admin-layout">
        <article className="admin-panel">
          <div className="admin-panel__header">
            <h2>{form.id ? `Edit Product #${form.id}` : 'Add Product'}</h2>
            {form.id && (
              <button type="button" className="admin-secondary" onClick={resetForm}>
                New Product
              </button>
            )}
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Product Name
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                maxLength={120}
                aria-invalid={Boolean(fieldErrors.name)}
                required
              />
              {fieldErrors.name && <p className="admin-field-error">{fieldErrors.name}</p>}
            </label>

            <label>
              Description
              <textarea
                rows="4"
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                maxLength={2000}
                aria-invalid={Boolean(fieldErrors.description)}
              />
              {fieldErrors.description && <p className="admin-field-error">{fieldErrors.description}</p>}
            </label>

            <div className="admin-form__split">
              <label>
                Price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => updateField('price', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.price)}
                  required
                />
                {fieldErrors.price && <p className="admin-field-error">{fieldErrors.price}</p>}
              </label>

              <label>
                Category
                <select
                  value={form.category_id}
                  onChange={(event) => updateField('category_id', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.category_id)}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                {fieldErrors.category_id && <p className="admin-field-error">{fieldErrors.category_id}</p>}
              </label>

              <label>
                Primary Image URL
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(event) => updateField('image_url', event.target.value)}
                  placeholder="https://..."
                  aria-invalid={Boolean(fieldErrors.image_url)}
                />
                {fieldErrors.image_url && <p className="admin-field-error">{fieldErrors.image_url}</p>}
              </label>
            </div>

            <fieldset className="admin-fieldset">
              <legend>Gallery Photos</legend>

              {form.image_urls.map((imageUrl, index) => (
                <AdminImageInputRow
                  key={`image-input-${index}`}
                  index={index}
                  value={imageUrl}
                  error={fieldErrors.image_urls[index]}
                  canRemove={form.image_urls.length > 1}
                  onUrlChange={updateImageAt}
                  onFileChange={handleUpload}
                  onRemove={removeImageInput}
                />
              ))}

              <button
                type="button"
                className="admin-secondary"
                onClick={addImageInput}
                disabled={form.image_urls.length >= MAX_IMAGES}
              >
                Add Another Photo
              </button>
            </fieldset>

            <fieldset className="admin-fieldset">
              <legend>Size Quantities</legend>
              <AdminSizeQuantities
                sizeOptions={SIZE_OPTIONS}
                values={form.size_quantities}
                errors={fieldErrors.size_quantities}
                onUpdateSize={updateSize}
              />
              <p className="admin-stock-total">Total stock: {totalStock}</p>
            </fieldset>

            <button className="admin-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : form.id ? 'Save Product' : 'Create Product'}
            </button>
          </form>
        </article>

        <article className="admin-panel">
          <div className="admin-panel__header">
            <h2>Products</h2>
            <p>{loading ? 'Loading...' : `${products.length} items`}</p>
          </div>

          <div className="admin-products-list">
            {!loading && products.length === 0 && (
              <p className="admin-empty">No products found.</p>
            )}

            {products.map((product) => (
              <AdminProductListItem
                key={product.id}
                product={product}
                onEdit={startEdit}
                onDeactivate={handleDelete}
              />
            ))}
          </div>
        </article>
      </section>

      <section className="admin-panel admin-panel--orders">
        <div className="admin-panel__header">
          <h2>Orders</h2>
          <p>{ordersLoading ? 'Loading...' : `${orders.length} orders`}</p>
        </div>

        {orders.length === 0 && !ordersLoading ? (
          <p className="admin-empty">No orders found.</p>
        ) : (
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Items</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.user_id}</td>
                    <td>{order.status_label || getOrderStatusLabel(order.status)}</td>
                    <td>${Number(order.total_amount || 0).toFixed(2)}</td>
                    <td>
                      {(order.items || []).map((item) => (
                        <div key={item.id} className="orders-table__detail">
                          {item.product_name} ({item.size || 'M'}) × {item.quantity}
                        </div>
                      ))}
                    </td>
                    <td>
                      <select
                        value={order.status || 'placed'}
                        onChange={(event) => handleUpdateOrderStatus(order.id, event.target.value)}
                        disabled={updatingOrderId === order.id}
                      >
                        {ORDER_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
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

export default AdminDashboard;
