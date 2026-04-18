import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/api.js';
import { getLocalProductImageUrls } from '../utils/productImages.js';

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedSize, setSelectedSize] = useState('M');

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

  const imageCandidates = useMemo(() => {
    if (!product) return [];

    const list = [
      ...getLocalProductImageUrls(product.id),
      product.image_url,
      ...(Array.isArray(product.images) ? product.images : []),
    ];

    return [...new Set(list.filter(Boolean))];
  }, [product]);

  useEffect(() => {
    let isMounted = true;

    async function resolveAvailableImages() {
      if (!imageCandidates.length) {
        setImages(['https://via.placeholder.com/1200x1200?text=No+Image']);
        return;
      }

      const checks = await Promise.all(
        imageCandidates.map(
          (url) =>
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve(url);
              img.onerror = () => resolve(null);
              img.src = url;
            })
        )
      );

      if (!isMounted) return;

      const available = checks.filter(Boolean);
      setImages(available.length ? available : ['https://via.placeholder.com/1200x1200?text=No+Image']);
    }

    resolveAvailableImages();

    return () => {
      isMounted = false;
    };
  }, [imageCandidates]);

  useEffect(() => {
    if (images.length) {
      setSelectedImage(images[0]);
    }
  }, [images]);

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

  return (
    <main className="product-detail-page">
      <div className="detail-topbar">
        <Link to="/products" className="detail-back-link">← Back to products</Link>
      </div>

      <section className="product-detail-layout">
        <div className="product-gallery">
          <div className="product-gallery__main">
            <img src={selectedImage} alt={product.name} />
          </div>

          <div className="product-gallery__thumbs">
            {images.map((imageUrl, index) => (
              <button
                key={`${imageUrl}-${index}`}
                type="button"
                className={`gallery-thumb ${selectedImage === imageUrl ? 'gallery-thumb--active' : ''}`}
                onClick={() => setSelectedImage(imageUrl)}
              >
                <img src={imageUrl} alt={`${product.name} ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="product-detail-card">
          <p className="product-detail-card__category">{product.category_name || 'Product'}</p>
          <h1 className="product-detail-card__title">{product.name}</h1>
          <p className="product-detail-card__price">${product.price}</p>

          <p className="product-detail-card__description">
            {product.description || 'No description available yet.'}
          </p>

          <div className="size-picker">
            <p className="size-picker__label">Select size</p>
            <div className="size-picker__buttons">
              {SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`size-button ${selectedSize === size ? 'size-button--active' : ''}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="add-to-cart-button" disabled>
            Add to cart (coming soon)
          </button>

          <p className="stock-note">
            {product.stock > 0 ? `In stock: ${product.stock}` : 'Currently out of stock'}
          </p>
        </div>
      </section>
    </main>
  );
}

export default ProductDetail;
