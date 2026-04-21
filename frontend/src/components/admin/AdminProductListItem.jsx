function AdminProductListItem({ product, onEdit, onDeactivate }) {
  return (
    <div className="admin-product-item">
      <div>
        <p className="admin-product-item__name">{product.name}</p>
        <p className="admin-product-item__meta">
          ${product.price} · Stock {product.stock} · {product.category_name || 'Uncategorized'}
        </p>
        {!product.is_active && <p className="admin-product-item__inactive">Inactive</p>}
      </div>
      <div className="admin-product-item__actions">
        <button
          type="button"
          className="admin-secondary"
          onClick={() => onEdit(product)}
        >
          Edit
        </button>
        <button
          type="button"
          className="admin-danger"
          onClick={() => onDeactivate(product.id)}
          disabled={!product.is_active}
        >
          {product.is_active ? 'Deactivate' : 'Inactive'}
        </button>
      </div>
    </div>
  );
}

export default AdminProductListItem;
