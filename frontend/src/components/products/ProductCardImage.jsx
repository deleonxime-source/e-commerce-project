import { useEffect, useState } from 'react';
import { getLocalProductImageUrls } from '../../utils/productImages.js';

function ProductCardImage({ product, index }) {
  const localMainImage = getLocalProductImageUrls(product.id)[0] || '';
  const fallbackImage = product.image_url || '';
  const [src, setSrc] = useState(localMainImage || fallbackImage);
  const [showPlaceholder, setShowPlaceholder] = useState(!localMainImage && !fallbackImage);

  useEffect(() => {
    setSrc(localMainImage || fallbackImage);
    setShowPlaceholder(!localMainImage && !fallbackImage);
  }, [localMainImage, fallbackImage]);

  if (showPlaceholder) {
    return (
      <div className="product-card__image--placeholder">
        <span className="product-card__ref">{String(index + 1).padStart(3, '0')}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={product.name}
      onError={() => {
        if (fallbackImage && src !== fallbackImage) {
          setSrc(fallbackImage);
          return;
        }

        setShowPlaceholder(true);
      }}
    />
  );
}

export default ProductCardImage;
