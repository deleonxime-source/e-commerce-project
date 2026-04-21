import { Link } from 'react-router-dom';
import ProductCardImage from './ProductCardImage.jsx';

function ProductCard({ product, index }) {
  return (
    <Link to={`/products/${product.id}`} className="product-card">
      <div className="product-card__image">
        <ProductCardImage product={product} index={index} />
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
  );
}

export default ProductCard;
