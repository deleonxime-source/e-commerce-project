import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api/api.js';
import AnnouncementBar from './components/home/AnnouncementBar.jsx';
import CategoryFilter from './components/home/CategoryFilter.jsx';
import ProductCard from './components/products/ProductCard.jsx';

const ANNOUNCEMENT_ITEMS = [
  'Free shipping over $300',
  'Sustainable materials',
  'Returns within 30 days',
];

const Home = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/api/products');
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch products', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/categories');
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch categories', err);
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const filteredProducts = selectedCategory
    ? products.filter((p) => Number(p.category_id) === Number(selectedCategory))
    : products;

  return (
    <main className="body">
      <section className="hero">
  <div className="hero__editorial">

    {/* Background video */}
    <video
      className="hero__video"
      src="/videos/hero.mp4"
      autoPlay
      loop
      muted
      playsInline
    />

    {/* Overlay so text stays readable */}
    <div className="hero__overlay" />

    {/* Content sits on top */}
    <div className="hero__content">
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
        <div className="hero__actions">
          <Link to="/products" className="hero__cta">
            <span>Explore</span>
            <span className="arrow">→</span>
          </Link>
          <Link to="/admin" className="hero__cta">
            <span>Admin</span>
            <span className="arrow">→</span>
          </Link>
        </div>
      </div>
    </div>

  </div>
</section>

      

      <AnnouncementBar items={ANNOUNCEMENT_ITEMS} />

      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <section className="product-grid">
        {loading && (
          <p className="grid-message">Loading...</p>
        )}
        {!loading && filteredProducts.length === 0 && (
          <p className="grid-message">No products found.</p>
        )}
        {!loading && filteredProducts.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </section>

    </main>
  );
};

export default Home;