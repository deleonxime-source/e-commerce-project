import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api.js';
import ProductCard from '../components/products/ProductCard.jsx';
import CategoryFilter from '../components/home/CategoryFilter.jsx';
import AnnouncementBar from '../components/home/AnnouncementBar.jsx';

const ANNOUNCEMENT_ITEMS = [
  'Free shipping over $300',
  'Sustainable materials',
  'Returns within 30 days',
];

function Products() {
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
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  return (
    <main className="body">

      <div className="products-header">
        <div>
          <p className="products-header__eyebrow">SS — 2026</p>
          <h1 className="products-header__title">All Products</h1>
        </div>
        <div className="products-header__meta">
          <span className="products-header__sort">Newest ▾</span>
          <span className="products-header__sep">|</span>
          <span className="products-header__count">
            {filteredProducts.length} pieces
          </span>
        </div>
      </div>

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

      <AnnouncementBar items={ANNOUNCEMENT_ITEMS} />

    </main>
  );
}

export default Products;