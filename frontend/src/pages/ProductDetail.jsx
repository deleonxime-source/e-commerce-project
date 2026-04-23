import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/api.js';
import ProductGallery from '../components/products/ProductGallery.jsx';
import SizeSelector from '../components/products/SizeSelector.jsx';

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const NO_IMAGE_PLACEHOLDER = 'https://via.placeholder.com/1200x1200?text=No+Image';
  function getImageList(product) {
  if (!product) return [NO_IMAGE_PLACEHOLDER];

  const single =
    product.image_url ||
    (Array.isArray(product.image_urls) && product.image_urls[0]) ||
    (Array.isArray(product.images) && product.images[0]);

  return single ? [single] : [NO_IMAGE_PLACEHOLDER];
}

  

function normalizeSizeQuantities(product) {
  if (!product?.size_quantities || typeof product.size_quantities !== 'object') {
    return null;
  }

  return Object.entries(product.size_quantities).reduce((acc, [size, quantity]) => {
    acc[String(size).toUpperCase()] = Number(quantity) || 0;
    return acc;
  }, {});
}

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedSize, setSelectedSize] = useState('M');
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    setLoading(true);
    setError('');

    api
      .get(`/api/products/${id}`)
      .then((response) => {
        if (!isMounted) return;
        setProduct(response.data);
      })
      .catch((err) => {
        if (!isMounted) return;
        const message = err?.response?.data?.message || 'Unable to load product';
        setError(message);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    const nextImages = getImageList(product);
    setImages(nextImages);
    setSelectedImage(nextImages[0]);
  }, [product]);

  const sizeQuantities = normalizeSizeQuantities(product);
  const availableSizes = sizeQuantities && Object.keys(sizeQuantities).length
    ? Object.keys(sizeQuantities)
    : SIZES;
  const stock = Number(product?.stock) || 0;
  const selectedSizeQuantity = sizeQuantities?.[selectedSize] ?? 0;
  const canAddToCart = stock > 0 && selectedSizeQuantity > 0 && !isAddingToCart;

  useEffect(() => {
    if (availableSizes.includes(selectedSize)) return;
    setSelectedSize(availableSizes[0]);
  }, [product, selectedSize]);

  if (loading) {
    return <main className="product-detail-page"><p className="grid-message">Loading product...</p></main>;
  }

  if (error || !product) {
    return (
      <main className="product-detail-page">
        <p className="grid-message">{error || 'Product not found.'}</p>
        <Link to="/products" className="detail-back-link">Back to products</Link>
      </main>
    );
  }

  const hasSizeInventory = sizeQuantities && Object.values(sizeQuantities).some((quantity) => quantity > 0);

  async function handleAddToCart() {
    if (!product?.id || !canAddToCart) {
      return;
    }

    try {
      setIsAddingToCart(true);
      setCartMessage('');

      await api.post('/api/cart', {
        productId: product.id,
        size: selectedSize,
        quantity: 1,
      });

      setCartMessage('Added to cart.');
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to add item to cart.';
      setCartMessage(message);
    } finally {
      setIsAddingToCart(false);
    }
  }

  return (
    <main className="product-detail-page">
      <div className="detail-topbar">
        <Link to="/products" className="detail-back-link">← Back to products</Link>
      </div>

      <section className="product-detail-layout">
        <ProductGallery
          productName={product.name}
          images={images}
          selectedImage={selectedImage}
          onSelectImage={setSelectedImage}
        />

        <div className="product-detail-card">
          <p className="product-detail-card__category">{product.category_name || 'Product'}</p>
          <h1 className="product-detail-card__title">{product.name}</h1>
          <p className="product-detail-card__price">${product.price}</p>

          <p className="product-detail-card__description">
            {product.description || 'No description available yet.'}
          </p>

          <SizeSelector
            availableSizes={availableSizes}
            sizeQuantities={sizeQuantities}
            selectedSize={selectedSize}
            onSelectSize={setSelectedSize}
          />

          {!hasSizeInventory && (
            <p className="cart-note">No size inventory is available for this product.</p>
          )}

          <button
            type="button"
            className="add-to-cart-button"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
          >
            {isAddingToCart ? 'Adding...' : 'Add to cart'}
          </button>

          <Link to="/cart" className="detail-cart-link">View cart</Link>

          {cartMessage && <p className="cart-feedback">{cartMessage}</p>}

          <p className="stock-note">
            {stock > 0 ? `In stock: ${stock}` : 'Currently out of stock'}
          </p>
        </div>
      </section>
    </main>
  );
}

export default ProductDetail;
