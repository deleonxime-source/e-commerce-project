import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const filtered = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  return (
    <main className="body">

      {/* Hero */}
      <section className="hero">
        <div className="hero__editorial">
          <div>
            <p className="hero__season">SS — 2026</p>
            <h1 className="hero__headline">
              CORPS
              <span className="diamond">◆</span>
              OBJECT
            </h1>
          </div>
          <div>
            <p className="hero__collection-label">The new collection</p>
            <Link to="/products" className="hero__cta">
              <span>Explore</span>
              <span className="arrow">→</span>
            </Link>
          </div>
        </div>

        <div className="hero__products">
          <div className="hero__product hero__product--light">
            <div className="hero__product-header">
              <div>
                <p className="hero__product-category hero__product-category--light">
                  Outerwear
                </p>
                <p className="hero__product-name hero__product-name--light">
                  Anatomical Jacket
                </p>
              </div>
              <p className="hero__product-price hero__product-price--light">
                $890
              </p>
            </div>
            <div className="hero__swatches">
              <div className="hero__swatch-block" style={{ background: '#e0ddd8' }} />
              <div className="hero__swatch-block" style={{ background: '#ccc9c3' }} />
            </div>
          </div>

          <div className="hero__product hero__product--dark">
            <div className="hero__product-header">
              <div>
                <p className="hero__product-category hero__product-category--dark">
                  Knitwear
                </p>
                <p className="hero__product-name hero__product-name--dark">
                  Deconstructed Turtleneck
                </p>
              </div>
              <p className="hero__product-price hero__product-price--dark">
                $420
              </p>
            </div>
            <div className="colour-swatches">
              <div className="swatch" style={{ background: '#fff' }} />
              <div className="swatch" style={{ background: '#c0a882' }} />
              <div className="swatch" style={{ background: '#555' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Announcement bar */}
      <div className="announcement-bar">
        <span className="announcement-bar__item">Free shipping over $300</span>
        <span className="announcement-bar__sep">◆</span>
        <span className="announcement-bar__item">Sustainable materials</span>
        <span className="announcement-bar__sep">◆</span>
        <span className="announcement-bar__item">Returns within 30 days</span>
      </div>

      {/* Category filter */}
      <section className="category-filter">
        <span className="category-filter__label">Filter:</span>
        <button
          className={`filter-chip ${!selectedCategory ? 'filter-chip--active' : 'filter-chip--inactive'}`}
          onClick={() => setSelectedCategory(null)}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`filter-chip ${selectedCategory === cat.id ? 'filter-chip--active' : 'filter-chip--inactive'}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </section>

      {/* Product grid */}
      <section className="product-grid">
        {loading && (
          <p className="grid-message">Loading...</p>
        )}

        {!loading && filtered.length === 0 && (
          <p className="grid-message">No products found.</p>
        )}

        {!loading && filtered.map((product, index) => (
          <Link
            to={`/products/${product.id}`}
            key={product.id}
            className="product-card"
          >
            <div className="product-card__image">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} />
              ) : (
                <div className="product-card__image--placeholder">
                  <span className="product-card__ref">
                    {String(index + 1).padStart(3, '0')}
                  </span>
                </div>
              )}
              {product.stock === 0 && (
                <span className="product-card__sold-out">Sold Out</span>
              )}
            </div>
            <div className="product-card__body">
              <p className="product-card__category">{product.category_name}</p>
              <p className={`product-card__name ${product.stock === 0 ? 'product-card__name--sold-out' : ''}`}>
                {product.name}
              </p>
              <p className="product-card__price">${product.price}</p>
            </div>
          </Link>
        ))}
      </section>

    </main>
  );
};

export default Home;