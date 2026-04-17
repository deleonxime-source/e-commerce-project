import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/products/${id}`)
      .then((response) => setProduct(response.data))
      .catch(() => setError('Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Loading product…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="product-detail">
      <img src={product.image_url} alt={product.name} />
      <div>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <p className="price">${product.price}</p>
        <button className="button">Add to cart</button>
      </div>
    </div>
  );
}

export default ProductDetail;
