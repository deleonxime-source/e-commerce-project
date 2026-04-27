import Button from '@mui/material/Button';

const NO_IMAGE_PLACEHOLDER = 'https://via.placeholder.com/160x160?text=No+Image';

function AdminProductListItem({ product, onEdit, onDeactivate }) {
  const galleryImage = Array.isArray(product?.image_urls) ? product.image_urls.find(Boolean) : '';
  const productImage = product?.image_url || galleryImage || NO_IMAGE_PLACEHOLDER;

  return (
    <div className="admin-product-item">
      <img
        src={productImage}
        alt={product.name || 'Product image'}
        className="admin-product-item__image"
      />

      <div className="admin-product-item__content">
        <p className="admin-product-item__name">{product.name}</p>
        <p className="admin-product-item__meta">
          ${product.price} · Stock {product.stock} · {product.category_name || 'Uncategorized'}
        </p>
        {!product.is_active && <p className="admin-product-item__inactive">Inactive</p>}
      </div>
      <div className="admin-product-item__actions">
        <Button
          type="button"
          variant="outlined"
          size="small"
          onClick={() => onEdit(product)}
          sx={{ fontFamily: '"Space Mono", monospace', fontSize: '10px', letterSpacing: '0.08em' }}
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="outlined"
          size="small"
          onClick={() => onDeactivate(product.id)}
          disabled={!product.is_active}
          sx={{
            fontFamily: '"Space Mono", monospace',
            fontSize: '10px',
            letterSpacing: '0.08em',
            borderColor: 'rgba(0, 0, 0, 0.3)',
            color: '#333333',
            '&:hover': { borderColor: '#111111', backgroundColor: 'rgba(0, 0, 0, 0.03)' },
          }}
        >
          {product.is_active ? 'Deactivate' : 'Inactive'}
        </Button>
      </div>
    </div>
  );
}

export default AdminProductListItem;
