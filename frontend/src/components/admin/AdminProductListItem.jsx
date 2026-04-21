function AdminProductListItem({ product, onEdit, onDelete }) {
  return (
    <div className="admin-product-item">
      <div>
        <p className="admin-product-item__name">{product.name}</p>
        <p className="admin-product-item__meta">
          ${product.price} · Stock {product.stock}
        </p>
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
          onClick={() => onDelete(product.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default AdminProductListItem;
