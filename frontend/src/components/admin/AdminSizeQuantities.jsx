function AdminSizeQuantities({ sizeOptions, values, errors, onUpdateSize }) {
  return (
    <div className="admin-sizes-grid">
      {sizeOptions.map((size) => (
        <label key={size}>
          {size}
          <input
            type="number"
            min="0"
            step="1"
            value={values[size]}
            onChange={(event) => onUpdateSize(size, event.target.value)}
            aria-invalid={Boolean(errors[size])}
          />
          {errors[size] && <p className="admin-field-error">{errors[size]}</p>}
        </label>
      ))}
    </div>
  );
}

export default AdminSizeQuantities;
