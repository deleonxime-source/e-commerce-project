import { useEffect, useState } from 'react';
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
  const [sortOrder, setSortOrder] = useState('newest');
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
    ? products.filter(
        (p) => Number(p.category_id) === Number(selectedCategory)
      )
    : products;

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortOrder === 'newest') return b.id - a.id;
    if (sortOrder === 'oldest') return a.id - b.id;
    if (sortOrder === 'price-asc') return Number(a.price) - Number(b.price);
    if (sortOrder === 'price-desc') return Number(b.price) - Number(a.price);
    return 0;
  });

  return (
    <main className="body">

      <div className="products-header">
        <div>
          <p className="products-header__eyebrow">S/S — 2026</p>
          <h1 className="products-header__title">All Products</h1>
        </div>
        <div className="products-header__meta">
          <select
            className="products-header__sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
          <span className="products-header__sep">|</span>
          <span className="products-header__count">
            {sortedProducts.length} pieces
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

        {!loading && sortedProducts.length === 0 && (
          <p className="grid-message">No products found.</p>
        )}

        {!loading && sortedProducts.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </section>

      <AnnouncementBar items={ANNOUNCEMENT_ITEMS} />

    </main>
  );
}

export default Products;