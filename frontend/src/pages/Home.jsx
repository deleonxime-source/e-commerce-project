import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api.js';

function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/products')
      .then((response) => setProducts(response.data))
      .catch(() => setError('Unable to load products'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading products…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h1>Product Catalog</h1>
      <div className="product-grid">
        {products.map((product) => (
          <article key={product.id} className="card">
            <img src={product.image_url} alt={product.name} />
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            <p className="price">${product.price}</p>
            <Link to={`/product/${product.id}`} className="button">
              View details
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

export default Home;
