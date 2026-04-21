import { useEffect, useState } from 'react';
import api from '../api/api.js';

function Home() {
  const [status, setStatus] = useState('Checking backend...');
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let isMounted = true;

    api.get('/api/products')
      .then((response) => {
        if (!isMounted) return;
        setProducts(response.data);
        setStatus('Backend is working.');
      })
      .catch((error) => {
        if (!isMounted) return;
        const message = error?.response?.data?.message || error.message || 'Request failed';
        setStatus(`Backend check failed: ${message}`);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="home-test-page">
      <h1>Backend Test Page</h1>
      <p>{status}</p>
      <p>Products returned: {products.length}</p>
      <ul>
        {products.slice(0, 3).map((product) => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default Home;
